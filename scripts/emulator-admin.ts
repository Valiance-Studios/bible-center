/**
 * Admin access to the local Auth and Firestore emulators, for seeding and tests.
 *
 * Talks to the emulators' REST APIs as an admin, so writes bypass the security rules the same way
 * a change made in the Firebase console would. The project and ports come from the dev configuration
 * (`apps/web/.env.development` and `firebase.json`), so this always targets the same emulators the dev server
 * and the E2E tests use.
 */
import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {loadEnv} from 'vite';

export interface EmulatorAccount {
  email: string;
  displayName: string;
}

interface EmulatorPorts {
  auth: number;
  firestore: number;
}

const env = loadEnv('development', fileURLToPath(new URL('../apps/web', import.meta.url)), 'VITE_');
const projectId = env.VITE_FIREBASE_PROJECT_ID ?? '';

// The `demo-` prefix is what keeps the emulators from ever reaching real Firebase resources.
if (!projectId.startsWith('demo-')) {
  throw new Error(`Refusing to administer project "${projectId}": the emulator project id must start with "demo-".`);
}

function readEmulatorPorts(): EmulatorPorts {
  const config = JSON.parse(readFileSync(new URL('../firebase.json', import.meta.url), 'utf8')) as {
    emulators: {auth: {port: number}; firestore: {port: number}};
  };

  return {auth: config.emulators.auth.port, firestore: config.emulators.firestore.port};
}

const ports = readEmulatorPorts();
/** The emulators accept "owner" as an admin token that bypasses the security rules. */
const ADMIN_HEADERS = {'Authorization': 'Bearer owner', 'Content-Type': 'application/json'};

async function request(url: string, init: RequestInit, action: string): Promise<unknown> {
  const response = await fetch(url, init);

  if (!response.ok) {
    throw new Error(`Could not ${action}: ${response.status} ${await response.text()}`);
  }

  return response.json();
}

/** Adds the email to the allowlist the security rules check. Safe to repeat. */
export async function allowEmail(email: string): Promise<void> {
  const url = `http://127.0.0.1:${ports.firestore}/v1/projects/${projectId}/databases/(default)/documents/allowedUsers/${encodeURIComponent(email.toLowerCase())}`;

  await request(url, {method: 'PATCH', headers: ADMIN_HEADERS, body: JSON.stringify({fields: {}})}, `allow ${email}`);
}

/** Opens the confirmation link the Auth emulator would have emailed, as the person would from their inbox. */
export async function confirmEmail(email: string): Promise<void> {
  const url = `http://127.0.0.1:${ports.auth}/emulator/v1/projects/${projectId}/oobCodes`;
  const {oobCodes} = await request(url, {headers: ADMIN_HEADERS}, 'list emailed links') as {
    oobCodes: {email: string; requestType: string; oobLink: string}[];
  };
  const code = oobCodes.findLast((candidate) => candidate.email === email && candidate.requestType === 'VERIFY_EMAIL');

  if (!code) {
    throw new Error(`No confirmation link was sent to ${email}.`);
  }

  await request(code.oobLink, {}, `confirm ${email}`).catch(() => {
    // The link answers with a web page rather than JSON once it has done its work.
  });
}

/**
 * Creates a verified Google account in the Auth emulator, the way its sign-in popup does, so the popup
 * then offers it under "Choose an account". Signing in again with the same email reuses the account.
 */
export async function createGoogleAccount(account: EmulatorAccount): Promise<void> {
  // The Auth emulator accepts an unsigned ID token: just the claims, as JSON.
  const idToken = JSON.stringify({sub: account.email, email: account.email, email_verified: true, name: account.displayName});
  const url = `http://127.0.0.1:${ports.auth}/identitytoolkit.googleapis.com/v1/accounts:signInWithIdp?key=${env.VITE_FIREBASE_API_KEY}`;
  const body = {
    requestUri: 'http://localhost',
    postBody: new URLSearchParams({id_token: idToken, providerId: 'google.com'}).toString(),
    returnSecureToken: true,
  };

  await request(url, {method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(body)}, `create ${account.email}`);
}
