import type {TranslationProvider} from '@/bible/translations';
import type {MemoryListEntry} from '@/firebase/memoryVerses';

import {Link} from 'react-router';
import {formatReference} from '@bible-center/core';
import {Button} from '@mantine/core';
import {memorizePath, referencePath} from '@/bible/paths';
import {useSpanText} from '@/bible/useSpanText';
import classes from './Memorize.module.scss';

const MS_PER_DAY = 86_400_000;
const relativeDays = new Intl.RelativeTimeFormat('en', {numeric: 'auto'});

/** "today", "yesterday" or "9 days ago", counting calendar days where the viewer is. */
export function daysAgo(date: Date, now: Date): string {
  const startOfDay = (day: Date) => new Date(day.getFullYear(), day.getMonth(), day.getDate()).getTime();

  return relativeDays.format(-Math.round((startOfDay(now) - startOfDay(date)) / MS_PER_DAY), 'day');
}

interface MemoryListEntryItemProps {
  entry: MemoryListEntry;
  translation: TranslationProvider;
  now: Date;
  isSaving: boolean;
  onRemove: () => void;
}

/** One verse on the memory list, with its first words, when it was practiced, and ways to practice or remove it. */
export function MemoryListEntryItem({entry, translation, now, isSaving, onRemove}: MemoryListEntryItemProps) {
  const {reference, passage} = useSpanText(entry, translation);

  if (!reference) {
    return null;
  }

  const name = formatReference(reference);
  const practiced = `practiced ${daysAgo(entry.practicedAt, now)}`;

  return (
    <div className={classes.entry}>
      <div className={classes.entryMain}>
        <Link className={classes.entryReference} to={referencePath(reference)}>{name}</Link>
        <p className={classes.entryText}>{passage.isPending ? ' ' : passage.text}</p>
        <p className={classes.entryWhen}>{entry.status === 'memorized' ? `Memorized, ${practiced}` : `Learning, ${practiced}`}</p>
      </div>
      <Button component={Link} to={memorizePath(reference)} variant="outline" radius="xl" aria-label={`Practice ${name}`}>Practice</Button>
      <button type="button" className={classes.remove} disabled={isSaving} aria-label={`Remove ${name} from my memory list`} onClick={onRemove}>
        Remove
      </button>
    </div>
  );
}
