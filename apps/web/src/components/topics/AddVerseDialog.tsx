import type {VerseReference} from '@bible-center/core';
import type {TranslationProvider} from '@/bible/translations';
import type {TopicSpan} from '@/firebase/topics';

import {useState} from 'react';
import {formatReference, parseReferences, topicVerseKey, verseIdIn} from '@bible-center/core';
import {Alert, Button, Group, Modal, Text, TextInput} from '@mantine/core';
import {usePassage} from '@/bible/usePassage';
import classes from './AddVerseDialog.module.scss';

interface AddVerseDialogProps {
  topicName: string;
  /** The keys of the verses already on the topic. */
  existingKeys: ReadonlySet<string>;
  /** The keys of the verses a reviewer took off the topic, which cannot be added back. */
  removedKeys: ReadonlySet<string>;
  translation: TranslationProvider;
  isSaving: boolean;
  /** Resolves once added, which closes the dialog, or rejects to show an error. */
  onAdd: (span: TopicSpan) => Promise<unknown>;
  onClose: () => void;
}

/** One reference, or null if the text is not exactly one. */
function parseOneReference(text: string): VerseReference | null {
  const references = text.trim() ? parseReferences(text) : null;

  return references?.length === 1 ? references[0] ?? null : null;
}

/** Adds a verse or passage to a topic, which counts as the person's upvote. */
export function AddVerseDialog({topicName, existingKeys, removedKeys, translation, isSaving, onAdd, onClose}: AddVerseDialogProps) {
  const [text, setText] = useState('');
  const [hasError, setHasError] = useState(false);
  const reference = parseOneReference(text);
  const passage = usePassage(reference, translation);
  const isLoaded = reference !== null && !passage.isPending && !passage.isError;
  const firstSection = passage.sections[0];
  const lastSection = passage.sections.at(-1);
  const firstVerse = firstSection?.verses[0]?.verse;
  const lastVerse = lastSection?.verses.at(-1)?.verse;
  // Every verse it names must exist, so "John 1:1-99" is not stored as a passage that runs past the chapter.
  const isWhole = isLoaded
    && firstVerse !== undefined && lastVerse !== undefined
    && (reference.startVerse === null || reference.startVerse === firstVerse)
    && (reference.endVerse === null || reference.endVerse === lastVerse);
  const span: TopicSpan | null = reference && isWhole && firstSection && lastSection
    ? {
        startVerse: verseIdIn({book: reference.book, chapter: firstSection.chapter}, firstVerse),
        endVerse: verseIdIn({book: reference.book, chapter: lastSection.chapter}, lastVerse),
      }
    : null;
  const title = reference ? formatReference(reference) : '';
  const spanKey = span ? topicVerseKey(span.startVerse, span.endVerse) : null;
  const isListed = spanKey !== null && existingKeys.has(spanKey);
  const isRemoved = spanKey !== null && removedKeys.has(spanKey);
  let problem: string | null = null;

  if (text.trim() && !reference) {
    problem = 'Enter one reference, such as Romans 12:15 or Psalm 23:1-4.';
  } else if (isLoaded && !isWhole) {
    problem = `There is no ${title} in the ${translation.name}.`;
  } else if (isListed) {
    problem = `${title} is already on this topic. Upvote it there instead.`;
  } else if (isRemoved) {
    problem = `A reviewer removed ${title} from this topic.`;
  }

  async function add() {
    if (!span) {
      return;
    }

    setHasError(false);

    try {
      await onAdd(span);
      onClose();
    } catch {
      setHasError(true);
    }
  }

  return (
    <Modal opened onClose={onClose} title={`Add a verse to ${topicName}`}>
      <form onSubmit={(event) => {
        event.preventDefault();
        void add();
      }}
      >
        <TextInput
          label="Verse or passage"
          placeholder="Romans 12:15"
          value={text}
          onChange={(event) => setText(event.currentTarget.value)}
          data-autofocus
        />

        {span && !isListed && !isRemoved && (
          <div className={classes.preview}>
            <span className={classes.reference}>{title}</span>
            <p className={classes.text}>{passage.text}</p>
          </div>
        )}

        {passage.isError && (
          <Text c="red" size="sm" mt="sm">The verse could not be loaded. Check your connection and try again.</Text>
        )}

        {problem && <p className={classes.problem}>{problem}</p>}

        <p className={classes.note}>Adding a verse counts as your upvote. It starts with 1, and others can upvote it from there.</p>

        {hasError && <Alert color="red" mt="md">It could not be added. Check your connection and try again.</Alert>}

        <Group justify="flex-end" mt="md">
          <Button variant="default" onClick={onClose} disabled={isSaving}>Cancel</Button>
          <Button type="submit" disabled={!span || isListed || isRemoved} loading={isSaving}>Add verse</Button>
        </Group>
      </form>
    </Modal>
  );
}
