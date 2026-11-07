import {Link} from 'react-router';
import {Button, Menu} from '@mantine/core';
import {useAuthStore} from '@/stores/auth';
import classes from './AppLayout.module.scss';

/** The sign-in button, or the signed-in person's menu. Shows nothing until the auth state is known. */
export function AccountMenu() {
  const status = useAuthStore((state) => state.status);
  const user = useAuthStore((state) => state.user);
  const signOut = useAuthStore((state) => state.signOut);

  if (status === 'loading') {
    return null;
  }

  if (!user) {
    return <Button component={Link} to="/sign-in" radius="xl">Sign in</Button>;
  }

  const name = user.displayName || user.email || 'Account';

  return (
    <Menu position="bottom-end">
      <Menu.Target>
        <button type="button" className={classes.avatar} aria-label="Account menu">
          {name.charAt(0).toUpperCase()}
        </button>
      </Menu.Target>
      <Menu.Dropdown>
        <Menu.Label>{name}</Menu.Label>
        {status !== 'allowed' && <Menu.Item component={Link} to="/sign-in">Account status</Menu.Item>}
        <Menu.Item onClick={() => void signOut()}>Sign out</Menu.Item>
      </Menu.Dropdown>
    </Menu>
  );
}
