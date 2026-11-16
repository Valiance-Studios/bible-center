import type {MemoryStatus, MemoryVerse} from '@bible-center/core';
import type {QueryDocumentSnapshot, Timestamp} from 'firebase/firestore';

import {topicVerseKey} from '@bible-center/core';
import {collection, doc, runTransaction, serverTimestamp, updateDoc} from 'firebase/firestore';
import {db} from './index';
import {fetchFromServer} from './serverQuery';
import {addToCount, readUserRecord, takeFromCount} from './userRecord';

/** A verse on the memory list, with the key it is stored under. */
export interface MemoryListEntry extends MemoryVerse {
  key: string;
}

/** A passage by its first and last verse ids. */
export type MemorySpan = Pick<MemoryVerse, 'startVerse' | 'endVerse'>;

/** Mirrors `users/{uid}/memoryVerses/{key}` in `firestore.rules`, keyed like a topic's verses. */
function memoryVersesOf(uid: string) {
  return collection(db, 'users', uid, 'memoryVerses');
}

/** The key a passage is stored under, such as `19023001-19023002`. */
export function memoryKeyOf({startVerse, endVerse}: MemorySpan): string {
  return topicVerseKey(startVerse, endVerse);
}

function toEntry(document: QueryDocumentSnapshot): MemoryListEntry {
  const data = document.data() as {startVerse: string; endVerse: string; status: MemoryStatus; createdAt: Timestamp; practicedAt: Timestamp};

  return {
    key: document.id,
    startVerse: data.startVerse,
    endVerse: data.endVerse,
    status: data.status,
    createdAt: data.createdAt.toDate(),
    practicedAt: data.practicedAt.toDate(),
  };
}

/** Everything on the user's memory list, in no particular order. */
export async function listMemoryVerses(uid: string): Promise<MemoryListEntry[]> {
  return (await fetchFromServer(memoryVersesOf(uid))).map(toEntry);
}

/**
 * Puts a passage on the list as learning. Adding it counts as practicing it. Does nothing if it is already there,
 * and rejects with `WriteLimitError` once the list is as long as `WRITE_LIMITS` allows.
 */
export async function addMemoryVerse(uid: string, span: MemorySpan): Promise<void> {
  const {startVerse, endVerse} = span;
  const verseRef = doc(memoryVersesOf(uid), memoryKeyOf(span));

  await runTransaction(db, async (transaction) => {
    const record = await readUserRecord(transaction, uid);

    if ((await transaction.get(verseRef)).exists()) {
      return;
    }

    addToCount(transaction, uid, record, 'memoryVerses');
    transaction.set(verseRef, {startVerse, endVerse, status: 'learning', createdAt: serverTimestamp(), practicedAt: serverTimestamp()});
  });
}

/** Records practice now, and the status, which changes only when given. */
export async function recordPractice(uid: string, key: string, status?: MemoryStatus): Promise<void> {
  await updateDoc(doc(memoryVersesOf(uid), key), {...(status ? {status} : {}), practicedAt: serverTimestamp()});
}

export async function removeMemoryVerse(uid: string, key: string): Promise<void> {
  await runTransaction(db, async (transaction) => {
    const record = await readUserRecord(transaction, uid);

    takeFromCount(transaction, uid, record, 'memoryVerses', key);
    transaction.delete(doc(memoryVersesOf(uid), key));
  });
}
