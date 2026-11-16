import type {BlockAccountRequest, BlockAccountResult, BlockedAccountRecord} from '@bible-center/core';

import {FirebaseError} from 'firebase/app';
import {collection, deleteDoc, doc, getDoc, Timestamp} from 'firebase/firestore';
import {httpsCallable} from 'firebase/functions';
import {functions} from './functions';
import {db} from './index';
import {BLOCKED_USERS_COLLECTION} from './access';
import {fetchFromServer} from './serverQuery';

/** An account an admin blocked. */
export interface BlockedAccount extends BlockedAccountRecord {
  uid: string;
  blockedAt: Date;
}

/** Why blocking failed, in words for the admin. */
export class BlockAccountError extends Error {}

const callBlockAccount = httpsCallable<BlockAccountRequest, BlockAccountResult>(functions, 'blockAccount');

/**
 * Blocks an account through the `blockAccount` function, which finds it by email when given one. Rejects with
 * `BlockAccountError` when there is no such account or it is the admin's own, and otherwise as the call failed.
 */
export async function blockAccount(request: BlockAccountRequest): Promise<BlockAccountResult> {
  try {
    return (await callBlockAccount(request)).data;
  } catch (error) {
    if (error instanceof FirebaseError && (error.code === 'functions/not-found' || error.code === 'functions/invalid-argument')) {
      throw new BlockAccountError(error.code === 'functions/not-found' && 'email' in request ? `No account uses ${request.email}.` : error.message);
    }

    throw error;
  }
}

/** Every blocked account, most recently blocked first. Only admins may list them. */
export async function listBlockedAccounts(): Promise<BlockedAccount[]> {
  const documents = await fetchFromServer(collection(db, BLOCKED_USERS_COLLECTION));
  const accounts = documents.map((document) => {
    const data = document.data() as BlockedAccountRecord & {blockedAt: unknown};

    return {...data, uid: document.id, blockedAt: data.blockedAt instanceof Timestamp ? data.blockedAt.toDate() : new Date(0)};
  });

  return accounts.sort((a, b) => b.blockedAt.getTime() - a.blockedAt.getTime());
}

/** Lets the account save again. Anything removed when it was blocked stays removed. */
export async function unblockAccount(uid: string): Promise<void> {
  await deleteDoc(doc(db, BLOCKED_USERS_COLLECTION, uid));
}

/** When an account was first seen, or null if that is unknown. Only admins may read other people's. */
export async function accountJoinedAt(uid: string): Promise<Date | null> {
  const createdAt: unknown = (await getDoc(doc(db, 'users', uid))).get('createdAt');

  return createdAt instanceof Timestamp ? createdAt.toDate() : null;
}
