import type {TopicFile} from '@bible-center/core';

import {normalizeTopicName, topicSlug} from '@bible-center/core';

/** Shown on the home page and the Topics page. A fixed list for now; see "Open Items" in ARCHITECTURE.md. */
export const COMMON_TOPICS = ['marriage', 'forgiveness', 'anxiety', 'grief', 'money', 'prayer'] as const;

/** Where a topic's page is. */
export function topicPath(name: string): string {
  return `/topics/${topicSlug(name)}`;
}

/**
 * Reads a file `scripts/build-topic-data.ts` wrote, or null if there is none. Hosting and the dev server answer
 * a missing file with the app's HTML page, so anything that is not JSON means the file does not exist.
 */
async function fetchTopicData<T>(path: string): Promise<T | null> {
  const response = await fetch(path);

  if (!response.ok && response.status !== 404) {
    throw new Error(`Could not load ${path}: ${response.status}`);
  }

  const isJson = response.headers.get('content-type')?.includes('json') ?? false;

  return response.ok && isJson ? await response.json() as T : null;
}

/** A topic's OpenBible verses, or null for a topic OpenBible does not have. */
export function topicQuery(slug: string) {
  return {
    queryKey: ['topic', slug],
    queryFn: () => fetchTopicData<TopicFile>(`/topic-data/${slug}.json`),
  };
}

/** Every topic's name, sorted, loaded once when first needed. */
export const topicNamesQuery = {
  queryKey: ['topicNames'],
  queryFn: async () => {
    const names = await fetchTopicData<string[]>('/topic-data/_index.json');

    if (!names) {
      throw new Error('The list of topics is missing.');
    }

    return names;
  },
};

/** The topic a search names, if it is exactly a topic's name, such as "marriage" or "Self control". */
export function findTopic(names: readonly string[], query: string): string | null {
  const slug = topicSlug(query);

  return names.find((name) => topicSlug(name) === slug) ?? null;
}

/** The name to show for a topic known only by its slug, as for one OpenBible does not have. */
export function nameFromSlug(slug: string): string {
  return normalizeTopicName(slug.replaceAll('-', ' '));
}
