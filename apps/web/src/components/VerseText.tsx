import classes from './VerseText.module.scss';

interface VerseTextProps {
  verse: number;
  text: string;
  /** Marks the verse someone followed a link to. */
  isTarget?: boolean;
  id?: string;
}

/** One verse of Scripture with its number, as the reader and search results show it. */
export function VerseText({verse, text, isTarget = false, id}: VerseTextProps) {
  return (
    <p id={id} className={isTarget ? classes.targetVerse : classes.verse}>
      <sup className={classes.number}>{verse}</sup>
      {text}
    </p>
  );
}
