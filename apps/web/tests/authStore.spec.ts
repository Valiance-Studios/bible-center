import type {User} from 'firebase/auth';

import {beforeEach, describe, expect, it, vi} from 'vite-plus/test';
import {onAuthStateChanged, signInWithPopup} from 'firebase/auth';
import {getAccess, isAccountBlocked} from '@/firebase/access';
import {recordFirstSignIn} from '@/firebase/settings';
import {finishTwoStepSignIn, hasEnrolledSecondFactor, signedInWithSecondFactor, twoStepResolverFor} from '@/firebase/twoStep';
import {useAuthStore} from '@/stores/auth';

const firebaseState = vi.hoisted(() => ({auth: {currentUser: null as unknown}}));

vi.mock('@/firebase', () => ({auth: firebaseState.auth, db: {}}));
vi.mock('@/firebase/access', () => ({getAccess: vi.fn(), isAccountBlocked: vi.fn()}));
vi.mock('@/firebase/settings', () => ({recordFirstSignIn: vi.fn()}));
vi.mock('@/firebase/twoStep', () => ({
  finishTwoStepSignIn: vi.fn(),
  hasEnrolledSecondFactor: vi.fn(),
  signedInWithSecondFactor: vi.fn(),
  twoStepResolverFor: vi.fn(),
}));
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
    vi.mocked(recordFirstSignIn).mockResolvedValue(new Date('2026-11-01T00:00:00Z'));
    vi.mocked(isAccountBlocked).mockResolvedValue(false);
    vi.mocked(signedInWithSecondFactor).mockResolvedValue(false);
    vi.mocked(hasEnrolledSecondFactor).mockReturnValue(false);
    vi.mocked(twoStepResolverFor).mockReturnValue(null);
    useAuthStore.setState({twoStepResolver: null});
  });

  it('knows whether this sign-in used a second step, and whether one is set up', async () => {
    vi.mocked(getAccess).mockResolvedValue('admin');
    vi.mocked(signedInWithSecondFactor).mockResolvedValue(true);
    vi.mocked(hasEnrolledSecondFactor).mockReturnValue(true);

    await reportUser(makeUser());

    expect(useAuthStore.getState()).toMatchObject({role: 'admin', hasSecondFactor: true, isEnrolled: true});
  });

  it('waits for a code when the account has two-step sign-in, and finishes with it', async () => {
    const resolver = {hints: []};

    vi.mocked(signInWithPopup).mockRejectedValue(new Error('multi-factor-auth-required'));
    vi.mocked(twoStepResolverFor).mockReturnValue(resolver as never);

    await useAuthStore.getState().signInWithGoogle();
    expect(useAuthStore.getState().twoStepResolver).toBe(resolver);

    await useAuthStore.getState().finishTwoStep('123456');
    expect(finishTwoStepSignIn).toHaveBeenCalledWith(resolver, '123456');
    expect(useAuthStore.getState().twoStepResolver).toBeNull();
  });

  it('keeps waiting after a wrong code, and can give up', async () => {
    useAuthStore.setState({twoStepResolver: {hints: []} as never});
    vi.mocked(finishTwoStepSignIn).mockRejectedValue(new Error('auth/invalid-verification-code'));

    await expect(useAuthStore.getState().finishTwoStep('000000')).rejects.toThrow();
    expect(useAuthStore.getState().twoStepResolver).not.toBeNull();

    useAuthStore.getState().cancelTwoStep();
    expect(useAuthStore.getState().twoStepResolver).toBeNull();
  });

  it('passes on any other sign-in failure', async () => {
    vi.mocked(signInWithPopup).mockRejectedValue(new Error('auth/network-request-failed'));

    await expect(useAuthStore.getState().signInWithGoogle()).rejects.toThrow('auth/network-request-failed');
    expect(useAuthStore.getState().twoStepResolver).toBeNull();
  });

  it('knows when an admin blocked the account, and records no first sign-in for it', async () => {
    vi.mocked(getAccess).mockResolvedValue('member');
    vi.mocked(isAccountBlocked).mockResolvedValue(true);

    await reportUser(makeUser());

    expect(useAuthStore.getState()).toMatchObject({status: 'allowed', isBlocked: true, accountCreatedAt: null});
    expect(recordFirstSignIn).not.toHaveBeenCalled();
  });

  it('treats a failed block check as not blocked, since the rules still refuse a blocked account', async () => {
    vi.mocked(getAccess).mockResolvedValue('member');
    vi.mocked(isAccountBlocked).mockRejectedValue(new Error('offline'));
    vi.spyOn(console, 'error').mockImplementation(() => {});

    await reportUser(makeUser());

    expect(useAuthStore.getState()).toMatchObject({status: 'allowed', isBlocked: false});
  });

  it('checks again when asked, as after a refused save', async () => {
    vi.mocked(getAccess).mockResolvedValue('member');
    await reportUser(makeUser());
    firebaseState.auth.currentUser = makeUser();
    vi.mocked(isAccountBlocked).mockResolvedValue(true);

    await expect(useAuthStore.getState().recheckBlocked()).resolves.toBe(true);
    expect(useAuthStore.getState().isBlocked).toBe(true);
  });

  it('is signed out when Firebase reports no user', async () => {
    await reportUser(null);

    expect(useAuthStore.getState().status).toBe('signedOut');
  });

  it('asks an unverified user to verify, without checking their role', async () => {
    await reportUser(makeUser({emailVerified: false}));

    expect(useAuthStore.getState().status).toBe('unverified');
    expect(getAccess).not.toHaveBeenCalled();
  });

  it('allows any verified user, as a member', async () => {
    vi.mocked(getAccess).mockResolvedValue('member');

    await reportUser(makeUser());

    expect(useAuthStore.getState().status).toBe('allowed');
    expect(useAuthStore.getState().user?.email).toBe('person@example.com');
    expect(useAuthStore.getState().role).toBe('member');
    expect(useAuthStore.getState().accountCreatedAt).toEqual(new Date('2026-11-01T00:00:00Z'));
  });

  it('still allows a user whose first sign-in could not be recorded, with no account age', async () => {
    vi.mocked(getAccess).mockResolvedValue('member');
    vi.mocked(recordFirstSignIn).mockRejectedValue(new Error('offline'));
    vi.spyOn(console, 'error').mockImplementation(() => {});

    await reportUser(makeUser());

    expect(useAuthStore.getState().status).toBe('allowed');
    expect(useAuthStore.getState().accountCreatedAt).toBeNull();
  });

  it('records no first sign-in until the email is verified', async () => {
    await reportUser(makeUser({emailVerified: false}));

    expect(recordFirstSignIn).not.toHaveBeenCalled();
  });

  it('keeps the role from roles', async () => {
    vi.mocked(getAccess).mockResolvedValue('reviewer');

    await reportUser(makeUser());

    expect(useAuthStore.getState().role).toBe('reviewer');
  });

  it('reports a failed check, so the person can try again', async () => {
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
