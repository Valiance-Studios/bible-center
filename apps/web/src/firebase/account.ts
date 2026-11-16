import {httpsCallable} from 'firebase/functions';
import {functions} from './functions';

const callDeleteAccount = httpsCallable<void, void>(functions, 'deleteAccount');

/**
 * Deletes the signed-in account and everything kept for it, through the `deleteAccount` function. The account no
 * longer exists afterwards, so sign out locally too.
 */
export async function deleteOwnAccount(): Promise<void> {
  await callDeleteAccount();
}
