/**
 * Runs in the browser, loaded by the dev server from `page.evaluate`, so it uses the app's own Firebase Auth instance.
 * Signs a staff account in with its SMS second factor, which the Auth emulator offers where the hosted project
 * offers authenticator apps. Test only: nothing in the app imports it.
 */
import type {Auth, MultiFactorResolver} from 'firebase/auth';

import {getMultiFactorResolver, GoogleAuthProvider, PhoneAuthProvider, PhoneMultiFactorGenerator, signInWithCredential} from 'firebase/auth';

/** The app's Firebase module, as the dev server serves it, so this shares the app's Auth instance. */
const APP_FIREBASE_MODULE = '/src/firebase/index.ts';

let pending: {resolver: MultiFactorResolver; verificationId: string} | null = null;

async function appAuth(): Promise<Auth> {
  return ((await import(/* @vite-ignore */ APP_FIREBASE_MODULE)) as {auth: Auth}).auth;
}

/** Starts signing in with Google, and has the emulator "send" the SMS code. */
export async function startStaffSignIn(googleIdToken: string): Promise<void> {
  const auth = await appAuth();

  // The emulator needs no reCAPTCHA, so a stand-in verifier is enough.
  auth.settings.appVerificationDisabledForTesting = true;

  try {
    await signInWithCredential(auth, GoogleAuthProvider.credential(googleIdToken));
  } catch (error) {
    const resolver = getMultiFactorResolver(auth, error as never);
    const verifier = {type: 'recaptcha', verify: () => Promise.resolve('test'), _reset: () => {}};
    const verificationId = await new PhoneAuthProvider(auth).verifyPhoneNumber({multiFactorHint: resolver.hints[0], session: resolver.session}, verifier as never);

    pending = {resolver, verificationId};

    return;
  }

  throw new Error('Signed in without a second step; enroll one first.');
}

/** Finishes signing in with the SMS code. */
export async function finishStaffSignIn(code: string): Promise<void> {
  if (!pending) {
    throw new Error('Call startStaffSignIn first.');
  }

  const {resolver, verificationId} = pending;

  pending = null;
  await resolver.resolveSignIn(PhoneMultiFactorGenerator.assertion(PhoneAuthProvider.credential(verificationId, code)));
}
