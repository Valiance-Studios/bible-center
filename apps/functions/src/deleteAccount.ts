import type {AccountHolder} from './caller.ts';

import {auth, db} from './firebase.ts';
import {deleteReports, removeVotes, unlinkAddedContent} from './userContent.ts';

/**
 * Deletes an account and everything kept for it: its upvotes (with their counts), reports, settings, annotations,
 * memory list, role, allowlist entry and block record, then the account itself. The verses it added and the topics it
 * started stay, with nothing linking them to it. The account goes last, so a failure partway leaves the person
 * signed in to try again.
 */
export async function deleteAccount({uid, verifiedEmail}: AccountHolder): Promise<void> {
  await removeVotes(uid);
  await deleteReports(uid);
  await unlinkAddedContent(uid);
  await db.recursiveDelete(db.doc(`users/${uid}`));
  await db.doc(`blockedUsers/${uid}`).delete();

  // Keyed by email, so only for a verified one: an unverified account could otherwise remove someone else's.
  if (verifiedEmail) {
    await Promise.all([db.doc(`roles/${verifiedEmail}`).delete(), db.doc(`allowedUsers/${verifiedEmail}`).delete()]);
  }

  await auth.deleteUser(uid);
}
