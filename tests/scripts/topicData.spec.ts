import type {TopicFile} from '../../packages/core/src/topics.ts';

import {existsSync, readFileSync} from 'node:fs';
import {describe, expect, it} from 'vitest';
import {topicSlug} from '../../packages/core/src/topics.ts';
import {parseTopicVotes} from '../../scripts/build-topic-data';

const HEADER = 'Topic\tStart Verse ID\tEnd Verse ID\tVotes\t#Generated 2026-11-02. CC-BY License: www.openbible.info/topics';

describe('parseTopicVotes', () => {
  it('reads single verses and passages, most-voted first, skipping the header', () => {
    const topics = parseTopicVotes(`${HEADER}\r\ngrief\t40005004\t\t300\r\ngrief\t40011028\t40011030\t135\r\ngrief\t19147003\t\t250\r\n`);

    expect(topics.get('grief')).toEqual({
      name: 'grief',
      verses: [['40005004', '40005004', 300], ['19147003', '19147003', 250], ['40011028', '40011030', 135]],
    });
  });

  it('merges spellings that share a slug, named by the most-voted spelling, keeping the higher count', () => {
    const topics = parseTopicVotes([
      'Self Control\t48005022\t48005023\t10',
      'self-control\t48005022\t48005023\t40',
      'self-control\t20025028\t\t5',
      'gain the world \t40016026\t\t3',
    ].join('\n'));

    expect(topics.get('self-control')).toEqual({
      name: 'self-control',
      verses: [['48005022', '48005023', 40], ['20025028', '20025028', 5]],
    });
    expect(topics.get('gain-the-world')?.name).toBe('gain the world');
  });

  it('skips verses that do not exist, backwards passages, and rows without votes', () => {
    const topics = parseTopicVotes(['hope\t67001001\t\t9', 'hope\t45005005\t45005001\t9', 'hope\t45005005\t\t0', 'hope\t45015013\t\t7'].join('\n'));

    expect(topics.get('hope')?.verses).toEqual([['45015013', '45015013', 7]]);
  });
});

describe('the committed topic data', () => {
  const names = JSON.parse(readFileSync('apps/web/public/topic-data/_index.json', 'utf8')) as string[];

  it('lists thousands of topics, each with its own file', () => {
    expect(names.length).toBeGreaterThan(5000);
    expect(names.filter((name) => !existsSync(`apps/web/public/topic-data/${topicSlug(name)}.json`))).toEqual([]);
  });

  it('has the common topics the home page links to', () => {
    for (const name of ['marriage', 'forgiveness', 'anxiety', 'grief', 'money', 'prayer']) {
      const topic = JSON.parse(readFileSync(`apps/web/public/topic-data/${topicSlug(name)}.json`, 'utf8')) as TopicFile;

      expect(topic.name).toBe(name);
      expect(topic.verses.length).toBeGreaterThan(50);
    }
  });
});
