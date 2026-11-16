import {FieldValue} from 'firebase-admin/firestore';
import {db} from './firebase.ts';

/**
 * Takes away each of this account's upvotes, one transaction per vote so each verse's count moves with its vote,
 * as the security rules keep it for people voting themselves.
 */
export async function removeVotes(uid: string): Promise<void> {
  const votes = await db.collectionGroup('votes').where('uid', '==', uid).get();

  for (const vote of votes.docs) {
    const verseRef = vote.ref.parent.parent;

    await db.runTransaction(async (transaction) => {
      const verse = verseRef ? await transaction.get(verseRef) : null;
      const upvotes: unknown = verse?.get('upvotes');

      if (verseRef && typeof upvotes === 'number' && upvotes > 0) {
        transaction.update(verseRef, {upvotes: upvotes - 1});
      }

      transaction.delete(vote.ref);
    });
  }
}

/** Deletes every report this account sent, open or closed. */
export async function deleteReports(uid: string): Promise<void> {
  const reports = await db.collection('reports').where('reportedBy', '==', uid).get();

  await Promise.all(reports.docs.map((report) => report.ref.delete()));
}

/**
 * Keeps the verses this account added and the topics it started, which others may rely on, but removes the account id
 * from them, so nothing links them to it.
 */
export async function unlinkAddedContent(uid: string): Promise<void> {
  const [verses, topics] = await Promise.all([
    db.collectionGroup('verses').where('createdBy', '==', uid).get(),
    db.collection('topics').where('createdBy', '==', uid).get(),
  ]);

  await Promise.all([...verses.docs, ...topics.docs].map((document) => document.ref.update({createdBy: FieldValue.delete()})));
}

/**
 * Removes what this account made public: deletes the verses it added, with their votes, and rejects the topics it
 * started, which hides them and closes them to new verses. `adminUid` is recorded as the reviewer.
 */
export async function removeAddedContent(uid: string, adminUid: string): Promise<void> {
  const [verses, topics] = await Promise.all([
    db.collectionGroup('verses').where('createdBy', '==', uid).get(),
    db.collection('topics').where('createdBy', '==', uid).get(),
  ]);

  await Promise.all(verses.docs.map((verse) => db.recursiveDelete(verse.ref)));
  await Promise.all(topics.docs
    .filter((topic) => topic.get('status') !== 'rejected')
    .map((topic) => topic.ref.update({status: 'rejected', reviewedBy: adminUid, reviewedAt: FieldValue.serverTimestamp()})));
}
