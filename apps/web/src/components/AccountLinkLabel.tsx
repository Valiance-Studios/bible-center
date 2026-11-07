import type {AccountLink} from './useAccountLinks';

import classes from './AccountLinkLabel.module.scss';

/** A menu link's label, with how many things wait there when there are any. */
export function AccountLinkLabel({label, count}: AccountLink) {
  return (
    <span className={classes.label}>
      {label}
      {count ? <span className={classes.count} aria-label={`${count} waiting`}>{count}</span> : null}
    </span>
  );
}
