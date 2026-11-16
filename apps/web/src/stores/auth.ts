import type {User} from 'firebase/auth';
import type {Role} from '@bible-center/core';

import {
  createUserWithEmailAndPassword,
  GoogleAuthProvider,
  onAuthStateChanged,
  sendEmailVerification,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut as signOutFirebase,
  updateProfile,
} from 'firebase/auth';
import {create} from 'zustand';
import {auth} from '@/firebase';
import {getAccess} from '@/firebase/access';
import {recordFirstSignIn} from '@/firebase/settings';

/**
 * Where the current visitor stands. Reading is open in every state; `allowed` is what will unlock
 * annotations and voting. The check is repeated here for the interface only, as the security rules enforce it.
 */
export type AuthStatus = 'loading' | 'signedOut' | 'unverified' | 'noAccess' | 'accessCheckFailed' | 'allowed';

export interface SessionUser {
  uid: string;
  email: string | null;
  displayName: string | null;
}

interface AuthState {
  status: AuthStatus;
  user: SessionUser | null;
  /** What the user can do once `allowed`. Only shapes the interface; the security rules check it. */
  role: Role;
  /** When an `allowed` user's account was first seen, which decides when they can vote; null if unknown. */
  accountCreatedAt: Date | null;
  /** Follows Firebase's auth state. Returns the function that stops following it. */
  init: () => () => void;
  signInWithGoogle: () => Promise<void>;
  signInWithEmail: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  sendPasswordReset: (email: string) => Promise<void>;
  resendVerificationEmail: () => Promise<void>;
  /** Re-reads the account and its access, as after confirming an email or joining the allowlist. Returns the new status. */
  recheckAccess: () => Promise<AuthStatus>;
  signOut: () => Promise<void>;
}

interface Access {
  status: AuthStatus;
  role: Role;
  accountCreatedAt: Date | null;
}

const NO_ACCESS = {role: 'member', accountCreatedAt: null} as const;

/** A failure here only leaves the account's age unknown, so it must not cost the person their access. */
async function accountCreatedAtOf(uid: string): Promise<Date | null> {
  try {
    return await recordFirstSignIn(uid);
  } catch (error) {
    console.error('Could not record the first sign-in', error);

    return null;
  }
}

async function accessFor(user: User): Promise<Access> {
  if (!user.emailVerified) {
    return {status: 'unverified', ...NO_ACCESS};
  }

  let role: Role | null;

  try {
    role = await getAccess(user);
  } catch (error) {
    console.error('Could not check access', error);

    return {status: 'accessCheckFailed', ...NO_ACCESS};
  }

  return role
    ? {status: 'allowed', role, accountCreatedAt: await accountCreatedAtOf(user.uid)}
    : {status: 'noAccess', ...NO_ACCESS};
}

export const useAuthStore = create<AuthState>((set) => {
  /** Identifies the newest update, so a slow access check cannot overwrite a later sign-in or sign-out. */
  let latestUpdate = 0;

  async function applyUser(user: User | null): Promise<AuthStatus> {
    const update = ++latestUpdate;

    if (!user) {
      set({status: 'signedOut', user: null, ...NO_ACCESS});

      return 'signedOut';
    }

    const {status, role, accountCreatedAt} = await accessFor(user);

    if (update === latestUpdate) {
      set({status, role, accountCreatedAt, user: {uid: user.uid, email: user.email, displayName: user.displayName}});
    }

    return status;
  }

  return {
    status: 'loading',
    user: null,
    ...NO_ACCESS,

    init: () => onAuthStateChanged(auth, (user) => {
      void applyUser(user);
    }),

    signInWithGoogle: async () => {
      await signInWithPopup(auth, new GoogleAuthProvider());
    },

    signInWithEmail: async (email, password) => {
      await signInWithEmailAndPassword(auth, email, password);
    },

    register: async (name, email, password) => {
      const {user} = await createUserWithEmailAndPassword(auth, email, password);

      await updateProfile(user, {displayName: name});
      await sendEmailVerification(user);
      // The auth state listener ran before the name was set.
      await applyUser(user);
    },

    sendPasswordReset: (email) => sendPasswordResetEmail(auth, email),

    resendVerificationEmail: async () => {
      if (auth.currentUser) {
        await sendEmailVerification(auth.currentUser);
      }
    },

    recheckAccess: async () => {
      const user = auth.currentUser;

      if (!user) {
        return applyUser(null);
      }

      await user.reload();
      // The security rules read `email_verified` from the token, which only updates when refreshed.
      await user.getIdToken(true);

      return applyUser(user);
    },

    signOut: () => signOutFirebase(auth),
  };
});
