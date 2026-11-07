import type {User} from 'firebase/auth';

import {doc, getDoc} from 'firebase/firestore';
import {db} from './index';

/** Keyed by lowercase email; managed in the Firebase console. Mirrors `allowedUsers` in `firestore.rules`. */
const ALLOWED_USERS_COLLECTION = 'allowedUsers';

/** Whether this user is on the allowlist. The rules only answer for a verified email, so check that first. */
export async function isOnAllowlist(user: User): Promise<boolean> {
  if (!user.email || !user.emailVerified) {
    return false;
  }

  const snapshot = await getDoc(doc(db, ALLOWED_USERS_COLLECTION, user.email.toLowerCase()));

  return snapshot.exists();
}
