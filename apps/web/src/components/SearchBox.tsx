import type {FormEvent} from 'react';

import {useState} from 'react';
import {createSearchParams, useNavigate} from 'react-router';
import classes from './SearchBox.module.scss';

interface SearchBoxProps {
  initialQuery?: string;
  /** Shows the label above the box, as on the home page. */
  showLabel?: boolean;
  placeholder?: string;
}

/** The one search box, for references, remembered wording and topics. */
export function SearchBox({initialQuery = '', showLabel = false, placeholder}: SearchBoxProps) {
  const navigate = useNavigate();
  const [query, setQuery] = useState(initialQuery);

  function submit(event: FormEvent): void {
    event.preventDefault();

    const trimmed = query.trim();

    if (trimmed) {
      void navigate({pathname: '/search', search: createSearchParams({q: trimmed}).toString()});
    }
  }

  return (
    <form role="search" onSubmit={submit}>
      <label className={showLabel ? classes.label : classes.hiddenLabel} htmlFor="search-query">
        Find a verse, a phrase or a topic
      </label>
      <div className={classes.box}>
        <input
          id="search-query"
          className={classes.input}
          type="search"
          placeholder={placeholder}
          value={query}
          onChange={(event) => setQuery(event.currentTarget.value)}
        />
        <button type="submit" className={classes.button}>Search</button>
      </div>
    </form>
  );
}
