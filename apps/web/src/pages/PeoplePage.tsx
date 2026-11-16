import type {StaffMember} from '@/firebase/people';

import {useState} from 'react';
import {isAdmin, normalizeEmail, parseStaffRole, ROLE_NAMES, STAFF_ROLES} from '@bible-center/core';
import {Alert, Button, Loader, NativeSelect} from '@mantine/core';
import {BlockedAccounts} from '@/components/people/BlockedAccounts';
import {GiveRoleForm} from '@/components/people/GiveRoleForm';
import {usePeople} from '@/components/people/usePeople';
import {RoleGate} from '@/components/RoleGate';
import {useAuthStore} from '@/stores/auth';
import pageClasses from './AdminPage.module.scss';
import classes from '@/components/people/People.module.scss';

const ROLE_OPTIONS = STAFF_ROLES.map((role) => ({value: role, label: ROLE_NAMES[role]}));

/** You first, then everyone else alphabetically. */
function sortStaff(staff: readonly StaffMember[], myEmail: string): StaffMember[] {
  return [...staff].sort((a, b) => Number(b.email === myEmail) - Number(a.email === myEmail) || a.email.localeCompare(b.email));
}

function StaffList({uid, myEmail}: {uid: string; myEmail: string}) {
  const people = usePeople(uid);
  const [status, setStatus] = useState<string | null>(null);

  async function save(change: () => Promise<unknown>, done: string, failed: string) {
    setStatus(null);

    try {
      await change();
      setStatus(done);
    } catch {
      setStatus(failed);
    }
  }

  return (
    <section aria-labelledby="staff-title">
      <h2 id="staff-title" className={classes.sectionTitle}>Reviewers and admins</h2>
      <GiveRoleForm isSaving={people.isSaving} onGive={people.giveRole} onGiven={setStatus} />

      {people.hasLoadError && (
        <Alert color="red" title="Could not load the reviewers and admins">
          <p className={pageClasses.alertText}>Check your connection and try again.</p>
          <Button onClick={people.reload}>Try again</Button>
        </Alert>
      )}

      {people.isLoading && <Loader aria-label="Loading reviewers and admins" />}

      {people.staff && sortStaff(people.staff, myEmail).map((member) => {
        const isMe = member.email === myEmail;

        return (
          <div key={member.email} className={classes.person}>
            <div>
              <div className={classes.email}>{member.email}</div>
              {isMe && <div className={classes.you}>You</div>}
            </div>
            {isMe
              ? <span className={classes.fixedRole}>{ROLE_NAMES[member.role]}</span>
              : (
                  <NativeSelect
                    className={classes.roleSelect}
                    size="md"
                    aria-label={`Role for ${member.email}`}
                    data={ROLE_OPTIONS}
                    value={member.role}
                    disabled={people.isSaving}
                    onChange={(event) => {
                      const role = parseStaffRole(event.currentTarget.value);

                      void save(
                        () => people.changeRole({email: member.email, role}),
                        `${member.email} is now ${ROLE_NAMES[role].toLowerCase()}.`,
                        `The role for ${member.email} could not be changed. Check your connection and try again.`,
                      );
                    }}
                  />
                )}
            {!isMe && (
              <button
                type="button"
                className={classes.remove}
                aria-label={`Make ${member.email} a member`}
                disabled={people.isSaving}
                onClick={() => void save(
                  () => people.makeMember(member.email),
                  `${member.email} is now a member.`,
                  `${member.email} could not be made a member. Check your connection and try again.`,
                )}
              >
                Make a member
              </button>
            )}
          </div>
        );
      })}

      {status && <p className={classes.status} role="status">{status}</p>}
    </section>
  );
}

function People({uid}: {uid: string}) {
  const myEmail = normalizeEmail(useAuthStore((state) => state.user?.email) ?? '');

  return (
    <>
      <StaffList uid={uid} myEmail={myEmail} />
      <BlockedAccounts uid={uid} myEmail={myEmail} />
    </>
  );
}

/** Where admins give roles and block accounts. */
export function PeoplePage() {
  return (
    <main className={pageClasses.content}>
      <title>People | Bible Center</title>
      <h1 className={pageClasses.title}>People</h1>
      <p className={pageClasses.intro}>
        Anyone with a verified email can sign in and is a member. Give someone a role to let them do more, or block an account that misuses Bible Center.
      </p>
      <ul className={classes.roles}>
        <li>
          <strong>Members</strong>
          {' '}
          can highlight, take notes, memorize and vote.
        </li>
        <li>
          <strong>Reviewers</strong>
          {' '}
          can also handle reports and new topics.
        </li>
        <li>
          <strong>Admins</strong>
          {' '}
          can also set the verse of the day, give roles and block accounts.
        </li>
      </ul>
      <RoleGate canSee={isAdmin} audience="admins">{(uid) => <People uid={uid} />}</RoleGate>
    </main>
  );
}
