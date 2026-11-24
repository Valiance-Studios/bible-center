import {describe, it} from 'vite-plus/test';
import {assertFails, assertSucceeds} from '@firebase/rules-unit-testing';
import {collection, deleteDoc, doc, getDoc, getDocs, serverTimestamp, setDoc} from 'firebase/firestore';
import {ADA, ALICE, dbFor, emailOf, MALLORY, RITA, useRulesTestEnvironment} from './support';

function changeBy(uid: string) {
  return {updatedBy: uid, updatedAt: serverTimestamp()};
}

function roleEntry(uid: string, role: unknown = 'reviewer') {
  return {role, ...changeBy(uid)};
}

function roleRef(uid: string, email: string) {
  return doc(dbFor(uid), 'roles', email);
}

useRulesTestEnvironment();

describe('roles', () => {
  it('lets an admin list them, and make someone a reviewer or admin, or a member again', async () => {
    await assertSucceeds(getDocs(collection(dbFor(ADA), 'roles')));
    await assertSucceeds(setDoc(roleRef(ADA, emailOf(ALICE)), roleEntry(ADA, 'reviewer')));
    await assertSucceeds(setDoc(roleRef(ADA, emailOf(RITA)), roleEntry(ADA, 'admin')));
    await assertSucceeds(deleteDoc(roleRef(ADA, emailOf(RITA))));
  });

  it('keeps no entry for members', async () => {
    await assertFails(setDoc(roleRef(ADA, emailOf(ALICE)), roleEntry(ADA, 'member')));
  });

  it('never lets an admin change their own role', async () => {
    await assertFails(setDoc(roleRef(ADA, emailOf(ADA)), roleEntry(ADA, 'reviewer')));
    await assertFails(deleteDoc(roleRef(ADA, emailOf(ADA))));
  });

  it('checks the email, role and who made the change', async () => {
    await assertFails(setDoc(roleRef(ADA, 'Grace@example.com'), roleEntry(ADA)));
    await assertFails(setDoc(roleRef(ADA, 'not an email'), roleEntry(ADA)));
    await assertFails(setDoc(roleRef(ADA, 'grace@example.com'), roleEntry(ADA, 'owner')));
    await assertFails(setDoc(roleRef(ADA, 'grace@example.com'), roleEntry(RITA)));
    await assertFails(setDoc(roleRef(ADA, 'grace@example.com'), {...roleEntry(ADA), note: 'extra'}));
    await assertFails(setDoc(roleRef(ADA, 'grace@example.com'), {role: 'reviewer'}));
  });

  it('lets people check their own role, and nobody else\'s', async () => {
    await assertSucceeds(getDoc(roleRef(RITA, emailOf(RITA))));
    await assertSucceeds(getDoc(roleRef(ALICE, emailOf(ALICE))));
    await assertSucceeds(getDoc(roleRef(MALLORY, emailOf(MALLORY))));
    await assertFails(getDoc(roleRef(ALICE, emailOf(RITA))));
    await assertFails(getDoc(roleRef(RITA, emailOf(ADA))));
    await assertFails(getDoc(doc(dbFor(RITA, false), 'roles', emailOf(RITA))));
    await assertFails(getDoc(doc(dbFor(null), 'roles', emailOf(RITA))));
  });

  it('lets nobody else list or change them, including themselves', async () => {
    for (const uid of [ALICE, RITA]) {
      await assertFails(getDocs(collection(dbFor(uid), 'roles')));
      await assertFails(setDoc(roleRef(uid, emailOf(uid)), roleEntry(uid, 'admin')));
      await assertFails(setDoc(roleRef(uid, 'grace@example.com'), roleEntry(uid, 'reviewer')));
    }
  });

  it('requires the admin\'s email to be verified', async () => {
    await assertFails(getDocs(collection(dbFor(ADA, false), 'roles')));
    await assertFails(setDoc(doc(dbFor(ADA, false), 'roles', 'grace@example.com'), roleEntry(ADA)));
  });
});
