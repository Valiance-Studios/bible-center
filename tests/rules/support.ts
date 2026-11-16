import type {RulesTestEnvironment} from '@firebase/rules-unit-testing';
import type {DocumentReference, Firestore} from 'firebase/firestore';

import {readFileSync} from 'node:fs';
import {afterAll, beforeAll, beforeEach} from 'vitest';
import {initializeTestEnvironment} from '@firebase/rules-unit-testing';
import {doc, increment, serverTimestamp, setDoc, writeBatch} from 'firebase/firestore';

/** On the allowlist. */
export const ALICE = 'alice';
/** On the allowlist, with a `role` of admin left on his entry from before roles moved, which grants nothing. */
export const BOB = 'bob';
/** On the allowlist, for tests that need an account too new to vote. */
export const NEWT = 'newt';
/** Signed in and verified, but not on the allowlist. */
export const MALLORY = 'mallory';
/** On the allowlist, with a reviewer entry in `roles`. */
export const RITA = 'rita';
/** On the allowlist, with an admin entry in `roles`. */
export const ADA = 'ada';

/** The allowlist and roles key for one of the users above. */
export function emailOf(uid: string): string {
  return `${uid}@example.com`;
}

let testEnv: RulesTestEnvironment;

/**
 * Starts the rules against the Firestore emulator for this file's tests. Before each test the database is
 * cleared, everyone but Mallory is allowlisted, Rita is a reviewer and Ada an admin, and `seed` writes anything else with the
 * rules turned off.
 */
export function useRulesTestEnvironment(seed: (db: Firestore) => Promise<void> = async () => {}) {
  beforeAll(async () => {
    testEnv = await initializeTestEnvironment({
      projectId: 'demo-bible-center',
      firestore: {
        rules: readFileSync('firestore.rules', 'utf8'),
        host: '127.0.0.1',
        port: 8080,
      },
    });
  });

  afterAll(async () => {
    await testEnv.cleanup();
  });

  beforeEach(async () => {
    await testEnv.clearFirestore();
    await testEnv.withSecurityRulesDisabled(async (context) => {
      const db = context.firestore() as unknown as Firestore;

      for (const uid of [ALICE, NEWT, RITA, ADA]) {
        await setDoc(doc(db, 'allowedUsers', emailOf(uid)), {});
      }

      await setDoc(doc(db, 'allowedUsers', emailOf(BOB)), {role: 'admin'});
      await setDoc(doc(db, 'roles', emailOf(RITA)), {role: 'reviewer'});
      await setDoc(doc(db, 'roles', emailOf(ADA)), {role: 'admin'});
      await seed(db);
    });
  });
}

/** Firestore as this user, or as someone signed out when `uid` is null. */
export function dbFor(uid: string | null, emailVerified = true): Firestore {
  const context = uid
    ? testEnv.authenticatedContext(uid, {email: emailOf(uid), email_verified: emailVerified})
    : testEnv.unauthenticatedContext();

  return context.firestore() as unknown as Firestore;
}

/** The record of the user a document under `users/{uid}` belongs to. */
function ownerRecordOf(ref: DocumentReference) {
  const owner = ref.parent.parent;

  if (!owner) {
    throw new Error(`${ref.path} does not belong to a user.`);
  }

  return doc(ref.firestore, 'users', owner.id);
}

/** Creates a counted document as the app does: with one more in its owner's `countField`, in the same write. */
export function createCounted(ref: DocumentReference, data: object, countField: string): Promise<void> {
  const batch = writeBatch(ref.firestore);

  batch.set(ref, data);
  batch.set(ownerRecordOf(ref), {[countField]: increment(1)}, {merge: true});

  return batch.commit();
}

/** Deletes a counted document as the app does: with one fewer in its owner's `countField`, naming it in `changeField`. */
export function deleteCounted(ref: DocumentReference, countField: string, changeField: string): Promise<void> {
  const batch = writeBatch(ref.firestore);

  batch.delete(ref);
  batch.set(ownerRecordOf(ref), {[countField]: increment(-1), [changeField]: ref.id}, {merge: true});

  return batch.commit();
}

/** Creates a document with a cooldown as the app does: stamping now as `stampField` on the user's record, in the same write. */
export function createStamped(uid: string, ref: DocumentReference, data: object, stampField: string): Promise<void> {
  const batch = writeBatch(ref.firestore);

  batch.set(ref, data);
  batch.set(doc(ref.firestore, 'users', uid), {[stampField]: serverTimestamp()}, {merge: true});

  return batch.commit();
}
