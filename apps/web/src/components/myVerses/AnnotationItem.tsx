import type {Annotation, AnnotationType, VerseReference} from '@bible-center/core';
import type {TranslationProvider} from '@/bible/translations';

import {useState} from 'react';
import {useQuery} from '@tanstack/react-query';
import {Link} from 'react-router';
import {formatReference, spanContains, spanOf} from '@bible-center/core';
import {Button, Loader} from '@mantine/core';
import {chapterPath} from '@/bible/paths';
import {chapterQuery} from '@/bible/queries';
import {RemoveDialog} from './RemoveDialog';
import classes from './AnnotationItem.module.scss';

const TYPE_LABELS: Record<AnnotationType, string> = {highlight: 'Highlight', bookmark: 'Bookmark', note: 'Note'};

interface AnnotationItemProps {
  annotation: Annotation;
  reference: VerseReference;
  translation: TranslationProvider;
  isRemoving: boolean;
  /** Resolves once removed. Called after the person confirms. */
  onRemove: () => Promise<unknown>;
}

/** One highlight, bookmark or note on My verses, with its verses in the selected translation. */
export function AnnotationItem({annotation, reference, translation, isRemoving, onRemove}: AnnotationItemProps) {
  const chapter = {book: reference.book, chapter: reference.startChapter};
  const span = spanOf(annotation);
  const {data, isPending, isError, refetch} = useQuery(chapterQuery(translation, chapter));
  const text = (data?.verses ?? []).filter(({verse}) => spanContains(span, verse)).map(({text: verseText}) => verseText).join(' ');
  const title = formatReference(reference);
  const label = TYPE_LABELS[annotation.type].toLowerCase();
  const [isConfirming, setIsConfirming] = useState(false);

  return (
    <article className={classes.item}>
      <div className={classes.head}>
        <Link className={classes.reference} to={`${chapterPath(chapter)}#v${span.start}`}>{title}</Link>
        <span className={classes.kind}>{TYPE_LABELS[annotation.type]}</span>
      </div>

      {isPending && <Loader size="sm" mt={8} aria-label={`Loading ${title}`} />}

      {isError && (
        <p className={classes.missing}>
          {'The text could not be loaded. '}
          <Button variant="subtle" size="compact-sm" onClick={() => void refetch()}>Try again</Button>
        </p>
      )}

      {data && (text
        ? <p className={classes.text}>{annotation.type === 'highlight' ? <mark className={classes.highlight}>{text}</mark> : text}</p>
        : <p className={classes.missing}>{`The ${translation.name} has no verses at this reference.`}</p>)}

      {annotation.text && <p className={classes.note}>{annotation.text}</p>}

      <button
        type="button"
        className={classes.remove}
        aria-label={`Remove ${label} on ${title}`}
        onClick={() => setIsConfirming(true)}
      >
        {`Remove ${label}`}
      </button>

      {isConfirming && (
        <RemoveDialog label={label} title={title} isRemoving={isRemoving} onConfirm={onRemove} onClose={() => setIsConfirming(false)} />
      )}
    </article>
  );
}
