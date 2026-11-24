import {describe, expect, it} from 'vite-plus/test';
import {findReleaseProblems} from '../../scripts/check-release';
import {hostedMode} from '../../scripts/environments';

describe('hostedMode', () => {
  it('builds each hosted project with its own mode', () => {
    expect(hostedMode('vs-bible-center-dev')).toBe('staging');
    expect(hostedMode('vs-bible-center-prod')).toBe('production');
  });

  it('knows no other project', () => {
    expect(hostedMode('demo-bible-center')).toBeNull();
    expect(hostedMode('toString')).toBeNull();
    expect(hostedMode(undefined)).toBeNull();
  });
});

describe('findReleaseProblems', () => {
  const MAIN = 'a'.repeat(40);

  it('accepts a clean checkout of main', () => {
    expect(findReleaseProblems({uncommitted: '', head: MAIN, main: MAIN})).toEqual([]);
  });

  it('refuses uncommitted changes', () => {
    const [problem] = findReleaseProblems({uncommitted: ' M apps/web/src/App.tsx\n', head: MAIN, main: MAIN});

    expect(problem).toContain('not committed');
  });

  it('refuses a commit other than main', () => {
    const [problem] = findReleaseProblems({uncommitted: '', head: 'b'.repeat(40), main: MAIN});

    expect(problem).toContain('main on GitHub is at aaaaaaa');
  });
});
