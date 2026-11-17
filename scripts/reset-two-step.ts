/**
 * Turns off two-step sign-in for one account, for someone who lost their authenticator app. They sign in with their
 * password or Google account alone afterwards, and a reviewer or admin then sets two-step sign-in up again.
 *
 * Confirm who is asking before running this: anyone can claim to have lost their phone.
 *
 * Usage, with Google Cloud credentials for the project (gcloud auth application-default login):
 *   node scripts/reset-two-step.ts --project vs-bible-center-prod --email person@example.com            (dry run)
 *   node scripts/reset-two-step.ts --project vs-bible-center-prod --email person@example.com --write
 */
import {parseArgs} from 'node:util';
import {applicationDefault, initializeApp} from 'firebase-admin/app';
import {getAuth} from 'firebase-admin/auth';
import {HOSTED_PROJECTS} from './environments.ts';

/** The projects this may change. */
const PROJECTS = new Set(HOSTED_PROJECTS.keys());
const {values} = parseArgs({options: {project: {type: 'string'}, email: {type: 'string'}, write: {type: 'boolean', default: false}}});

if (!values.project || !PROJECTS.has(values.project) || !values.email) {
  console.error(`Usage: node scripts/reset-two-step.ts --project <${[...PROJECTS].join(' | ')}> --email <email> [--write]`);
  process.exit(1);
}

initializeApp({credential: applicationDefault(), projectId: values.project});

const auth = getAuth();
const user = await auth.getUserByEmail(values.email.trim().toLowerCase());
const factors = user.multiFactor?.enrolledFactors ?? [];

if (factors.length === 0) {
  console.log(`${user.email} has no two-step sign-in to reset.`);
  process.exit(0);
}

console.log(`${user.email} (${user.uid}) has: ${factors.map(({displayName, factorId}) => displayName ?? factorId).join(', ')}.`);

if (!values.write) {
  console.log('Dry run: pass --write to turn it off.');
  process.exit(0);
}

await auth.updateUser(user.uid, {multiFactor: {enrolledFactors: null}});
// Ends their other sessions too, in case the lost phone is in someone else's hands.
await auth.revokeRefreshTokens(user.uid);
console.log(`Two-step sign-in is off for ${user.email}, and their other sessions are signed out.`);
