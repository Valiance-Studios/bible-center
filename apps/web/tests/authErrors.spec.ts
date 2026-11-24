import {describe, expect, it} from 'vite-plus/test';
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

  it('explains a refused temporary email, which Firebase passes on as an internal error', () => {
    const refused = new FirebaseError(
      'auth/internal-error',
      'Firebase: ((HTTP request to …/checkSignUpEmail returned HTTP error 400: {"error":{"message":"temporary-email-service","status":"INVALID_ARGUMENT"}})) (auth/internal-error).',
    );

    expect(authErrorMessage(refused)).toBe(
      'Bible Center does not accept sign-ups from temporary email services. Use an email address you keep, such as a personal or work one.',
    );
  });

  it('explains a wrong two-step code', () => {
    expect(authErrorMessage(new FirebaseError('auth/invalid-verification-code', ''))).toBe(
      'That code did not match. Codes change every 30 seconds; try the current one.',
    );
  });
});
