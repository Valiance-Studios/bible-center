import type {Firestore} from 'firebase/firestore';

import {describe, it} from 'vitest';
import {assertFails, assertSucceeds} from '@firebase/rules-unit-testing';
import {collection, deleteDoc, doc, getDoc, getDocs, query, serverTimestamp, setDoc, updateDoc, where} from 'firebase/firestore';
import {ALICE, BOB, createCounted, dbFor, deleteCounted, MALLORY, useRulesTestEnvironment} from './support';

function annotation(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    type: 'highlight',
    chapterId: '43003',
    startVerse: '43003016',
    endVerse: '43003018',
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    ...overrides,
  };
}

function annotationsOf(db: Firestore, uid: string) {
  return collection(db, 'users', uid, 'annotations');
}

/** Adds an annotation the way the app does, counting it on the owner's record. */
function addAnnotation(db: Firestore, uid: string, data: Record<string, unknown>) {
  return createCounted(doc(annotationsOf(db, uid)), data, 'annotationCount');
}

useRulesTestEnvironment(async (db) => {
  // Bob has as many annotations as anyone may keep.
  await setDoc(doc(db, 'users', BOB), {annotationCount: 5000});
  await setDoc(doc(db, 'users', ALICE, 'annotations', 'existing'), annotation());
  await setDoc(doc(db, 'users', ALICE, 'annotations', 'existing-note'), annotation({type: 'note', text: 'Old words.'}));
});

describe('annotations', () => {
  it('lets an allowlisted user manage their own', async () => {
    const db = dbFor(ALICE);

    await assertSucceeds(addAnnotation(db, ALICE, annotation()));
    await assertSucceeds(getDocs(query(annotationsOf(db, ALICE), where('chapterId', '==', '43003'))));
    // My verses lists all of them at once.
    await assertSucceeds(getDocs(annotationsOf(db, ALICE)));
    // Once counted, every delete lowers the count, even of an annotation made before counts.
    await assertSucceeds(deleteCounted(doc(annotationsOf(db, ALICE), 'existing'), 'annotationCount', 'annotationChange'));
  });

  it('accepts a single verse, a range, and each type', async () => {
    const db = dbFor(ALICE);

    await assertSucceeds(addAnnotation(db, ALICE, annotation({startVerse: '43003016', endVerse: '43003016'})));
    await assertSucceeds(addAnnotation(db, ALICE, annotation({type: 'bookmark'})));
    await assertSucceeds(addAnnotation(db, ALICE, annotation({type: 'note', text: 'My note.'})));
  });

  it('never lets one user reach another user\'s', async () => {
    const db = dbFor(BOB);

    await assertFails(getDocs(annotationsOf(db, ALICE)));
    await assertFails(getDoc(doc(annotationsOf(db, ALICE), 'existing')));
    await assertFails(addAnnotation(db, ALICE, annotation()));
    await assertFails(deleteDoc(doc(annotationsOf(db, ALICE), 'existing')));
  });

  it('requires the allowlist, a verified email and a sign-in', async () => {
    await assertFails(addAnnotation(dbFor(MALLORY), MALLORY, annotation()));
    await assertFails(getDocs(annotationsOf(dbFor(MALLORY), MALLORY)));
    await assertFails(addAnnotation(dbFor(ALICE, false), ALICE, annotation()));
    await assertFails(getDocs(annotationsOf(dbFor(null), ALICE)));
  });

  it.each([
    ['an unknown type', {type: 'scribble'}],
    ['an extra field', {color: 'red'}],
    ['a malformed verse id', {startVerse: '4300316'}],
    ['a backwards range', {startVerse: '43003018', endVerse: '43003016'}],
    ['a range across chapters', {endVerse: '43004001'}],
    ['a chapter id that does not match', {chapterId: '43004'}],
    ['text on a highlight', {text: 'Not a note.'}],
    ['a note with no text', {type: 'note'}],
    ['a blank note', {type: 'note', text: '   '}],
    ['an oversized note', {type: 'note', text: 'x'.repeat(2001)}],
    ['a client-chosen time', {createdAt: new Date(0)}],
  ])('rejects %s', async (_, overrides) => {
    await assertFails(addAnnotation(dbFor(ALICE), ALICE, annotation(overrides)));
  });

  it('requires both timestamps', async () => {
    const db = dbFor(ALICE);
    const withoutCreated = annotation();
    const withoutUpdated = annotation();

    delete withoutCreated['createdAt'];
    delete withoutUpdated['updatedAt'];

    await assertFails(addAnnotation(db, ALICE, withoutCreated));
    await assertFails(addAnnotation(db, ALICE, withoutUpdated));
  });

  it('accepts a note at the maximum length', async () => {
    await assertSucceeds(addAnnotation(dbFor(ALICE), ALICE, annotation({type: 'note', text: 'x'.repeat(2000)})));
  });

  it('only lets a note\'s words change', async () => {
    const note = doc(annotationsOf(dbFor(ALICE), ALICE), 'existing-note');

    await assertSucceeds(updateDoc(note, {text: 'New words.', updatedAt: serverTimestamp()}));
    await assertFails(updateDoc(note, {endVerse: '43003020', updatedAt: serverTimestamp()}));
    await assertFails(updateDoc(note, {text: '', updatedAt: serverTimestamp()}));
  });
});

