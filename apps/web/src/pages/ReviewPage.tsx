import type {FilterOption} from '@/components/FilterButtons';
import type {ReviewQueue} from '@/components/review/useReviewQueue';

import {useSearchParams} from 'react-router';
import {canReview} from '@bible-center/core';
import {Alert, Button, Loader} from '@mantine/core';
import {findTranslation} from '@/bible/translations';
import {FilterButtons} from '@/components/FilterButtons';
import {PendingTopicItem} from '@/components/review/PendingTopicItem';
import {ReportGroupItem} from '@/components/review/ReportGroupItem';
import {useReviewQueue} from '@/components/review/useReviewQueue';
import {RoleGate} from '@/components/RoleGate';
import {useTranslationStore} from '@/stores/translation';
import classes from './AdminPage.module.scss';

type Tab = 'reports' | 'topics';

function tabsFor({reports, topics}: ReviewQueue): FilterOption<Tab>[] {
  return [
    {value: 'reports', label: `Reports (${reports.filter(({outcome}) => !outcome).length})`},
    {value: 'topics', label: `New topics (${topics.filter(({decision}) => !decision).length})`},
  ];
}

function Queue() {
  const [searchParams, setSearchParams] = useSearchParams();
  const tab: Tab = searchParams.get('show') === 'topics' ? 'topics' : 'reports';
  const translation = findTranslation(useTranslationStore((state) => state.translationId));
  const review = useReviewQueue(true);
  const {queue} = review;

  if (review.hasLoadError) {
    return (
      <Alert color="red" title="Could not load what is waiting for review">
        <p className={classes.alertText}>Check your connection and try again.</p>
        <Button onClick={review.reload}>Try again</Button>
      </Alert>
    );
  }

  if (review.isLoading || !queue) {
    return <Loader aria-label="Loading what is waiting for review" />;
  }

  if (queue.reports.length === 0 && queue.topics.length === 0) {
    return (
      <section className={classes.empty}>
        <h2>Nothing to review</h2>
        <p>New reports and topics will appear here.</p>
      </section>
    );
  }

  return (
    <>
      <FilterButtons
        className={classes.tabs}
        label="Show"
        options={tabsFor(queue)}
        value={tab}
        onChange={(value) => setSearchParams(value === 'reports' ? {} : {show: value}, {replace: true})}
      />

      {tab === 'reports' && (
        <>
          {queue.reports.length === 0 && <p className={classes.none}>No reports are waiting.</p>}
          {queue.reports.map((item) => (
            <ReportGroupItem
              key={item.id}
              item={item}
              translation={translation}
              isSaving={review.savingId === item.id}
              hasError={review.failedId === item.id}
              onResolve={(outcome) => review.resolve(item, outcome)}
            />
          ))}
          {queue.reports.length > 0 && (
            <p className={classes.hint}>
              Removing a verse takes it off that topic for everyone, including verses that came from OpenBible.
              Keeping it closes its reports. Either way, every report on that verse and topic is closed.
            </p>
          )}
        </>
      )}

      {tab === 'topics' && (
        <>
          {queue.topics.length === 0 && <p className={classes.none}>No new topics are waiting.</p>}
          {queue.topics.map((item) => (
            <PendingTopicItem
              key={item.topic.slug}
              item={item}
              translation={translation}
              isSaving={review.savingId === item.topic.slug}
              hasError={review.failedId === item.topic.slug}
              onDecide={(decision) => review.decide(item, decision)}
            />
          ))}
          {queue.topics.length > 0 && (
            <p className={classes.hint}>
              Approving lists a topic on the Topics page and links it from search. Rejecting hides its page, and nobody can add verses to it.
            </p>
          )}
        </>
      )}
    </>
  );
}

/** Where reviewers decide on reported verses and the topics people start. */
export function ReviewPage() {
  return (
    <main className={classes.content}>
      <title>Review | Bible Center</title>
      <h1 className={classes.title}>Review</h1>
      <p className={classes.intro}>Reports and topics people have started wait here until a reviewer decides on them.</p>
      <RoleGate canSee={canReview} audience="reviewers">{() => <Queue />}</RoleGate>
    </main>
  );
}
