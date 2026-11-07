import type {FormEvent, ReactNode} from 'react';

import {useState} from 'react';
import {Link, Navigate} from 'react-router';
import {Alert, Button, Loader, PasswordInput, TextInput} from '@mantine/core';
import {useAuthStore} from '@/stores/auth';
import {authErrorMessage} from '@/stores/authErrors';
import classes from './SignInPage.module.scss';

const MIN_PASSWORD_LENGTH = 10;

/** Runs an auth action, tracking whether it is in progress and what to tell the person if it fails. */
function useAuthAction() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function run(action: () => Promise<void>): Promise<void> {
    setBusy(true);
    setError(null);

    try {
      await action();
    } catch (caught) {
      setError(authErrorMessage(caught));
    } finally {
      setBusy(false);
    }
  }

  return {busy, error, setError, run};
}

/**
 * Stays clickable while its popup is open: Firebase takes several seconds to notice a closed popup,
 * and a second click safely replaces the first popup.
 */
function GoogleButton() {
  const signInWithGoogle = useAuthStore((state) => state.signInWithGoogle);
  const {error, run} = useAuthAction();

  return (
    <>
      {error && <Alert color="red" mb="md">{error}</Alert>}
      <Button variant="default" fullWidth size="md" radius="xl" onClick={() => void run(signInWithGoogle)}>
        Continue with Google
      </Button>
    </>
  );
}

function SignInForm({onRegister}: {onRegister: () => void}) {
  const signInWithEmail = useAuthStore((state) => state.signInWithEmail);
  const sendPasswordReset = useAuthStore((state) => state.sendPasswordReset);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [notice, setNotice] = useState<string | null>(null);
  const {busy, error, setError, run} = useAuthAction();

  function submit(event: FormEvent): void {
    event.preventDefault();
    void run(() => signInWithEmail(email, password));
  }

  function resetPassword(): void {
    setNotice(null);

    if (!email) {
      setError('Enter your email first, then select "Forgot your password?"');

      return;
    }

    void run(async () => {
      await sendPasswordReset(email);
      setNotice(`If an account uses ${email}, we sent it a link to reset the password.`);
    });
  }

  return (
    <>
      <h1 className={classes.title}>Sign in</h1>
      <GoogleButton />
      <div className={classes.or}>or</div>
      <form className={classes.fields} onSubmit={submit}>
        {error && <Alert color="red">{error}</Alert>}
        {notice && <Alert>{notice}</Alert>}
        <TextInput label="Email" type="email" autoComplete="email" required value={email} onChange={(event) => setEmail(event.currentTarget.value)} />
        <PasswordInput label="Password" autoComplete="current-password" required value={password} onChange={(event) => setPassword(event.currentTarget.value)} />
        <Button type="submit" fullWidth size="md" radius="xl" loading={busy}>Sign in</Button>
      </form>
      <p className={classes.switch}><button type="button" className={classes.textButton} onClick={resetPassword}>Forgot your password?</button></p>
      <p className={classes.switch}>
        New to Bible Center?
        <button type="button" className={classes.textButton} onClick={onRegister}>Create an account</button>
      </p>
    </>
  );
}

function RegisterForm({onSignIn}: {onSignIn: () => void}) {
  const register = useAuthStore((state) => state.register);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const {busy, error, setError, run} = useAuthAction();

  function submit(event: FormEvent): void {
    event.preventDefault();

    if (password.length < MIN_PASSWORD_LENGTH) {
      setError(`Use at least ${MIN_PASSWORD_LENGTH} characters for your password.`);

      return;
    }

    void run(() => register(name.trim(), email, password));
  }

  return (
    <>
      <h1 className={classes.title}>Create an account</h1>
      <GoogleButton />
      <div className={classes.or}>or</div>
      <form className={classes.fields} onSubmit={submit}>
        {error && <Alert color="red">{error}</Alert>}
        <TextInput label="Name" autoComplete="name" required value={name} onChange={(event) => setName(event.currentTarget.value)} />
        <TextInput label="Email" type="email" autoComplete="email" required value={email} onChange={(event) => setEmail(event.currentTarget.value)} />
        <PasswordInput label="Password" description={`Use at least ${MIN_PASSWORD_LENGTH} characters.`} autoComplete="new-password" required value={password} onChange={(event) => setPassword(event.currentTarget.value)} />
        <Button type="submit" fullWidth size="md" radius="xl" loading={busy}>Create account</Button>
      </form>
      <p className={classes.switch}>
        Already have an account?
        <button type="button" className={classes.textButton} onClick={onSignIn}>Sign in</button>
      </p>
    </>
  );
}

