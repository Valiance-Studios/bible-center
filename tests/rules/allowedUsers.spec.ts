import type {RulesTestEnvironment} from '@firebase/rules-unit-testing';
import type {Firestore} from 'firebase/firestore';

import {readFileSync} from 'node:fs';
import {afterAll, beforeAll, beforeEach, describe, it} from 'vitest';
import {assertFails, assertSucceeds, initializeTestEnvironment} from '@firebase/rules-unit-testing';
import {collection, doc, getDoc, getDocs, setDoc} from 'firebase/firestore';

const ALICE_EMAIL = 'alice@example.com';

let testEnv: RulesTestEnvironment;

function dbFor(email: string | null, emailVerified = true): Firestore {
  const context = email
    ? testEnv.authenticatedContext(email, {email, email_verified: emailVerified})
    : testEnv.unauthenticatedContext();

  return context.firestore() as unknown as Firestore;
}

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
    await setDoc(doc(context.firestore() as unknown as Firestore, 'allowedUsers', ALICE_EMAIL), {});
  });
});

describe('allowedUsers', () => {
  it('lets a verified user check their own email, in any casing', async () => {
    await assertSucceeds(getDoc(doc(dbFor(ALICE_EMAIL), 'allowedUsers', ALICE_EMAIL)));
    await assertSucceeds(getDoc(doc(dbFor('Alice@Example.com'), 'allowedUsers', ALICE_EMAIL)));
  });

  it('rejects an unverified account claiming the email, as a password sign-up could', async () => {
    await assertFails(getDoc(doc(dbFor(ALICE_EMAIL, false), 'allowedUsers', ALICE_EMAIL)));
  });

  it('rejects anyone checking another email', async () => {
    await assertFails(getDoc(doc(dbFor('mallory@example.com'), 'allowedUsers', ALICE_EMAIL)));
    await assertFails(getDoc(doc(dbFor(null), 'allowedUsers', ALICE_EMAIL)));
  });

  it('never lets a user list or change the allowlist', async () => {
    await assertFails(getDocs(collection(dbFor(ALICE_EMAIL), 'allowedUsers')));
    await assertFails(setDoc(doc(dbFor('mallory@example.com'), 'allowedUsers', 'mallory@example.com'), {}));
  });
});

describe('everything else', () => {
  it('is denied until a collection has its own rules', async () => {
    await assertFails(getDoc(doc(dbFor(ALICE_EMAIL), 'anything', 'document')));
    await assertFails(setDoc(doc(dbFor(ALICE_EMAIL), 'anything', 'document'), {}));
  });
});
