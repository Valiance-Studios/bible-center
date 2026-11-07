import type {AnnotationOrder, AnnotationType} from '@bible-center/core';

import {Link, useSearchParams} from 'react-router';
import {referenceOf} from '@bible-center/core';
import {Alert, Button, Loader, NativeSelect} from '@mantine/core';
import {useMediaQuery} from '@mantine/hooks';
import {findTranslation} from '@/bible/translations';
import {AnnotationItem} from '@/components/myVerses/AnnotationItem';
import {useAnnotationPages} from '@/components/myVerses/useAnnotationPages';
import {TranslationSelect} from '@/components/TranslationSelect';
import {useAuthStore} from '@/stores/auth';
import {useTranslationStore} from '@/stores/translation';
import classes from './MyVersesPage.module.scss';

type Filter = 'all' | AnnotationType;

const FILTERS: readonly {value: Filter; label: string}[] = [
  {value: 'all', label: 'All'},
  {value: 'highlight', label: 'Highlights'},
  {value: 'bookmark', label: 'Bookmarks'},
  {value: 'note', label: 'Notes'},
];

const ORDERS: readonly {value: AnnotationOrder; label: string}[] = [
  {value: 'recent', label: 'Recently added'},
  {value: 'bible', label: 'Bible order'},
];

/** The URL keeps the filter and order, so they survive opening a verse and coming back. */
const DEFAULT_FILTER: Filter = 'all';
const DEFAULT_ORDER: AnnotationOrder = 'recent';

/** Below this width, the order and translation pickers sit side by side and the full translation names do not fit. */
const COMPACT_PICKERS_QUERY = '(max-width: 520px)';

function parseFilter(value: string | null): Filter {
  return FILTERS.find((filter) => filter.value === value)?.value ?? DEFAULT_FILTER;
}

function parseOrder(value: string | null): AnnotationOrder {
  return ORDERS.find((order) => order.value === value)?.value ?? DEFAULT_ORDER;
}

function NothingSaved() {
  return (
    <>
      <p className={classes.body}>Verses you highlight, bookmark or add notes to will appear here. To start, open a chapter and select a verse.</p>
      <Button component={Link} to="/read" radius="xl" size="md">Read the Bible</Button>
    </>
  );
}

function SavedVerses({uid}: {uid: string}) {
  const [searchParams, setSearchParams] = useSearchParams();
  const translation = findTranslation(useTranslationStore((state) => state.translationId));
  const isCompact = useMediaQuery(COMPACT_PICKERS_QUERY, false, {getInitialValueInEffect: false});
  const filter = parseFilter(searchParams.get('show'));
  const order = parseOrder(searchParams.get('order'));
  const pages = useAnnotationPages(uid, filter === 'all' ? null : filter, order);

  function setParam(name: string, value: string, defaultValue: string) {
    const next = new URLSearchParams(searchParams);

    if (value === defaultValue) {
      next.delete(name);
    } else {
      next.set(name, value);
    }

    setSearchParams(next, {replace: true});
  }

  if (pages.hasLoadError) {
    return (
      <Alert color="red" title="Could not load your verses">
        <p className={classes.alertText}>Check your connection and try again.</p>
        <Button onClick={pages.reload}>Try again</Button>
      </Alert>
    );
  }

  // With every type shown and nothing loaded, the person has saved nothing at all.
  if (filter === 'all' && !pages.isLoading && pages.annotations.length === 0) {
    return <NothingSaved />;
  }

  const shown = pages.annotations
    .flatMap((annotation) => {
      const reference = referenceOf(annotation);

      // The rules only accept well-formed verse ids, so this only skips data written some other way.
      return reference ? [{annotation, reference}] : [];
    });
  const filterLabel = FILTERS.find(({value}) => value === filter)?.label ?? '';

  return (
    <>
      <div className={classes.toolbar}>
        <div className={classes.filters} role="group" aria-label="Show">
          {FILTERS.map(({value, label}) => (
            <button
              key={value}
              type="button"
              className={value === filter ? classes.filterOn : classes.filter}
              aria-pressed={value === filter}
              onClick={() => setParam('show', value, DEFAULT_FILTER)}
            >
              {label}
            </button>
          ))}
        </div>
        <div className={classes.selects}>
          <NativeSelect
            size="md"
            aria-label="Order"
            value={order}
            data={ORDERS.map(({value, label}) => ({value, label}))}
            onChange={(event) => setParam('order', event.currentTarget.value, DEFAULT_ORDER)}
          />
          <TranslationSelect isCompact={isCompact} />
        </div>
      </div>

      {pages.isLoading && <Loader className={classes.loader} aria-label="Loading your verses" />}

      {!pages.isLoading && shown.length === 0 && <p className={classes.none}>{`You have no ${filterLabel.toLowerCase()} yet.`}</p>}

      {shown.map(({annotation, reference}) => (
        <AnnotationItem
          key={annotation.id}
          annotation={annotation}
          reference={reference}
          translation={translation}
          isRemoving={pages.isRemoving}
          onRemove={() => pages.remove(annotation.id)}
        />
      ))}

      {pages.hasMoreError && <Alert color="red" mt="md">More verses could not be loaded. Check your connection and try again.</Alert>}

      {pages.hasMore && (
        <Button className={classes.more} variant="outline" radius="xl" size="md" loading={pages.isLoadingMore} onClick={pages.loadMore}>
          Show more
        </Button>
      )}

      {shown.length > 0 && <p className={classes.credit}>{translation.credit}</p>}
    </>
  );
}

/** Everything a signed-in user has highlighted, bookmarked or added notes to. */
export function MyVersesPage() {
  const status = useAuthStore((state) => state.status);
  const user = useAuthStore((state) => state.user);

  return (
    <main className={classes.content}>
      <title>My verses | Bible Center</title>
      <h1 className={classes.title}>My verses</h1>

      {status === 'loading' && <Loader className={classes.loader} aria-label="Loading" />}

      {status === 'signedOut' && (
        <>
          <p className={classes.body}>Sign in to see the verses you highlight, bookmark and add notes to.</p>
          <Button component={Link} to="/sign-in" radius="xl" size="md">Sign in</Button>
        </>
      )}

      {status !== 'loading' && status !== 'signedOut' && status !== 'allowed' && (
        <>
          <p className={classes.body}>Your account cannot save verses yet.</p>
          <Button component={Link} to="/sign-in" radius="xl" size="md">Account status</Button>
        </>
      )}

      {status === 'allowed' && user && <SavedVerses uid={user.uid} />}
    </main>
  );
}
