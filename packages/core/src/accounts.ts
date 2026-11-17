/**
 * Blocking and deleting accounts, shared by the app and `apps/functions`, which imports only these types.
 * Keep in sync with `blockedUsers` in `firestore.rules`.
 */

/** What an admin asks the `blockAccount` function to do: block one account, found by email or account id. */
export type BlockAccountRequest = ({email: string} | {uid: string}) & {
  /** Also remove their upvotes, the verses they added, the topics they started and their reports. */
  removeContent: boolean;
};

/** The account `blockAccount` blocked. */
export interface BlockAccountResult {
  uid: string;
  email: string | null;
}

/** `blockedUsers/{uid}`, written only by `blockAccount`. */
export interface BlockedAccountRecord {
  email: string | null;
  blockedBy: string;
  blockedByEmail: string;
  contentRemoved: boolean;
}

/** In the error Firebase returns when `checkSignUpEmail` refuses a temporary email service. */
export const TEMPORARY_EMAIL_ERROR = 'temporary-email-service';
