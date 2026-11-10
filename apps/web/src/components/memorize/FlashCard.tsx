import type {PassageSection} from '@/bible/usePassage';

import {useState} from 'react';
import {Button, Group} from '@mantine/core';
import classes from './Memorize.module.scss';

interface FlashCardProps {
  /** The reference on the front, such as "Psalm 23:1–2". */
  title: string;
  /** The reference with its translation, beneath the verse, such as "Psalm 23:1–2, BSB". */
  label: string;
  sections: PassageSection[];
  /** Called each time the person says whether they knew it. */
  onAnswer: (knewIt: boolean) => void;
}

/** Shows the reference, then the verse when turned over, and asks whether the person knew it. */
export function FlashCard({title, label, sections, onAnswer}: FlashCardProps) {
  const [isTurned, setIsTurned] = useState(false);
  const [tally, setTally] = useState({knew: 0, tries: 0});

  function answer(knewIt: boolean) {
    setIsTurned(false);
    setTally(({knew, tries}) => ({knew: knew + Number(knewIt), tries: tries + 1}));
    onAnswer(knewIt);
  }

  return (
    <>
      <section className={classes.card} aria-live="polite" aria-label="Flash card">
        {isTurned
          ? (
              <>
                <p className={classes.cardText}>
                  {sections.flatMap(({chapter, verses}) => verses.map(({verse, text}) => (
                    <span key={`${chapter}:${verse}`}>
                      <sup>{verse}</sup>
                      {`${text} `}
                    </span>
                  )))}
                </p>
                <p className={classes.cardLabel}>{label}</p>
              </>
            )
          : (
              <>
                <p className={classes.cardTitle}>{title}</p>
                <p className={classes.cardHint}>Say the verse to yourself, then turn the card over to check.</p>
              </>
            )}
      </section>

      {isTurned
        ? (
            <div className={classes.check}>
              <p>Did you have it?</p>
              <Group justify="center" gap="sm">
                <Button variant="outline" radius="xl" size="md" onClick={() => answer(false)}>Not yet</Button>
                <Button radius="xl" size="md" onClick={() => answer(true)}>I knew it</Button>
              </Group>
            </div>
          )
        : (
            <Group justify="center" mt="lg">
              <Button radius="xl" size="md" onClick={() => setIsTurned(true)} data-autofocus>Show the verse</Button>
            </Group>
          )}

      <p className={classes.tally} role="status">
        {tally.tries > 0 && `You knew it ${tally.knew} of ${tally.tries} ${tally.tries === 1 ? 'time' : 'times'} this session.`}
      </p>
    </>
  );
}
