import type {ReportOutcome} from '@bible-center/core';
import type {TranslationProvider} from '@/bible/translations';
import type {ReportItem} from './useReviewQueue';

import {useQuery} from '@tanstack/react-query';
import {Link} from 'react-router';
import {formatReference, parseTopicVerseKey, referenceOf, REPORT_REASONS} from '@bible-center/core';
import {referencePath} from '@/bible/paths';
import {startedTopicQuery} from '@/components/topics/startedTopicQuery';
import {nameFromSlug, topicQuery} from '@/topics/topicData';
import {formatReviewDate} from './formatReviewDate';
import {ReviewActions} from './ReviewActions';
import {ReviewVerseText} from './ReviewVerseText';
import classes from './ReviewItem.module.scss';

interface ReportGroupItemProps {
  item: ReportItem;
  translation: TranslationProvider;
  isSaving: boolean;
  hasError: boolean;
  onResolve: (outcome: ReportOutcome) => void;
}

/** Every open report on one verse of one topic, to remove the verse from the topic or keep it. */
export function ReportGroupItem({item: {group, outcome}, translation, isSaving, hasError, onResolve}: ReportGroupItemProps) {
  // OpenBible's topics are named in their files, and the topics people start in Firestore.
  const {data: topicFile} = useQuery(topicQuery(group.topic));
  const {data: started} = useQuery({...startedTopicQuery(group.topic), enabled: topicFile === null});
  const topicName = topicFile?.name ?? started?.name ?? nameFromSlug(group.topic);
  const span = parseTopicVerseKey(group.verseKey);
  const reference = span ? referenceOf(span) : null;
  const title = reference ? formatReference(reference) : group.verseKey;
  const count = group.reports.length;
  const outcomeText = outcome === 'removed'
    ? `Removed from ${topicName}. Its reports are closed.`
    : outcome === 'kept' ? `Kept on ${topicName}. Its reports are closed.` : null;

  return (
    <article className={classes.item} aria-label={`${title} on ${topicName}`}>
      <div className={classes.head}>
        {reference
          ? <Link className={classes.reference} to={referencePath(reference)}>{title}</Link>
          : <span className={classes.reference}>{title}</span>}
        <span className={classes.onTopic}>
          {'on '}
          <Link to={`/topics/${group.topic}`}>{topicName}</Link>
        </span>
      </div>

      {reference && <ReviewVerseText reference={reference} translation={translation} />}

      <ul className={classes.reports} aria-label={count === 1 ? '1 report' : `${count} reports`}>
        {group.reports.map((report) => (
          <li key={report.id} className={classes.report}>
            <strong>{REPORT_REASONS[report.reason]}</strong>
            <span className={classes.when}>{` · ${formatReviewDate(report.createdAt)}`}</span>
            {report.details && <p className={classes.details}>{report.details}</p>}
          </li>
        ))}
      </ul>

      <ReviewActions
        choices={['Remove from topic', 'Keep it']}
        outcome={outcomeText}
        isSaving={isSaving}
        hasError={hasError}
        onMain={() => onResolve('removed')}
        onOther={() => onResolve('kept')}
      />
    </article>
  );
}
