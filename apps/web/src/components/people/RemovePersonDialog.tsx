import {useState} from 'react';
import {Alert, Button, Group, Modal, Text} from '@mantine/core';

interface RemovePersonDialogProps {
  email: string;
  isRemoving: boolean;
  /** Resolves once removed, which closes the dialog, or rejects to show an error. */
  onConfirm: () => Promise<unknown>;
  onClose: () => void;
}

/** Asks before taking someone off the allowlist. */
export function RemovePersonDialog({email, isRemoving, onConfirm, onClose}: RemovePersonDialogProps) {
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
    <Modal opened onClose={onClose} title={`Remove ${email}?`}>
      <Text>They will no longer be able to sign in. Their highlights, notes and votes are kept, and come back if they are added again.</Text>
      {hasError && <Alert color="red" mt="md">They could not be removed. Check your connection and try again.</Alert>}
      <Group justify="flex-end" mt="md">
        <Button variant="default" onClick={onClose} disabled={isRemoving} data-autofocus>Cancel</Button>
        <Button color="red" onClick={() => void confirm()} loading={isRemoving}>Remove</Button>
      </Group>
    </Modal>
  );
}
