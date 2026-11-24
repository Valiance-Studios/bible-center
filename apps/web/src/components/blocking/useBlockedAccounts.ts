import type {BlockAccountRequest} from '@bible-center/core';

import {useMutation, useQuery, useQueryClient} from '@tanstack/react-query';
import {blockAccount, listBlockedAccounts, unblockAccount} from '@/firebase/blocking';

export const BLOCKED_ACCOUNTS_KEY = ['blockedAccounts'] as const;

export type BlockedAccounts = ReturnType<typeof useBlockedAccounts>;

/** Every blocked account, and an admin's ways to block and unblock. Loads nothing unless `enabled`. */
export function useBlockedAccounts(enabled = true) {
  const queryClient = useQueryClient();
  const blocked = useQuery({
    queryKey: BLOCKED_ACCOUNTS_KEY,
    queryFn: listBlockedAccounts,
    enabled,
    staleTime: 0,
    retry: 4,
  });
  // Removing an account's content can change any topic, and the review queue.
  const refresh = () => queryClient.invalidateQueries();
  const block = useMutation({mutationFn: (request: BlockAccountRequest) => blockAccount(request), onSettled: refresh});
  const unblock = useMutation({
    mutationFn: unblockAccount,
    onSettled: () => queryClient.invalidateQueries({queryKey: BLOCKED_ACCOUNTS_KEY}),
  });

  return {
    accounts: blocked.data,
    isLoading: blocked.isLoading,
    hasLoadError: blocked.isError,
    reload: () => void blocked.refetch(),
    /** Whether this account is blocked, once the list has loaded. */
    isBlocked: (uid: string) => blocked.data?.some((account) => account.uid === uid) ?? false,
    isBlocking: block.isPending,
    isUnblocking: unblock.isPending,
    block: block.mutateAsync,
    unblock: unblock.mutateAsync,
  };
}