describe('annotation limits', () => {
  it('counts each one on the owner\'s record, in the same write', async () => {
    const db = dbFor(ALICE);

    await assertFails(setDoc(doc(annotationsOf(db, ALICE)), annotation()));
    await assertSucceeds(addAnnotation(db, ALICE, annotation()));
  });

  it('refuses one past the limit', async () => {
    await assertFails(addAnnotation(dbFor(BOB), BOB, annotation()));
  });

  it('only lowers the count when the annotation it names is deleted in the same write', async () => {
    const db = dbFor(ALICE);
    const added = doc(annotationsOf(db, ALICE), 'added');

    await assertSucceeds(createCounted(added, annotation(), 'annotationCount'));
    // Lowering the count without deleting, or naming one that stays.
    await assertFails(setDoc(doc(db, 'users', ALICE), {annotationCount: 0}, {merge: true}));
    await assertFails(setDoc(doc(db, 'users', ALICE), {annotationCount: 0, annotationChange: 'existing'}, {merge: true}));
    // Deleting without lowering the count.
    await assertFails(deleteDoc(added));
    await assertSucceeds(deleteCounted(added, 'annotationCount', 'annotationChange'));
  });

  it('lets annotations from before counts be deleted without one', async () => {
    await assertSucceeds(deleteDoc(doc(annotationsOf(dbFor(ALICE), ALICE), 'existing')));
  });
});

describe('user settings', () => {
  it('lets a user save and read their translation', async () => {
    const settings = doc(dbFor(ALICE), 'users', ALICE);

    await assertSucceeds(setDoc(settings, {translationId: 'kjv'}));
    await assertSucceeds(getDoc(settings));
  });

  it('rejects an unknown translation or extra fields', async () => {
    const settings = doc(dbFor(ALICE), 'users', ALICE);

    await assertFails(setDoc(settings, {translationId: 'not-a-translation'}));
    await assertFails(setDoc(settings, {translationId: 'kjv', isAdmin: true}));
  });

  it('records when the account was first seen, once, as the server\'s time', async () => {
    const record = doc(dbFor(ALICE), 'users', ALICE);

    await assertFails(setDoc(record, {createdAt: new Date(0)}));
    await assertSucceeds(setDoc(record, {createdAt: serverTimestamp()}));
    await assertSucceeds(setDoc(record, {translationId: 'kjv'}, {merge: true}));
    await assertFails(updateDoc(record, {createdAt: serverTimestamp()}));
    await assertFails(updateDoc(record, {createdAt: new Date(0)}));
    // Saving settings without merging would erase it.
    await assertFails(setDoc(record, {translationId: 'bsb'}));
  });

  it('lets an existing record gain a first-seen time, but not a backdated one', async () => {
    const record = doc(dbFor(ALICE), 'users', ALICE);

    await assertSucceeds(setDoc(record, {translationId: 'kjv'}));
    await assertFails(updateDoc(record, {createdAt: new Date(0)}));
    await assertSucceeds(updateDoc(record, {createdAt: serverTimestamp()}));
  });

  it('keeps them private', async () => {
    await assertFails(getDoc(doc(dbFor(BOB), 'users', ALICE)));
    await assertFails(setDoc(doc(dbFor(BOB), 'users', ALICE), {translationId: 'kjv'}));
    await assertFails(setDoc(doc(dbFor(MALLORY), 'users', MALLORY), {translationId: 'kjv'}));
  });
});
