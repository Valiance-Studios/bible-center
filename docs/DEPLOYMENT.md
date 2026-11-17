# Deployment

There are two hosted environments, each its own Firebase project. `scripts/environments.ts` lists them, with the Vite mode each one's site is built with.

| Environment | Project | Site | Web app config | Deploys from |
| --- | --- | --- | --- | --- |
| Staging | `vs-bible-center-dev` | [vs-bible-center-dev.web.app](https://vs-bible-center-dev.web.app) | `apps/web/.env.staging` | Any branch, to try a change on a real project |
| Production | `vs-bible-center-prod` | [vs-bible-center.web.app](https://vs-bible-center.web.app) | `apps/web/.env.production` | `main` only, after it has been tested on staging |

Production's site is the second Hosting site in its project, `vs-bible-center`, rather than the default `vs-bible-center-prod`, which stays empty. `.firebaserc` maps the Hosting target `app` in `firebase.json` to each project's site.

## Deploying

| Command | Deploys |
| --- | --- |
| `npm run deploy:staging` | Hosting, Firestore rules and indexes, and Cloud Functions to staging |
| `npm run deploy:production` | The same to production, from a clean checkout of `main` as it is on GitHub |

To deploy only part, add `-- --only` with the parts, which replaces the script's own list: for example `npm run deploy:staging -- --only firestore` for the rules and indexes, or `-- --only hosting` or `-- --only functions`. Each function needs its service account before its first deploy; see [Cloud Functions](#cloud-functions).

Deploy Firestore rules and indexes along with any feature that changes them, or the live site's writes or queries will be rejected. The full deploy covers both. New indexes take a few minutes to build after deploying.

Every deploy runs these checks first, from the `predeploy` lists in `firebase.json`, so they apply however the deploy is started:

- **`scripts/check-release.ts`**, for Hosting, Firestore and Functions: refuses a production deploy with uncommitted changes, or from any commit other than `origin/main`, which it fetches first. It does nothing for staging.
- **`scripts/build-hosting.ts`**, for Hosting: builds the web app with the mode for the project being deployed to, after refusing a deploy whose env file is for another project, is missing Firebase config or the App Check site key, has an App Check debug token, or points at the emulators.

**The Hosting check reads `apps/web/.env.<mode>.local` too, so a machine with a debug token in it cannot deploy that environment's Hosting.** Temporarily move the token out of the file. This is deliberate, since a build containing a registered debug token would let anyone pass App Check. Rules and functions deploys do not read it.

### Releasing to Production

1. Merge the pull request, then switch to `main` and pull.
2. Deploy it to staging with `npm run deploy:staging`, and try the change on [vs-bible-center-dev.web.app](https://vs-bible-center-dev.web.app).
3. Deploy the same commit with `npm run deploy:production`.

Each environment's build has its own config compiled in, so production is built again from the same commit rather than copied from staging. If a step needs something done in the console, such as a new index or a service account, do it in both projects; the pull request's notes say what.

## API Key Restrictions

Each project's Firebase web API key is public by design, so restrict it in Google Cloud under APIs & Services > Credentials.

- **HTTP referrers:** the site and the project's `firebaseapp.com` domain:
  - Staging: `vs-bible-center-dev.web.app/*`, `vs-bible-center-dev.firebaseapp.com/*` and `localhost:5173/*`. The `localhost` entry is only for `npm run dev:staging`.
  - Production: `vs-bible-center.web.app/*` and `vs-bible-center-prod.firebaseapp.com/*`, and no `localhost`.

  The `firebaseapp.com` entry is the value of `VITE_FIREBASE_AUTH_DOMAIN`, and Google sign-in fails without it, since its popup calls Firebase from that domain.
- **APIs:** at least Identity Toolkit, Token Service, Firestore and App Check.

To check a referrer, request `https://identitytoolkit.googleapis.com/v1/projects?key=<key>` with a `Referer` header. A 200 means it is allowed and a 403 means it is blocked.

Referrer restrictions are a light barrier, since non-browser clients can fake the header. Security rules and App Check are the real protection. `localhost` must stay off the reCAPTCHA key, which is separate; local runs use a [debug token](#debug-token) for App Check.

## Roles

Anyone with a verified email can sign in, and is a member. Admins give, change and remove the reviewer and admin roles, and block accounts, on the People page (`/people`). Roles belong to each project, so each has its own admins. A project's first admin has to be made in its Firestore console: create `roles/<lowercase email>` with a string field `role` set to `admin`. The email must be verified to count; see [Authentication and Access](../ARCHITECTURE.md#authentication-and-access).

Admins cannot change or remove their own role, so there is always at least one admin. To demote the last admin, use the console.

The `allowedUsers` collection from before sign-up opened is no longer read by anything and the rules close it to everyone, so it can be deleted in the console.

### Account Age for Voting

Votes only count from accounts first seen at least a week ago, recorded as `createdAt` on `users/<uid>` at their first sign-in. To let someone vote sooner, set their `createdAt` to an earlier timestamp in the Firestore console; the app never can.

## Before Opening Sign-Up

Do these in each project's consoles before deploying the rules that let anyone sign up. They are [#23](https://github.com/Valiance-Studios/bible-center/issues/23).

1. **Email enumeration protection.** Firebase console > Authentication > Settings > User actions: turn on **Email enumeration protection**. Firebase then answers every failed email sign-in the same way, so nobody can test which addresses have accounts. The app already shows one message for a wrong email or password, and its password reset says "If an account uses …", so nothing in it changes.
2. **A billing budget.** Google Cloud console > Billing > Budgets & alerts > Create budget, scoped to this project, with email alerts at 50%, 90% and 100%. A budget only warns; it does not stop spending. Start low, such as $25 a month, and raise it once real use is known.
3. **Alerts for unusual activity.** Google Cloud console > Monitoring > Alerting > Create policy, each emailing you:
   - **New accounts:** the metric *Consumed API > Request count* (`serviceruntime.googleapis.com/api/request_count`) for the service `identitytoolkit.googleapis.com`, summed over an hour, above a threshold such as 200. Filter it to the sign-up methods if the method list offers them.
   - **Firestore writes:** the metric *Firestore Instance > Document Write Count* (`firestore.googleapis.com/document/write_count`), summed over an hour, above a threshold such as 50,000.
   
   The thresholds are starting points; tighten them once normal traffic is known. In a new project, the metric picker hides Firestore's metrics until the database has been used; turn off its **Active** filter to find them.

## Identity Platform

Do this in each project. [#22](https://github.com/Valiance-Studios/bible-center/issues/22) upgrades Authentication to Firebase Authentication with Identity Platform, which is free up to 50,000 monthly active users for email and Google sign-in. Firebase console > Authentication > Settings > **Upgrade**. Then:

- **Password policy:** Authentication > Settings > Password policy: require at least 10 characters and turn on enforcement, so Firebase refuses short passwords even from a client other than the app.
- **reCAPTCHA for email and password:** the console may only offer reCAPTCHA for SMS, so set it through the Identity Toolkit API with your Google Cloud login. Start in audit mode, which only logs scores:

  ```sh
  PROJECT=vs-bible-center-prod  # or vs-bible-center-dev

  curl -X PATCH \
    "https://identitytoolkit.googleapis.com/admin/v2/projects/$PROJECT/config?updateMask=recaptchaConfig.emailPasswordEnforcementState,recaptchaConfig.managedRules" \
    -H "Authorization: Bearer $(gcloud auth print-access-token)" \
    -H "X-Goog-User-Project: $PROJECT" \
    -H "Content-Type: application/json" \
    -d '{"recaptchaConfig": {"emailPasswordEnforcementState": "AUDIT", "managedRules": [{"endScore": 0.3, "action": "BLOCK"}]}}'
  ```

  Firebase creates its own reCAPTCHA Enterprise key for this, separate from the App Check key, and the web SDK attaches tokens to email sign-in and sign-up by itself, so the app needs no change; the emulators ignore it. After a week or so, check the key's scores under Security > reCAPTCHA in the Google Cloud console, then run the same command with `"ENFORCE"`, and register a `+test` address on that project's site to confirm a person still gets through. A `GET` on the same URL, without `?updateMask…`, shows the current setting.
- **Two-step sign-in with authenticator apps (TOTP).** The console only offers SMS, so turn on authenticator apps through the same API. Staff then set it up from the Review or People page:

  ```sh
  curl -X PATCH \
    "https://identitytoolkit.googleapis.com/admin/v2/projects/$PROJECT/config?updateMask=mfa" \
    -H "Authorization: Bearer $(gcloud auth print-access-token)" \
    -H "X-Goog-User-Project: $PROJECT" \
    -H "Content-Type: application/json" \
    -d '{"mfa": {"state": "ENABLED", "providerConfigs": [{"state": "ENABLED", "totpProviderConfig": {"adjacentIntervals": 5}}]}}'
  ```

  Check that it took with a `GET` on the same URL without `?updateMask…`: `mfa.state` should be `ENABLED`. Until it is, setup fails just after confirming it is you, with "That did not work. Try again."

  Leave SMS off: it costs per message and can be stolen by moving someone's number to another SIM. `adjacentIntervals` accepts codes up to five 30-second steps either side, for phones whose clocks drift.
- **Turning away temporary email services.** The `checkSignUpEmail` blocking function does this. Create its service account (see [Cloud Functions](#cloud-functions)) and deploy the functions; the deploy registers it with Identity Platform, so it runs before every new account, by email or Google.

### Resetting Two-Step Sign-In

When someone loses their authenticator app, confirm it is really them (for example, from the email address on the account), then run, with your Google Cloud login:

```sh
node scripts/reset-two-step.ts --project vs-bible-center-prod --email person@example.com          # shows what is set up
node scripts/reset-two-step.ts --project vs-bible-center-prod --email person@example.com --write  # turns it off
```

Use `vs-bible-center-dev` for a staging account. It turns two-step sign-in off and signs the account out everywhere. They sign in with their password or Google account, and set it up again from the Review or People page.

## App Check Setup

In each project:

1. Create a reCAPTCHA Enterprise key with the **Score** integration type in Google Cloud. Add only the hosted domains, the site and the project's `firebaseapp.com` domain, such as `vs-bible-center.web.app` and `vs-bible-center-prod.firebaseapp.com`, and keep `localhost` off.
2. Register the web app with App Check in the Firebase console using that key.
3. Put the site key in the mode's env file in `apps/web` as `VITE_APPCHECK_SITE_KEY`. It is public.

### Debug Token

To run against staging from `localhost`, generate a debug token under App Check > Apps > Manage debug tokens, and put it in a gitignored `apps/web/.env.staging.local`:

```sh
VITE_APPCHECK_DEBUG_TOKEN=<token>
```

Each machine should have its own token. Delete a token from the console if it might have leaked, since it passes App Check.

### Enforcement

In staging, Cloud Firestore and Authentication are enforced, so their requests need a valid App Check token: from the deployed app, or from `localhost` with a registered [debug token](#debug-token). The emulators do not check it.

Callable Cloud Functions enforce App Check themselves, through their `enforceAppCheck` option, from the moment they are deployed; the app already sends the tokens. Before enforcing another console service, deploy the app that sends its tokens and confirm in the console's App Check metrics that its requests are verified. Enforcement is per service for the whole project, and each project hosts only this app.

A new project, such as production, can enforce Firestore and Authentication before its first deploy, since no older app uses it. Enforce them once the site is deployed and the App Check metrics show its requests as verified.

## Cloud Functions

The functions live in `apps/functions`. Each runs as its own service account, with only the roles it needs, named by the convention `sa-bc-<function>-<env>`, where `<env>` is `dev` for staging and `prod` for production. `apps/functions/.env.<project id>` tells each function its account in that project.

| Function | Service account | Roles |
| --- | --- | --- |
| `blockAccount` | `sa-bc-block-account-<env>` | Cloud Datastore User (`roles/datastore.user`), Firebase Authentication Viewer (`roles/firebaseauth.viewer`) |
| `deleteAccount` | `sa-bc-delete-account-<env>` | Cloud Datastore User (`roles/datastore.user`), Firebase Authentication Admin (`roles/firebaseauth.admin`), since it deletes accounts |
| `checkSignUpEmail` | `sa-bc-check-signup-email-<env>` | None: it only checks the new account's email against a list it carries |

Create each account in each project before its first deploy there, with a Google Cloud login that can manage IAM in the project:

```sh
PROJECT=vs-bible-center-prod ENV=prod  # or PROJECT=vs-bible-center-dev ENV=dev

# Creates a function's service account and grants it the roles in the table above.
create_function_account() { # <account name> <function> <description> <role>...
  local name=$1 function=$2 description=$3
  shift 3
  gcloud iam service-accounts create "$name" --project $PROJECT \
    --display-name "Bible Center $function ($ENV)" --description "$description"
  for role in "$@"; do
    gcloud projects add-iam-policy-binding $PROJECT \
      --member "serviceAccount:$name@$PROJECT.iam.gserviceaccount.com" --role "$role" --condition None
  done
}

create_function_account sa-bc-block-account-$ENV blockAccount \
  "Runs the blockAccount Cloud Function: finds and blocks accounts, and removes their content." \
  roles/datastore.user roles/firebaseauth.viewer
create_function_account sa-bc-delete-account-$ENV deleteAccount \
  "Runs the deleteAccount Cloud Function: deletes a person's own account and its data." \
  roles/datastore.user roles/firebaseauth.admin
create_function_account sa-bc-check-signup-email-$ENV checkSignUpEmail \
  "Runs the checkSignUpEmail blocking function: turns away sign-ups from temporary email services."
```

An account that already exists makes its `create` line fail harmlessly; the role grants still apply. A grant made just after its account is created can fail because the account is not visible yet, so run the script again if any grant fails, and check the result with `gcloud projects get-iam-policy $PROJECT`.

Whoever deploys needs Service Account User (`roles/iam.serviceAccountUser`) on each account; a project Owner has it already.

**Builds, once per project.** Cloud Build builds each function as the Compute Engine default service account, `<project number>-compute@developer.gserviceaccount.com`, which new projects create with almost no roles. The first deploy fails until it can read the uploaded source, push to Artifact Registry and write logs, which the Cloud Build Service Account role covers. Granting `roles/logging.logWriter` alone is not enough. Allow a few minutes for the grant to apply before retrying:

```sh
NUMBER=$(gcloud projects describe $PROJECT --format='value(projectNumber)')

gcloud projects add-iam-policy-binding $PROJECT \
  --member "serviceAccount:$NUMBER-compute@developer.gserviceaccount.com" \
  --role roles/cloudbuild.builds.builder --condition None
```

The Firebase CLI cannot choose a different build account. The functions still run as their own accounts; the default one only builds them. Then deploy them with the environment's deploy command, which builds them first. The service accounts have no keys, and none should be made: the functions run as them without one.

## Setting Up a Project

Everything a new project needs before its first deploy, in order. Production was set up this way; the sections above have the details.

1. **Billing:** the Blaze plan, which Cloud Functions need, and a budget (see [Before Opening Sign-Up](#before-opening-sign-up)).
2. **Hosting:** the site. Add it to `.firebaserc` under `targets` as `app`, and the project to `scripts/environments.ts`.
3. **Firestore:** create the `(default)` database in `nam5`, the same location as staging.
4. **Authentication:** turn on Google and Email/Password sign-in, and add the site to Authentication > Settings > Authorized domains.
5. **Identity Platform:** upgrade, then the password policy, reCAPTCHA for email and password, and two-step sign-in with authenticator apps (see [Identity Platform](#identity-platform)). Then email enumeration protection and the alerts (see [Before Opening Sign-Up](#before-opening-sign-up)).
6. **App Check:** the reCAPTCHA Enterprise key, the web app's registration, and the site key in the env file (see [App Check Setup](#app-check-setup)).
7. **Web app config:** fill in the mode's env file in `apps/web` from Project settings > Your apps.
8. **API key:** restrict it (see [API Key Restrictions](#api-key-restrictions)).
9. **Cloud Functions:** turn on the APIs for Cloud Functions, Cloud Run, Cloud Build, Artifact Registry and Eventarc, create the service accounts, add `apps/functions/.env.<project id>`, and grant the build role (see [Cloud Functions](#cloud-functions)).
10. **Deploy,** then make the first admin (see [Roles](#roles)), and enforce App Check for Firestore and Authentication once its metrics show verified requests (see [Enforcement](#enforcement)).
11. **Try it on the site:** sign in with Google, register by email, set up two-step sign-in from the Review page, and register a `@mailinator.com` address to see it refused.

## Secrets

Cloud Functions read secrets from Secret Manager. They never go in env files.

| Purpose | Secret | Status |
| --- | --- | --- |
| Crossway ESV API key | To be named when issued | Waiting on Crossway |
| Anthropic API key | To be named at the AI step | Not created |
