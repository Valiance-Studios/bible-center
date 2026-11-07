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

let testEnv: RulesTestEnvironment;

/**
 * Starts the rules against the Firestore emulator for this file's tests. Before each test the database is
 * cleared, Alice and Bob are allowlisted, and `seed` writes anything else with the rules turned off.
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

      await setDoc(doc(db, 'allowedUsers', `${ALICE}@example.com`), {});
      await setDoc(doc(db, 'allowedUsers', `${BOB}@example.com`), {});
      await seed(db);
    });
  });
}

/** Firestore as this user, or as someone signed out when `uid` is null. */
export function dbFor(uid: string | null, emailVerified = true): Firestore {
  const context = uid
    ? testEnv.authenticatedContext(uid, {email: `${uid}@example.com`, email_verified: emailVerified})
    : testEnv.unauthenticatedContext();

  return context.firestore() as unknown as Firestore;
}
