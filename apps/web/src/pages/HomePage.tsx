import {Link} from 'react-router';
import classes from './HomePage.module.scss';

/** One fixed verse until the Verse of the Day feature exists; see "Verse of the Day" in `ARCHITECTURE.md`. */
const PLACEHOLDER_VERSE = {
  text: 'Because of the loving devotion of the LORD we are not consumed, for His mercies never fail. They are new every morning; great is Your faithfulness!',
  reference: 'Lamentations 3:22–23, BSB',
};

export function HomePage() {
  return (
    <main className={classes.content}>
      <p className={classes.label}>Verse of the day</p>
      <blockquote className={classes.verse}>{PLACEHOLDER_VERSE.text}</blockquote>
      <p className={classes.reference}>{PLACEHOLDER_VERSE.reference}</p>
    </main>
  );
}

/** Stands in for a page that is not built yet, so the app's navigation has somewhere to go. */
export function ComingSoonPage({title}: {title: string}) {
  return (
    <main className={classes.content}>
      <h1 className={classes.comingSoonTitle}>{title}</h1>
      <p>This part of Bible Center is still being built.</p>
      <Link to="/">Back to the home page</Link>
    </main>
  );
}
