import type {BlockedAccounts} from '@/components/blocking/useBlockedAccounts';

import {useState} from 'react';
import {useQuery} from '@tanstack/react-query';
import {BlockDialog} from '@/components/blocking/BlockDialog';
import {accountJoinedAt} from '@/firebase/blocking';
import {formatReviewDate} from './formatReviewDate';
import classes from './ReviewItem.module.scss';

interface AccountLineProps {
  /** The account behind the item, or null if there is none, as for OpenBible's verses. */
  uid: string | null | undefined;
  /** What it did, as in "Added by", "Reported by" or "Started by". */
  lead: string;
  /** The same for the dialog, as in "added Matthew 22:30 to marriage". */
  did: string;
  accounts: BlockedAccounts;
}

/** For admins: when the account behind an item joined, and a way to block it. */
export function AccountLine({uid, lead, did, accounts}: AccountLineProps) {
  const [isConfirming, setIsConfirming] = useState(false);
  const joined = useQuery({
    queryKey: ['accountJoined', uid],
    queryFn: () => accountJoinedAt(uid ?? ''),
    enabled: Boolean(uid),
    staleTime: Infinity,
  });

  if (!uid) {
    return null;
  }

  const joinedText = joined.data ? formatReviewDate(joined.data) : null;

  return (
    <p className={classes.account}>
      <span>{joinedText ? `${lead} an account that joined ${joinedText}` : `${lead} an account`}</span>
      {accounts.isBlocked(uid) ? (
        <span className={classes.blockedTag}>Blocked</span>
      ) : (
        <button type="button" className={classes.block} onClick={() => setIsConfirming(true)}>
          Block this account
        </button>
      )}

      {isConfirming && (
        <BlockDialog
          title={`Block the account that ${did}?`}
          about={joinedText ? `It joined ${joinedText}.` : undefined}
          isBlocking={accounts.isBlocking}
          onConfirm={(removeContent) => accounts.block({uid, removeContent})}
          onClose={() => setIsConfirming(false)}
        />
      )}
    </p>
  );
}
