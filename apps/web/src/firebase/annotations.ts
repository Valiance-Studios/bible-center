import type {Annotation} from '@bible-center/core';

import {addDoc, collection, deleteDoc, doc, getDocs, query, serverTimestamp, updateDoc, where} from 'firebase/firestore';
import {db} from './index';

export type NewAnnotation = Omit<Annotation, 'id'>;

/** Mirrors `users/{uid}/annotations` in `firestore.rules`. */
function annotationsOf(uid: string) {
  return collection(db, 'users', uid, 'annotations');
}

export async function listChapterAnnotations(uid: string, chapterId: string): Promise<Annotation[]> {
  const snapshot = await getDocs(query(annotationsOf(uid), where('chapterId', '==', chapterId)));

  // Offline, Firestore answers from its empty cache rather than failing, which would look like having no annotations.
  if (snapshot.metadata.fromCache) {
    throw new Error('Could not reach Firestore to load annotations.');
  }

  return snapshot.docs.map((annotation) => {
    const {type, startVerse, endVerse, text} = annotation.data() as NewAnnotation;

    return {id: annotation.id, type, chapterId, startVerse, endVerse, ...(text === undefined ? {} : {text})};
  });
}

export async function addAnnotation(uid: string, annotation: NewAnnotation): Promise<void> {
  await addDoc(annotationsOf(uid), {...annotation, createdAt: serverTimestamp(), updatedAt: serverTimestamp()});
}

export async function updateNoteText(uid: string, annotationId: string, text: string): Promise<void> {
  await updateDoc(doc(annotationsOf(uid), annotationId), {text, updatedAt: serverTimestamp()});
}

export async function removeAnnotation(uid: string, annotationId: string): Promise<void> {
  await deleteDoc(doc(annotationsOf(uid), annotationId));
}
