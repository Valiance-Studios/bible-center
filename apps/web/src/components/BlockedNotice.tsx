import type {ReactNode} from 'react';

import classes from './BlockedNotice.module.scss';

interface BlockedNoticeProps {
  /** Lets the controls it turns off point to it with `aria-describedby`. */
  id?: string;
  children: ReactNode;
}

/** Tells a blocked account, where it would save something, why it cannot. */
export function BlockedNotice({id, children}: BlockedNoticeProps) {
  return (
    <p id={id} className={classes.notice}>
      {children}
    </p>
  );
}
