import {describe, it} from 'vitest';
import {assertFails, assertSucceeds} from '@firebase/rules-unit-testing';
import {collection, doc, getDoc, getDocs, serverTimestamp, setDoc, updateDoc} from 'firebase/firestore';
import {ADA, ALICE, dbFor, emailOf, MALLORY, RITA, useRulesTestEnvironment} from './support';

useRulesTestEnvironment(async (db) => {
  await setDoc(doc(db, 'topics', 'screen-time'), {name: 'screen time', status: 'pending', createdBy: ALICE, createdAt: new Date()});
});

describe('signing up', () => {
  it('lets anyone with a verified email save, with no list to be on', async () => {
    await assertSucceeds(setDoc(doc(dbFor(MALLORY), 'users', MALLORY), {translationId: 'kjv'}, {merge: true}));
  });

  it('turns away an unverified email, as a password sign-up with someone else\'s address would be, and the signed out', async () => {
    await assertFails(setDoc(doc(dbFor(MALLORY, false), 'users', MALLORY), {translationId: 'kjv'}, {merge: true}));
    await assertFails(getDoc(doc(dbFor(null), 'users', MALLORY)));
  });
});

describe('staff', () => {
  it('act only after signing in with a second step', async () => {
    const decision = {status: 'approved', reviewedBy: RITA, reviewedAt: serverTimestamp()};

    await assertFails(updateDoc(doc(dbFor(RITA, true, false), 'topics', 'screen-time'), decision));
    await assertFails(getDocs(collection(dbFor(ADA, true, false), 'roles')));
    await assertSucceeds(updateDoc(doc(dbFor(RITA), 'topics', 'screen-time'), decision));
    await assertSucceeds(getDocs(collection(dbFor(ADA), 'roles')));
  });

  it('keep their member features without one', async () => {
    await assertSucceeds(setDoc(doc(dbFor(RITA, true, false), 'users', RITA), {translationId: 'kjv'}, {merge: true}));
    await assertSucceeds(getDoc(doc(dbFor(ADA, true, false), 'roles', emailOf(ADA))));
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
