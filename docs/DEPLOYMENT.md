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

## Roles

Anyone with a verified email can sign in, and is a member. Admins give, change and remove the reviewer and admin roles, and block accounts, on the People page (`/people`). The first admin has to be made in the Firestore console: create `roles/<lowercase email>` with a string field `role` set to `admin`. The email must be verified to count; see [Authentication and Access](../ARCHITECTURE.md#authentication-and-access).

Admins cannot change or remove their own role, so there is always at least one admin. To demote the last admin, use the console.

The `allowedUsers` collection from before sign-up opened is no longer read by anything and the rules close it to everyone, so it can be deleted in the console.

### Account Age for Voting

Votes only count from accounts first seen at least a week ago, recorded as `createdAt` on `users/<uid>` at their first sign-in. To let someone vote sooner, set their `createdAt` to an earlier timestamp in the Firestore console; the app never can.

## Before Opening Sign-Up

Do these in the consoles before deploying the rules that let anyone sign up. They are [#23](https://github.com/Valiance-Studios/bible-center/issues/23).

1. **Email enumeration protection.** Firebase console > Authentication > Settings > User actions: turn on **Email enumeration protection**. Firebase then answers every failed email sign-in the same way, so nobody can test which addresses have accounts. The app already shows one message for a wrong email or password, and its password reset says "If an account uses …", so nothing in it changes.
2. **A billing budget.** Google Cloud console > Billing > Budgets & alerts > Create budget, scoped to this project, with email alerts at 50%, 90% and 100%. A budget only warns; it does not stop spending. Start low, such as $25 a month, and raise it once real use is known.
3. **Alerts for unusual activity.** Google Cloud console > Monitoring > Alerting > Create policy, each emailing you:
   - **New accounts:** the metric *Consumed API > Request count* (`serviceruntime.googleapis.com/api/request_count`) for the service `identitytoolkit.googleapis.com`, summed over an hour, above a threshold such as 200. Filter it to the sign-up methods if the method list offers them.
   - **Firestore writes:** the metric *Firestore Instance > Document Write Count* (`firestore.googleapis.com/document/write_count`), summed over an hour, above a threshold such as 50,000.
   
   The thresholds are starting points; tighten them once normal traffic is known.

## Identity Platform

[#22](https://github.com/Valiance-Studios/bible-center/issues/22) upgrades Authentication to Firebase Authentication with Identity Platform, which is free up to 50,000 monthly active users for email and Google sign-in. Firebase console > Authentication > Settings > **Upgrade**. Then:

- **Password policy:** Authentication > Settings > Password policy: require at least 10 characters and turn on enforcement, so Firebase refuses short passwords even from a client other than the app.
- **reCAPTCHA for email and password:** the console may only offer reCAPTCHA for SMS, so set it through the Identity Toolkit API with your Google Cloud login. Start in audit mode, which only logs scores:

  ```sh
  PROJECT=vs-bible-center-dev

  curl -X PATCH \
    "https://identitytoolkit.googleapis.com/admin/v2/projects/$PROJECT/config?updateMask=recaptchaConfig.emailPasswordEnforcementState,recaptchaConfig.managedRules" \
    -H "Authorization: Bearer $(gcloud auth print-access-token)" \
    -H "X-Goog-User-Project: $PROJECT" \
    -H "Content-Type: application/json" \
    -d '{"recaptchaConfig": {"emailPasswordEnforcementState": "AUDIT", "managedRules": [{"endScore": 0.3, "action": "BLOCK"}]}}'
  ```

  Firebase creates its own reCAPTCHA Enterprise key for this, separate from the App Check key, and the web SDK attaches tokens to email sign-in and sign-up by itself, so the app needs no change; the emulators ignore it. After a week or so, check the key's scores under Security > reCAPTCHA in the Google Cloud console, then run the same command with `"ENFORCE"`, and register a `+test` address on the hosted site to confirm a person still gets through. A `GET` on the same URL, without `?updateMask…`, shows the current setting.
- **Two-step sign-in with authenticator apps (TOTP).** The console only offers SMS, so turn on authenticator apps through the same API. Staff then set it up from the Review or People page:

  ```sh
  curl -X PATCH \
    "https://identitytoolkit.googleapis.com/admin/v2/projects/$PROJECT/config?updateMask=mfa" \
    -H "Authorization: Bearer $(gcloud auth print-access-token)" \
    -H "X-Goog-User-Project: $PROJECT" \
    -H "Content-Type: application/json" \
    -d '{"mfa": {"state": "ENABLED", "providerConfigs": [{"state": "ENABLED", "totpProviderConfig": {"adjacentIntervals": 5}}]}}'
  ```

  Leave SMS off: it costs per message and can be stolen by moving someone's number to another SIM. `adjacentIntervals` accepts codes up to five 30-second steps either side, for phones whose clocks drift.
- **Turning away temporary email services.** The `checkSignUpEmail` blocking function does this. Create its service account (see [Cloud Functions](#cloud-functions)) and deploy the functions; the deploy registers it with Identity Platform, so it runs before every new account, by email or Google.

### Resetting Two-Step Sign-In

When someone loses their authenticator app, confirm it is really them (for example, from the email address on the account), then run, with your Google Cloud login:

```sh
node scripts/reset-two-step.ts --project vs-bible-center-dev --email person@example.com          # shows what is set up
node scripts/reset-two-step.ts --project vs-bible-center-dev --email person@example.com --write  # turns it off
```

It turns two-step sign-in off and signs the account out everywhere. They sign in with their password or Google account, and set it up again from the Review or People page.

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
| `checkSignUpEmail` | `sa-bc-check-signup-email-dev` | None: it only checks the new account's email against a list it carries |

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
create_function_account sa-bc-check-signup-email-dev checkSignUpEmail \
  "Runs the checkSignUpEmail blocking function: turns away sign-ups from temporary email services."
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
