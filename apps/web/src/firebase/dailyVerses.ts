import type {DailyVerse} from '@bible-center/core';

import {deleteDoc, doc, getDocFromServer, serverTimestamp, setDoc} from 'firebase/firestore';
import {db} from './index';

/** Mirrors `dailyVerses/{date}` in `firestore.rules`. */
function dateRef(date: string) {
  return doc(db, 'dailyVerses', date);
}

/** The verse an admin chose for the date, or null if it is left to the automatic list. */
export async function getChosenDailyVerse(date: string): Promise<DailyVerse | null> {
  const chosen = await getDocFromServer(dateRef(date));

  if (!chosen.exists()) {
    return null;
  }

  const {startVerse, endVerse} = chosen.data() as DailyVerse;

  return {startVerse, endVerse};
}

/** Chooses the date's verse, in place of the automatic pick. Only admins may. */
export async function setDailyVerse(uid: string, date: string, {startVerse, endVerse}: DailyVerse): Promise<void> {
  await setDoc(dateRef(date), {startVerse, endVerse, setBy: uid, setAt: serverTimestamp()});
}

/** Leaves the date to the automatic list again. Only admins may. */
export async function clearDailyVerse(date: string): Promise<void> {
  await deleteDoc(dateRef(date));
}
