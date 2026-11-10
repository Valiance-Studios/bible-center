import {describe, it} from 'vitest';
import {assertFails, assertSucceeds} from '@firebase/rules-unit-testing';
import {deleteDoc, doc, getDoc, serverTimestamp, setDoc, updateDoc} from 'firebase/firestore';
import {ALICE, BOB, dbFor, MALLORY, useRulesTestEnvironment} from './support';

const KEY = '19023001-19023002';

function entry(startVerse = '19023001', endVerse = '19023002') {
  return {startVerse, endVerse, status: 'learning', createdAt: serverTimestamp(), practicedAt: serverTimestamp()};
}

function verseRef(uid: string, owner = uid, key = KEY, emailVerified = true) {
  return doc(dbFor(uid, emailVerified), 'users', owner, 'memoryVerses', key);
}

useRulesTestEnvironment(async (db) => {
  await setDoc(doc(db, 'users', BOB, 'memoryVerses', '43003016'), {
    startVerse: '43003016', endVerse: '43003016', status: 'learning', createdAt: new Date(), practicedAt: new Date(),
  });
});

describe('the memory list', () => {
  it('lets an allowed user add, practice, mark and remove their own verses', async () => {
    await assertSucceeds(setDoc(verseRef(ALICE), entry()));
    await assertSucceeds(getDoc(verseRef(ALICE)));
    await assertSucceeds(updateDoc(verseRef(ALICE), {practicedAt: serverTimestamp()}));
    await assertSucceeds(updateDoc(verseRef(ALICE), {status: 'memorized', practicedAt: serverTimestamp()}));
    await assertSucceeds(updateDoc(verseRef(ALICE), {status: 'learning', practicedAt: serverTimestamp()}));
    await assertSucceeds(deleteDoc(verseRef(ALICE)));
  });

  it('keeps each list to its owner, on the allowlist, with a verified email', async () => {
    await assertFails(getDoc(verseRef(ALICE, BOB, '43003016')));
    await assertFails(setDoc(verseRef(ALICE, BOB), entry()));
    await assertFails(deleteDoc(verseRef(ALICE, BOB, '43003016')));
    await assertFails(setDoc(verseRef(MALLORY), entry()));
    await assertFails(setDoc(verseRef(ALICE, ALICE, KEY, false), entry()));
  });

  it('checks the passage, its key, the status and the times', async () => {
    await assertFails(setDoc(verseRef(ALICE, ALICE, '19023001'), entry()));
    await assertFails(setDoc(verseRef(ALICE, ALICE, '19023002-19023001'), entry('19023002', '19023001')));
    await assertFails(setDoc(verseRef(ALICE, ALICE, '19023001-20001001'), entry('19023001', '20001001')));
    await assertFails(setDoc(verseRef(ALICE), {...entry(), status: 'memorized'}));
    await assertFails(setDoc(verseRef(ALICE), {...entry(), practicedAt: new Date('2020-01-01')}));
    await assertFails(setDoc(verseRef(ALICE), {...entry(), text: 'The LORD is my shepherd'}));
  });

  it('only lets the status and practice time change, with the time set by the server', async () => {
    await assertSucceeds(setDoc(verseRef(ALICE), entry()));
    await assertFails(updateDoc(verseRef(ALICE), {status: 'mastered', practicedAt: serverTimestamp()}));
    await assertFails(updateDoc(verseRef(ALICE), {status: 'memorized'}));
    await assertFails(updateDoc(verseRef(ALICE), {endVerse: '19023006', practicedAt: serverTimestamp()}));
  });
});
