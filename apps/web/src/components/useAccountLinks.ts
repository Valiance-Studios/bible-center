import {canReview, isAdmin} from '@bible-center/core';
import {useReviewQueue, waitingCount} from '@/components/review/useReviewQueue';
import {useAuthStore} from '@/stores/auth';

export interface AccountLink {
  to: string;
  label: string;
  /** How many things wait there, shown beside the label. */
  count?: number;
}

/** The signed-in pages this user can open, for the account and phone menus. */
export function useAccountLinks(): AccountLink[] {
  const status = useAuthStore((state) => state.status);
  const role = useAuthStore((state) => state.role);
  const isAllowed = status === 'allowed';
  const isReviewer = isAllowed && canReview(role);
  const {queue} = useReviewQueue(isReviewer);
  const links: AccountLink[] = [];

  if (isAllowed) {
    links.push({to: '/my-verses', label: 'My verses'});
  }

  if (isReviewer) {
    links.push({to: '/review', label: 'Review', ...(queue ? {count: waitingCount(queue)} : {})});
  }

  if (isAllowed && isAdmin(role)) {
    links.push({to: '/people', label: 'People'});
  }

  return links;
}
