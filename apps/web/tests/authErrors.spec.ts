import {describe, expect, it} from 'vitest';
import {FirebaseError} from 'firebase/app';
import {authErrorMessage} from '@/stores/authErrors';

describe('authErrorMessage', () => {
  it('says nothing when the person closed the popup', () => {
    expect(authErrorMessage(new FirebaseError('auth/popup-closed-by-user', ''))).toBeNull();
  });

  it('never reveals whether it was the email or the password that was wrong', () => {
    const wrongPassword = authErrorMessage(new FirebaseError('auth/wrong-password', ''));

    expect(wrongPassword).toBe(authErrorMessage(new FirebaseError('auth/user-not-found', '')));
    expect(wrongPassword).toBe(authErrorMessage(new FirebaseError('auth/invalid-credential', '')));
  });

  it('falls back to a general message for anything unknown', () => {
    expect(authErrorMessage(new FirebaseError('auth/unknown', ''))).toBe('That did not work. Try again.');
    expect(authErrorMessage(new Error('boom'))).toBe('That did not work. Try again.');
  });
});
