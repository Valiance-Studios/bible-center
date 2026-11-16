import type {StaffRole} from '@bible-center/core';
import type {StaffMember} from '@/firebase/people';

import {useState} from 'react';
import {isEmailAddress, normalizeEmail, parseStaffRole, ROLE_NAMES, STAFF_ROLES} from '@bible-center/core';
import {Alert, Button, NativeSelect, TextInput} from '@mantine/core';
import {AlreadyHasRoleError} from '@/firebase/people';
import classes from './People.module.scss';

interface GiveRoleFormProps {
  isSaving: boolean;
  /** Resolves once given, or rejects with `AlreadyHasRoleError` or a failure to save. */
  onGive: (member: StaffMember) => Promise<unknown>;
  /** Called with what happened, for the page to announce. */
  onGiven: (message: string) => void;
}

const ROLE_OPTIONS = STAFF_ROLES.map((role) => ({value: role, label: ROLE_NAMES[role]}));

/** Gives someone a role by email, whether or not they have signed in yet. */
export function GiveRoleForm({isSaving, onGive, onGiven}: GiveRoleFormProps) {
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<StaffRole>('reviewer');
  const [problem, setProblem] = useState<string | null>(null);

  async function give() {
    const normalized = normalizeEmail(email);

    if (!isEmailAddress(normalized)) {
      setProblem('Enter an email address, such as name@example.com.');

      return;
    }

    setProblem(null);

    try {
      await onGive({email: normalized, role});
      setEmail('');
      onGiven(`${normalized} is now ${ROLE_NAMES[role].toLowerCase()}.`);
    } catch (error) {
      setProblem(error instanceof AlreadyHasRoleError ? error.message : 'The role could not be given. Check your connection and try again.');
    }
  }

  return (
    <>
      <form
        className={classes.add}
        aria-label="Give a role"
        noValidate
        onSubmit={(event) => {
          event.preventDefault();
          void give();
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
        <NativeSelect size="md" label="Role" data={ROLE_OPTIONS} value={role} onChange={(event) => setRole(parseStaffRole(event.currentTarget.value))} />
        <Button type="submit" size="md" loading={isSaving}>Give role</Button>
      </form>
      {problem && <Alert color="red" mt="sm" role="alert">{problem}</Alert>}
      <p className={classes.addHint}>The role applies once they sign in with this email and it is verified. They do not need an account yet.</p>
    </>
  );
}
