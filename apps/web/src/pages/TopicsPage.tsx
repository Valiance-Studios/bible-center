import {useState} from 'react';
import {useQuery} from '@tanstack/react-query';
import {Link, useSearchParams} from 'react-router';
import {normalizeTopicName} from '@bible-center/core';
import {Alert, Button, Loader, TextInput} from '@mantine/core';
import {COMMON_TOPICS, topicNamesQuery, topicPath} from '@/topics/topicData';
import classes from './TopicsPage.module.scss';

const LETTERS = [...'abcdefghijklmnopqrstuvwxyz'];
/** Topics that start with a digit, such as "10 commandments", are listed under this. */
const OTHER = '#';
const MAX_MATCHES = 8;

function firstLetterOf(name: string): string {
  const first = name.charAt(0);

  return LETTERS.includes(first) ? first : OTHER;
}

function FindTopic({names}: {names: readonly string[]}) {
  const [query, setQuery] = useState('');
  const normalized = normalizeTopicName(query);
  const matches = normalized ? names.filter((name) => name.includes(normalized)).slice(0, MAX_MATCHES) : [];

  return (
    <>
      <TextInput
        className={classes.find}
        size="md"
        type="search"
        label="Find a topic"
        placeholder="grief, money, forgiveness"
        value={query}
        onChange={(event) => setQuery(event.currentTarget.value)}
      />
      {matches.length > 0 && (
        <ul className={classes.matches} aria-label="Matching topics">
          {matches.map((name) => <li key={name}><Link to={topicPath(name)}>{name}</Link></li>)}
        </ul>
      )}
      {normalized && matches.length === 0 && (
        <p className={classes.none}>
          {`No topic is named “${normalized}” yet. `}
          <Link to={topicPath(normalized)}>Start it by adding a verse</Link>
        </p>
      )}
    </>
  );
}

/** Every topic: find one by name, the common ones, and all of them from A to Z. */
export function TopicsPage() {
  const [searchParams] = useSearchParams();
  const {data: names, isPending, isError, refetch} = useQuery(topicNamesQuery);
  const requestedLetter = searchParams.get('letter') ?? 'a';
  const letter = requestedLetter === OTHER || LETTERS.includes(requestedLetter) ? requestedLetter : 'a';
  const letterTopics = (names ?? []).filter((name) => firstLetterOf(name) === letter);
  const letterLabel = letter === OTHER ? 'a number' : letter.toUpperCase();

  return (
    <main className={classes.content}>
      <title>Topics | Bible Center</title>
      <h1 className={classes.title}>Topics</h1>
      <p className={classes.intro}>What does the Bible say about…? Each topic ranks the verses people on Bible Center and OpenBible.info found most helpful.</p>

      {isPending && <Loader aria-label="Loading topics" />}

      {isError && (
        <Alert color="red" title="Could not load the topics">
          <p className={classes.alertText}>Check your connection and try again.</p>
          <Button onClick={() => void refetch()}>Try again</Button>
        </Alert>
      )}

      {names && <FindTopic names={names} />}

      <h2 className={classes.heading}>Common topics</h2>
      <div className={classes.common}>
        {COMMON_TOPICS.map((name) => <Link key={name} to={topicPath(name)}>{name}</Link>)}
      </div>

      {names && (
        <>
          <h2 className={classes.heading}>All topics, A to Z</h2>
          <nav className={classes.letters} aria-label="Topics by first letter">
            {[...LETTERS, OTHER].map((candidate) => (
              <Link
                key={candidate}
                to={`?letter=${encodeURIComponent(candidate)}`}
                replace
                aria-current={candidate === letter ? 'true' : undefined}
                aria-label={candidate === OTHER ? 'Topics starting with a number' : undefined}
              >
                {candidate.toUpperCase()}
              </Link>
            ))}
          </nav>
          <p className={classes.count}>{`${letterTopics.length.toLocaleString('en-US')} topics starting with ${letterLabel}`}</p>
          <ul className={classes.all}>
            {letterTopics.map((name) => <li key={name}><Link to={topicPath(name)}>{name}</Link></li>)}
          </ul>
        </>
      )}

      <p className={classes.credit}>
        {'Topics from '}
        <a href="https://www.openbible.info/topics/">OpenBible.info</a>
        , licensed CC BY, and from people on Bible Center.
      </p>
    </main>
  );
}
