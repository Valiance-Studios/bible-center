import type {TopicDecision} from '@bible-center/core';
import type {TranslationProvider} from '@/bible/translations';
import type {TopicItem} from './useReviewQueue';

import {useQuery} from '@tanstack/react-query';
import {Link} from 'react-router';
import {formatReference, referenceOf, topicVerseKey} from '@bible-center/core';
import {Loader} from '@mantine/core';
import {referencePath} from '@/bible/paths';
import {topicQueryKeys} from '@/components/topics/topicQueryKeys';
import {listCommunityVerses} from '@/firebase/topics';
import {formatReviewDate} from './formatReviewDate';
import {ReviewActions} from './ReviewActions';
import {ReviewVerseText} from './ReviewVerseText';
import classes from './ReviewItem.module.scss';

interface PendingTopicItemProps {
  item: TopicItem;
  translation: TranslationProvider;
  isSaving: boolean;
  hasError: boolean;
  onDecide: (decision: TopicDecision) => void;
}

/** A topic someone started, with the verses on it so far, to approve or reject. */
export function PendingTopicItem({item: {topic, decision}, translation, isSaving, hasError, onDecide}: PendingTopicItemProps) {
  const verses = useQuery({queryKey: topicQueryKeys.verses(topic.slug), queryFn: () => listCommunityVerses(topic.slug), staleTime: 0, retry: 4});
  const shown = (verses.data ?? []).flatMap((verse) => {
    const reference = referenceOf(verse);

    return reference ? [{key: topicVerseKey(verse.startVerse, verse.endVerse), reference}] : [];
  });
  const count = verses.data ? `${shown.length} ${shown.length === 1 ? 'verse' : 'verses'}` : null;
  const outcome = decision === 'approved'
    ? 'Approved. It is now listed on the Topics page.'
    : decision === 'rejected' ? 'Rejected. Its page is hidden.' : null;

  return (
    <article className={classes.item} aria-label={topic.name}>
      <Link className={classes.topicName} to={`/topics/${topic.slug}`}>{topic.name}</Link>
      <p className={classes.meta}>{[`Started ${formatReviewDate(topic.createdAt)}`, count].filter(Boolean).join(' · ')}</p>

      {verses.isPending && <Loader size="sm" aria-label={`Loading the verses on ${topic.name}`} />}
      {verses.isError && <p className={classes.missing}>Its verses could not be loaded.</p>}

      <ul className={classes.verses}>
        {shown.map(({key, reference}) => (
          <li key={key}>
            <Link className={classes.reference} to={referencePath(reference)}>
              {formatReference(reference)}
            </Link>
            <ReviewVerseText reference={reference} translation={translation} />
          </li>
        ))}
      </ul>

      <ReviewActions
        choices={['Approve', 'Reject']}
        outcome={outcome}
        isSaving={isSaving}
        hasError={hasError}
        onMain={() => onDecide('approved')}
        onOther={() => onDecide('rejected')}
      />
    </article>
  );
}
