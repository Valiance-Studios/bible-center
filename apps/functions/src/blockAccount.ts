import type {BlockAccountRequest, BlockAccountResult, BlockedAccountRecord} from '@bible-center/core';
import type {UserRecord} from 'firebase-admin/auth';
import type {Caller} from './caller.ts';

import {FieldValue} from 'firebase-admin/firestore';
import {HttpsError} from 'firebase-functions/v2/https';
import {auth, db} from './firebase.ts';
import {deleteReports, removeAddedContent, removeVotes} from './userContent.ts';

/** The request as sent, checked, since anything can arrive over the network. */
export function parseBlockAccountRequest(data: unknown): BlockAccountRequest {
  const {email, uid, removeContent} = (data ?? {}) as Record<string, unknown>;

  if (typeof removeContent !== 'boolean' || (typeof email === 'string') === (typeof uid === 'string')) {
    throw new HttpsError('invalid-argument', 'Name one account, by email or by id, and whether to remove its content.');
  }

  return typeof email === 'string' ? {email, removeContent} : {uid: uid as string, removeContent};
}

async function findAccount(request: BlockAccountRequest): Promise<UserRecord> {
  try {
    return 'email' in request ? await auth.getUserByEmail(request.email.trim().toLowerCase()) : await auth.getUser(request.uid);
  } catch (error) {
    if ((error as {code?: string}).code === 'auth/user-not-found') {
      throw new HttpsError('not-found', 'email' in request ? 'No account uses that email.' : 'That account no longer exists.');
    }

    throw error;
  }
}

/**
 * Blocks an account: the security rules refuse every write from it at once. With `removeContent`, also takes away
 * its upvotes and reports, deletes the verses it added and rejects the topics it started.
 */
export async function blockAccount(caller: Caller, request: BlockAccountRequest): Promise<BlockAccountResult> {
  const account = await findAccount(request);

  if (account.uid === caller.uid) {
    throw new HttpsError('invalid-argument', 'You cannot block yourself.');
  }

  const record: BlockedAccountRecord = {
    email: account.email?.toLowerCase() ?? null,
    blockedBy: caller.uid,
    blockedByEmail: caller.email,
    contentRemoved: request.removeContent,
  };

  await db.doc(`blockedUsers/${account.uid}`).set({...record, blockedAt: FieldValue.serverTimestamp()});

  if (request.removeContent) {
    await removeVotes(account.uid);
    await deleteReports(account.uid);
    await removeAddedContent(account.uid, caller.uid);
  }

  return {uid: account.uid, email: record.email};
}
