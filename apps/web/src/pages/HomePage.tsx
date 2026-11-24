import type {AccountDeletedState} from '@/components/account/DeleteAccountDialog';

import {Link, useLocation} from 'react-router';
import {SearchBox} from '@/components/SearchBox';
import {VerseOfTheDay} from '@/components/verseOfTheDay/VerseOfTheDay';
import {COMMON_TOPICS, topicPath} from '@/topics/topicData';
import classes from './HomePage.module.scss';

export function HomePage() {
  const isAccountDeleted = (useLocation().state as Partial<AccountDeletedState> | null)?.accountDeleted === true;

  return (
    <main className={classes.content}>
      {isAccountDeleted && (
        <p className={classes.deleted} role="status">
          Your account and everything kept for it are deleted. You can still read and search, and create a new account
          at any time.
        </p>
      )}
      <VerseOfTheDay />
      <div className={classes.search}>
        <SearchBox showLabel placeholder="John 1:1-5, “mercies never fail”, or marriage" />
      </div>
      <section className={classes.topics}>
        <h2 className={classes.topicsTitle}>What does the Bible say about</h2>
        <div className={classes.topicLinks}>
          {COMMON_TOPICS.map((name) => (
            <Link key={name} to={topicPath(name)}>
              {name}
            </Link>
          ))}
          <Link to="/topics">more topics</Link>
        </div>
      </section>
    </main>
  );
}
