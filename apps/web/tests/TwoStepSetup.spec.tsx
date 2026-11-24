import {beforeEach, describe, expect, it, vi} from 'vite-plus/test';
import {MantineProvider} from '@mantine/core';
import {fireEvent, render, screen} from '@testing-library/react';
import {MemoryRouter} from 'react-router';
import {FirebaseError} from 'firebase/app';
import {TwoStepSetup} from '@/components/account/TwoStepSetup';
import {confirmItIsYou, finishAuthenticatorSetup, startAuthenticatorSetup, usesPassword} from '@/firebase/twoStep';
import {useAuthStore} from '@/stores/auth';

const user = vi.hoisted(() => ({uid: 'grace', email: 'grace@example.com'}));

vi.mock('@/firebase', () => ({auth: {currentUser: user}, db: {}}));
vi.mock('@/firebase/twoStep', () => ({
  confirmItIsYou: vi.fn(),
  finishAuthenticatorSetup: vi.fn(),
  startAuthenticatorSetup: vi.fn(),
  usesPassword: vi.fn(),
}));

const PENDING = {secret: {}, qrCodeImage: 'data:image/gif;base64,AAAA', key: 'JBSW Y3DP EHPK 3PXP'};

function renderSetup() {
  render(<MantineProvider><MemoryRouter><TwoStepSetup /></MemoryRouter></MantineProvider>);
}

describe('TwoStepSetup', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAuthStore.setState({user: {uid: 'grace', email: 'grace@example.com', displayName: 'Grace'}});
    vi.mocked(usesPassword).mockReturnValue(true);
    vi.mocked(startAuthenticatorSetup).mockResolvedValue(PENDING as never);
  });

  it('confirms it is you, shows the code and key to scan, and turns two-step sign-in on', async () => {
    renderSetup();

    fireEvent.click(screen.getByRole('button', {name: 'Set it up'}));
    fireEvent.change(screen.getByLabelText('Password for grace@example.com'), {target: {value: 'a-long-password'}});
    fireEvent.click(screen.getByRole('button', {name: 'Continue'}));

    expect(await screen.findByRole('img', {name: 'QR code to scan with your authenticator app'})).toHaveProperty('src', PENDING.qrCodeImage);
    expect(screen.getByText(PENDING.key)).toBeTruthy();
    expect(confirmItIsYou).toHaveBeenCalledWith(user, 'a-long-password');

    fireEvent.change(screen.getByLabelText('Then enter the 6-digit code the app shows'), {target: {value: ' 123456 '}});
    fireEvent.click(screen.getByRole('button', {name: 'Turn on two-step sign-in'}));

    expect(await screen.findByRole('heading', {name: 'Two-step sign-in is on'})).toBeTruthy();
    expect(finishAuthenticatorSetup).toHaveBeenCalledWith(user, PENDING, '123456');
    expect(screen.getByRole('button', {name: 'Sign in again'})).toBeTruthy();
  });

  it('asks a Google account to confirm through Google, with no password', async () => {
    vi.mocked(usesPassword).mockReturnValue(false);
    renderSetup();

    fireEvent.click(screen.getByRole('button', {name: 'Set it up'}));
    expect(screen.queryByLabelText(/^Password for/)).toBeNull();
    fireEvent.click(screen.getByRole('button', {name: 'Continue with Google'}));

    await screen.findByRole('img', {name: 'QR code to scan with your authenticator app'});
    expect(confirmItIsYou).toHaveBeenCalledWith(user, undefined);
  });

  it('says when the code did not match, and lets the person try again', async () => {
    vi.mocked(finishAuthenticatorSetup).mockRejectedValueOnce(new FirebaseError('auth/invalid-verification-code', ''));
    renderSetup();

    fireEvent.click(screen.getByRole('button', {name: 'Set it up'}));
    fireEvent.click(screen.getByRole('button', {name: 'Continue'}));
    await screen.findByRole('img', {name: 'QR code to scan with your authenticator app'});
    fireEvent.change(screen.getByLabelText('Then enter the 6-digit code the app shows'), {target: {value: '000000'}});
    fireEvent.click(screen.getByRole('button', {name: 'Turn on two-step sign-in'}));

    expect((await screen.findByRole('alert')).textContent).toBe('That code did not match. Codes change every 30 seconds; try the current one.');
    expect(screen.getByRole('button', {name: 'Turn on two-step sign-in'})).toBeTruthy();
  });
});
