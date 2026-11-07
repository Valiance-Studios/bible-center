import type {ReportGroup, ReportOutcome, TopicDecision} from '@bible-center/core';
import type {PendingTopic} from '@/firebase/review';

import {useMutation, useQuery, useQueryClient} from '@tanstack/react-query';
import {groupReports} from '@bible-center/core';
import {topicQueryKeys} from '@/components/topics/topicQueryKeys';
import {decideTopic, listOpenReports, listPendingTopics, resolveReports} from '@/firebase/review';
import {useAuthStore} from '@/stores/auth';
import {topicNamesQuery} from '@/topics/topicData';

/** A reported verse, and what a reviewer decided in this session, if anything. */
export interface ReportItem {
  id: string;
  group: ReportGroup;
  outcome?: ReportOutcome;
}

/** A topic someone started, and what a reviewer decided in this session, if anything. */
export interface TopicItem {
  topic: PendingTopic;
  decision?: TopicDecision;
}

export interface ReviewQueue {
  reports: ReportItem[];
  topics: TopicItem[];
}

const REVIEW_QUEUE_KEY = ['reviewQueue'] as const;
/** Long enough that moving between pages does not reload it, short enough to pick up new reports. */
const REVIEW_QUEUE_STALE_MS = 60_000;

async function loadQueue(): Promise<ReviewQueue> {
  const [reports, topics] = await Promise.all([listOpenReports(), listPendingTopics()]);

  return {
    reports: groupReports(reports).map((group) => ({id: `${group.topic}/${group.verseKey}`, group})),
    topics: topics.map((topic) => ({topic})),
  };
}

/** How many decisions are still waiting. */
export function waitingCount({reports, topics}: ReviewQueue): number {
  return reports.filter(({outcome}) => !outcome).length + topics.filter(({decision}) => !decision).length;
}

/**
 * The open reports and pending topics, and the ways to decide on them. A decision stays in the list,
 * marked with its outcome, until the queue next loads. Loads nothing unless `enabled`.
 */
export function useReviewQueue(enabled: boolean) {
  const queryClient = useQueryClient();
  const uid = useAuthStore((state) => state.user?.uid);
  const queue = useQuery({queryKey: REVIEW_QUEUE_KEY, queryFn: loadQueue, enabled, staleTime: REVIEW_QUEUE_STALE_MS, retry: 4});

  function updateQueue(change: (current: ReviewQueue) => ReviewQueue) {
    queryClient.setQueryData<ReviewQueue>(REVIEW_QUEUE_KEY, (current) => current && change(current));
  }

  const resolve = useMutation({
    mutationFn: async ({item, outcome}: {item: ReportItem; outcome: ReportOutcome}) => {
      if (uid) {
        await resolveReports(uid, item.group, outcome);
      }
    },
    onSuccess: (_, {item, outcome}) => {
      updateQueue((current) => ({...current, reports: current.reports.map((report) => (report.id === item.id ? {...report, outcome} : report))}));
      void queryClient.invalidateQueries({queryKey: topicQueryKeys.forTopic(item.group.topic)});
    },
  });
  const decide = useMutation({
    mutationFn: async ({item, decision}: {item: TopicItem; decision: TopicDecision}) => {
      if (uid) {
        await decideTopic(uid, item.topic.slug, decision);
      }
    },
    onSuccess: (_, {item, decision}) => {
      updateQueue((current) => ({...current, topics: current.topics.map((topic) => (topic.topic.slug === item.topic.slug ? {...topic, decision} : topic))}));
      void queryClient.invalidateQueries({queryKey: topicQueryKeys.forTopic(item.topic.slug)});
      void queryClient.invalidateQueries({queryKey: topicNamesQuery.queryKey});
    },
  });

  return {
    queue: queue.data,
    isLoading: queue.isLoading,
    hasLoadError: queue.isError,
    reload: () => void queue.refetch(),
    /** The report or topic being decided on, by its `ReportItem` id or topic slug. */
    savingId: resolve.isPending ? resolve.variables.item.id : decide.isPending ? decide.variables.item.topic.slug : undefined,
    /** The report or topic whose decision last failed to save. */
    failedId: resolve.isError ? resolve.variables.item.id : decide.isError ? decide.variables.item.topic.slug : undefined,
    resolve: (item: ReportItem, outcome: ReportOutcome) => resolve.mutate({item, outcome}),
    decide: (item: TopicItem, decision: TopicDecision) => decide.mutate({item, decision}),
  };
}
