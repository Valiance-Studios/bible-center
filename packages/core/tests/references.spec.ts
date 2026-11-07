import {describe, expect, it} from 'vitest';
import {formatReference, parseReferences} from '../src/references';

function formatted(query: string): string[] | null {
  return parseReferences(query)?.map(formatReference) ?? null;
}

describe('parseReferences', () => {
  it.each([
    ['John 1:1', ['John 1:1']],
    ['John 1:1-5', ['John 1:1–5']],
    ['John 1:1–5', ['John 1:1–5']],
    ['John 1:1; Acts 2:3-4; Revelation 22:13', ['John 1:1', 'Acts 2:3–4', 'Revelation 22:13']],
    ['john 3:16', ['John 3:16']],
    ['  John   3 : 16 ', ['John 3:16']],
    ['John 3', ['John 3']],
    ['John 3-4', ['John 3–4']],
    ['John 1:1-2:3', ['John 1:1–2:3']],
    ['Psalm 23', ['Psalm 23']],
    ['Ps 23:1', ['Psalm 23:1']],
    ['Psalms 1-2', ['Psalms 1–2']],
    ['1 Cor 13:4-7', ['1 Corinthians 13:4–7']],
    ['1cor. 13:4', ['1 Corinthians 13:4']],
    ['1 John 5', ['1 John 5']],
    ['1jn 1:9', ['1 John 1:9']],
    ['Song of Solomon 2:1', ['Song of Solomon 2:1']],
    ['Rev 22:13', ['Revelation 22:13']],
    ['Jude 5', ['Jude 1:5']],
    ['John 1:1, 3, 5-7', ['John 1:1', 'John 1:3', 'John 1:5–7']],
    ['John 1:1; 2:3', ['John 1:1', 'John 2:3']],
    ['John 1:1;', ['John 1:1']],
  ])('reads "%s"', (query, expected) => {
    expect(formatted(query)).toEqual(expected);
  });

  it.each([
    [''],
    ['marriage'],
    ['love is patient'],
    ['love 3'],
    ['John'],
    ['2:3'],
    ['Not A Book 1:1'],
    ['John 22'],
    ['John 0:1'],
    ['John 1:0'],
    ['John 1:5-1'],
    ['John 4-3'],
    ['John 3:16; marriage'],
    ['1-2:3'],
    ['John 1-2:3'],
    ['Genesis 51:1'],
  ])('does not read "%s" as a reference', (query) => {
    expect(parseReferences(query)).toBeNull();
  });
});
