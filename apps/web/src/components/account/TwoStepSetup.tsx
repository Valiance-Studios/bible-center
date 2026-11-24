import type {PendingAuthenticator} from '@/firebase/twoStep';

import {useState} from 'react';
import {useNavigate} from 'react-router';
import {Alert, Button, Group, PasswordInput, TextInput} from '@mantine/core';
import {auth} from '@/firebase';
import {confirmItIsYou, finishAuthenticatorSetup, startAuthenticatorSetup, usesPassword} from '@/firebase/twoStep';
import {useAuthStore} from '@/stores/auth';
import {authErrorMessage} from '@/stores/authErrors';
import {SUPPORT_EMAIL} from '../SupportContact';
import classes from './TwoStepSetup.module.scss';

type Step = 'intro' | 'confirm' | 'scan' | 'done';

/** Runs one step, tracking whether it is in progress and what to tell the person if it fails. */
function useStepAction() {
  const [isBusy, setIsBusy] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);

  async function run(action: () => Promise<void>): Promise<void> {
    setIsBusy(true);
    setProblem(null);

    try {
      await action();
    } catch (error) {
      setProblem(authErrorMessage(error));
    } finally {
      setIsBusy(false);
    }
  }

  return {isBusy, problem, run};
}

/**
 * Sets up two-step sign-in with an authenticator app, which reviewers and admins need before staff pages work.
 * Afterwards the person signs in again, since only a sign-in with the second step counts.
 */
export function TwoStepSetup() {
  const email = useAuthStore((state) => state.user?.email);
  const signOut = useAuthStore((state) => state.signOut);
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>('intro');
  const [password, setPassword] = useState('');
  const [pending, setPending] = useState<PendingAuthenticator | null>(null);
  const [code, setCode] = useState('');
  const {isBusy, problem, run} = useStepAction();
  const user = auth.currentUser;
  const needsPassword = user ? usesPassword(user) : false;

  function cancel() {
    setStep('intro');
    setPassword('');
    setPending(null);
    setCode('');
  }

  function confirm() {
    void run(async () => {
      if (!user) {
        return;
      }

      await confirmItIsYou(user, needsPassword ? password : undefined);
      setPending(await startAuthenticatorSetup(user));
      setStep('scan');
    });
  }

  function finish() {
    void run(async () => {
      if (user && pending) {
        await finishAuthenticatorSetup(user, pending, code.trim());
        setStep('done');
      }
    });
  }

  return (
    <>
      <section className={classes.card} aria-labelledby="two-step-title" role={step === 'done' ? 'status' : undefined}>
        {step === 'intro' && (
          <>
            <h2 id="two-step-title" className={classes.title}>
              Set up two-step sign-in first
            </h2>
            <p>
              Reviewers and admins sign in with a code from an authenticator app as well as their password or Google
              account, so a stolen password alone cannot reach this page. It takes about a minute.
            </p>
            <p>
              You need an authenticator app on your phone, such as Google Authenticator, Microsoft Authenticator or
              1Password.
            </p>
            <Button radius="xl" size="md" onClick={() => setStep('confirm')}>
              Set it up
            </Button>
          </>
        )}

        {step === 'confirm' && (
          <>
            <p className={classes.step}>Step 1 of 3</p>
            <h2 id="two-step-title" className={classes.title}>
              Confirm it is you
            </h2>
            <p>Sign in again before changing how you sign in.</p>
            {needsPassword && (
              <PasswordInput
                size="md"
                label={`Password for ${email ?? 'your account'}`}
                autoComplete="current-password"
                value={password}
                onChange={(event) => setPassword(event.currentTarget.value)}
              />
            )}
            {problem && (
              <Alert color="red" mt="md" role="alert">
                {problem}
              </Alert>
            )}
            <Group mt="md">
              <Button radius="xl" size="md" loading={isBusy} onClick={confirm}>
                {needsPassword ? 'Continue' : 'Continue with Google'}
              </Button>
              <Button radius="xl" size="md" variant="default" onClick={cancel}>
                Cancel
              </Button>
            </Group>
          </>
        )}

        {step === 'scan' && pending && (
          <>
            <p className={classes.step}>Step 2 of 3</p>
            <h2 id="two-step-title" className={classes.title}>
              Add Bible Center to your authenticator app
            </h2>
            <div className={classes.qrRow}>
              <img className={classes.qr} src={pending.qrCodeImage} alt="QR code to scan with your authenticator app" />
              <div>
                <p>Scan this code with the app. If you cannot scan it, enter this key instead:</p>
                <code className={classes.key}>{pending.key}</code>
              </div>
            </div>
            <form
              onSubmit={(event) => {
                event.preventDefault();
                finish();
              }}
            >
              <TextInput
                className={classes.code}
                size="md"
                label="Then enter the 6-digit code the app shows"
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={6}
                value={code}
                onChange={(event) => setCode(event.currentTarget.value)}
              />
              {problem && (
                <Alert color="red" mt="md" role="alert">
                  {problem}
                </Alert>
              )}
              <Group mt="md">
                <Button type="submit" radius="xl" size="md" loading={isBusy}>
                  Turn on two-step sign-in
                </Button>
                <Button radius="xl" size="md" variant="default" onClick={cancel}>
                  Cancel
                </Button>
              </Group>
            </form>
          </>
        )}

        {step === 'done' && (
          <>
            <p className={classes.step}>Step 3 of 3</p>
            <h2 id="two-step-title" className={classes.title}>
              Two-step sign-in is on
            </h2>
            <p>
              Sign in once more, with a code from your app, to open Review and People. From now on Bible Center asks for
              a code each time you sign in.
            </p>
            <Button radius="xl" size="md" onClick={() => void signOut().then(() => navigate('/sign-in'))}>
              Sign in again
            </Button>
          </>
        )}
      </section>

      <p className={classes.note}>
        {step === 'done' ? (
          <>
            {'Lost your phone? Write to '}
            <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>
            {' to have two-step sign-in reset.'}
          </>
        ) : (
          'Highlights, notes, your memory list and voting work as before, without it.'
        )}
      </p>
    </>
  );
}
