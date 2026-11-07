import type {TopicSpan} from '@/firebase/topics';

import {useMutation, useQuery, useQueryClient} from '@tanstack/react-query';
import {topicVerseKey} from '@bible-center/core';
import {listCommunityVerses, listMyVotes, removeUpvote, upvoteVerse} from '@/firebase/topics';
import {topicQueryKeys} from './topicQueryKeys';

const NO_VOTES = new Set<string>();

/**
 * A topic's Bible Center upvotes, which of them are this user's, and the ways to change them.
 * With no user, anyone can still see the counts.
 */
export function useTopicVotes(slug: string, uid: string | undefined) {
  const queryClient = useQueryClient();
  const verses = useQuery({
    queryKey: topicQueryKeys.verses(slug),
    queryFn: () => listCommunityVerses(slug),
    // Other people vote too.
    staleTime: 0,
    // Being offline counts as a failure here (see fetchFromServer), so give a brief one time to pass.
    retry: 4,
  });
  const mine = useQuery({
    queryKey: topicQueryKeys.mine(slug, uid),
    queryFn: () => listMyVotes(uid ?? '', slug),
    enabled: uid !== undefined,
    staleTime: 0,
    retry: 4,
  });
  const change = useMutation({
    mutationFn: async ({run}: {key: string; run: (userId: string) => Promise<void>}) => {
      if (uid) {
        await run(uid);
      }
    },
    onSettled: () => queryClient.invalidateQueries({queryKey: topicQueryKeys.forTopic(slug)}),
  });

  return {
    community: verses.data ?? [],
    myVotes: mine.data ?? NO_VOTES,
    isLoading: verses.isLoading || mine.isLoading,
    hasLoadError: verses.isError || mine.isError,
    /** The verse being voted on, if any. */
    savingKey: change.isPending ? change.variables.key : undefined,
    hasSaveError: change.isError,
    /** With `startTopicName`, also starts the topic if nobody has. */
    upvote: (span: TopicSpan, startTopicName?: string) => change.mutateAsync({
      key: topicVerseKey(span.startVerse, span.endVerse),
      run: (userId) => upvoteVerse(userId, slug, span, startTopicName),
    }),
    removeUpvote: (key: string) => change.mutateAsync({key, run: (userId) => removeUpvote(userId, slug, key)}),
  };
}
