import type {ReactNode} from 'react';
import type {Role} from '@bible-center/core';

import {Link} from 'react-router';
import {Button, Loader} from '@mantine/core';
import {useAuthStore} from '@/stores/auth';
import classes from './RoleGate.module.scss';

interface RoleGateProps {
  /** Whether the role may see the page. */
  canSee: (role: Role) => boolean;
  /** Who the page is for, such as "reviewers". */
  audience: string;
  /** Rendered with the signed-in user's id once they may see the page. */
  children: (uid: string) => ReactNode;
}

/**
 * Shows a page only to the roles it is for, and tells anyone else why they cannot see it.
 * This only shapes the interface; the security rules refuse everyone else's reads and writes.
 */
export function RoleGate({canSee, audience, children}: RoleGateProps) {
  const status = useAuthStore((state) => state.status);
  const role = useAuthStore((state) => state.role);
  const uid = useAuthStore((state) => state.user?.uid);

  if (status === 'loading') {
    return <Loader aria-label="Loading" />;
  }

  if (status === 'signedOut') {
    return (
      <>
        <p className={classes.body}>{`This page is for ${audience}. Sign in to see it.`}</p>
        <Button component={Link} to="/sign-in" radius="xl" size="md">Sign in</Button>
      </>
    );
  }

  if (status !== 'allowed' || !uid || !canSee(role)) {
    return <p className={classes.body}>{`This page is only for ${audience}.`}</p>;
  }

  return children(uid);
}
