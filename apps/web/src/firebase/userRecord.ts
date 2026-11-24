import type {CooldownKind, CountedKind} from '@bible-center/core';
import type {DocumentData, Transaction} from 'firebase/firestore';

import {cooldownEndsAt, WRITE_LIMITS} from '@bible-center/core';
import {doc, serverTimestamp, Timestamp} from 'firebase/firestore';
import {db} from './index';

/** Each user's own record, `users/{uid}`, holding their settings, when they were first seen, and their limits. */
export function userRecordRef(uid: string) {
  return doc(db, 'users', uid);
}

/** The record's fields for each count and cooldown. Mirrors `isValidUserRecord` in `firestore.rules`. */
const COUNT_FIELDS: Record<CountedKind, {count: string; change: string}> = {
  annotations: {count: 'annotationCount', change: 'annotationChange'},
  memoryVerses: {count: 'memoryVerseCount', change: 'memoryVerseChange'},
};

const STAMP_FIELDS: Record<CooldownKind, string> = {
  report: 'lastReportAt',
  topic: 'lastTopicAt',
};

/** What stopped a write: a full count, or a cooldown still running. */
export type WriteLimit = {type: 'count'; kind: CountedKind} | {type: 'cooldown'; kind: CooldownKind; endsAt: Date};

export class WriteLimitError extends Error {
  readonly limit: WriteLimit;

  constructor(limit: WriteLimit) {
    super(limit.type === 'count' ? `The ${limit.kind} limit is reached.` : `Wait until ${limit.endsAt.toISOString()}.`);
    this.limit = limit;
  }
}

/** The limit that stopped a write, or null if it failed for another reason. */
export function limitOf(error: unknown): WriteLimit | null {
  return error instanceof WriteLimitError ? error.limit : null;
}

/** The user's record as a transaction sees it, empty if it does not exist yet. */
export async function readUserRecord(transaction: Transaction, uid: string): Promise<DocumentData> {
  return (await transaction.get(userRecordRef(uid))).data() ?? {};
}

function countOf(record: DocumentData, kind: CountedKind): number {
  const count: unknown = record[COUNT_FIELDS[kind].count];

  return typeof count === 'number' ? count : 0;
}

/** Counts one more, as the rules require when creating a counted document, unless the limit is reached. */
export function addToCount(transaction: Transaction, uid: string, record: DocumentData, kind: CountedKind): void {
  const count = countOf(record, kind);

  if (count >= WRITE_LIMITS[kind]) {
    throw new WriteLimitError({type: 'count', kind});
  }

  transaction.set(userRecordRef(uid), {[COUNT_FIELDS[kind].count]: count + 1}, {merge: true});
}

/** Counts one fewer, naming the document deleted alongside, as the rules require. Documents made before counts leave it at 0. */
export function takeFromCount(
  transaction: Transaction,
  uid: string,
  record: DocumentData,
  kind: CountedKind,
  documentId: string,
): void {
  const count = countOf(record, kind);

  if (count > 0) {
    transaction.set(
      userRecordRef(uid),
      {[COUNT_FIELDS[kind].count]: count - 1, [COUNT_FIELDS[kind].change]: documentId},
      {merge: true},
    );
  }
}

/** Stamps now as the last time, as the rules require, unless the cooldown since the last one is still running. */
export function stampAfterCooldown(
  transaction: Transaction,
  uid: string,
  record: DocumentData,
  kind: CooldownKind,
): void {
  const last: unknown = record[STAMP_FIELDS[kind]];
  const endsAt = cooldownEndsAt(kind, last instanceof Timestamp ? last.toDate() : null, new Date());

  if (endsAt) {
    throw new WriteLimitError({type: 'cooldown', kind, endsAt});
  }

  transaction.set(userRecordRef(uid), {[STAMP_FIELDS[kind]]: serverTimestamp()}, {merge: true});
}
