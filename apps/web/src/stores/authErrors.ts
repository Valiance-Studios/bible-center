import {FirebaseError} from 'firebase/app';

/** The person dismissed sign-in, which is not a failure. */
const CANCELLED_CODES = new Set(['auth/popup-closed-by-user', 'auth/cancelled-popup-request']);

const MESSAGES: Record<string, string> = {
  'auth/invalid-credential': 'That email or password is incorrect.',
  'auth/wrong-password': 'That email or password is incorrect.',
  'auth/user-not-found': 'That email or password is incorrect.',
  'auth/invalid-email': 'Enter a valid email address.',
  'auth/email-already-in-use': 'An account already uses this email. Sign in instead.',
  'auth/weak-password': 'Choose a longer password.',
  'auth/too-many-requests': 'Too many attempts. Wait a few minutes and try again.',
  'auth/network-request-failed': 'Could not reach the server. Check your connection and try again.',
  'auth/popup-blocked': 'Your browser blocked the sign-in window. Allow pop-ups for this site and try again.',
};

const FALLBACK_MESSAGE = 'That did not work. Try again.';

/** What to tell the person about a failed auth action, or null if there is nothing to report. */
export function authErrorMessage(error: unknown): string | null {
  if (!(error instanceof FirebaseError)) {
    return FALLBACK_MESSAGE;
  }

  if (CANCELLED_CODES.has(error.code)) {
    return null;
  }

  return MESSAGES[error.code] ?? FALLBACK_MESSAGE;
}
