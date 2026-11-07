import type {Annotation, AnnotationOrder, AnnotationType} from '@bible-center/core';
import type {Query, QueryConstraint, QueryDocumentSnapshot} from 'firebase/firestore';

import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  limit,
  orderBy,
  query,
  serverTimestamp,
  startAfter,
  updateDoc,
  where,
} from 'firebase/firestore';
import {db} from './index';

export type NewAnnotation = Omit<Annotation, 'id'>;

/** Where the next page of annotations starts. Only this module looks inside it. */
export type AnnotationCursor = QueryDocumentSnapshot;

export interface AnnotationPageRequest {
  /** Only annotations of this type, or every type when null. */
  type: AnnotationType | null;
  order: AnnotationOrder;
  /** The previous page's `next`, or null for the first page. */
  after: AnnotationCursor | null;
  pageSize: number;
}

export interface AnnotationPage {
  annotations: Annotation[];
  /** Null when this is the last page. */
  next: AnnotationCursor | null;
}

/**
 * Verse ids sort canonically as plain strings, so Bible order is theirs. Firestore breaks ties by document id.
 * Each ordering, alone and after a type filter, needs an index in `firestore.indexes.json`.
 */
const ORDERINGS: Record<AnnotationOrder, QueryConstraint[]> = {
  recent: [orderBy('createdAt', 'desc')],
  bible: [orderBy('startVerse'), orderBy('endVerse')],
};

/** Mirrors `users/{uid}/annotations` in `firestore.rules`. */
function annotationsOf(uid: string) {
  return collection(db, 'users', uid, 'annotations');
}

/** The query's documents from the server. */
async function fetchFromServer(annotationQuery: Query): Promise<QueryDocumentSnapshot[]> {
  const snapshot = await getDocs(annotationQuery);

  // Offline, Firestore answers from its empty cache rather than failing, which would look like having no annotations.
  if (snapshot.metadata.fromCache) {
    throw new Error('Could not reach Firestore to load annotations.');
  }

  return snapshot.docs;
}

function toAnnotation(document: QueryDocumentSnapshot): Annotation {
  const {type, chapterId, startVerse, endVerse, text} = document.data() as NewAnnotation;

  return {id: document.id, type, chapterId, startVerse, endVerse, ...(text === undefined ? {} : {text})};
}

export async function listChapterAnnotations(uid: string, chapterId: string): Promise<Annotation[]> {
  const documents = await fetchFromServer(query(annotationsOf(uid), where('chapterId', '==', chapterId)));

  return documents.map(toAnnotation);
}

/** One page of a user's annotations. It asks for one more than a page, to know whether another follows. */
export async function listAnnotationPage(uid: string, {type, order, after, pageSize}: AnnotationPageRequest): Promise<AnnotationPage> {
  const documents = await fetchFromServer(query(
    annotationsOf(uid),
    ...(type ? [where('type', '==', type)] : []),
    ...ORDERINGS[order],
    ...(after ? [startAfter(after)] : []),
    limit(pageSize + 1),
  ));
  const page = documents.slice(0, pageSize);

  return {annotations: page.map(toAnnotation), next: documents.length > pageSize ? page.at(-1) ?? null : null};
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
