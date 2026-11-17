import type {MultiFactorResolver, TotpSecret, User} from 'firebase/auth';

import {FirebaseError} from 'firebase/app';
import {
  EmailAuthProvider,
  getMultiFactorResolver,
  GoogleAuthProvider,
  multiFactor,
  reauthenticateWithCredential,
  reauthenticateWithPopup,
  TotpMultiFactorGenerator,
} from 'firebase/auth';
import qrcode from 'qrcode-generator';
import {auth} from './index';

/** What authenticator apps show the account as. */
const ISSUER = 'Bible Center';

/** Whether this sign-in used a second step, which the rules require of staff (`hasSecondFactor`). */
export async function signedInWithSecondFactor(user: User): Promise<boolean> {
  return (await user.getIdTokenResult()).signInSecondFactor != null;
}

/** Whether the account has a second step set up, so every sign-in asks for it. */
export function hasEnrolledSecondFactor(user: User): boolean {
  return multiFactor(user).enrolledFactors.length > 0;
}

/** The resolver for a sign-in that needs a second step, or null if the error is anything else. */
export function twoStepResolverFor(error: unknown): MultiFactorResolver | null {
  return error instanceof FirebaseError && error.code === 'auth/multi-factor-auth-required' ? getMultiFactorResolver(auth, error as never) : null;
}

/** Finishes a sign-in with the code from the person's authenticator app. */
export async function finishTwoStepSignIn(resolver: MultiFactorResolver, code: string): Promise<void> {
  const hint = resolver.hints.find(({factorId}) => factorId === TotpMultiFactorGenerator.FACTOR_ID);

  if (!hint) {
    throw new Error('This account has no authenticator app set up.');
  }

  await resolver.resolveSignIn(TotpMultiFactorGenerator.assertionForSignIn(hint.uid, code));
}

/** Whether the account signs in with a password, so confirming it is them asks for that rather than Google. */
export function usesPassword(user: User): boolean {
  return user.providerData.some(({providerId}) => providerId === EmailAuthProvider.PROVIDER_ID);
}

/** Has the person sign in again, as Firebase requires before changing how they sign in. */
export async function confirmItIsYou(user: User, password?: string): Promise<void> {
  await (password !== undefined && user.email
    ? reauthenticateWithCredential(user, EmailAuthProvider.credential(user.email, password))
    : reauthenticateWithPopup(user, new GoogleAuthProvider()));
}

/** A new authenticator app secret, shown to the person as a QR code and as a key they can type. */
export interface PendingAuthenticator {
  secret: TotpSecret;
  /** An image of the QR code, as a data URL. */
  qrCodeImage: string;
  /** The secret key in groups of four, for typing in by hand. */
  key: string;
}

export async function startAuthenticatorSetup(user: User): Promise<PendingAuthenticator> {
  const secret = await TotpMultiFactorGenerator.generateSecret(await multiFactor(user).getSession());
  const code = qrcode(0, 'M');

  code.addData(secret.generateQrCodeUrl(user.email ?? 'Bible Center account', ISSUER));
  code.make();

  return {secret, qrCodeImage: code.createDataURL(4, 8), key: secret.secretKey.replace(/(.{4})(?=.)/g, '$1 ')};
}

/** Turns on two-step sign-in with the first code from the person's app. */
export async function finishAuthenticatorSetup(user: User, {secret}: PendingAuthenticator, code: string): Promise<void> {
  await multiFactor(user).enroll(TotpMultiFactorGenerator.assertionForEnrollment(secret, code), 'Authenticator app');
}
