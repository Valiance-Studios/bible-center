import {TEMPORARY_EMAIL_ERROR} from '@bible-center/core';
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
  'auth/invalid-verification-code': 'That code did not match. Codes change every 30 seconds; try the current one.',
};

/** What `checkSignUpEmail` refusing a sign-up looks like to the person. */
const TEMPORARY_EMAIL_MESSAGE =
  'Bible Center does not accept sign-ups from temporary email services. Use an email address you keep, such as a personal or work one.';

const FALLBACK_MESSAGE = 'That did not work. Try again.';

/** What to tell the person about a failed auth action, or null if there is nothing to report. */
export function authErrorMessage(error: unknown): string | null {
  if (!(error instanceof FirebaseError)) {
    return FALLBACK_MESSAGE;
  }

  if (CANCELLED_CODES.has(error.code)) {
    return null;
  }

  // Firebase passes on the blocking function's refusal as an internal error, with its message inside.
  if (error.message.includes(TEMPORARY_EMAIL_ERROR)) {
    return TEMPORARY_EMAIL_MESSAGE;
  }

  return MESSAGES[error.code] ?? FALLBACK_MESSAGE;
}
