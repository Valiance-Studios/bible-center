import type {Person} from '@/firebase/people';

import {useMutation, useQuery, useQueryClient} from '@tanstack/react-query';
import {addPerson, listPeople, removePerson, setRole} from '@/firebase/people';

const PEOPLE_KEY = ['people'] as const;

/** Everyone on the allowlist, and an admin's ways to change it. */
export function usePeople(uid: string) {
  const queryClient = useQueryClient();
  const people = useQuery({queryKey: PEOPLE_KEY, queryFn: listPeople, staleTime: 0, retry: 4});
  const refresh = () => queryClient.invalidateQueries({queryKey: PEOPLE_KEY});
  const add = useMutation({mutationFn: (person: Person) => addPerson(uid, person), onSettled: refresh});
  const changeRole = useMutation({mutationFn: (person: Person) => setRole(uid, person), onSettled: refresh});
  const remove = useMutation({mutationFn: removePerson, onSettled: refresh});

  return {
    people: people.data,
    isLoading: people.isLoading,
    hasLoadError: people.isError,
    reload: () => void people.refetch(),
    isSaving: add.isPending || changeRole.isPending || remove.isPending,
    add: add.mutateAsync,
    setRole: changeRole.mutateAsync,
    remove: remove.mutateAsync,
  };
}
