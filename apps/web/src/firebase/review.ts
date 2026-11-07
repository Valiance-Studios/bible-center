import type {OpenReport, ReportGroup, ReportOutcome, TopicDecision} from '@bible-center/core';

import {collection, doc, orderBy, query, runTransaction, serverTimestamp, Timestamp, updateDoc, where} from 'firebase/firestore';
import {db} from './index';
import {fetchFromServer} from './serverQuery';

/** A topic someone started, waiting for a reviewer. */
export interface PendingTopic {
  slug: string;
  name: string;
  createdAt: Date;
}

function dateOf(value: unknown): Date {
  // A server timestamp reads back as null until the server has set it.
  return value instanceof Timestamp ? value.toDate() : new Date(0);
}

/** Every open report, oldest first. Only reviewers may read them. */
export async function listOpenReports(): Promise<OpenReport[]> {
  const documents = await fetchFromServer(query(collection(db, 'reports'), where('status', '==', 'open'), orderBy('createdAt')));

  return documents.map((report) => {
    const data = report.data() as Omit<OpenReport, 'id' | 'createdAt'> & {createdAt: unknown};

    return {
      id: report.id,
      topic: data.topic,
      verseKey: data.verseKey,
      reason: data.reason,
      ...(data.details ? {details: data.details} : {}),
      createdAt: dateOf(data.createdAt),
    };
  });
}

/** Every topic waiting for a decision, oldest first. */
export async function listPendingTopics(): Promise<PendingTopic[]> {
  const documents = await fetchFromServer(query(collection(db, 'topics'), where('status', '==', 'pending'), orderBy('createdAt')));

  return documents.map((topic) => ({slug: topic.id, name: topic.get('name') as string, createdAt: dateOf(topic.get('createdAt'))}));
}

/**
 * Closes every report in the group. Removing also takes the verse off the topic, in the same write,
 * as the security rules require. A verse someone already removed stays removed.
 */
export async function resolveReports(uid: string, {topic, verseKey, reports}: ReportGroup, outcome: ReportOutcome): Promise<void> {
  const removedRef = doc(db, 'topics', topic, 'removed', verseKey);

  await runTransaction(db, async (transaction) => {
    const isRemoved = outcome === 'removed' && (await transaction.get(removedRef)).exists();

    if (outcome === 'removed' && !isRemoved) {
      transaction.set(removedRef, {removedBy: uid, removedAt: serverTimestamp()});
    }

    for (const report of reports) {
      transaction.update(doc(db, 'reports', report.id), {status: outcome, resolvedBy: uid, resolvedAt: serverTimestamp()});
    }
  });
}

export async function decideTopic(uid: string, slug: string, decision: TopicDecision): Promise<void> {
  await updateDoc(doc(db, 'topics', slug), {status: decision, reviewedBy: uid, reviewedAt: serverTimestamp()});
}
