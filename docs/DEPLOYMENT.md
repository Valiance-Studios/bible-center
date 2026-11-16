# Deployment

The hosted app is [vs-bible-center-dev.web.app](https://vs-bible-center-dev.web.app), in the `vs-bible-center-dev` project. It is staging until a production project exists.

## Deploying

| Command | Deploys |
| --- | --- |
| `npm run deploy` | Hosting, Firestore rules and indexes, and Cloud Functions |
| `npm run deploy:hosting` | Hosting only |
| `npm run deploy:rules` | Firestore rules and indexes only |
| `npm run deploy:functions` | Cloud Functions only; each needs its service account first, see [Cloud Functions](#cloud-functions) |

Deploy Firestore rules and indexes along with any feature that changes them, or the live site's writes or queries will be rejected. `npm run deploy` covers both, and `npm run deploy:rules` needs no debug token moved. New indexes take a few minutes to build after deploying.

Hosting deploys first run `scripts/check-firebase-config.ts staging`, then `npm run build:staging`. The check refuses a deploy with missing Firebase config, no App Check site key, an App Check debug token, or the emulators turned on.

**The check reads `apps/web/.env.staging.local` too, so a machine with a debug token cannot deploy Hosting.** Temporarily move the token out of the file. This is deliberate, since a build containing a registered debug token would let anyone pass App Check.

## API Key Restrictions

The Firebase web API key is public by design, so restrict it in Google Cloud under APIs & Services > Credentials.

- **HTTP referrers:** `vs-bible-center-dev.web.app/*`, `vs-bible-center-dev.firebaseapp.com/*` and `localhost:5173/*`. The `firebaseapp.com` entry is the value of `VITE_FIREBASE_AUTH_DOMAIN`, and Google sign-in fails without it, since its popup calls Firebase from that domain. The `localhost` entry is only for `npm run dev:staging`.
- **APIs:** at least Identity Toolkit, Token Service, Firestore and App Check.

To check a referrer, request `https://identitytoolkit.googleapis.com/v1/projects?key=<key>` with a `Referer` header. A 200 means it is allowed and a 403 means it is blocked.

Referrer restrictions are a light barrier, since non-browser clients can fake the header. Security rules and App Check are the real protection. `localhost` must stay off the reCAPTCHA key, which is separate; local runs use a [debug token](#debug-token) for App Check.

## Allowlist and Roles

Admins add people, set their roles and remove them on the People page (`/people`). The first admin has to be made in the Firestore console: create `allowedUsers/<lowercase email>` with no fields, and `roles/<lowercase email>` with a string field `role` set to `admin`. Anyone without a `roles` entry is a member. The email must be verified to count; see [Authentication and Access](../ARCHITECTURE.md#authentication-and-access).

### Account Age for Voting

Votes only count from accounts first seen at least a week ago, recorded as `createdAt` on `users/<uid>` at their first sign-in after the rule is deployed. Existing users get today's date then, so they cannot vote for a week. To let someone vote sooner, set their `createdAt` to an earlier timestamp in the Firestore console; the app never can.

### Moving Roles Off the Allowlist

Roles used to be a `role` field on `allowedUsers/<email>`. The rules now read them only from `roles/<email>`, so before deploying those rules, copy each reviewer and admin across in the Firestore console:

1. In `allowedUsers`, find every entry whose `role` is `reviewer` or `admin`.
2. For each, create `roles/<the same email>` with a string field `role` holding that value. Members need nothing.
3. Deploy the rules with `npm run deploy:rules`, then confirm the People page still opens for you.

The old `role` fields are ignored afterwards and can be deleted. If the rules go out first, admins lose their role until their `roles` entry exists, but the console can always add it.

Admins cannot change or remove their own entry, so there is always at least one admin. To demote the last admin, use the console.

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

Cloud Firestore and Authentication are enforced, so their requests need a valid App Check token: from the deployed app, or from `localhost` with a registered [debug token](#debug-token). The emulators do not check it.

Callable Cloud Functions enforce App Check themselves, through their `enforceAppCheck` option, from the moment they are deployed; the app already sends the tokens. Before enforcing another console service, deploy the app that sends its tokens and confirm in the console's App Check metrics that its requests are verified. Enforcement is per service for the whole project, and this project hosts only this app.

## Cloud Functions

The functions live in `apps/functions`. Each runs as its own service account, with only the roles it needs, named by the convention `sa-bc-<function>-<env>`. `apps/functions/.env.<project id>` tells each function its account, so a production project gets its own file and accounts.

| Function | Service account | Roles |
| --- | --- | --- |
| `blockAccount` | `sa-bc-block-account-dev` | Cloud Datastore User (`roles/datastore.user`), Firebase Authentication Viewer (`roles/firebaseauth.viewer`) |
| `deleteAccount` | `sa-bc-delete-account-dev` | Cloud Datastore User (`roles/datastore.user`), Firebase Authentication Admin (`roles/firebaseauth.admin`), since it deletes accounts |

Create each account before its first deploy, with a Google Cloud login that can manage IAM in the project:

```sh
PROJECT=vs-bible-center-dev

# Creates a function's service account and grants it the roles in the table above.
create_function_account() { # <account name> <function> <description> <role>...
  local name=$1 function=$2 description=$3
  shift 3
  gcloud iam service-accounts create "$name" --project $PROJECT \
    --display-name "Bible Center $function (dev)" --description "$description"
  for role in "$@"; do
    gcloud projects add-iam-policy-binding $PROJECT \
      --member "serviceAccount:$name@$PROJECT.iam.gserviceaccount.com" --role "$role" --condition None
  done
}

create_function_account sa-bc-block-account-dev blockAccount \
  "Runs the blockAccount Cloud Function: finds and blocks accounts, and removes their content." \
  roles/datastore.user roles/firebaseauth.viewer
create_function_account sa-bc-delete-account-dev deleteAccount \
  "Runs the deleteAccount Cloud Function: deletes a person's own account and its data." \
  roles/datastore.user roles/firebaseauth.admin
```

An account that already exists makes its `create` line fail harmlessly; the role grants still apply.

Whoever deploys needs Service Account User (`roles/iam.serviceAccountUser`) on each account; a project Owner has it already.

**Builds, once per project.** Cloud Build builds each function as the Compute Engine default service account, `<project number>-compute@developer.gserviceaccount.com`, which new projects create with almost no roles. The first deploy fails until it can read the uploaded source, push to Artifact Registry and write logs, which the Cloud Build Service Account role covers. Granting `roles/logging.logWriter` alone is not enough. Allow a few minutes for the grant to apply before retrying:

```sh
NUMBER=$(gcloud projects describe $PROJECT --format='value(projectNumber)')

gcloud projects add-iam-policy-binding $PROJECT \
  --member "serviceAccount:$NUMBER-compute@developer.gserviceaccount.com" \
  --role roles/cloudbuild.builds.builder --condition None
```

The Firebase CLI cannot choose a different build account. The functions still run as their own accounts; the default one only builds them. Then deploy with `npm run deploy:functions`, which builds them first. The service accounts have no keys, and none should be made: the functions run as them without one.

## Secrets

Cloud Functions read secrets from Secret Manager. They never go in env files.

| Purpose | Secret | Status |
| --- | --- | --- |
| Crossway ESV API key | To be named when issued | Waiting on Crossway |
| Anthropic API key | To be named at the AI step | Not created |
