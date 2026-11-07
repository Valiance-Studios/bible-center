import {beforeEach, describe, expect, it, vi} from 'vitest';
import {addDoc, getDocs} from 'firebase/firestore';
import {listCommunityVerses, listMyVotes, reportVerse} from '@/firebase/topics';

vi.mock('@/firebase', () => ({db: {}}));
vi.mock('firebase/firestore', () => ({
  addDoc: vi.fn(),
  collection: vi.fn(),
  collectionGroup: vi.fn(),
  doc: vi.fn(),
  getDocFromServer: vi.fn(),
  getDocs: vi.fn(),
  query: vi.fn(),
  runTransaction: vi.fn(),
  serverTimestamp: () => 'now',
  where: vi.fn(),
}));

function snapshot(fromCache: boolean, documents: {data?: Record<string, unknown>; verseKey?: string}[] = []) {
  return {
    metadata: {fromCache},
    docs: documents.map(({data = {}, verseKey}) => ({data: () => data, ref: {parent: {parent: verseKey ? {id: verseKey} : null}}})),
  } as never;
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('listCommunityVerses', () => {
  it('fails when offline, rather than reporting no votes', async () => {
    vi.mocked(getDocs).mockResolvedValue(snapshot(true));

    await expect(listCommunityVerses('grief')).rejects.toThrow('Could not reach Firestore');
  });

  it('returns each verse with its upvotes', async () => {
    vi.mocked(getDocs).mockResolvedValue(snapshot(false, [
      {data: {startVerse: '40005004', endVerse: '40005004', upvotes: 3, createdBy: 'someone', createdAt: 'then'}},
    ]));

    await expect(listCommunityVerses('grief')).resolves.toEqual([{startVerse: '40005004', endVerse: '40005004', upvotes: 3}]);
  });
});

describe('listMyVotes', () => {
  it('names each voted verse by the key of the verse it sits under', async () => {
    vi.mocked(getDocs).mockResolvedValue(snapshot(false, [{verseKey: '40005004'}, {verseKey: '40011028-40011030'}]));

    await expect(listMyVotes('uid', 'grief')).resolves.toEqual(new Set(['40005004', '40011028-40011030']));
  });
});

describe('reportVerse', () => {
  it('sends an open report, leaving out empty details', async () => {
    await reportVerse('uid', {topic: 'grief', verseKey: '40005004', reason: 'fit'});

    expect(vi.mocked(addDoc).mock.calls[0]?.[1]).toEqual({
      topic: 'grief', verseKey: '40005004', reason: 'fit', reportedBy: 'uid', createdAt: 'now', status: 'open',
    });
  });
});
