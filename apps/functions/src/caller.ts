import type {CallableRequest} from 'firebase-functions/v2/https';

import {HttpsError} from 'firebase-functions/v2/https';
import {db} from './firebase.ts';

/** Someone calling a function, as their verified ID token names them. */
export interface Caller {
  uid: string;
  /** Lowercase, as `roles` keys it. */
  email: string;
}

/** A signed-in caller acting on their own account. */
export interface AccountHolder {
  uid: string;
  /** Lowercase, and only when verified, since anyone can register a password account with someone else's address. */
  verifiedEmail: string | null;
}

/** The caller, if they are signed in. Their email counts only once verified. */
export function requireSignedIn(auth: CallableRequest['auth']): AccountHolder {
  if (!auth) {
    throw new HttpsError('unauthenticated', 'Sign in first.');
  }

  const email = typeof auth.token.email === 'string' && auth.token.email_verified === true ? auth.token.email.toLowerCase() : null;

  return {uid: auth.uid, verifiedEmail: email};
}

/**
 * The caller, if they are a signed-in admin with a verified email who is not blocked. The same checks as `isAdmin`
 * in `firestore.rules`, since the Admin SDK skips the rules.
 */
export async function requireAdmin(auth: CallableRequest['auth']): Promise<Caller> {
  const email = typeof auth?.token.email === 'string' ? auth.token.email.toLowerCase() : null;

  if (!auth || !email || auth.token.email_verified !== true) {
    throw new HttpsError('unauthenticated', 'Sign in with a verified email.');
  }

  const [role, blocked] = await Promise.all([
    db.doc(`roles/${email}`).get(),
    db.doc(`blockedUsers/${auth.uid}`).get(),
  ]);

  if (role.get('role') !== 'admin' || blocked.exists) {
    throw new HttpsError('permission-denied', 'Only admins can do this.');
  }

  return {uid: auth.uid, email};
}
