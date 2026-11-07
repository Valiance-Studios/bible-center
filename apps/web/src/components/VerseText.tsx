import type {ReactNode} from 'react';

import classes from './VerseText.module.scss';

interface VerseTextProps {
  verse: number;
  text: string;
  id?: string;
  /** Outlines the verse, for a selection or the verse a link pointed to. */
  isMarked?: boolean;
  isHighlighted?: boolean;
  /** Shown just before the verse number, such as a bookmark. */
  marker?: ReactNode;
  /** Makes the verse selectable. The number is a real button, so this also works from a keyboard. */
  onSelect?: () => void;
  isSelected?: boolean;
}

/** One verse of Scripture with its number, as the reader and search results show it. */
export function VerseText({verse, text, id, isMarked = false, isHighlighted = false, marker, onSelect, isSelected}: VerseTextProps) {
  const paragraphClass = [isMarked ? classes.markedVerse : classes.verse, onSelect ? classes.selectable : ''].join(' ');

  return (
    <p id={id} className={paragraphClass} onClick={onSelect}>
      {marker}
      {onSelect
        ? (
            <button
              type="button"
              className={classes.numberButton}
              aria-label={`Select verse ${verse}`}
              aria-pressed={isSelected}
              onClick={(event) => {
                // The paragraph's own click would otherwise select it a second time.
                event.stopPropagation();
                onSelect();
              }}
            >
              {verse}
            </button>
          )
        : <sup className={classes.number}>{verse}</sup>}
      {isHighlighted ? <mark className={classes.highlight}>{text}</mark> : text}
    </p>
  );
}
