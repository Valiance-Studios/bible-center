import {beforeEach, describe, expect, it, vi} from 'vite-plus/test';
import {WRITE_LIMITS} from '@bible-center/core';
import {Timestamp} from 'firebase/firestore';
import {addToCount, stampAfterCooldown, takeFromCount, WriteLimitError} from '@/firebase/userRecord';

vi.mock('@/firebase', () => ({db: {}}));
vi.mock('firebase/firestore', () => ({
  doc: (_: unknown, ...path: string[]) => path.join('/'),
  serverTimestamp: () => 'now',
  Timestamp: class {
    readonly date: Date;

    constructor(date: Date) {
      this.date = date;
    }

    toDate() {
      return this.date;
    }
  },
}));

const transaction = {set: vi.fn()};

beforeEach(() => {
  vi.clearAllMocks();
});

describe('counting', () => {
  it('counts one more, starting from none', () => {
    addToCount(transaction as never, 'uid', {}, 'annotations');
    addToCount(transaction as never, 'uid', {memoryVerseCount: 4}, 'memoryVerses');

    expect(transaction.set).toHaveBeenCalledWith('users/uid', {annotationCount: 1}, {merge: true});
    expect(transaction.set).toHaveBeenCalledWith('users/uid', {memoryVerseCount: 5}, {merge: true});
  });

  it('refuses once the limit is reached, writing nothing', () => {
    expect(() => addToCount(transaction as never, 'uid', {annotationCount: WRITE_LIMITS.annotations}, 'annotations'))
      .toThrow(WriteLimitError);
    expect(transaction.set).not.toHaveBeenCalled();
  });

  it('counts one fewer, naming what was deleted, but never below none', () => {
    takeFromCount(transaction as never, 'uid', {annotationCount: 3}, 'annotations', 'abc');
    takeFromCount(transaction as never, 'uid', {}, 'memoryVerses', '19023001');

    expect(transaction.set).toHaveBeenCalledOnce();
    expect(transaction.set).toHaveBeenCalledWith('users/uid', {annotationCount: 2, annotationChange: 'abc'}, {merge: true});
  });
});

describe('cooldowns', () => {
  it('stamps now when there is no cooldown running', () => {
    stampAfterCooldown(transaction as never, 'uid', {lastReportAt: new Timestamp(new Date(Date.now() - 120_000) as never, 0)}, 'report');

    expect(transaction.set).toHaveBeenCalledWith('users/uid', {lastReportAt: 'now'}, {merge: true});
  });

  it('refuses during the cooldown, saying when it ends', () => {
    const last = new Date(Date.now() - 1000);

    try {
      stampAfterCooldown(transaction as never, 'uid', {lastTopicAt: new Timestamp(last as never, 0)}, 'topic');
      expect.unreachable();
    } catch (error) {
      expect(error).toBeInstanceOf(WriteLimitError);
      expect((error as WriteLimitError).limit).toEqual({type: 'cooldown', kind: 'topic', endsAt: new Date(last.getTime() + 10 * 60 * 1000)});
    }

    expect(transaction.set).not.toHaveBeenCalled();
  });
});
