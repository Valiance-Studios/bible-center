import type {Role} from '@bible-center/core';

import {parseRole} from '@bible-center/core';
import {collection, deleteDoc, doc, runTransaction, serverTimestamp, setDoc} from 'firebase/firestore';
import {ALLOWED_USERS_COLLECTION} from './access';
import {db} from './index';
import {fetchFromServer} from './serverQuery';

/** Someone on the allowlist. */
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

function personRef(email: string) {
  return doc(db, ALLOWED_USERS_COLLECTION, email);
}

function entryFor(uid: string, role: Role) {
  return {role, updatedBy: uid, updatedAt: serverTimestamp()};
}

/** Everyone on the allowlist, in no particular order. Only admins may read it. */
export async function listPeople(): Promise<Person[]> {
  const documents = await fetchFromServer(collection(db, ALLOWED_USERS_COLLECTION));

  return documents.map((person) => ({email: person.id, role: parseRole(person.get('role'))}));
}

/** Puts a normalized email on the allowlist, unless it is already there. */
export async function addPerson(uid: string, {email, role}: Person): Promise<void> {
  await runTransaction(db, async (transaction) => {
    if ((await transaction.get(personRef(email))).exists()) {
      throw new AlreadyAllowedError(email);
    }

    transaction.set(personRef(email), entryFor(uid, role));
  });
}

export async function setRole(uid: string, {email, role}: Person): Promise<void> {
  await setDoc(personRef(email), entryFor(uid, role));
}

/** Takes someone off the allowlist. Their own data stays, keyed by their account. */
export async function removePerson(email: string): Promise<void> {
  await deleteDoc(personRef(email));
}
