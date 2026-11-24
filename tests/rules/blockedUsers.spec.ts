import type {Firestore} from 'firebase/firestore';

import {describe, it} from 'vite-plus/test';
import {assertFails, assertSucceeds} from '@firebase/rules-unit-testing';
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  runTransaction,
  serverTimestamp,
  setDoc,
  updateDoc,
} from 'firebase/firestore';
import {ADA, ALICE, BOB, createCounted, createStamped, dbFor, RITA, useRulesTestEnvironment} from './support';

const TOPIC = 'grief';
const VERSE = '19147003';
const A_MONTH_AGO = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

function blocked(uid: string) {
  return {
    email: `${uid}@example.com`,
    blockedBy: ADA,
    blockedByEmail: 'ada@example.com',
    blockedAt: new Date(),
    contentRemoved: false,
  };
}

function annotation() {
  return {
    type: 'highlight',
    chapterId: '43003',
    startVerse: '43003016',
    endVerse: '43003016',
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };
}

/** Adds a verse to a topic with its adder's vote, as the app does. */
function addVerse(db: Firestore, uid: string) {
  return runTransaction(db, async (transaction) => {
    transaction.set(doc(db, 'topics', TOPIC, 'verses', VERSE), {
      startVerse: VERSE,
      endVerse: VERSE,
      upvotes: 1,
      createdBy: uid,
      createdAt: serverTimestamp(),
    });
    transaction.set(doc(db, 'topics', TOPIC, 'verses', VERSE, 'votes', uid), {
      uid,
      topic: TOPIC,
      createdAt: serverTimestamp(),
    });
  });
}

useRulesTestEnvironment(async (db) => {
  // Bob is a member old enough to vote, and Rita a reviewer; both are blocked.
  await setDoc(doc(db, 'users', BOB), {createdAt: A_MONTH_AGO});
  await setDoc(doc(db, 'users', ALICE), {createdAt: A_MONTH_AGO});
  await setDoc(doc(db, 'users', BOB, 'annotations', 'existing'), {
    ...annotation(),
    createdAt: new Date(),
    updatedAt: new Date(),
  });
  await setDoc(doc(db, 'blockedUsers', BOB), blocked(BOB));
  await setDoc(doc(db, 'blockedUsers', RITA), blocked(RITA));
  await setDoc(doc(db, 'topics', 'screen-time'), {
    name: 'screen time',
    status: 'pending',
    createdBy: ALICE,
    createdAt: new Date(),
  });
});

describe('a blocked account', () => {
  it('can still read its own things', async () => {
    await assertSucceeds(getDocs(collection(dbFor(BOB), 'users', BOB, 'annotations')));
    await assertSucceeds(getDoc(doc(dbFor(BOB), 'users', BOB)));
  });

  it('cannot save anything', async () => {
    const db = dbFor(BOB);

    await assertFails(createCounted(doc(collection(db, 'users', BOB, 'annotations')), annotation(), 'annotationCount'));
    await assertFails(deleteDoc(doc(db, 'users', BOB, 'annotations', 'existing')));
    await assertFails(setDoc(doc(db, 'users', BOB), {translationId: 'kjv'}, {merge: true}));
    await assertFails(addVerse(db, BOB));
    await assertFails(
      createStamped(
        BOB,
        doc(collection(db, 'reports')),
        {
          topic: TOPIC,
          verseKey: VERSE,
          reason: 'fit',
          reportedBy: BOB,
          createdAt: serverTimestamp(),
          status: 'open',
        },
        'lastReportAt',
      ),
    );
  });

  it('cannot review, even with a reviewer role', async () => {
    await assertFails(
      updateDoc(doc(dbFor(RITA), 'topics', 'screen-time'), {
        status: 'approved',
        reviewedBy: RITA,
        reviewedAt: serverTimestamp(),
      }),
    );
  });

  it('leaves everyone else able to save', async () => {
    await assertSucceeds(addVerse(dbFor(ALICE), ALICE));
  });
});

describe('blocked accounts', () => {
  it('let an admin list and unblock them', async () => {
    await assertSucceeds(getDocs(collection(dbFor(ADA), 'blockedUsers')));
    await assertSucceeds(deleteDoc(doc(dbFor(ADA), 'blockedUsers', BOB)));
  });

  it("let someone check whether they are blocked, but nobody else's", async () => {
    await assertSucceeds(getDoc(doc(dbFor(BOB), 'blockedUsers', BOB)));
    await assertFails(getDoc(doc(dbFor(ALICE), 'blockedUsers', BOB)));
    await assertFails(getDocs(collection(dbFor(ALICE), 'blockedUsers')));
  });

  it('are written only by the blockAccount function, never directly', async () => {
    await assertFails(setDoc(doc(dbFor(ADA), 'blockedUsers', ALICE), blocked(ALICE)));
    await assertFails(setDoc(doc(dbFor(BOB), 'blockedUsers', BOB), blocked(BOB)));
    await assertFails(deleteDoc(doc(dbFor(BOB), 'blockedUsers', BOB)));
  });
});

describe('account records', () => {
  it('let an admin see when an account joined, but not a reviewer or another member', async () => {
    await assertSucceeds(getDoc(doc(dbFor(ADA), 'users', ALICE)));
    await assertFails(getDoc(doc(dbFor(RITA), 'users', ALICE)));
    await assertFails(getDoc(doc(dbFor(BOB), 'users', ALICE)));
  });
});
