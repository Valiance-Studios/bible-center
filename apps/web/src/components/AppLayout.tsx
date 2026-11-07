import {useState} from 'react';
import {Link, Outlet, ScrollRestoration, useMatch} from 'react-router';
import {BIBLE_BOOKS, BIBLE_SECTIONS} from '@bible-center/core';
import {chapterPath} from '@/bible/paths';
import {AccountMenu} from './AccountMenu';
import {PhoneMenu} from './PhoneMenu';
import {ThemeToggle} from './ThemeToggle';
import classes from './AppLayout.module.scss';

/** The chapter each thumb tab opens: the first of its section. */
function sectionPath(section: string): string {
  const book = BIBLE_BOOKS.find((candidate) => candidate.section === section);

  return book ? chapterPath({book, chapter: 1}) : '/read';
}

/** The app bar and thumb index around every page except sign-in. */
export function AppLayout() {
  const [menuOpened, setMenuOpened] = useState(false);
  const readerMatch = useMatch('/read/:book/:chapter');
  const currentSection = BIBLE_BOOKS.find((book) => book.slug === readerMatch?.params.book)?.section;

  return (
    <div className={classes.app}>
      <ScrollRestoration />

      <header className={classes.bar}>
        <button type="button" className={classes.menuButton} aria-label="Open menu" onClick={() => setMenuOpened(true)}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
            <path d="M4 7h16M4 12h16M4 17h16" />
          </svg>
        </button>
        <Link className={classes.mark} to="/">Bible Center</Link>
        <Link className={classes.navLink} to="/read">Read</Link>
        <Link className={classes.navLink} to="/topics">Topics</Link>
        <ThemeToggle />
        <AccountMenu />
      </header>

      <nav className={classes.thumb} aria-label="Browse by section of the Bible">
        {BIBLE_SECTIONS.map(({name}) => (
          <Link
            key={name}
            to={sectionPath(name)}
            className={name === currentSection ? classes.currentTab : undefined}
            aria-current={name === currentSection ? 'true' : undefined}
          >
            {name}
          </Link>
        ))}
      </nav>

      <PhoneMenu opened={menuOpened} onClose={() => setMenuOpened(false)} />

      <Outlet />
    </div>
  );
}
