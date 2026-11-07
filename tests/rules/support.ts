import type {RulesTestEnvironment} from '@firebase/rules-unit-testing';
import type {Firestore} from 'firebase/firestore';

import {readFileSync} from 'node:fs';
import {afterAll, beforeAll, beforeEach} from 'vitest';
import {initializeTestEnvironment} from '@firebase/rules-unit-testing';
import {doc, setDoc} from 'firebase/firestore';

/** On the allowlist. */
export const ALICE = 'alice';
/** On the allowlist. */
export const BOB = 'bob';
/** Signed in and verified, but not on the allowlist. */
export const MALLORY = 'mallory';
/** On the allowlist as a reviewer. */
export const RITA = 'rita';
/** On the allowlist as an admin. */
export const ADA = 'ada';

/** The allowlist key for one of the users above. */
export function emailOf(uid: string): string {
  return `${uid}@example.com`;
}

let testEnv: RulesTestEnvironment;

/**
 * Starts the rules against the Firestore emulator for this file's tests. Before each test the database is
 * cleared, Alice and Bob are allowlisted as members, Rita as a reviewer and Ada as an admin, and `seed` writes anything else with the rules turned off.
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

      // Alice's entry has no role, as entries made before roles existed do.
      await setDoc(doc(db, 'allowedUsers', emailOf(ALICE)), {});
      await setDoc(doc(db, 'allowedUsers', emailOf(BOB)), {role: 'member'});
      await setDoc(doc(db, 'allowedUsers', emailOf(RITA)), {role: 'reviewer'});
      await setDoc(doc(db, 'allowedUsers', emailOf(ADA)), {role: 'admin'});
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
