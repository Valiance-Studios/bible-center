import type {MemoryListEntry, MemorySpan} from '@/firebase/memoryVerses';
import type {MemoryList} from './useMemoryList';

import {Link} from 'react-router';
import {Button, Loader} from '@mantine/core';
import {memoryKeyOf} from '@/firebase/memoryVerses';
import classes from './Memorize.module.scss';

interface MemoryListBoxProps {
  span: MemorySpan;
  list: MemoryList;
}

/** The passage's place on the memory list: a way to add it, or its status and a way to change it. */
export function MemoryListBox({span, list}: MemoryListBoxProps) {
  const key = memoryKeyOf(span);
  const entry: MemoryListEntry | undefined = list.entries?.find((candidate) => candidate.key === key);
  let content;

  if (list.authStatus === 'signedOut') {
    content = (
      <>
        <p>Sign in to keep this verse on a memory list and come back to it.</p>
        <Button component={Link} to="/sign-in" variant="outline" radius="xl">Sign in</Button>
      </>
    );
  } else if (!list.canKeepList && list.authStatus !== 'loading') {
    content = <p>Keeping a memory list is invite-only for now. Anyone can practice.</p>;
  } else if (list.authStatus === 'loading' || list.isLoading) {
    content = <Loader size="sm" aria-label="Loading your memory list" />;
  } else if (list.hasLoadError) {
    content = (
      <>
        <p>Your memory list could not be loaded.</p>
        <Button variant="outline" radius="xl" onClick={list.reload}>Try again</Button>
      </>
    );
  } else if (entry) {
    const isMemorized = entry.status === 'memorized';

    content = (
      <>
        <p>
          <strong>{isMemorized ? 'On your memory list, memorized.' : 'On your memory list, learning.'}</strong>
          {' '}
          {isMemorized ? 'It comes back for review a week after you last practiced it.' : 'Mark it memorized once you can say it without help.'}
        </p>
        <Button
          variant="outline"
          radius="xl"
          loading={list.isSaving}
          onClick={() => void list.practice({key, status: isMemorized ? 'learning' : 'memorized'}).catch(() => {})}
        >
          {isMemorized ? 'Still learning it' : 'Mark as memorized'}
        </Button>
      </>
    );
  } else {
    content = (
      <>
        <p>Keep this verse on your memory list to come back to it.</p>
        <Button variant="outline" radius="xl" loading={list.isSaving} onClick={() => void list.add(span).catch(() => {})}>
          Add to my memory list
        </Button>
      </>
    );
  }

  return (
    <div className={classes.listBox}>
      {content}
      {list.hasSaveError && <p className={classes.saveError} role="alert">Your memory list could not be changed. Check your connection and try again.</p>}
    </div>
  );
}
