# Security Policy

## Reporting a Vulnerability

Please report security problems privately, not in a public issue, pull request or discussion.

Use GitHub's private vulnerability reporting: open the repository's [Security tab](https://github.com/Valiance-Studios/bible-center/security) and choose **Report a vulnerability**. Only the maintainers can see the report.

Please include:

- What the problem is, and what someone could do with it.
- Steps to reproduce it, or a proof of concept.
- The page, file or Firestore collection involved, if you know it.

We will acknowledge the report, keep you informed as we fix it, and credit you in the advisory if you would like.

## Scope

In scope:

- The code in this repository.
- The hosted app at [vs-bible-center-dev.web.app](https://vs-bible-center-dev.web.app), including its Firestore security rules and sign-in.

Out of scope:

- Denial of service, spam or automated scanning of the hosted app.
- Problems in Firebase, Google Cloud or other third-party services themselves. Report those to their owners.
- The Firebase web API key and the reCAPTCHA site key in the app's configuration. They are public by design; the security rules and App Check protect the data.

Please test only with your own account, and do not access, change or delete other people's data.
