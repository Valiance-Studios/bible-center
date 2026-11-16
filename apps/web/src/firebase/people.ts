import type {StaffRole} from '@bible-center/core';

import {parseStaffRole} from '@bible-center/core';
import {collection, deleteDoc, doc, runTransaction, serverTimestamp, setDoc} from 'firebase/firestore';
import {ROLES_COLLECTION} from './access';
import {db} from './index';
import {fetchFromServer} from './serverQuery';

/** A reviewer or admin. Everyone else is a member, with no entry. */
export interface StaffMember {
  email: string;
  role: StaffRole;
}

/** Giving a role to someone who already has one, which is changed in the list instead. */
export class AlreadyHasRoleError extends Error {
  constructor(email: string) {
    super(`${email} already has a role. Change it in the list.`);
  }
}

function roleRef(email: string) {
  return doc(db, ROLES_COLLECTION, email);
}

function entryFor(uid: string, role: StaffRole) {
  return {role, updatedBy: uid, updatedAt: serverTimestamp()};
}

/** Every reviewer and admin, in no particular order. Only admins may read them. */
export async function listStaff(): Promise<StaffMember[]> {
  const entries = await fetchFromServer(collection(db, ROLES_COLLECTION));

  return entries.map((entry) => ({email: entry.id, role: parseStaffRole(entry.get('role'))}));
}

/** Gives a normalized email a role, unless it has one. It applies once they sign in with that email, verified. */
export async function giveRole(uid: string, {email, role}: StaffMember): Promise<void> {
  await runTransaction(db, async (transaction) => {
    if ((await transaction.get(roleRef(email))).exists()) {
      throw new AlreadyHasRoleError(email);
    }

    transaction.set(roleRef(email), entryFor(uid, role));
  });
}

export async function changeRole(uid: string, {email, role}: StaffMember): Promise<void> {
  await setDoc(roleRef(email), entryFor(uid, role));
}

/** Makes someone a member again, which is having no entry. */
export async function removeRole(email: string): Promise<void> {
  await deleteDoc(roleRef(email));
}
