import type {FormEvent} from 'react';
import type {MemoryGroup} from '@bible-center/core';

import {useState} from 'react';
import {Link, useNavigate} from 'react-router';
import {groupMemoryVerses, parseReferences} from '@bible-center/core';
import {Alert, Button, Loader, TextInput} from '@mantine/core';
import {memorizePath} from '@/bible/paths';
import {findTranslation} from '@/bible/translations';
import {MemoryListEntryItem} from '@/components/memorize/MemoryListEntryItem';
import {useMemoryList} from '@/components/memorize/useMemoryList';
import {useTranslationStore} from '@/stores/translation';
import pageClasses from './AdminPage.module.scss';
import classes from '@/components/memorize/Memorize.module.scss';

const GROUPS: Record<MemoryGroup, {title: string; note: string}> = {
  due: {title: 'Ready to review', note: 'Memorized verses come back a week after you last practiced them.'},
  learning: {title: 'Learning', note: 'Practice until you can say them without help, then mark them memorized.'},
  memorized: {title: 'Memorized', note: ''},
};

/** Starts practicing any verse. */
function StartForm() {
  const navigate = useNavigate();
  const [text, setText] = useState('');
  const [error, setError] = useState<string | null>(null);

  function start(event: FormEvent) {
    event.preventDefault();

    const references = parseReferences(text);
    const reference = references?.length === 1 ? references[0] : undefined;

    if (!reference) {
      setError('Enter one reference, such as Psalm 23:1-2.');

      return;
    }

    void navigate(memorizePath(reference));
  }

  return (
    <form className={classes.start} onSubmit={start}>
      <TextInput
        className={classes.startInput}
        label="Verse or passage"
        placeholder="Psalm 23:1-2"
        size="md"
        value={text}
        error={error}
        onChange={(event) => {
          setText(event.currentTarget.value);
          setError(null);
        }}
      />
      <Button type="submit" size="md">Start</Button>
    </form>
  );
}

/** The signed-in user's memory list, in its sections. */
function MemoryList() {
  const list = useMemoryList();
  const translation = findTranslation(useTranslationStore((state) => state.translationId));
  const [now] = useState(() => new Date());

  if (list.authStatus === 'loading' || list.isLoading) {
    return <Loader aria-label="Loading your memory list" />;
  }

  if (list.authStatus === 'signedOut') {
    return (
      <div className={classes.signedOut}>
        <p>Sign in to keep a list of the verses you are learning, and see which are ready to review. Anyone can practice without an account.</p>
        <Button component={Link} to="/sign-in" radius="xl">Sign in</Button>
      </div>
    );
  }

  if (!list.canKeepList) {
    return <p className={classes.empty}>Keeping a memory list is invite-only for now. Anyone can practice.</p>;
  }

  if (list.hasLoadError || !list.entries) {
    return (
      <Alert color="red" title="Your memory list could not be loaded">
        <p className={pageClasses.alertText}>Check your connection and try again.</p>
        <Button onClick={list.reload}>Try again</Button>
      </Alert>
    );
  }

  if (list.entries.length === 0) {
    return <p className={classes.empty}>Verses you add will appear here. Start with one above, then choose Add to my memory list.</p>;
  }

  return (
    <>
      {groupMemoryVerses(list.entries, now).map(({group, verses}) => (
        <section key={group} className={classes.group} aria-label={GROUPS[group].title}>
          <h3 className={classes.groupTitle}>
            {GROUPS[group].title}
            {' '}
            <span>{verses.length}</span>
          </h3>
          {GROUPS[group].note && <p className={classes.groupNote}>{GROUPS[group].note}</p>}
          {verses.map((entry) => (
            <MemoryListEntryItem
              key={entry.key}
              entry={entry}
              translation={translation}
              now={now}
              isSaving={list.isSaving}
              onRemove={() => void list.remove(entry.key).catch(() => {})}
            />
          ))}
        </section>
      ))}
      {list.hasSaveError && <p className={classes.saveError} role="alert">Your memory list could not be changed. Check your connection and try again.</p>}
    </>
  );
}

/** Where people start memorizing a verse, and keep their memory list. */
export function MemorizePage() {
  return (
    <main className={pageClasses.content}>
      <title>Memorize | Bible Center</title>
      <h1 className={pageClasses.title}>Memorize</h1>
      <p className={pageClasses.intro}>Learn a verse by heart with flash cards, or by letting its words fade a few at a time until you can say it all.</p>
      <StartForm />
      <p className={classes.hint}>You can also choose Memorize on a verse in the reader, or beside the verse of the day.</p>
      <h2 className={classes.listTitle}>My memory list</h2>
      <MemoryList />
    </main>
  );
}
