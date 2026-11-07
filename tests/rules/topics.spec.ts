import type {Firestore} from 'firebase/firestore';

import {describe, it} from 'vitest';
import {assertFails, assertSucceeds} from '@firebase/rules-unit-testing';
import {
  addDoc,
  collection,
  collectionGroup,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  increment,
  query,
  runTransaction,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  writeBatch,
} from 'firebase/firestore';
import {ALICE, BOB, dbFor, MALLORY, useRulesTestEnvironment} from './support';

const TOPIC = 'grief';
/** Already has Bob's upvote. */
const VOTED = '40005004';
/** Has no Bible Center votes yet. */
const UNVOTED = '19147003';

function verseRef(db: Firestore, key: string, topic = TOPIC) {
  return doc(db, 'topics', topic, 'verses', key);
}

function voteRef(db: Firestore, key: string, uid: string, topic = TOPIC) {
  return doc(db, 'topics', topic, 'verses', key, 'votes', uid);
}

function vote(uid: string, topic = TOPIC) {
  return {uid, topic, createdAt: serverTimestamp()};
}

function newVerse(uid: string, startVerse: string, endVerse = startVerse) {
  return {startVerse, endVerse, upvotes: 1, createdBy: uid, createdAt: serverTimestamp()};
}

/** Upvotes the way the app does: read the count, then write it and the vote together. */
function upvote(db: Firestore, uid: string, startVerse: string, endVerse = startVerse, topic = TOPIC) {
  const key = startVerse === endVerse ? startVerse : `${startVerse}-${endVerse}`;

  return runTransaction(db, async (transaction) => {
    const verse = await transaction.get(verseRef(db, key, topic));

    if (verse.exists()) {
      transaction.update(verseRef(db, key, topic), {upvotes: (verse.data().upvotes as number) + 1});
    } else {
      transaction.set(verseRef(db, key, topic), newVerse(uid, startVerse, endVerse));
    }

    transaction.set(voteRef(db, key, uid, topic), vote(uid, topic));
  });
}

function removeUpvote(db: Firestore, uid: string, key: string) {
  return runTransaction(db, async (transaction) => {
    const verse = await transaction.get(verseRef(db, key));

    transaction.update(verseRef(db, key), {upvotes: (verse.data()?.upvotes as number) - 1});
    transaction.delete(voteRef(db, key, uid));
  });
}

async function upvotesOf(key: string): Promise<unknown> {
  return (await getDoc(verseRef(dbFor(null), key))).data()?.upvotes;
}

useRulesTestEnvironment(async (db) => {
  await setDoc(verseRef(db, VOTED), {startVerse: VOTED, endVerse: VOTED, upvotes: 1, createdBy: BOB, createdAt: new Date()});
  await setDoc(voteRef(db, VOTED, BOB), {uid: BOB, topic: TOPIC, createdAt: new Date()});
});

describe('topic votes', () => {
  it('lets anyone read the counts', async () => {
    await assertSucceeds(getDocs(collection(dbFor(null), 'topics', TOPIC, 'verses')));
  });

  it('counts a first upvote, and later ones, and lets each be removed', async () => {
    await assertSucceeds(upvote(dbFor(ALICE), ALICE, UNVOTED));
    await assertSucceeds(upvote(dbFor(BOB), BOB, UNVOTED));
    await assertSucceeds(upvote(dbFor(ALICE), ALICE, VOTED));
    await assertSucceeds(removeUpvote(dbFor(BOB), BOB, VOTED));

    if (await upvotesOf(UNVOTED) !== 2 || await upvotesOf(VOTED) !== 1) {
      throw new Error('The counts did not follow the votes.');
    }
  });

  it('accepts a passage keyed by both of its verse ids', async () => {
    await assertSucceeds(upvote(dbFor(ALICE), ALICE, '40011028', '40011030'));
  });

  it('allows one vote per user', async () => {
    await assertFails(upvote(dbFor(BOB), BOB, VOTED));
  });

  it('never lets a count change without a matching vote', async () => {
    const db = dbFor(ALICE);

    await assertFails(updateDoc(verseRef(db, VOTED), {upvotes: 500}));
    await assertFails(updateDoc(verseRef(db, VOTED), {upvotes: increment(1)}));
    await assertFails(setDoc(verseRef(db, UNVOTED), newVerse(ALICE, UNVOTED)));

    // A vote with the count moving by more than one.
    const batch = writeBatch(db);

    batch.update(verseRef(db, VOTED), {upvotes: 3});
    batch.set(voteRef(db, VOTED, ALICE), vote(ALICE));
    await assertFails(batch.commit());
  });

  it('never lets a vote appear or disappear without the count', async () => {
    await assertFails(setDoc(voteRef(dbFor(ALICE), VOTED, ALICE), vote(ALICE)));
    await assertFails(deleteDoc(voteRef(dbFor(BOB), VOTED, BOB)));

    // Lowering the count while keeping the vote.
    await assertFails(updateDoc(verseRef(dbFor(BOB), VOTED), {upvotes: 0}));
  });

  it('only lets people vote as themselves', async () => {
    const db = dbFor(ALICE);
    const batch = writeBatch(db);

    batch.update(verseRef(db, VOTED), {upvotes: 2});
    batch.set(voteRef(db, VOTED, MALLORY), vote(MALLORY));
    await assertFails(batch.commit());
    await assertFails(removeUpvote(db, BOB, VOTED));
  });

  it('checks a new verse\'s key, ids and fields', async () => {
    const db = dbFor(ALICE);
    const withVerse = (key: string, verse: Record<string, unknown>) => {
      const batch = writeBatch(db);

      batch.set(verseRef(db, key), verse);
      batch.set(voteRef(db, key, ALICE), vote(ALICE));

      return batch.commit();
    };

    await assertFails(withVerse('19147004', newVerse(ALICE, UNVOTED)));
    await assertFails(withVerse('40011030-40011028', newVerse(ALICE, '40011030', '40011028')));
    await assertFails(withVerse('nonsense', newVerse(ALICE, 'nonsense')));
    await assertFails(withVerse(UNVOTED, {...newVerse(ALICE, UNVOTED), upvotes: 2}));
    await assertFails(withVerse(UNVOTED, {...newVerse(ALICE, UNVOTED), createdBy: BOB}));
    await assertFails(withVerse(UNVOTED, {...newVerse(ALICE, UNVOTED), note: 'extra'}));
  });

  it('requires the allowlist and a sign-in', async () => {
    await assertFails(upvote(dbFor(MALLORY), MALLORY, UNVOTED));
    await assertFails(upvote(dbFor(ALICE, false), ALICE, UNVOTED));
  });

  it('keeps each person\'s votes private to them', async () => {
    const mine = (uid: string) => query(collectionGroup(dbFor(uid), 'votes'), where('uid', '==', uid), where('topic', '==', TOPIC));

    await assertSucceeds(getDocs(mine(BOB)));
    await assertFails(getDocs(query(collectionGroup(dbFor(ALICE), 'votes'), where('uid', '==', BOB))));
    await assertFails(getDoc(voteRef(dbFor(null), VOTED, BOB)));
  });
});

