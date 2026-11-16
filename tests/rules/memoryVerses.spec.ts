import {describe, it} from 'vitest';
import {assertFails, assertSucceeds} from '@firebase/rules-unit-testing';
import {deleteDoc, doc, getDoc, serverTimestamp, setDoc, updateDoc} from 'firebase/firestore';
import {ALICE, BOB, createCounted, dbFor, deleteCounted, MALLORY, useRulesTestEnvironment} from './support';

const KEY = '19023001-19023002';
const COUNT = 'memoryVerseCount';

function entry(startVerse = '19023001', endVerse = '19023002') {
  return {startVerse, endVerse, status: 'learning', createdAt: serverTimestamp(), practicedAt: serverTimestamp()};
}

function verseRef(uid: string, owner = uid, key = KEY, emailVerified = true) {
  return doc(dbFor(uid, emailVerified), 'users', owner, 'memoryVerses', key);
}

useRulesTestEnvironment(async (db) => {
  // Bob's list is as long as anyone's may be.
  await setDoc(doc(db, 'users', BOB), {memoryVerseCount: 500});
  await setDoc(doc(db, 'users', BOB, 'memoryVerses', '43003016'), {
    startVerse: '43003016', endVerse: '43003016', status: 'learning', createdAt: new Date(), practicedAt: new Date(),
  });
});

describe('the memory list', () => {
  it('lets an allowed user add, practice, mark and remove their own verses', async () => {
    await assertSucceeds(createCounted(verseRef(ALICE), entry(), COUNT));
    await assertSucceeds(getDoc(verseRef(ALICE)));
    await assertSucceeds(updateDoc(verseRef(ALICE), {practicedAt: serverTimestamp()}));
    await assertSucceeds(updateDoc(verseRef(ALICE), {status: 'memorized', practicedAt: serverTimestamp()}));
    await assertSucceeds(updateDoc(verseRef(ALICE), {status: 'learning', practicedAt: serverTimestamp()}));
    await assertSucceeds(deleteCounted(verseRef(ALICE), COUNT, 'memoryVerseChange'));
  });

  it('keeps each list to its owner, with a verified email', async () => {
    await assertFails(getDoc(verseRef(ALICE, BOB, '43003016')));
    await assertFails(createCounted(verseRef(ALICE, BOB), entry(), COUNT));
    await assertFails(deleteDoc(verseRef(ALICE, BOB, '43003016')));
    await assertSucceeds(createCounted(verseRef(MALLORY), entry(), COUNT));
    await assertFails(createCounted(verseRef(ALICE, ALICE, KEY, false), entry(), COUNT));
  });

  it('checks the passage, its key, the status and the times', async () => {
    await assertFails(createCounted(verseRef(ALICE, ALICE, '19023001'), entry(), COUNT));
    await assertFails(createCounted(verseRef(ALICE, ALICE, '19023002-19023001'), entry('19023002', '19023001'), COUNT));
    await assertFails(createCounted(verseRef(ALICE, ALICE, '19023001-20001001'), entry('19023001', '20001001'), COUNT));
    await assertFails(createCounted(verseRef(ALICE), {...entry(), status: 'memorized'}, COUNT));
    await assertFails(createCounted(verseRef(ALICE), {...entry(), practicedAt: new Date('2020-01-01')}, COUNT));
    await assertFails(createCounted(verseRef(ALICE), {...entry(), text: 'The LORD is my shepherd'}, COUNT));
  });

  it('only lets the status and practice time change, with the time set by the server', async () => {
    await assertSucceeds(createCounted(verseRef(ALICE), entry(), COUNT));
    await assertFails(updateDoc(verseRef(ALICE), {status: 'mastered', practicedAt: serverTimestamp()}));
    await assertFails(updateDoc(verseRef(ALICE), {status: 'memorized'}));
    await assertFails(updateDoc(verseRef(ALICE), {endVerse: '19023006', practicedAt: serverTimestamp()}));
  });

  it('counts each verse on the owner\'s record, and refuses one past the limit', async () => {
    await assertFails(setDoc(verseRef(ALICE), entry()));
    await assertFails(createCounted(verseRef(BOB), entry(), COUNT));
  });

  it('only lowers the count when the verse is deleted in the same write', async () => {
    await assertSucceeds(createCounted(verseRef(ALICE), entry(), COUNT));
    await assertFails(deleteDoc(verseRef(ALICE)));
    await assertFails(setDoc(doc(dbFor(ALICE), 'users', ALICE), {memoryVerseCount: 0, memoryVerseChange: KEY}, {merge: true}));
  });
});
