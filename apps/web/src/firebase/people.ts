import type {Role} from '@bible-center/core';

import {parseRole} from '@bible-center/core';
import {collection, doc, runTransaction, serverTimestamp, writeBatch} from 'firebase/firestore';
import {ALLOWED_USERS_COLLECTION, ROLES_COLLECTION} from './access';
import {db} from './index';
import {fetchFromServer} from './serverQuery';

/** Someone on the allowlist, with their role. */
export interface Person {
  email: string;
  role: Role;
}

/** Adding someone who is already on the allowlist. */
export class AlreadyAllowedError extends Error {
  constructor(email: string) {
    super(`${email} can already sign in.`);
  }
}

function allowedRef(email: string) {
  return doc(db, ALLOWED_USERS_COLLECTION, email);
}

function roleRef(email: string) {
  return doc(db, ROLES_COLLECTION, email);
}

function changeBy(uid: string) {
  return {updatedBy: uid, updatedAt: serverTimestamp()};
}

/** Everyone on the allowlist, with their roles, in no particular order. Only admins may read them. */
export async function listPeople(): Promise<Person[]> {
  const [allowed, roles] = await Promise.all([
    fetchFromServer(collection(db, ALLOWED_USERS_COLLECTION)),
    fetchFromServer(collection(db, ROLES_COLLECTION)),
  ]);
  const roleByEmail = new Map(roles.map((entry) => [entry.id, parseRole(entry.get('role'))]));

  return allowed.map(({id: email}) => ({email, role: roleByEmail.get(email) ?? 'member'}));
}

/** Puts a normalized email on the allowlist with a role, unless it is already there. */
export async function addPerson(uid: string, {email, role}: Person): Promise<void> {
  await runTransaction(db, async (transaction) => {
    if ((await transaction.get(allowedRef(email))).exists()) {
      throw new AlreadyAllowedError(email);
    }

    transaction.set(allowedRef(email), changeBy(uid));

    if (role !== 'member') {
      transaction.set(roleRef(email), {role, ...changeBy(uid)});
    }
  });
}

/** Members have no entry in `roles`, so making someone a member removes theirs. */
export async function setRole(uid: string, {email, role}: Person): Promise<void> {
  const batch = writeBatch(db);

  if (role === 'member') {
    batch.delete(roleRef(email));
  } else {
    batch.set(roleRef(email), {role, ...changeBy(uid)});
  }

  await batch.commit();
}

/** Takes someone off the allowlist, with their role. Their own data stays, keyed by their account. */
export async function removePerson(email: string): Promise<void> {
  const batch = writeBatch(db);

  batch.delete(allowedRef(email));
  batch.delete(roleRef(email));
  await batch.commit();
}
