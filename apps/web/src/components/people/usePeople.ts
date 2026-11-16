import type {StaffMember} from '@/firebase/people';

import {useMutation, useQuery, useQueryClient} from '@tanstack/react-query';
import {changeRole, giveRole, listStaff, removeRole} from '@/firebase/people';

const STAFF_KEY = ['staff'] as const;

/** The reviewers and admins, and an admin's ways to change them. */
export function usePeople(uid: string) {
  const queryClient = useQueryClient();
  const staff = useQuery({queryKey: STAFF_KEY, queryFn: listStaff, staleTime: 0, retry: 4});
  const refresh = () => queryClient.invalidateQueries({queryKey: STAFF_KEY});
  const give = useMutation({mutationFn: (member: StaffMember) => giveRole(uid, member), onSettled: refresh});
  const change = useMutation({mutationFn: (member: StaffMember) => changeRole(uid, member), onSettled: refresh});
  const remove = useMutation({mutationFn: removeRole, onSettled: refresh});

  return {
    staff: staff.data,
    isLoading: staff.isLoading,
    hasLoadError: staff.isError,
    reload: () => void staff.refetch(),
    isSaving: give.isPending || change.isPending || remove.isPending,
    giveRole: give.mutateAsync,
    changeRole: change.mutateAsync,
    makeMember: remove.mutateAsync,
  };
}
