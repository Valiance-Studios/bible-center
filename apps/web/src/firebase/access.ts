import type {User} from 'firebase/auth';
import type {Role} from '@bible-center/core';

import {parseRole} from '@bible-center/core';
import {doc, getDoc} from 'firebase/firestore';
import {db} from './index';

/** Reviewers and admins, keyed by lowercase email. Mirrors `roles` in `firestore.rules`. */
export const ROLES_COLLECTION = 'roles';

/** Accounts an admin blocked, keyed by account id. Mirrors `blockedUsers` in `firestore.rules`. */
export const BLOCKED_USERS_COLLECTION = 'blockedUsers';

/**
 * This user's role, or null until their email is verified. Anyone verified is at least a member; the rules only let
 * a verified email read its own `roles` entry, so check that first.
 */
export async function getAccess(user: User): Promise<Role | null> {
  if (!user.email || !user.emailVerified) {
    return null;
  }

  const role = await getDoc(doc(db, ROLES_COLLECTION, user.email.toLowerCase()));

  return parseRole(role.get('role'));
}

/** Whether an admin blocked this account. The rules let each account read its own entry. */
export async function isAccountBlocked(uid: string): Promise<boolean> {
  return (await getDoc(doc(db, BLOCKED_USERS_COLLECTION, uid))).exists();
}
