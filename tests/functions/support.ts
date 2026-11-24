import type {CallableRequest} from 'firebase-functions/v2/https';

import {beforeEach} from 'vite-plus/test';
import {auth, db} from '../../apps/functions/src/firebase.ts';

const PROJECT = 'demo-bible-center';
const OWNER = {Authorization: 'Bearer owner'};

/** Clears the emulators' accounts and data before each test. */
export function useCleanEmulators(): void {
  beforeEach(async () => {
    await fetch(`http://127.0.0.1:8080/emulator/v1/projects/${PROJECT}/databases/(default)/documents`, {method: 'DELETE', headers: OWNER});
    await fetch(`http://127.0.0.1:9099/emulator/v1/projects/${PROJECT}/accounts`, {method: 'DELETE', headers: OWNER});
  });
}

/** Makes an account with a verified email, and returns its id. */
export async function createAccount(name: string): Promise<string> {
  const {uid} = await auth.createUser({email: `${name}@example.com`, emailVerified: true});

  return uid;
}

/** What a callable function sees of a caller signed in as this account, with a second step unless `secondFactor` is false. */
export function callerAuth(uid: string, email: string, emailVerified = true, secondFactor = true): NonNullable<CallableRequest['auth']> {
  const firebase = {sign_in_provider: 'google.com', ...(secondFactor ? {sign_in_second_factor: 'totp'} : {})};

  return {uid, token: {email, email_verified: emailVerified, firebase} as never, rawToken: ''};
}

export async function makeAdmin(email: string): Promise<void> {
  await db.doc(`roles/${email}`).set({role: 'admin'});
}
