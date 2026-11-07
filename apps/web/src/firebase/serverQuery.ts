import type {Query, QueryDocumentSnapshot} from 'firebase/firestore';

import {getDocs} from 'firebase/firestore';

/**
 * The query's documents from the server. Offline, Firestore answers from its cache rather than failing, which
 * would look like there being nothing to show, so an answer from the cache counts as a failure.
 */
export async function fetchFromServer(serverQuery: Query): Promise<QueryDocumentSnapshot[]> {
  const snapshot = await getDocs(serverQuery);

  if (snapshot.metadata.fromCache) {
    throw new Error('Could not reach Firestore.');
  }

  return snapshot.docs;
}
