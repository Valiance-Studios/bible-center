# Deployment

The hosted app is [vs-bible-center-dev.web.app](https://vs-bible-center-dev.web.app), in the `vs-bible-center-dev` project. It is staging until a production project exists.

## Deploying

| Command | Deploys |
| --- | --- |
| `npm run deploy` | Hosting and Firestore rules and indexes |
| `npm run deploy:hosting` | Hosting only |
| `npm run deploy:rules` | Firestore rules and indexes only |

Hosting deploys first run `scripts/check-firebase-config.ts staging`, then `npm run build:staging`. The check refuses a deploy with missing Firebase config, no App Check site key, an App Check debug token, or the emulators turned on.

**The check reads `apps/web/.env.staging.local` too, so a machine with a debug token cannot deploy Hosting.** Temporarily move the token out of the file. This is deliberate, since a build containing a registered debug token would let anyone pass App Check.

## Allowlist

Add a document with no fields at `allowedUsers/<lowercase email>` in the Firestore console. The email must be verified to count; see [Authentication and Access](../ARCHITECTURE.md#authentication-and-access).

## App Check Setup

1. Create a reCAPTCHA Enterprise key with the **Score** integration type in Google Cloud. Add only the hosted domains, `vs-bible-center-dev.web.app` and `vs-bible-center-dev.firebaseapp.com`, and keep `localhost` off.
2. Register the web app with App Check in the Firebase console using that key.
3. Put the site key in the mode's env file in `apps/web` as `VITE_APPCHECK_SITE_KEY`. It is public.

The dev project's key is done and is in `apps/web/.env.staging`.

### Debug Token

To run against the hosted project from `localhost`, generate a debug token under App Check > Apps > Manage debug tokens, and put it in a gitignored `apps/web/.env.staging.local`:

```sh
VITE_APPCHECK_DEBUG_TOKEN=<token>
```

Each machine should have its own token. Delete a token from the console if it might have leaked, since it passes App Check.

### Enforcement

No service is enforced yet. Before enforcing one, confirm in the console's App Check metrics that the deployed app's requests are verified. Enforcement is per service for the whole project, and this project hosts only this app.

## Secrets

Cloud Functions read secrets from Secret Manager. They never go in env files.

| Purpose | Secret | Status |
| --- | --- | --- |
| Crossway ESV API key | To be named when issued | Waiting on Crossway |
| Anthropic API key | To be named at the AI step | Not created |
