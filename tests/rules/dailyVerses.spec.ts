import {describe, it} from 'vitest';
import {assertFails, assertSucceeds} from '@firebase/rules-unit-testing';
import {collection, deleteDoc, doc, getDoc, getDocs, serverTimestamp, setDoc} from 'firebase/firestore';
import {ADA, ALICE, dbFor, RITA, useRulesTestEnvironment} from './support';

const DATE = '2026-11-08';

function chosen(uid: string, startVerse = '25003022', endVerse = '25003023') {
  return {startVerse, endVerse, setBy: uid, setAt: serverTimestamp()};
}

function dateRef(uid: string | null, date = DATE) {
  return doc(dbFor(uid), 'dailyVerses', date);
}

useRulesTestEnvironment(async (db) => {
  await setDoc(doc(db, 'dailyVerses', '2026-11-09'), {startVerse: '19046010', endVerse: '19046010', setBy: ADA, setAt: new Date()});
});

describe('the verse of the day', () => {
  it('lets anyone read a date, but nobody list them', async () => {
    await assertSucceeds(getDoc(dateRef(null, '2026-11-09')));
    await assertSucceeds(getDoc(dateRef(ALICE, DATE)));
    await assertFails(getDocs(collection(dbFor(null), 'dailyVerses')));
    await assertFails(getDocs(collection(dbFor(ADA), 'dailyVerses')));
  });

  it('lets an admin choose, change and clear a date\'s verse', async () => {
    await assertSucceeds(setDoc(dateRef(ADA), chosen(ADA)));
    await assertSucceeds(setDoc(dateRef(ADA), chosen(ADA, '19046010', '19046010')));
    await assertSucceeds(deleteDoc(dateRef(ADA)));
  });

  it('lets nobody else choose or clear one', async () => {
    for (const uid of [ALICE, RITA]) {
      await assertFails(setDoc(dateRef(uid), chosen(uid)));
      await assertFails(deleteDoc(dateRef(uid, '2026-11-09')));
    }

    await assertFails(setDoc(dateRef(null), chosen('nobody')));
  });

  it('checks the date, the passage, and who chose it', async () => {
    await assertFails(setDoc(dateRef(ADA, 'tomorrow'), chosen(ADA)));
    await assertFails(setDoc(dateRef(ADA), chosen(ADA, 'John 3:16', '43003016')));
    await assertFails(setDoc(dateRef(ADA), chosen(ADA, '43003017', '43003016')));
    await assertFails(setDoc(dateRef(ADA), chosen(ADA, '43003016', '44001001')));
    await assertFails(setDoc(dateRef(ADA), chosen(RITA)));
    await assertFails(setDoc(dateRef(ADA), {...chosen(ADA), text: 'For God so loved the world'}));
    await assertFails(setDoc(dateRef(ADA), {startVerse: '43003016', endVerse: '43003016'}));
  });

  it('requires the admin\'s email to be verified', async () => {
    await assertFails(setDoc(doc(dbFor(ADA, false), 'dailyVerses', DATE), chosen(ADA)));
  });
});
