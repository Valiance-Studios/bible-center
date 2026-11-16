import {describe, it} from 'vitest';
import {assertFails, assertSucceeds} from '@firebase/rules-unit-testing';
import {collection, doc, getDoc, getDocs, setDoc} from 'firebase/firestore';
import {ALICE, dbFor, emailOf, MALLORY, useRulesTestEnvironment} from './support';

useRulesTestEnvironment();

describe('signing up', () => {
  it('lets anyone with a verified email save, with no list to be on', async () => {
    await assertSucceeds(setDoc(doc(dbFor(MALLORY), 'users', MALLORY), {translationId: 'kjv'}, {merge: true}));
  });

  it('turns away an unverified email, as a password sign-up with someone else\'s address would be, and the signed out', async () => {
    await assertFails(setDoc(doc(dbFor(MALLORY, false), 'users', MALLORY), {translationId: 'kjv'}, {merge: true}));
    await assertFails(getDoc(doc(dbFor(null), 'users', MALLORY)));
  });
});

describe('the old allowlist', () => {
  it('is closed to everyone, now that nothing reads it', async () => {
    await assertFails(getDoc(doc(dbFor(ALICE), 'allowedUsers', emailOf(ALICE))));
    await assertFails(getDocs(collection(dbFor(ALICE), 'allowedUsers')));
    await assertFails(setDoc(doc(dbFor(ALICE), 'allowedUsers', emailOf(ALICE)), {}));
  });
});

describe('everything else', () => {
  it('is denied until a collection has its own rules', async () => {
    await assertFails(getDoc(doc(dbFor(ALICE), 'anything', 'document')));
    await assertFails(setDoc(doc(dbFor(ALICE), 'anything', 'document'), {}));
  });
});
