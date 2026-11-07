import {describe, expect, it} from 'vitest';
import {MAX_SEED_SCORE, seedScore, topicVerseScore} from '../src/topicScore';

const TOPIC_MAX = 2953;

describe('seedScore', () => {
  it('gives the topic\'s most-voted verse the maximum score', () => {
    expect(seedScore(TOPIC_MAX, TOPIC_MAX)).toBe(MAX_SEED_SCORE);
  });

  it('keeps OpenBible\'s order while compressing its counts', () => {
    expect(seedScore(14, TOPIC_MAX)).toBeCloseTo(6.78, 2);
    expect(seedScore(1000, TOPIC_MAX)).toBeGreaterThan(seedScore(14, TOPIC_MAX));
  });

  it('gives no score to a verse or topic without votes', () => {
    expect(seedScore(0, TOPIC_MAX)).toBe(0);
    expect(seedScore(0, 0)).toBe(0);
  });
});

describe('topicVerseScore', () => {
  it('lets enough upvotes overtake OpenBible\'s top verse', () => {
    const top = topicVerseScore(TOPIC_MAX, TOPIC_MAX, 0);

    expect(topicVerseScore(0, TOPIC_MAX, MAX_SEED_SCORE)).toBe(top);
    expect(topicVerseScore(0, TOPIC_MAX, MAX_SEED_SCORE + 1)).toBeGreaterThan(top);
  });
});
