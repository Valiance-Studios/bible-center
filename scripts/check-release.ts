/**
 * Refuses a production deploy that is not a release: a clean checkout of `main` as it is on GitHub, the commit that
 * was deployed to staging and tested there. Staging deploys may come from anywhere, so this does nothing for them.
 *
 * It runs from the `predeploy` of each part of firebase.json (Hosting, Firestore, Functions), with the project as
 * GCLOUD_PROJECT from the Firebase CLI, so even a partial deploy to production is checked.
 */
import {execSync} from 'node:child_process';
import {hostedMode} from './environments.ts';

export interface ReleaseState {
  /** `git status --porcelain`: anything not committed, including new files. */
  uncommitted: string;
  head: string;
  /** `origin/main` after fetching it. */
  main: string;
}

/** What makes this checkout something other than a release, if anything. */
export function findReleaseProblems({uncommitted, head, main}: ReleaseState): string[] {
  const problems: string[] = [];

  if (uncommitted.trim()) {
    problems.push('There are changes that are not committed. Production deploys build exactly what is on main.');
  }

  if (head !== main) {
    problems.push(
      `This checkout is at ${head.slice(0, 7)}, but main on GitHub is at ${main.slice(0, 7)}. Switch to main and pull, deploy it to staging and test it there, then deploy it to production.`,
    );
  }

  return problems;
}

if (import.meta.main && hostedMode(process.env.GCLOUD_PROJECT) === 'production') {
  const git = (args: string) => execSync(`git ${args}`, {encoding: 'utf8'}).trim();

  git('fetch --quiet origin main');

  const problems = findReleaseProblems({
    uncommitted: git('status --porcelain'),
    head: git('rev-parse HEAD'),
    main: git('rev-parse origin/main'),
  });

  if (problems.length > 0) {
    console.error(`Refusing to deploy to production:\n${problems.map((problem) => `- ${problem}`).join('\n')}`);
    process.exit(1);
  }
}
