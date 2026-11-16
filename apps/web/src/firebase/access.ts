import type {User} from 'firebase/auth';
import type {Role} from '@bible-center/core';

import {parseRole} from '@bible-center/core';
import {doc, getDoc} from 'firebase/firestore';
import {db} from './index';

/** Who can sign in, keyed by lowercase email. Mirrors `allowedUsers` in `firestore.rules`. */
export const ALLOWED_USERS_COLLECTION = 'allowedUsers';

/** Reviewers and admins, keyed by lowercase email. Mirrors `roles` in `firestore.rules`. */
export const ROLES_COLLECTION = 'roles';

/** Accounts an admin blocked, keyed by account id. Mirrors `blockedUsers` in `firestore.rules`. */
export const BLOCKED_USERS_COLLECTION = 'blockedUsers';

/** Whether an admin blocked this account. The rules let each account read its own entry. */
export async function isAccountBlocked(uid: string): Promise<boolean> {
  return (await getDoc(doc(db, BLOCKED_USERS_COLLECTION, uid))).exists();
}

/**
 * This user's role, or null if they are not on the allowlist. The rules only answer for a verified email,
 * so check that first.
 */
export async function getAccess(user: User): Promise<Role | null> {
  if (!user.email || !user.emailVerified) {
    return null;
  }

  const email = user.email.toLowerCase();
  const [allowed, role] = await Promise.all([
    getDoc(doc(db, ALLOWED_USERS_COLLECTION, email)),
    getDoc(doc(db, ROLES_COLLECTION, email)),
  ]);

  return allowed.exists() ? parseRole(role.get('role')) : null;
}
