import {useState} from 'react';
import {useNavigate} from 'react-router';
import {Alert, Button, Group, Modal, Text, TextInput} from '@mantine/core';
import {deleteOwnAccount} from '@/firebase/account';
import {useAuthStore} from '@/stores/auth';
import classes from './DeleteAccountDialog.module.scss';

/** What the person types to confirm, so a slip of the hand cannot delete an account. */
const CONFIRMATION = 'delete';

/** The state the home page reads to say the account was deleted. */
export interface AccountDeletedState {
  accountDeleted: true;
}

interface DeleteAccountDialogProps {
  opened: boolean;
  onClose: () => void;
}

/** Deletes the signed-in account, after listing what goes and what stays and having the person type "delete". */
export function DeleteAccountDialog({opened, onClose}: DeleteAccountDialogProps) {
  const email = useAuthStore((state) => state.user?.email);
  const signOut = useAuthStore((state) => state.signOut);
  const navigate = useNavigate();
  const [typed, setTyped] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [hasError, setHasError] = useState(false);

  function close() {
    setTyped('');
    setHasError(false);
    onClose();
  }

  async function confirm() {
    setIsDeleting(true);
    setHasError(false);

    try {
      await deleteOwnAccount();
      await signOut();
      close();
      void navigate('/', {state: {accountDeleted: true} satisfies AccountDeletedState});
    } catch {
      setHasError(true);
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <Modal opened={opened} onClose={close} title="Delete your account?">
      <Text>This removes, for good:</Text>
      <ul className={classes.list}>
        <li>{email ? `your account, ${email}` : 'your account'}</li>
        <li>your highlights, bookmarks and notes</li>
        <li>your memory list and saved translation</li>
        <li>your upvotes and your reports</li>
      </ul>
      <Text>Verses you added to topics, and topics you started, stay for others, with nothing linking them to you. This cannot be undone.</Text>
      <TextInput
        mt="md"
        size="md"
        label={`Type ${CONFIRMATION} to confirm`}
        autoComplete="off"
        value={typed}
        onChange={(event) => setTyped(event.currentTarget.value)}
        data-autofocus
      />
      {hasError && <Alert color="red" mt="md" role="alert">Your account could not be deleted. Check your connection and try again.</Alert>}
      <Group justify="flex-end" mt="md">
        <Button variant="default" onClick={close} disabled={isDeleting}>Cancel</Button>
        <Button color="red" disabled={typed.trim().toLowerCase() !== CONFIRMATION} loading={isDeleting} onClick={() => void confirm()}>Delete account</Button>
      </Group>
    </Modal>
  );
}
