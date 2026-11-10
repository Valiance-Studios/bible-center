import type {MemoryStatus} from '@bible-center/core';
import type {MemorySpan} from '@/firebase/memoryVerses';

import {useMutation, useQuery, useQueryClient} from '@tanstack/react-query';
import {addMemoryVerse, listMemoryVerses, recordPractice, removeMemoryVerse} from '@/firebase/memoryVerses';
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
 * The signed-in user's memory list and the ways to change it. Only allowlisted users have one; for anyone else
 * `uid` is undefined and nothing loads.
 */
export function useMemoryList() {
  const authStatus = useAuthStore((state) => state.status);
  const uid = useAuthStore((state) => (state.status === 'allowed' ? state.user?.uid : undefined));
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
  const practice = useMutation({mutationFn: ({key, status}: Practice) => recordPractice(requireUid(), key, status), onSettled: refresh});
  const remove = useMutation({mutationFn: (key: string) => removeMemoryVerse(requireUid(), key), onSettled: refresh});

  return {
    /** Whether this user can keep a list at all. */
    canKeepList: uid !== undefined,
    /** Why they cannot, if they cannot: still loading, signed out, or not on the allowlist. */
    authStatus,
    entries: list.data,
    isLoading: list.isLoading,
    hasLoadError: list.isError,
    reload: () => void list.refetch(),
    isSaving: add.isPending || practice.isPending || remove.isPending,
    hasSaveError: add.isError || practice.isError || remove.isError,
    add: add.mutateAsync,
    practice: practice.mutateAsync,
    remove: remove.mutateAsync,
  };
}
