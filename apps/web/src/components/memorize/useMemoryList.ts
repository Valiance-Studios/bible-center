import type {MemoryStatus} from '@bible-center/core';
import type {MemorySpan} from '@/firebase/memoryVerses';

import {useMutation, useQuery, useQueryClient} from '@tanstack/react-query';
import {addMemoryVerse, listMemoryVerses, recordPractice, removeMemoryVerse} from '@/firebase/memoryVerses';
import {limitOf} from '@/firebase/userRecord';
import {useAuthStore} from '@/stores/auth';

export type MemoryList = ReturnType<typeof useMemoryList>;

function memoryListKey(uid: string | undefined) {
  return ['memoryVerses', uid] as const;
}

interface Practice {
  key: string;
  status?: MemoryStatus;
}

/**
 * The signed-in user's memory list and the ways to change it. Only verified accounts have one; for anyone else
 * `uid` is undefined and nothing loads.
 */
export function useMemoryList() {
  const authStatus = useAuthStore((state) => state.status);
  const uid = useAuthStore((state) => (state.status === 'allowed' ? state.user?.uid : undefined));
  // A blocked account still sees its list, but cannot change it.
  const isBlocked = useAuthStore((state) => state.status === 'allowed' && state.isBlocked);
  const queryClient = useQueryClient();
  const queryKey = memoryListKey(uid);
  const list = useQuery({queryKey, queryFn: () => listMemoryVerses(uid ?? ''), enabled: uid !== undefined});
  const refresh = () => queryClient.invalidateQueries({queryKey});
  const requireUid = () => {
    if (!uid) {
      throw new Error('Sign in to keep a memory list.');
    }

    return uid;
  };
  const add = useMutation({mutationFn: (span: MemorySpan) => addMemoryVerse(requireUid(), span), onSettled: refresh});
  const practice = useMutation({
    // Practicing still works for a blocked account; it just is not recorded.
    mutationFn: async ({key, status}: Practice) => (isBlocked ? undefined : recordPractice(requireUid(), key, status)),
    onSettled: refresh,
  });
  const remove = useMutation({mutationFn: (key: string) => removeMemoryVerse(requireUid(), key), onSettled: refresh});

  return {
    /** Whether this user can keep a list at all. */
    canKeepList: uid !== undefined,
    /** Whether an admin blocked the account, so the list can be seen but not changed. */
    isBlocked,
    /** Why they cannot, if they cannot: still loading, signed out, or not finished signing in. */
    authStatus,
    entries: list.data,
    isLoading: list.isLoading,
    hasLoadError: list.isError,
    reload: () => void list.refetch(),
    isSaving: add.isPending || practice.isPending || remove.isPending,
    hasSaveError: add.isError || practice.isError || remove.isError,
    /** Whether adding failed because the list is as long as one account's may be. */
    isFull: limitOf(add.error)?.type === 'count',
    add: add.mutateAsync,
    practice: practice.mutateAsync,
    remove: remove.mutateAsync,
  };
}
