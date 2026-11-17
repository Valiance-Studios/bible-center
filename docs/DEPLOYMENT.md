# Deployment

There are two hosted environments, each its own Firebase project. `scripts/environments.ts` lists them, with the Vite mode each one's site is built with.

| Environment | Project | Site | Web app config | Deploys from |
| --- | --- | --- | --- | --- |
| Staging | `vs-bible-center-dev` | [vs-bible-center-dev.web.app](https://vs-bible-center-dev.web.app) | `apps/web/.env.staging` | Any branch by hand, to try a change before merging; `main` automatically |
| Production | `vs-bible-center-prod` | [vs-bible-center.web.app](https://vs-bible-center.web.app) | `apps/web/.env.production` | `main` only, automatically on every merge |

Production's site is the second Hosting site in its project, `vs-bible-center`, rather than the default `vs-bible-center-prod`, which stays empty. `.firebaserc` maps the Hosting target `app` in `firebase.json` to each project's site.

## Releasing

Merging a pull request releases it. When a push to `main` passes CI, the `deploy-staging` and then `deploy-production` jobs in `.github/workflows/ci.yml` deploy Hosting, Firestore rules and indexes, and Cloud Functions to each project, through `.github/workflows/deploy.yml`. So a pull request must be ready to release before it merges:

1. Deploy the branch to staging with `npm run deploy:staging`, and try the change on [vs-bible-center-dev.web.app](https://vs-bible-center-dev.web.app).
2. Do anything the change needs in the consoles of **both** projects first, such as a service account or a setting; the pull request's Notes list it. New indexes deploy with the release, and take a few minutes to build.
3. Merge. `main` requires a pull request, both CI checks, and the branch up to date with `main`, so what merges is what was tested, and nobody can push to `main` directly, admins included.

Each environment's build has its own config compiled in, so production is built again from the same commit rather than copied from staging. Runs on `main` never cancel each other, since a deploy stopped partway could leave functions half updated: a newer one waits, and an older run whose commit is no longer `main` is refused by `check-release.ts` and leaves production to the newer run.

**Undoing a release:** revert the pull request, which releases again. For a broken site, roll Hosting back at once in the Firebase console under Hosting > release history; the next release replaces it.

**Removing a function** fails the automatic deploy before it changes anything, since the Firebase CLI asks before deleting one. Release it by hand from `main` with `npm run deploy:staging -- --force`, then `npm run deploy:production -- --force`.

### How GitHub Signs In

The deploy jobs have no stored key. Each project trusts GitHub through Workload Identity Federation:

- **Pool `github`, provider `bible-center`:** accepts GitHub's tokens only when `assertion.repository_id` is this repository's id (`1449040639`, which survives renames) and `assertion.ref` is `refs/heads/main`.
- **GitHub environments `staging` and `production`:** only `main` may deploy to them, and they record each deployment.
- **Deploy service account `sa-bc-github-deploy-<env>`:** the pool's principals for this repository may act as it (`roles/iam.workloadIdentityUser`). It has:

| Role | For |
| --- | --- |
| Firebase Hosting Admin (`roles/firebasehosting.admin`) | Hosting |
| Firebase Rules Admin (`roles/firebaserules.admin`) | Firestore rules |
| Cloud Datastore Index Admin (`roles/datastore.indexAdmin`) | Firestore indexes |
| Cloud Functions Developer (`roles/cloudfunctions.developer`) | Functions |
| Service Account User (`roles/iam.serviceAccountUser`) on each function's account only | Running functions as their own accounts |
| Service Usage Consumer (`roles/serviceusage.serviceUsageConsumer`) | Checking the APIs the deploy uses are on |
| Firebase Viewer (`roles/firebase.viewer`) | Reading the project |

If a deploy fails for lack of a permission, the job's log names it; grant the narrowest role that has it, in both projects, and add it here.

To set it up in a new project, with `PROJECT`, `ENV` and the function accounts as in [Cloud Functions](#cloud-functions):

```sh
NUMBER=$(gcloud projects describe $PROJECT --format='value(projectNumber)')
REPO_ID=1449040639
DEPLOY=sa-bc-github-deploy-$ENV@$PROJECT.iam.gserviceaccount.com

gcloud services enable iamcredentials.googleapis.com sts.googleapis.com --project $PROJECT
gcloud iam workload-identity-pools create github --project $PROJECT --location global \
  --display-name "GitHub Actions"
gcloud iam workload-identity-pools providers create-oidc bible-center --project $PROJECT --location global \
  --workload-identity-pool github --issuer-uri https://token.actions.githubusercontent.com \
  --attribute-mapping "google.subject=assertion.sub,attribute.repository_id=assertion.repository_id,attribute.ref=assertion.ref" \
  --attribute-condition "assertion.repository_id == '$REPO_ID' && assertion.ref == 'refs/heads/main'"
gcloud iam service-accounts create sa-bc-github-deploy-$ENV --project $PROJECT \
  --display-name "Bible Center GitHub deploy ($ENV)" --description "Deploys Bible Center from GitHub Actions on pushes to main."

for role in roles/firebasehosting.admin roles/firebaserules.admin roles/datastore.indexAdmin \
    roles/cloudfunctions.developer roles/serviceusage.serviceUsageConsumer roles/firebase.viewer; do
  gcloud projects add-iam-policy-binding $PROJECT --member "serviceAccount:$DEPLOY" --role $role --condition None
done
for fn in block-account delete-account check-signup-email; do
  gcloud iam service-accounts add-iam-policy-binding sa-bc-$fn-$ENV@$PROJECT.iam.gserviceaccount.com --project $PROJECT \
    --member "serviceAccount:$DEPLOY" --role roles/iam.serviceAccountUser
done
gcloud iam service-accounts add-iam-policy-binding $DEPLOY --project $PROJECT --role roles/iam.workloadIdentityUser \
  --member "principalSet://iam.googleapis.com/projects/$NUMBER/locations/global/workloadIdentityPools/github/attribute.repository_id/$REPO_ID"
```

Then add the project to `.github/workflows/ci.yml` as a deploy job, with its number and account. A new function's account needs the same Service Account User grant before the release that adds it.

## Deploying by Hand

For trying a branch on staging, or when an automatic release cannot run.

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

### Account Age for Voting

Votes only count from accounts first seen at least a week ago, recorded as `createdAt` on `users/<uid>` at their first sign-in. To let someone vote sooner, set their `createdAt` to an earlier timestamp in the Firestore console; the app never can.

## Abuse Protections

Anyone can sign up, so set these up in each project's consoles before its first deploy.

1. **Email enumeration protection.** Firebase console > Authentication > Settings > User actions: turn on **Email enumeration protection**. Firebase then answers every failed email sign-in the same way, so nobody can test which addresses have accounts. The app already shows one message for a wrong email or password, and its password reset says "If an account uses …", so nothing in it changes.
2. **A billing budget.** Google Cloud console > Billing > Budgets & alerts > Create budget, scoped to this project, with email alerts at 50%, 90% and 100%. A budget only warns; it does not stop spending. Start low, such as $25 a month, and raise it once real use is known.
3. **Alerts for unusual activity.** Google Cloud console > Monitoring > Alerting > Create policy, each emailing you:
   - **New accounts:** the metric *Consumed API > Request count* (`serviceruntime.googleapis.com/api/request_count`) for the service `identitytoolkit.googleapis.com`, summed over an hour, above a threshold such as 200. Filter it to the sign-up methods if the method list offers them.
   - **Firestore writes:** the metric *Firestore Instance > Document Write Count* (`firestore.googleapis.com/document/write_count`), summed over an hour, above a threshold such as 50,000.
   
   The thresholds are starting points; tighten them once normal traffic is known. In a new project, the metric picker hides Firestore's metrics until the database has been used; turn off its **Active** filter to find them.

## Identity Platform

Do this in each project. Upgrade Authentication to Firebase Authentication with Identity Platform, which is free up to 50,000 monthly active users for email and Google sign-in. Firebase console > Authentication > Settings > **Upgrade**. Then:

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

In both projects, Cloud Firestore and Authentication are enforced, so their requests need a valid App Check token: from the deployed app, or from `localhost` with a registered [debug token](#debug-token). The emulators do not check it.

Callable Cloud Functions enforce App Check themselves, through their `enforceAppCheck` option, from the moment they are deployed; the app already sends the tokens. Before enforcing another console service, deploy the app that sends its tokens and confirm in the console's App Check metrics that its requests are verified. Enforcement is per service for the whole project, and each project hosts only this app.

In a new project, enforce Firestore and Authentication once its site is deployed and the App Check metrics show its requests as verified, as production did.

## Cloud Functions

The functions live in `apps/functions`. Each runs as its own service account, with only the roles it needs, named by the convention `sa-bc-<function>-<env>`, where `<env>` is `dev` for staging and `prod` for production. `apps/functions/.env.<project id>` tells each function its account in that project.

| Function | Service account | Roles |
| --- | --- | --- |
| `blockAccount` | `sa-bc-block-account-<env>` | Cloud Datastore User (`roles/datastore.user`), Firebase Authentication Viewer (`roles/firebaseauth.viewer`) |
| `deleteAccount` | `sa-bc-delete-account-<env>` | Cloud Datastore User (`roles/datastore.user`), Firebase Authentication Admin (`roles/firebaseauth.admin`), since it deletes accounts |
| `checkSignUpEmail` | `sa-bc-check-signup-email-<env>` | None: it only checks the new account's email against a list it carries |

Create each account in each project before the release that adds its function, with a Google Cloud login that can manage IAM in the project, and let the deploy account use it (see [How GitHub Signs In](#how-github-signs-in)):

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

1. **Billing:** the Blaze plan, which Cloud Functions need, and a budget (see [Abuse Protections](#abuse-protections)).
2. **Hosting:** the site. Add it to `.firebaserc` under `targets` as `app`, and the project to `scripts/environments.ts`.
3. **Firestore:** create the `(default)` database in `nam5`, the same location as staging.
4. **Authentication:** turn on Google and Email/Password sign-in, and add the site to Authentication > Settings > Authorized domains.
5. **Identity Platform:** upgrade, then the password policy, reCAPTCHA for email and password, and two-step sign-in with authenticator apps (see [Identity Platform](#identity-platform)). Then email enumeration protection and the alerts (see [Abuse Protections](#abuse-protections)).
6. **App Check:** the reCAPTCHA Enterprise key, the web app's registration, and the site key in the env file (see [App Check Setup](#app-check-setup)).
7. **Web app config:** fill in the mode's env file in `apps/web` from Project settings > Your apps.
8. **API key:** restrict it (see [API Key Restrictions](#api-key-restrictions)).
9. **Cloud Functions:** turn on the APIs for Cloud Functions, Cloud Run, Cloud Build, Artifact Registry and Eventarc, create the service accounts, add `apps/functions/.env.<project id>`, and grant the build role (see [Cloud Functions](#cloud-functions)).
10. **GitHub deploys:** the identity pool and deploy account (see [How GitHub Signs In](#how-github-signs-in)), and a deploy job in `ci.yml`.
11. **Deploy,** then make the first admin (see [Roles](#roles)), and enforce App Check for Firestore and Authentication once its metrics show verified requests (see [Enforcement](#enforcement)).
12. **Try it on the site:** sign in with Google, register by email, set up two-step sign-in from the Review page, and register a `@mailinator.com` address to see it refused.

## Secrets

Cloud Functions read secrets from Secret Manager. They never go in env files.

| Purpose | Secret | Status |
| --- | --- | --- |
| Crossway ESV API key | To be named when issued | Waiting on Crossway |
| Anthropic API key | To be named at the AI step | Not created |