function SignedOutPanel() {
  const [mode, setMode] = useState<'signIn' | 'register'>('signIn');

  return mode === 'signIn'
    ? <SignInForm onRegister={() => setMode('register')} />
    : <RegisterForm onSignIn={() => setMode('signIn')} />;
}

function VerifyEmailPanel() {
  const email = useAuthStore((state) => state.user?.email);
  const recheckAccess = useAuthStore((state) => state.recheckAccess);
  const resendVerificationEmail = useAuthStore((state) => state.resendVerificationEmail);
  const signOut = useAuthStore((state) => state.signOut);
  const [notice, setNotice] = useState<string | null>(null);
  const {busy, error, run} = useAuthAction();

  function confirm(): void {
    setNotice(null);
    void run(async () => {
      if (await recheckAccess() === 'unverified') {
        setNotice('Your email is not confirmed yet. Open the link in the email, then try again.');
      }
    });
  }

  function resend(): void {
    setNotice(null);
    void run(async () => {
      await resendVerificationEmail();
      setNotice(`We sent a new link to ${email}.`);
    });
  }

  return (
    <>
      <h1 className={classes.title}>Check your email</h1>
      <p className={classes.body}>
        We sent a confirmation link to
        {email}
        . Open it to finish setting up your account, then come back here.
      </p>
      <div className={classes.fields}>
        {error && <Alert color="red">{error}</Alert>}
        {notice && <Alert>{notice}</Alert>}
        <Button fullWidth size="md" radius="xl" loading={busy} onClick={confirm}>I confirmed my email</Button>
      </div>
      <p className={classes.switch}>
        Nothing in your inbox?
        <button type="button" className={classes.textButton} onClick={resend}>Send the link again</button>
      </p>
      <p className={classes.switch}><button type="button" className={classes.textButton} onClick={() => void signOut()}>Sign out</button></p>
    </>
  );
}

function AccessPanel({checkFailed}: {checkFailed: boolean}) {
  const email = useAuthStore((state) => state.user?.email);
  const recheckAccess = useAuthStore((state) => state.recheckAccess);
  const signOut = useAuthStore((state) => state.signOut);
  const {busy, error, run} = useAuthAction();

  return (
    <>
      <h1 className={classes.title}>{checkFailed ? 'Could not check your access' : 'Accounts are invite-only for now'}</h1>
      <p className={classes.body}>
        {checkFailed
          ? `You are signed in as ${email}, but checking this account's access did not work. You can still read and search everything.`
          : `You are signed in as ${email}, but this address is not on the list yet. You can still read and search everything.`}
      </p>
      <div className={classes.fields}>
        {error && <Alert color="red">{error}</Alert>}
        <Button fullWidth size="md" radius="xl" loading={busy} onClick={() => void run(async () => void await recheckAccess())}>Check again</Button>
      </div>
      <p className={classes.switch}><Link to="/">Back to the home page</Link></p>
      <p className={classes.switch}><button type="button" className={classes.textButton} onClick={() => void signOut()}>Sign out</button></p>
    </>
  );
}

function panelFor(status: ReturnType<typeof useAuthStore.getState>['status']): ReactNode {
  switch (status) {
    case 'loading':
      return <Loader aria-label="Loading" />;
    case 'signedOut':
      return <SignedOutPanel />;
    case 'unverified':
      return <VerifyEmailPanel />;
    case 'noAccess':
      return <AccessPanel checkFailed={false} />;
    case 'accessCheckFailed':
      return <AccessPanel checkFailed />;
    case 'allowed':
      return <Navigate to="/" replace />;
  }
}

export function SignInPage() {
  const status = useAuthStore((state) => state.status);

  return (
    <div className={classes.page}>
      <aside className={classes.side}>
        <Link className={classes.mark} to="/">Bible Center</Link>
        <div>
          <p className={classes.sideText}>Keep your place, and the verses that matter to you.</p>
          <p className={classes.sideNote}>Reading and searching never need an account. Sign in to highlight, bookmark and upvote verses.</p>
        </div>
      </aside>
      <main className={classes.formSide}>
        <div className={classes.form}>{panelFor(status)}</div>
      </main>
    </div>
  );
}
