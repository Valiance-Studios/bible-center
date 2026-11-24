import {useState} from 'react';
import {Alert, Button, Checkbox, Group, Modal, Text} from '@mantine/core';
import {BlockAccountError} from '@/firebase/blocking';

interface BlockDialogProps {
  /** Names the account, such as "Block grace@example.com?". */
  title: string;
  /** What the account is, if more than the title says, such as when it joined. */
  about?: string;
  isBlocking: boolean;
  /** Resolves once blocked, which closes the dialog, or rejects to show why not. */
  onConfirm: (removeContent: boolean) => Promise<unknown>;
  onClose: () => void;
}

/** Asks before blocking an account, and whether to remove what it made public. */
export function BlockDialog({title, about, isBlocking, onConfirm, onClose}: BlockDialogProps) {
  const [removeContent, setRemoveContent] = useState(true);
  const [problem, setProblem] = useState<string | null>(null);

  async function confirm() {
    setProblem(null);

    try {
      await onConfirm(removeContent);
      onClose();
    } catch (error) {
      setProblem(
        error instanceof BlockAccountError
          ? error.message
          : 'The account could not be blocked. Check your connection and try again.',
      );
    }
  }

  return (
    <Modal opened onClose={onClose} title={title}>
      <Text>
        {[
          about,
          'It will still be able to read, but nothing it tries to save will be accepted. This takes effect at once.',
        ]
          .filter(Boolean)
          .join(' ')}
      </Text>
      <Checkbox
        mt="md"
        checked={removeContent}
        onChange={(event) => setRemoveContent(event.currentTarget.checked)}
        label="Also remove its upvotes, the verses it added, the topics it started and its reports"
      />
      {problem && (
        <Alert color="red" mt="md" role="alert">
          {problem}
        </Alert>
      )}
      <Group justify="flex-end" mt="md">
        <Button variant="default" onClick={onClose} disabled={isBlocking} data-autofocus>
          Cancel
        </Button>
        <Button color="red" onClick={() => void confirm()} loading={isBlocking}>
          Block
        </Button>
      </Group>
    </Modal>
  );
}
