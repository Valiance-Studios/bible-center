import type {TranslationProvider} from '@/bible/translations';
import type {TopicSpan} from '@/firebase/topics';

import {useState} from 'react';
import {topicVerseKey} from '@bible-center/core';
import {Alert, Button, Group, Modal, Text, TextInput} from '@mantine/core';
import {useReferenceSpan} from '@/bible/useReferenceSpan';
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

/** Adds a verse or passage to a topic, which counts as the person's upvote. */
export function AddVerseDialog({topicName, existingKeys, removedKeys, translation, isSaving, onAdd, onClose}: AddVerseDialogProps) {
  const [text, setText] = useState('');
  const [hasError, setHasError] = useState(false);
  const {span, title, passage, problem: referenceProblem} = useReferenceSpan(text, translation);
  const spanKey = span ? topicVerseKey(span.startVerse, span.endVerse) : null;
  const isListed = spanKey !== null && existingKeys.has(spanKey);
  const isRemoved = spanKey !== null && removedKeys.has(spanKey);
  let problem = referenceProblem;

  if (isListed) {
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
