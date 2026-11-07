import type {Role} from '@bible-center/core';
import type {Person} from '@/firebase/people';

import {useState} from 'react';
import {isEmailAddress, normalizeEmail, parseRole, ROLE_NAMES, ROLES} from '@bible-center/core';
import {Alert, Button, NativeSelect, TextInput} from '@mantine/core';
import {AlreadyAllowedError} from '@/firebase/people';
import classes from './People.module.scss';

interface AddPersonFormProps {
  isSaving: boolean;
  /** Resolves once added, or rejects with `AlreadyAllowedError` or a failure to save. */
  onAdd: (person: Person) => Promise<unknown>;
  /** Called with what happened, for the page to announce. */
  onAdded: (message: string) => void;
}

const ROLE_OPTIONS = ROLES.map((role) => ({value: role, label: ROLE_NAMES[role]}));

/** Puts someone on the allowlist with a role. */
export function AddPersonForm({isSaving, onAdd, onAdded}: AddPersonFormProps) {
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<Role>('member');
  const [problem, setProblem] = useState<string | null>(null);

  async function add() {
    const normalized = normalizeEmail(email);

    if (!isEmailAddress(normalized)) {
      setProblem('Enter an email address, such as name@example.com.');

      return;
    }

    setProblem(null);

    try {
      await onAdd({email: normalized, role});
      setEmail('');
      onAdded(`Added ${normalized} as ${ROLE_NAMES[role].toLowerCase()}.`);
    } catch (error) {
      setProblem(error instanceof AlreadyAllowedError ? error.message : 'They could not be added. Check your connection and try again.');
    }
  }

  return (
    <>
      <form
        className={classes.add}
        noValidate
        onSubmit={(event) => {
          event.preventDefault();
          void add();
        }}
      >
        <TextInput
          size="md"
          type="email"
          label="Email"
          autoComplete="off"
          value={email}
          onChange={(event) => {
            setEmail(event.currentTarget.value);
            setProblem(null);
          }}
        />
        <NativeSelect size="md" label="Role" data={ROLE_OPTIONS} value={role} onChange={(event) => setRole(parseRole(event.currentTarget.value))} />
        <Button type="submit" size="md" loading={isSaving}>Add person</Button>
      </form>
      {problem && <Alert color="red" mt="sm" role="alert">{problem}</Alert>}
      <p className={classes.addHint}>They sign in with Google or register with this email. It must be verified before anything works.</p>
    </>
  );
}
