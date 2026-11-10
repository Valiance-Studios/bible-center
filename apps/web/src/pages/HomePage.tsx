import {Link} from 'react-router';
import {SearchBox} from '@/components/SearchBox';
import {VerseOfTheDay} from '@/components/verseOfTheDay/VerseOfTheDay';
import {COMMON_TOPICS, topicPath} from '@/topics/topicData';
import classes from './HomePage.module.scss';

export function HomePage() {
  return (
    <main className={classes.content}>
      <VerseOfTheDay />
      <div className={classes.search}>
        <SearchBox showLabel placeholder="John 1:1-5, “mercies never fail”, or marriage" />
      </div>
      <section className={classes.topics}>
        <h2 className={classes.topicsTitle}>What does the Bible say about</h2>
        <div className={classes.topicLinks}>
          {COMMON_TOPICS.map((name) => <Link key={name} to={topicPath(name)}>{name}</Link>)}
          <Link to="/topics">more topics</Link>
        </div>
      </section>
    </main>
  );
}
