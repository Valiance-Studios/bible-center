import {getStartedTopic} from '@/firebase/topics';
import {topicQueryKeys} from './topicQueryKeys';

/** A topic someone started, with its name and review status, or null if nobody has. */
export function startedTopicQuery(slug: string) {
  return {
    queryKey: topicQueryKeys.started(slug),
    queryFn: () => getStartedTopic(slug),
  };
}
