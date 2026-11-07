import type {User} from 'firebase/auth';

import {beforeEach, describe, expect, it, vi} from 'vitest';
import {onAuthStateChanged} from 'firebase/auth';
import {getAccess} from '@/firebase/access';
import {useAuthStore} from '@/stores/auth';

const firebaseState = vi.hoisted(() => ({auth: {currentUser: null as unknown}}));

vi.mock('@/firebase', () => ({auth: firebaseState.auth, db: {}}));
vi.mock('@/firebase/access', () => ({getAccess: vi.fn()}));
vi.mock('firebase/auth', () => ({
  GoogleAuthProvider: vi.fn(),
  createUserWithEmailAndPassword: vi.fn(),
  onAuthStateChanged: vi.fn(),
  sendEmailVerification: vi.fn(),
  sendPasswordResetEmail: vi.fn(),
  signInWithEmailAndPassword: vi.fn(),
  signInWithPopup: vi.fn(),
  signOut: vi.fn(),
  updateProfile: vi.fn(),
}));

function makeUser(overrides: Partial<User> = {}): User {
  return {
    uid: 'uid',
    email: 'person@example.com',
    displayName: 'Person',
    emailVerified: true,
    reload: vi.fn(),
    getIdToken: vi.fn(),
    ...overrides,
  } as unknown as User;
}

/** Starts the store and reports this user the way Firebase would. */
async function reportUser(user: User | null): Promise<void> {
  useAuthStore.getState().init();

  const listener = vi.mocked(onAuthStateChanged).mock.lastCall?.[1] as (user: User | null) => void;

  listener(user);
  await vi.waitFor(() => expect(useAuthStore.getState().status).not.toBe('loading'));
}

describe('auth store', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    firebaseState.auth.currentUser = null;
    useAuthStore.setState({status: 'loading', user: null});
  });

  it('is signed out when Firebase reports no user', async () => {
    await reportUser(null);

    expect(useAuthStore.getState().status).toBe('signedOut');
  });

  it('asks an unverified user to verify, without checking the allowlist', async () => {
    await reportUser(makeUser({emailVerified: false}));

    expect(useAuthStore.getState().status).toBe('unverified');
    expect(getAccess).not.toHaveBeenCalled();
  });

  it('allows a verified user on the allowlist', async () => {
    vi.mocked(getAccess).mockResolvedValue('member');

    await reportUser(makeUser());

    expect(useAuthStore.getState().status).toBe('allowed');
    expect(useAuthStore.getState().user?.email).toBe('person@example.com');
    expect(useAuthStore.getState().role).toBe('member');
  });

  it('keeps the role from the allowlist', async () => {
    vi.mocked(getAccess).mockResolvedValue('reviewer');

    await reportUser(makeUser());

    expect(useAuthStore.getState().role).toBe('reviewer');
  });

  it('reports a verified user who is not on the allowlist', async () => {
    vi.mocked(getAccess).mockResolvedValue(null);

    await reportUser(makeUser());

    expect(useAuthStore.getState().status).toBe('noAccess');
  });

  it('reports a failed check separately from having no access', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.mocked(getAccess).mockRejectedValue(new Error('offline'));

    await reportUser(makeUser());

    expect(useAuthStore.getState().status).toBe('accessCheckFailed');
  });

  it('refreshes the token when rechecking, since the rules read email_verified from it', async () => {
    const user = makeUser();

    vi.mocked(getAccess).mockResolvedValue('member');
    firebaseState.auth.currentUser = user;

    await expect(useAuthStore.getState().recheckAccess()).resolves.toBe('allowed');
    expect(user.getIdToken).toHaveBeenCalledWith(true);
  });
});
