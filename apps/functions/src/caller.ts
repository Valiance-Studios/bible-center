import type {CallableRequest} from 'firebase-functions/v2/https';

import {HttpsError} from 'firebase-functions/v2/https';
import {db} from './firebase.ts';

/** Someone calling a function, as their verified ID token names them. */
export interface Caller {
  uid: string;
  /** Lowercase, as `roles` keys it. */
  email: string;
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
