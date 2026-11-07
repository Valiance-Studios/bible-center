import type {Person} from '@/firebase/people';

import {useState} from 'react';
import {isAdmin, normalizeEmail, parseRole, ROLE_NAMES, ROLES} from '@bible-center/core';
import {Alert, Button, Loader, NativeSelect} from '@mantine/core';
import {AddPersonForm} from '@/components/people/AddPersonForm';
import {RemovePersonDialog} from '@/components/people/RemovePersonDialog';
import {usePeople} from '@/components/people/usePeople';
import {RoleGate} from '@/components/RoleGate';
import {useAuthStore} from '@/stores/auth';
import pageClasses from './AdminPage.module.scss';
import classes from '@/components/people/People.module.scss';

const ROLE_OPTIONS = ROLES.map((role) => ({value: role, label: ROLE_NAMES[role]}));

/** You first, then everyone else alphabetically. */
function sortPeople(people: readonly Person[], myEmail: string): Person[] {
  return [...people].sort((a, b) => Number(b.email === myEmail) - Number(a.email === myEmail) || a.email.localeCompare(b.email));
}

function PeopleList({uid}: {uid: string}) {
  const myEmail = normalizeEmail(useAuthStore((state) => state.user?.email) ?? '');
  const people = usePeople(uid);
  const [status, setStatus] = useState<string | null>(null);
  const [removing, setRemoving] = useState<string | null>(null);

  async function changeRole(person: Person) {
    setStatus(null);

    try {
      await people.setRole(person);
      setStatus(`${person.email} is now ${ROLE_NAMES[person.role].toLowerCase()}.`);
    } catch {
      setStatus(`The role for ${person.email} could not be changed. Check your connection and try again.`);
    }
  }

  return (
    <>
      <AddPersonForm isSaving={people.isSaving} onAdd={people.add} onAdded={setStatus} />

      {people.hasLoadError && (
        <Alert color="red" title="Could not load the people who can sign in">
          <p className={pageClasses.alertText}>Check your connection and try again.</p>
          <Button onClick={people.reload}>Try again</Button>
        </Alert>
      )}

      {people.isLoading && <Loader aria-label="Loading people" />}

      {people.people && (
        <>
          <p className={classes.count}>{people.people.length === 1 ? '1 person' : `${people.people.length} people`}</p>
          {sortPeople(people.people, myEmail).map((person) => {
            const isMe = person.email === myEmail;

            return (
              <div key={person.email} className={classes.person}>
                <div>
                  <div className={classes.email}>{person.email}</div>
                  {isMe && <div className={classes.you}>You</div>}
                </div>
                {isMe
                  ? <span className={classes.fixedRole}>{ROLE_NAMES[person.role]}</span>
                  : (
                      <NativeSelect
                        className={classes.roleSelect}
                        size="md"
                        aria-label={`Role for ${person.email}`}
                        data={ROLE_OPTIONS}
                        value={person.role}
                        disabled={people.isSaving}
                        onChange={(event) => void changeRole({email: person.email, role: parseRole(event.currentTarget.value)})}
                      />
                    )}
                {!isMe && (
                  <button type="button" className={classes.remove} aria-label={`Remove ${person.email}`} onClick={() => setRemoving(person.email)}>
                    Remove
                  </button>
                )}
              </div>
            );
          })}
        </>
      )}

      {status && <p className={classes.status} role="status">{status}</p>}

      {removing && (
        <RemovePersonDialog
          email={removing}
          isRemoving={people.isSaving}
          onConfirm={async () => {
            await people.remove(removing);
            setStatus(`Removed ${removing}.`);
          }}
          onClose={() => setRemoving(null)}
        />
      )}
    </>
  );
}

/** Where admins manage who can sign in, and what each person can do. */
export function PeoplePage() {
  return (
    <main className={pageClasses.content}>
      <title>People | Bible Center</title>
      <h1 className={pageClasses.title}>People</h1>
      <p className={pageClasses.intro}>Everyone who can sign in while Bible Center is invite-only, and what they can do.</p>
      <ul className={classes.roles}>
        <li>
          <strong>Members</strong>
          {' '}
          can highlight, take notes and vote.
        </li>
        <li>
          <strong>Reviewers</strong>
          {' '}
          can also handle reports and new topics.
        </li>
        <li>
          <strong>Admins</strong>
          {' '}
          can also manage people.
        </li>
      </ul>
      <RoleGate canSee={isAdmin} audience="admins">{(uid) => <PeopleList uid={uid} />}</RoleGate>
    </main>
  );
}
