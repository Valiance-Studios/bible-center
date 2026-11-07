import {useState} from 'react';
import {Link} from 'react-router';
import {BIBLE_BOOKS, BIBLE_SECTIONS} from '@bible-center/core';
import {Drawer} from '@mantine/core';
import {chapterPath} from '@/bible/paths';
import {AccountLinkLabel} from './AccountLinkLabel';
import {ThemeToggle} from './ThemeToggle';
import {useAccountLinks} from './useAccountLinks';
import classes from './PhoneMenu.module.scss';

interface PhoneMenuProps {
  opened: boolean;
  onClose: () => void;
}

/** The left-hand menu on phones, where the thumb index becomes tabs that open to list their books. */
export function PhoneMenu({opened, onClose}: PhoneMenuProps) {
  const [openSection, setOpenSection] = useState<string | null>(null);
  const accountLinks = useAccountLinks();

  return (
    <Drawer opened={opened} onClose={onClose} position="left" size={334} title="Bible Center" classNames={{title: classes.title, body: classes.body}}>
      <Link className={classes.link} to="/search" onClick={onClose}>Search</Link>
      <Link className={classes.link} to="/topics" onClick={onClose}>Topics</Link>
      {accountLinks.map((link) => (
        <Link key={link.to} className={classes.link} to={link.to} onClick={onClose}><AccountLinkLabel {...link} /></Link>
      ))}

      <h2 className={classes.heading}>Read the Bible</h2>
      <div className={classes.sections}>
        {BIBLE_SECTIONS.map(({name}) => {
          const isOpen = name === openSection;
          const books = BIBLE_BOOKS.filter((book) => book.section === name);

          return (
            <div key={name}>
              <button
                type="button"
                className={isOpen ? classes.tabOpen : classes.tab}
                aria-expanded={isOpen}
                onClick={() => setOpenSection(isOpen ? null : name)}
              >
                {name}
              </button>
              {isOpen && (
                <div className={classes.books}>
                  {books.map((book) => (
                    <Link key={book.slug} className={classes.book} to={chapterPath({book, chapter: 1})} onClick={onClose}>{book.name}</Link>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className={classes.footer}>
        <ThemeToggle withLabel />
      </div>
    </Drawer>
  );
}
