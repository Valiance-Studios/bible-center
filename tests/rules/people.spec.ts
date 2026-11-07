import {describe, it} from 'vitest';
import {assertFails, assertSucceeds} from '@firebase/rules-unit-testing';
import {collection, deleteDoc, doc, getDoc, getDocs, serverTimestamp, setDoc} from 'firebase/firestore';
import {ADA, ALICE, dbFor, emailOf, RITA, useRulesTestEnvironment} from './support';

function entry(uid: string, role: unknown = 'reviewer') {
  return {role, updatedBy: uid, updatedAt: serverTimestamp()};
}

function personRef(uid: string, email: string) {
  return doc(dbFor(uid), 'allowedUsers', email);
}

useRulesTestEnvironment();

describe('managing people', () => {
  it('lets an admin list everyone, and add, change and remove people', async () => {
    await assertSucceeds(getDocs(collection(dbFor(ADA), 'allowedUsers')));
    await assertSucceeds(getDoc(personRef(ADA, emailOf(ALICE))));
    await assertSucceeds(setDoc(personRef(ADA, 'grace@example.com'), entry(ADA, 'member')));
    await assertSucceeds(setDoc(personRef(ADA, emailOf(ALICE)), entry(ADA, 'admin')));
    await assertSucceeds(deleteDoc(personRef(ADA, emailOf(RITA))));
  });

  it('never lets an admin change or remove their own entry', async () => {
    await assertFails(setDoc(personRef(ADA, emailOf(ADA)), entry(ADA, 'member')));
    await assertFails(deleteDoc(personRef(ADA, emailOf(ADA))));
  });

  it('checks the email, role and who made the change', async () => {
    await assertFails(setDoc(personRef(ADA, 'Grace@example.com'), entry(ADA)));
    await assertFails(setDoc(personRef(ADA, 'not an email'), entry(ADA)));
    await assertFails(setDoc(personRef(ADA, 'grace@example.com'), entry(ADA, 'owner')));
    await assertFails(setDoc(personRef(ADA, 'grace@example.com'), entry(RITA)));
    await assertFails(setDoc(personRef(ADA, 'grace@example.com'), {...entry(ADA), note: 'extra'}));
    await assertFails(setDoc(personRef(ADA, 'grace@example.com'), {role: 'member'}));
  });

  it('lets nobody else read or change the allowlist', async () => {
    for (const uid of [ALICE, RITA]) {
      await assertFails(getDocs(collection(dbFor(uid), 'allowedUsers')));
      await assertFails(getDoc(personRef(uid, emailOf(ADA))));
      await assertFails(setDoc(personRef(uid, emailOf(uid)), entry(uid, 'admin')));
      await assertFails(setDoc(personRef(uid, 'grace@example.com'), entry(uid, 'member')));
    }
  });

  it('requires the admin\'s email to be verified', async () => {
    await assertFails(getDocs(collection(dbFor(ADA, false), 'allowedUsers')));
    await assertFails(setDoc(doc(dbFor(ADA, false), 'allowedUsers', 'grace@example.com'), entry(ADA, 'member')));
  });
});
