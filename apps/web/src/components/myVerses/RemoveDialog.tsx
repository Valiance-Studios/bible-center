import {useState} from 'react';
import {Alert, Button, Group, Modal, Text} from '@mantine/core';

interface RemoveDialogProps {
  /** What is being removed, in lowercase, such as "note". */
  label: string;
  /** The verses it is on, such as "John 1:1–3". */
  title: string;
  isRemoving: boolean;
  /** Resolves once removed, which closes the dialog, or rejects to show an error. */
  onConfirm: () => Promise<unknown>;
  onClose: () => void;
}

/** Asks before removing an annotation, since a removed note's words cannot be recovered. */
export function RemoveDialog({label, title, isRemoving, onConfirm, onClose}: RemoveDialogProps) {
  const [hasError, setHasError] = useState(false);

  async function confirm() {
    setHasError(false);

    try {
      await onConfirm();
      onClose();
    } catch {
      setHasError(true);
    }
  }

  return (
    <Modal opened onClose={onClose} title={`Remove ${label}?`}>
      <Text>{`This removes the ${label} on ${title}. It cannot be undone.`}</Text>
      {hasError && <Alert color="red" mt="md">It could not be removed. Check your connection and try again.</Alert>}
      <Group justify="flex-end" mt="md">
        <Button variant="default" onClick={onClose} disabled={isRemoving} data-autofocus>Cancel</Button>
        <Button color="red" onClick={() => void confirm()} loading={isRemoving}>{`Remove ${label}`}</Button>
      </Group>
    </Modal>
  );
}
