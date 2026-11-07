import type {CommunityTopicVerse, ReportReason} from '@bible-center/core';

import {topicVerseKey} from '@bible-center/core';
import {
  addDoc,
  collection,
  collectionGroup,
  doc,
  getDocFromServer,
  query,
  runTransaction,
  serverTimestamp,
  where,
} from 'firebase/firestore';
import {db} from './index';
import {fetchFromServer} from './serverQuery';

/** A verse or passage on a topic, by its first and last verse ids. */
export type TopicSpan = Pick<CommunityTopicVerse, 'startVerse' | 'endVerse'>;

export interface NewReport {
  topic: string;
  verseKey: string;
  reason: ReportReason;
  /** Left out when empty. */
  details?: string;
}

/** Mirrors `topics/{slug}/verses/{key}` in `firestore.rules`. */
function verseRef(slug: string, key: string) {
  return doc(db, 'topics', slug, 'verses', key);
}

/** Mirrors `topics/{slug}/verses/{key}/votes/{uid}` in `firestore.rules`. */
function voteRef(slug: string, key: string, uid: string) {
  return doc(db, 'topics', slug, 'verses', key, 'votes', uid);
}

/** Every verse on the topic with Bible Center upvotes, including ones people added. */
export async function listCommunityVerses(slug: string): Promise<CommunityTopicVerse[]> {
  const documents = await fetchFromServer(query(collection(db, 'topics', slug, 'verses')));

  return documents.map((verse) => {
    const {startVerse, endVerse, upvotes} = verse.data() as CommunityTopicVerse;

    return {startVerse, endVerse, upvotes};
  });
}

/** The keys of the topic's verses this user has upvoted. */
export async function listMyVotes(uid: string, slug: string): Promise<Set<string>> {
  const votes = await fetchFromServer(query(collectionGroup(db, 'votes'), where('uid', '==', uid), where('topic', '==', slug)));

  // A vote sits under its verse, whose id is the verse's key.
  return new Set(votes.flatMap((vote) => vote.ref.parent.parent?.id ?? []));
}

/** The name of a topic someone started, or null if nobody has. */
export async function getStartedTopicName(slug: string): Promise<string | null> {
  const topic = await getDocFromServer(doc(db, 'topics', slug));

  return topic.exists() ? (topic.data() as {name: string}).name : null;
}

/**
 * Adds the user's upvote, creating the verse on the topic at one upvote if nobody has voted on it yet.
 * The vote and the count change together, as the security rules require. With `startTopicName`,
 * it also starts the topic, pending review, if nobody has.
 */
export async function upvoteVerse(uid: string, slug: string, {startVerse, endVerse}: TopicSpan, startTopicName?: string): Promise<void> {
  const key = topicVerseKey(startVerse, endVerse);

  await runTransaction(db, async (transaction) => {
    const topic = startTopicName ? await transaction.get(doc(db, 'topics', slug)) : null;
    const verse = await transaction.get(verseRef(slug, key));

    if (startTopicName && topic && !topic.exists()) {
      transaction.set(doc(db, 'topics', slug), {name: startTopicName, status: 'pending', createdBy: uid, createdAt: serverTimestamp()});
    }

    if (verse.exists()) {
      transaction.update(verseRef(slug, key), {upvotes: (verse.data() as CommunityTopicVerse).upvotes + 1});
    } else {
      transaction.set(verseRef(slug, key), {startVerse, endVerse, upvotes: 1, createdBy: uid, createdAt: serverTimestamp()});
    }

    transaction.set(voteRef(slug, key, uid), {uid, topic: slug, createdAt: serverTimestamp()});
  });
}

/** Removes the user's upvote, and one from the verse's count. */
export async function removeUpvote(uid: string, slug: string, key: string): Promise<void> {
  await runTransaction(db, async (transaction) => {
    const verse = await transaction.get(verseRef(slug, key));

    if (!verse.exists()) {
      return;
    }

    transaction.update(verseRef(slug, key), {upvotes: (verse.data() as CommunityTopicVerse).upvotes - 1});
    transaction.delete(voteRef(slug, key, uid));
  });
}

/** Sends a report for a reviewer. It does not change the ranking. */
export async function reportVerse(uid: string, {topic, verseKey, reason, details}: NewReport): Promise<void> {
  await addDoc(collection(db, 'reports'), {
    topic,
    verseKey,
    reason,
    ...(details ? {details} : {}),
    reportedBy: uid,
    createdAt: serverTimestamp(),
    status: 'open',
  });
}
