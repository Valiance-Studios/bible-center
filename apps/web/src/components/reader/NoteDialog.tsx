import {useState} from 'react';
import {NOTE_MAX_LENGTH} from '@bible-center/core';
import {Button, Group, Modal, Textarea} from '@mantine/core';

interface NoteDialogProps {
  /** The verses the note is on, as a heading. */
  title: string;
  initialText: string;
  isExisting: boolean;
  isSaving: boolean;
  onSave: (text: string) => void;
  onDelete: () => void;
  onClose: () => void;
}

/** Adds or edits a note. Mounted only while open, so it always starts from the note's current words. */
export function NoteDialog({title, initialText, isExisting, isSaving, onSave, onDelete, onClose}: NoteDialogProps) {
  const [text, setText] = useState(initialText);
  const trimmed = text.trim();

  return (
    <Modal opened onClose={onClose} title={title}>
      <Textarea
        label="Note"
        autosize
        minRows={4}
        maxRows={12}
        maxLength={NOTE_MAX_LENGTH}
        description={`Up to ${NOTE_MAX_LENGTH.toLocaleString('en-US')} characters.`}
        value={text}
        onChange={(event) => setText(event.currentTarget.value)}
        data-autofocus
      />
      <Group justify="flex-end" mt="md">
        {isExisting && <Button variant="subtle" color="red" onClick={onDelete} disabled={isSaving}>Delete note</Button>}
        <Button variant="default" onClick={onClose}>Cancel</Button>
        <Button onClick={() => onSave(trimmed)} disabled={!trimmed} loading={isSaving}>Save note</Button>
      </Group>
    </Modal>
  );
}
