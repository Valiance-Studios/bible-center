import {Link} from 'react-router';
import {SearchBox} from '@/components/SearchBox';
import {COMMON_TOPICS, topicPath} from '@/topics/topicData';
import classes from './HomePage.module.scss';

/** One fixed verse until the Verse of the Day feature exists; see "Verse of the Day" in `ARCHITECTURE.md`. */
const PLACEHOLDER_VERSE = {
  text: 'Because of the loving devotion of the LORD we are not consumed, for His mercies never fail. They are new every morning; great is Your faithfulness!',
  reference: 'Lamentations 3:22–23, BSB',
  chapterPath: '/read/lamentations/3',
};

export function HomePage() {
  return (
    <main className={classes.content}>
      <p className={classes.label}>Verse of the day</p>
      <blockquote className={classes.verse}>{PLACEHOLDER_VERSE.text}</blockquote>
      <p className={classes.reference}>
        <Link to={PLACEHOLDER_VERSE.chapterPath}>{PLACEHOLDER_VERSE.reference}</Link>
      </p>
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
