import type {VerseReference} from '@bible-center/core';
import type {TranslationProvider} from '@/bible/translations';

import {formatReference} from '@bible-center/core';
import {Button, Loader} from '@mantine/core';
import {usePassage} from '@/bible/usePassage';
import classes from './ReviewItem.module.scss';

interface ReviewVerseTextProps {
  reference: VerseReference;
  translation: TranslationProvider;
}

/** A verse or passage's text, for a reviewer to judge. */
export function ReviewVerseText({reference, translation}: ReviewVerseTextProps) {
  const {text, isPending, isError, retry} = usePassage(reference, translation);

  if (isPending) {
    return <Loader size="sm" mt={8} aria-label={`Loading ${formatReference(reference)}`} />;
  }

  if (isError) {
    return (
      <p className={classes.missing}>
        {'The text could not be loaded. '}
        <Button variant="subtle" size="compact-sm" onClick={retry}>Try again</Button>
      </p>
    );
  }

  return text
    ? <p className={classes.text}>{text}</p>
    : <p className={classes.missing}>{`The ${translation.name} has no verses at this reference.`}</p>;
}
