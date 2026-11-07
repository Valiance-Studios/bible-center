import type {User} from 'firebase/auth';
import type {Role} from '@bible-center/core';

import {parseRole} from '@bible-center/core';
import {doc, getDoc} from 'firebase/firestore';
import {db} from './index';

/** Keyed by lowercase email, with each person's role. Mirrors `allowedUsers` in `firestore.rules`. */
export const ALLOWED_USERS_COLLECTION = 'allowedUsers';

/**
 * This user's role, or null if they are not on the allowlist. The rules only answer for a verified email,
 * so check that first.
 */
export async function getAccess(user: User): Promise<Role | null> {
  if (!user.email || !user.emailVerified) {
    return null;
  }

  const snapshot = await getDoc(doc(db, ALLOWED_USERS_COLLECTION, user.email.toLowerCase()));

  return snapshot.exists() ? parseRole(snapshot.get('role')) : null;
}
