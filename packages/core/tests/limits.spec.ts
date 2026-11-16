import {describe, expect, it} from 'vitest';
import {cooldownEndsAt} from '../src/limits';

describe('cooldownEndsAt', () => {
  const last = new Date('2026-11-16T12:00:00Z');

  it('is null for someone who has never done it', () => {
    expect(cooldownEndsAt('report', null, last)).toBeNull();
  });

  it('is when the cooldown ends, while it runs', () => {
    expect(cooldownEndsAt('report', last, new Date('2026-11-16T12:00:30Z'))).toEqual(new Date('2026-11-16T12:01:00Z'));
    expect(cooldownEndsAt('topic', last, new Date('2026-11-16T12:05:00Z'))).toEqual(new Date('2026-11-16T12:10:00Z'));
  });

  it('is null once it has ended', () => {
    expect(cooldownEndsAt('report', last, new Date('2026-11-16T12:01:00Z'))).toBeNull();
  });
});
