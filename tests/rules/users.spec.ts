import type {RulesTestEnvironment} from '@firebase/rules-unit-testing';
import type {Firestore} from 'firebase/firestore';

import {readFileSync} from 'node:fs';
import {afterAll, beforeAll, beforeEach, describe, it} from 'vitest';
import {assertFails, assertSucceeds, initializeTestEnvironment} from '@firebase/rules-unit-testing';
import {addDoc, collection, deleteDoc, doc, getDoc, getDocs, query, serverTimestamp, setDoc, updateDoc, where} from 'firebase/firestore';

const ALICE = 'alice';
const BOB = 'bob';
/** Signed in and verified, but not on the allowlist. */
const MALLORY = 'mallory';

let testEnv: RulesTestEnvironment;

function dbFor(uid: string | null, emailVerified = true): Firestore {
  const context = uid
    ? testEnv.authenticatedContext(uid, {email: `${uid}@example.com`, email_verified: emailVerified})
    : testEnv.unauthenticatedContext();

  return context.firestore() as unknown as Firestore;
}

function annotation(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    type: 'highlight',
    chapterId: '43003',
    startVerse: '43003016',
    endVerse: '43003018',
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    ...overrides,
  };
}

function annotationsOf(db: Firestore, uid: string) {
  return collection(db, 'users', uid, 'annotations');
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
    const db = context.firestore() as unknown as Firestore;

    await setDoc(doc(db, 'allowedUsers', `${ALICE}@example.com`), {});
    await setDoc(doc(db, 'allowedUsers', `${BOB}@example.com`), {});
    await setDoc(doc(db, 'users', ALICE, 'annotations', 'existing'), annotation());
    await setDoc(doc(db, 'users', ALICE, 'annotations', 'existing-note'), annotation({type: 'note', text: 'Old words.'}));
  });
});

describe('annotations', () => {
  it('lets an allowlisted user manage their own', async () => {
    const db = dbFor(ALICE);

    await assertSucceeds(addDoc(annotationsOf(db, ALICE), annotation()));
    await assertSucceeds(getDocs(query(annotationsOf(db, ALICE), where('chapterId', '==', '43003'))));
    // My verses lists all of them at once.
    await assertSucceeds(getDocs(annotationsOf(db, ALICE)));
    await assertSucceeds(deleteDoc(doc(annotationsOf(db, ALICE), 'existing')));
  });

  it('accepts a single verse, a range, and each type', async () => {
    const collectionRef = annotationsOf(dbFor(ALICE), ALICE);

    await assertSucceeds(addDoc(collectionRef, annotation({startVerse: '43003016', endVerse: '43003016'})));
    await assertSucceeds(addDoc(collectionRef, annotation({type: 'bookmark'})));
    await assertSucceeds(addDoc(collectionRef, annotation({type: 'note', text: 'My note.'})));
  });

  it('never lets one user reach another user\'s', async () => {
    const db = dbFor(BOB);

    await assertFails(getDocs(annotationsOf(db, ALICE)));
    await assertFails(getDoc(doc(annotationsOf(db, ALICE), 'existing')));
    await assertFails(addDoc(annotationsOf(db, ALICE), annotation()));
    await assertFails(deleteDoc(doc(annotationsOf(db, ALICE), 'existing')));
  });

  it('requires the allowlist, a verified email and a sign-in', async () => {
    await assertFails(addDoc(annotationsOf(dbFor(MALLORY), MALLORY), annotation()));
    await assertFails(getDocs(annotationsOf(dbFor(MALLORY), MALLORY)));
    await assertFails(addDoc(annotationsOf(dbFor(ALICE, false), ALICE), annotation()));
    await assertFails(getDocs(annotationsOf(dbFor(null), ALICE)));
  });

  it.each([
    ['an unknown type', {type: 'scribble'}],
    ['an extra field', {color: 'red'}],
    ['a malformed verse id', {startVerse: '4300316'}],
    ['a backwards range', {startVerse: '43003018', endVerse: '43003016'}],
    ['a range across chapters', {endVerse: '43004001'}],
    ['a chapter id that does not match', {chapterId: '43004'}],
    ['text on a highlight', {text: 'Not a note.'}],
    ['a note with no text', {type: 'note'}],
    ['a blank note', {type: 'note', text: '   '}],
    ['an oversized note', {type: 'note', text: 'x'.repeat(2001)}],
    ['a client-chosen time', {createdAt: new Date(0)}],
  ])('rejects %s', async (_, overrides) => {
    await assertFails(addDoc(annotationsOf(dbFor(ALICE), ALICE), annotation(overrides)));
  });

  it('requires both timestamps', async () => {
    const collectionRef = annotationsOf(dbFor(ALICE), ALICE);
    const withoutCreated = annotation();
    const withoutUpdated = annotation();

    delete withoutCreated['createdAt'];
    delete withoutUpdated['updatedAt'];

    await assertFails(addDoc(collectionRef, withoutCreated));
    await assertFails(addDoc(collectionRef, withoutUpdated));
  });

  it('accepts a note at the maximum length', async () => {
    await assertSucceeds(addDoc(annotationsOf(dbFor(ALICE), ALICE), annotation({type: 'note', text: 'x'.repeat(2000)})));
  });

  it('only lets a note\'s words change', async () => {
    const note = doc(annotationsOf(dbFor(ALICE), ALICE), 'existing-note');

    await assertSucceeds(updateDoc(note, {text: 'New words.', updatedAt: serverTimestamp()}));
    await assertFails(updateDoc(note, {endVerse: '43003020', updatedAt: serverTimestamp()}));
    await assertFails(updateDoc(note, {text: '', updatedAt: serverTimestamp()}));
  });
});

describe('user settings', () => {
  it('lets a user save and read their translation', async () => {
    const settings = doc(dbFor(ALICE), 'users', ALICE);

    await assertSucceeds(setDoc(settings, {translationId: 'kjv'}));
    await assertSucceeds(getDoc(settings));
  });

  it('rejects an unknown translation or extra fields', async () => {
    const settings = doc(dbFor(ALICE), 'users', ALICE);

    await assertFails(setDoc(settings, {translationId: 'not-a-translation'}));
    await assertFails(setDoc(settings, {translationId: 'kjv', isAdmin: true}));
  });

  it('keeps them private', async () => {
    await assertFails(getDoc(doc(dbFor(BOB), 'users', ALICE)));
    await assertFails(setDoc(doc(dbFor(BOB), 'users', ALICE), {translationId: 'kjv'}));
    await assertFails(setDoc(doc(dbFor(MALLORY), 'users', MALLORY), {translationId: 'kjv'}));
  });
});
