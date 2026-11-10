import {Button, Group, Modal} from '@mantine/core';
import classes from './AboutDialog.module.scss';

const REPOSITORY_URL = 'https://github.com/Valiance-Studios/bible-center';

interface AboutDialogProps {
  opened: boolean;
  onClose: () => void;
}

/** What Bible Center is, and where its text and data come from. A shorter version of the README; keep the two consistent. */
export function AboutDialog({opened, onClose}: AboutDialogProps) {
  return (
    <Modal opened={opened} onClose={onClose} title="About Bible Center" size="lg" classNames={{title: classes.title, body: classes.body}}>
      <p className={classes.lead}>
        A free, one-stop Bible resource: read the Bible, search it, study the original languages, memorize it, and see what Scripture
        says about a topic.
      </p>
      <p>
        Anyone can read, search, study and practice without an account. Signing in, by invitation for now, adds highlights, bookmarks,
        notes, a memory list and voting on topics.
      </p>

      <h2 className={classes.heading}>Translations</h2>
      <ul>
        <li>
          <a href="https://berean.bible" target="_blank" rel="noreferrer">Berean Standard Bible</a>
          , dedicated to the public domain.
        </li>
        <li>
          King James Version, public domain in the United States. Text from
          {' '}
          <a href="https://openbible.com/textfiles/kjv.txt" target="_blank" rel="noreferrer">OpenBible</a>
          .
        </li>
      </ul>

      <h2 className={classes.heading}>Data and credits</h2>
      <ul>
        <li>
          Topics from
          {' '}
          <a href="https://www.openbible.info/topics/" target="_blank" rel="noreferrer">OpenBible.info</a>
          , licensed
          {' '}
          <a href="https://creativecommons.org/licenses/by/4.0/" target="_blank" rel="noreferrer">CC BY</a>
          .
        </li>
        <li>
          Hebrew and Greek data from
          {' '}
          <a href="https://stepbible.github.io/STEPBible-Data/" target="_blank" rel="noreferrer">STEP Bible</a>
          , by Tyndale House, licensed CC BY 4.0. Bible Center shortens its definitions and renumbers its words to match each translation.
        </li>
      </ul>

      <h2 className={classes.heading}>Free to use</h2>
      <p>
        Bible Center has no ads and charges nothing. Its code is open to read under the
        {' '}
        <a href={`${REPOSITORY_URL}/blob/main/LICENSE`} target="_blank" rel="noreferrer">PolyForm Noncommercial license</a>
        .
      </p>

      <Group className={classes.foot} justify="space-between">
        <a href={REPOSITORY_URL} target="_blank" rel="noreferrer">Source code and suggestions on GitHub</a>
        <Button radius="xl" onClick={onClose}>Close</Button>
      </Group>
    </Modal>
  );
}
