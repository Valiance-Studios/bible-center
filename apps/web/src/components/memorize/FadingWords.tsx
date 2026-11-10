import {useState} from 'react';
import {FADING_STEP_COUNT, fadeWords} from '@bible-center/core';
import {Button, Group} from '@mantine/core';
import classes from './Memorize.module.scss';

interface FadingWordsProps {
  /** The passage as one paragraph. */
  text: string;
  /** The reference with its translation, such as "Psalm 23:1–2, BSB". */
  label: string;
  /** Called on reaching the last step, with every word hidden. */
  onFinish: () => void;
}

const STEP_NOTES = [
  'Every word is showing.',
  'One word in three is hidden.',
  'Two words in three are hidden.',
  'Only first letters remain.',
  'Every word is hidden.',
];

/** Hides more of the passage at each step, until the person can say it all. A hidden word can be shown on its own. */
export function FadingWords({text, label, onFinish}: FadingWordsProps) {
  const [step, setStep] = useState(0);
  const [revealed, setRevealed] = useState<ReadonlySet<number>>(new Set());
  const lastStep = FADING_STEP_COUNT - 1;
  const words = fadeWords(text, step);

  function goTo(next: number) {
    setStep(next);
    setRevealed(new Set());

    if (next === lastStep) {
      onFinish();
    }
  }

  return (
    <>
      <p className={classes.step}>
        <strong>{step === 0 ? `Step 1 of ${FADING_STEP_COUNT}: read it through` : `Step ${step + 1} of ${FADING_STEP_COUNT}`}</strong>
        {' '}
        <span>{STEP_NOTES[step]}</span>
      </p>
      <div className={classes.dots} aria-hidden="true">
        {STEP_NOTES.map((note, index) => <span key={note} className={index <= step ? classes.dotDone : classes.dot} />)}
      </div>

      <section className={classes.fadingCard} aria-label={`${label}, with some words hidden`}>
        <p className={classes.words}>
          {words.map(({before, word, after, isHidden, hint}, index) => {
            const isShown = !isHidden || revealed.has(index);

            return (
              // The words never reorder, so their places identify them.
              <span key={index} className={classes.word}>
                {before}
                {isShown
                  ? word
                  : (
                      <button
                        type="button"
                        className={classes.blank}
                        style={{width: `${word.length * 0.5 + 0.4}em`}}
                        aria-label={`Show hidden word ${index + 1}`}
                        onClick={() => setRevealed(new Set([...revealed, index]))}
                      >
                        {hint}
                      </button>
                    )}
                {after}
              </span>
            );
          })}
        </p>
        <p className={classes.cardLabel}>{label}</p>
      </section>

      <Group gap="sm" mt="lg">
        <Button variant="outline" radius="xl" size="md" disabled={step === 0} onClick={() => goTo(step - 1)}>Show more words</Button>
        <Button radius="xl" size="md" disabled={step === lastStep} onClick={() => goTo(step + 1)}>Hide more words</Button>
        <Button variant="outline" radius="xl" size="md" onClick={() => goTo(0)}>Start again</Button>
      </Group>
      <p className={classes.tip}>Say the whole passage aloud at each step. Select a blank to see that word.</p>

      {step === lastStep && (
        <div className={classes.finished} role="status">
          <p>Every word is hidden. If you said it all without peeking, you may know it by heart.</p>
        </div>
      )}
    </>
  );
}
