import type {BlockedAccount} from '@/firebase/blocking';

import {useState} from 'react';
import {isEmailAddress, normalizeEmail} from '@bible-center/core';
import {Alert, Button, Loader, TextInput} from '@mantine/core';
import {BlockDialog} from '@/components/blocking/BlockDialog';
import {useBlockedAccounts} from '@/components/blocking/useBlockedAccounts';
import {formatReviewDate} from '@/components/review/formatReviewDate';
import classes from './People.module.scss';

/** "Blocked November 14, 2026 by you. Their content was removed." */
function blockedNote(account: BlockedAccount, myUid: string): string {
  const by = account.blockedBy === myUid ? 'you' : account.blockedByEmail;

  return `Blocked ${formatReviewDate(account.blockedAt)} by ${by}.${account.contentRemoved ? ' Their content was removed.' : ''}`;
}

/** Admins block an account by email, and see and unblock the blocked ones. */
export function BlockedAccounts({uid, myEmail}: {uid: string; myEmail: string}) {
  const blocked = useBlockedAccounts();
  const [draft, setDraft] = useState('');
  const [problem, setProblem] = useState<string | null>(null);
  const [confirming, setConfirming] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);

  function askToBlock() {
    const email = normalizeEmail(draft);

    if (!isEmailAddress(email)) {
      setProblem('Enter an email address, such as name@example.com.');
    } else if (email === myEmail) {
      setProblem('You cannot block yourself.');
    } else if (blocked.accounts?.some((account) => account.email === email)) {
      setProblem(`${email} is already blocked.`);
    } else {
      setProblem(null);
      setConfirming(email);
    }
  }

  async function unblock(account: BlockedAccount) {
    const name = account.email ?? 'The account';

    try {
      await blocked.unblock(account.uid);
      setStatus(`Unblocked ${name}. Anything removed stays removed.`);
    } catch {
      setStatus(`${name} could not be unblocked. Check your connection and try again.`);
    }
  }

  return (
    <section aria-labelledby="blocked-title">
      <h2 id="blocked-title" className={classes.sectionTitle}>
        Blocked accounts
      </h2>
      <p className={classes.sectionIntro}>
        A blocked account can still read, but cannot highlight, take notes, memorize, vote, add verses, report or start
        topics.
      </p>

      <form
        className={classes.blockForm}
        aria-label="Block an account"
        noValidate
        onSubmit={(event) => {
          event.preventDefault();
          askToBlock();
        }}
      >
        <TextInput
          size="md"
          type="email"
          label="Email"
          autoComplete="off"
          value={draft}
          onChange={(event) => {
            setDraft(event.currentTarget.value);
            setProblem(null);
          }}
        />
        <Button type="submit" size="md">
          Block account
        </Button>
      </form>
      {problem && (
        <Alert color="red" mt="sm" role="alert">
          {problem}
        </Alert>
      )}
      <p className={classes.addHint}>Accounts can also be blocked from the Review page, beside what they added.</p>

      {blocked.hasLoadError && (
        <Alert color="red" title="Could not load the blocked accounts">
          <Button onClick={blocked.reload}>Try again</Button>
        </Alert>
      )}
      {blocked.isLoading && <Loader aria-label="Loading blocked accounts" />}
      {blocked.accounts?.length === 0 && <p className={classes.none}>No accounts are blocked.</p>}
      {blocked.accounts?.map((account) => (
        <div key={account.uid} className={classes.blocked}>
          <div>
            <div className={classes.email}>{account.email ?? 'An account with no email'}</div>
            <div className={classes.you}>{blockedNote(account, uid)}</div>
          </div>
          <button
            type="button"
            className={classes.remove}
            aria-label={`Unblock ${account.email ?? 'this account'}`}
            disabled={blocked.isUnblocking}
            onClick={() => void unblock(account)}
          >
            Unblock
          </button>
        </div>
      ))}
      {status && (
        <p className={classes.status} role="status">
          {status}
        </p>
      )}

      {confirming && (
        <BlockDialog
          title={`Block ${confirming}?`}
          isBlocking={blocked.isBlocking}
          onConfirm={async (removeContent) => {
            await blocked.block({email: confirming, removeContent});
            setDraft('');
            setStatus(`Blocked ${confirming}.`);
          }}
          onClose={() => setConfirming(null)}
        />
      )}
    </section>
  );
}
