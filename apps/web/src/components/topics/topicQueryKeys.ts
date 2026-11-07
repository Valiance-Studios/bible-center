/** Query keys for a topic's Bible Center data. Every key starts with `forTopic`, so one invalidation refreshes them all. */
export const topicQueryKeys = {
  forTopic: (slug: string) => ['topicVotes', slug] as const,
  verses: (slug: string) => ['topicVotes', slug, 'verses'] as const,
  mine: (slug: string, uid: string | undefined) => ['topicVotes', slug, 'mine', uid] as const,
  started: (slug: string) => ['topicVotes', slug, 'started'] as const,
  removed: (slug: string) => ['topicVotes', slug, 'removed'] as const,
};