describe('started topics', () => {
  function topic(overrides: Record<string, unknown> = {}) {
    return {name: 'screen time', status: 'pending', createdBy: ALICE, createdAt: serverTimestamp(), ...overrides};
  }

  it('lets an allowlisted user start one, pending review, with its first verse', async () => {
    const db = dbFor(ALICE);

    await assertSucceeds(setDoc(doc(db, 'topics', 'screen-time'), topic()));
    await assertSucceeds(upvote(db, ALICE, UNVOTED, UNVOTED, 'screen-time'));
    await assertSucceeds(getDoc(doc(dbFor(null), 'topics', 'screen-time')));
  });

  it('requires a normalized name that matches its slug', async () => {
    const db = dbFor(ALICE);

    await assertFails(setDoc(doc(db, 'topics', 'screen-time'), topic({name: 'Screen time'})));
    await assertFails(setDoc(doc(db, 'topics', 'screen-time'), topic({name: 'screen  time'})));
    await assertFails(setDoc(doc(db, 'topics', 'screen-time'), topic({name: 'social media'})));
    await assertFails(setDoc(doc(db, 'topics', 'Screen-Time'), topic()));
    await assertSucceeds(setDoc(doc(db, 'topics', 'self-control'), topic({name: 'self-control'})));
  });

  it('cannot be approved, changed or started for someone else', async () => {
    const db = dbFor(ALICE);

    await assertFails(setDoc(doc(db, 'topics', 'screen-time'), topic({status: 'approved'})));
    await assertFails(setDoc(doc(db, 'topics', 'screen-time'), topic({createdBy: BOB})));
    await assertSucceeds(setDoc(doc(db, 'topics', 'screen-time'), topic()));
    await assertFails(updateDoc(doc(db, 'topics', 'screen-time'), {status: 'approved'}));
    await assertFails(setDoc(doc(dbFor(MALLORY), 'topics', 'other'), topic({name: 'other', createdBy: MALLORY})));
  });
});

describe('reports', () => {
  function report(overrides: Record<string, unknown> = {}) {
    return {topic: TOPIC, verseKey: VOTED, reason: 'fit', reportedBy: ALICE, createdAt: serverTimestamp(), status: 'open', ...overrides};
  }

  it('lets an allowlisted user report a verse, with optional details', async () => {
    const db = dbFor(ALICE);

    await assertSucceeds(addDoc(collection(db, 'reports'), report()));
    await assertSucceeds(addDoc(collection(db, 'reports'), report({reason: 'other', details: 'x'.repeat(500)})));
  });

  it('checks the reason, details, reporter and status', async () => {
    const db = dbFor(ALICE);

    await assertFails(addDoc(collection(db, 'reports'), report({reason: 'boring'})));
    await assertFails(addDoc(collection(db, 'reports'), report({details: 'x'.repeat(501)})));
    await assertFails(addDoc(collection(db, 'reports'), report({reportedBy: BOB})));
    await assertFails(addDoc(collection(db, 'reports'), report({status: 'resolved'})));
    await assertFails(addDoc(collection(db, 'reports'), report({verseKey: 'nonsense'})));
    await assertFails(addDoc(collection(dbFor(MALLORY), 'reports'), report({reportedBy: MALLORY})));
  });

  it('keeps reports out of reach of the app', async () => {
    await assertFails(getDocs(collection(dbFor(ALICE), 'reports')));
  });
});
