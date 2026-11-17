import {isValid} from 'mailchecker';
import {HttpsError} from 'firebase-functions/v2/https';

/**
 * In the error a refused sign-up gets, so the app can tell it from others. Keep in sync with
 * `TEMPORARY_EMAIL_ERROR` in `packages/core/src/accounts.ts`.
 */
export const TEMPORARY_EMAIL_ERROR = 'temporary-email-service';

/**
 * Refuses a new account whose email is from a temporary email service, from mailchecker's list. Runs before Firebase
 * creates any account, by email or Google, so existing accounts are never affected.
 */
export function checkSignUpEmail(email: string | undefined): void {
  if (email && !isValid(email)) {
    throw new HttpsError('invalid-argument', TEMPORARY_EMAIL_ERROR);
  }
}
