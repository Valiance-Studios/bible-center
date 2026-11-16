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
import {FirebaseError} from 'firebase/app';
import {getAccess, isAccountBlocked} from '@/firebase/access';
import {recordFirstSignIn} from '@/firebase/settings';

/**
 * Where the current visitor stands. Reading is open in every state; `allowed` is what will unlock
 * annotations and voting. The check is repeated here for the interface only, as the security rules enforce it.
 */
export type AuthStatus = 'loading' | 'signedOut' | 'unverified' | 'accessCheckFailed' | 'allowed';

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
  /** Whether an admin blocked this `allowed` account, so it can read but not save anything. */
  isBlocked: boolean;
  /** Follows Firebase's auth state. Returns the function that stops following it. */
  init: () => () => void;
  signInWithGoogle: () => Promise<void>;
  signInWithEmail: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  sendPasswordReset: (email: string) => Promise<void>;
  resendVerificationEmail: () => Promise<void>;
  /** Re-reads the account and its access, as after confirming an email. Returns the new status. */
  recheckAccess: () => Promise<AuthStatus>;
  /** Checks again whether the account is blocked, as after a save is refused. Returns whether it is. */
  recheckBlocked: () => Promise<boolean>;
  signOut: () => Promise<void>;
}

interface Access {
  status: AuthStatus;
  role: Role;
  accountCreatedAt: Date | null;
  isBlocked: boolean;
}

const NO_ACCESS = {role: 'member', accountCreatedAt: null, isBlocked: false} as const;

/** A failed check counts as not blocked: the rules still refuse a blocked account's writes. */
async function isBlockedOrUnknown(uid: string): Promise<boolean> {
  try {
    return await isAccountBlocked(uid);
  } catch (error) {
    console.error('Could not check whether the account is blocked', error);

    return false;
  }
}

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

  // getAccess only answers null for an unverified email, which was checked above.
  if (!role) {
    return {status: 'unverified', ...NO_ACCESS};
  }

  const isBlocked = await isBlockedOrUnknown(user.uid);

  // A blocked account cannot save its first sign-in, and cannot vote either way.
  return {status: 'allowed', role, isBlocked, accountCreatedAt: isBlocked ? null : await accountCreatedAtOf(user.uid)};
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

    const {status, role, accountCreatedAt, isBlocked} = await accessFor(user);

    if (update === latestUpdate) {
      set({status, role, accountCreatedAt, isBlocked, user: {uid: user.uid, email: user.email, displayName: user.displayName}});
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

    recheckBlocked: async () => {
      const uid = auth.currentUser?.uid;
      const isBlocked = uid ? await isBlockedOrUnknown(uid) : false;

      set({isBlocked});

      return isBlocked;
    },

    signOut: () => signOutFirebase(auth),
  };
});

/**
 * Whether a refused save was refused because an admin blocked the account during this visit. Checks again only
 * when the rules refused it, and updates the store so the pages show the blocked notice.
 */
export async function wasRefusedForBlock(error: unknown): Promise<boolean> {
  return error instanceof FirebaseError && error.code === 'permission-denied' && useAuthStore.getState().recheckBlocked();
}
