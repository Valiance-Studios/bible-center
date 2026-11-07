import type {TopicFile} from '@bible-center/core';

import {normalizeTopicName, topicSlug} from '@bible-center/core';
import {listApprovedTopicNames} from '@/firebase/topics';
import {fetchStaticJson} from '@/staticData';

/** Shown on the home page and the Topics page. A fixed list for now; see "Open Items" in ARCHITECTURE.md. */
export const COMMON_TOPICS = ['marriage', 'forgiveness', 'anxiety', 'grief', 'money', 'prayer'] as const;

/** Where a topic's page is. */
export function topicPath(name: string): string {
  return `/topics/${topicSlug(name)}`;
}

/** A topic's OpenBible verses, or null for a topic OpenBible does not have. */
export function topicQuery(slug: string) {
  return {
    queryKey: ['topic', slug],
    queryFn: () => fetchStaticJson<TopicFile>(`/topic-data/${slug}.json`),
  };
}

/** The approved topics people started, or none if they cannot be loaded, so OpenBible's topics still show. */
async function approvedTopicNames(): Promise<string[]> {
  try {
    return await listApprovedTopicNames();
  } catch (error) {
    console.error('Could not load the topics people started', error);

    return [];
  }
}

/** Every topic's name, OpenBible's and the approved ones people started, sorted, loaded once when first needed. */
export const topicNamesQuery = {
  queryKey: ['topicNames'],
  queryFn: async () => {
    const [names, approved] = await Promise.all([fetchStaticJson<string[]>('/topic-data/_index.json'), approvedTopicNames()]);

    if (!names) {
      throw new Error('The list of topics is missing.');
    }

    return [...new Set([...names, ...approved])].sort((a, b) => a.localeCompare(b));
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
