## Starting a Session

Bible Center is a free, public Bible resource built with React, TypeScript, Mantine and Firebase. To pick up the work:

1. Read "Project Status" in `ARCHITECTURE.md` for what is done, what is next, and what is waiting on the owner.
2. Before any UI work, read the "Mockups" section of `ARCHITECTURE.md` and `docs/UI.md`. Read the mockup source from the canvas with the Artifact tool. Do not build a feature's UI before its mockup is approved.
3. Check `git status` and the current branch, as local work may not be committed yet.

`ARCHITECTURE.md` maps the repository under "Repository Layout". Everything needed is in the repository except the mockups, on the canvas linked from "Mockups", and two local items: `apps/web/.env.staging.local`, which holds this machine's App Check debug token, and the owner's Google Cloud login. `docs/DEVELOPMENT.md` sets up a new machine.

### Decisions Not to Reopen

These were settled with the owner. Their reasoning is in `ARCHITECTURE.md`.

- Translations are BSB (default) and KJV as static files, and ESV through Crossway's API once approved. No NIV or NKJV.
- Code license is PolyForm Noncommercial 1.0.0.
- Topic ranking is `seedScore + upvotes`, with a 0-20 OpenBible seed. Voting is upvote-only, with reports.
- AI search uses Claude Opus 5.5 with a $10 monthly cap, and only fills gaps. It and the ESV come after V1.
- Memorization is flash cards and fading words, with a memory list for signed-in users; a memorized verse comes back for review a week after it was last practiced.
- Annotations are highlights, bookmarks and plain-text notes on a verse or a range within a chapter, in one highlight color.
- Search covers the selected translation only.
- A signed-in My verses page will list all of a user's annotations, as its approved mockups show.
- Anyone with a verified email can sign up. Roles (reviewer, admin) are entries in `roles/{email}`, members have none, and admins manage them on the People page.
- Staging is the Firebase project `vs-bible-center-dev`, deployable by hand from any branch. Production is `vs-bible-center-prod`, at `vs-bible-center.web.app`. Merging a pull request to `main` releases it to both through GitHub Actions, signing in with Workload Identity Federation (no service account keys). Boards come after V1, and are the next feature, ahead of AI suggestions and the ESV.

### Coding Principles

Always apply these principles:

- **SOLID** - Single responsibility, Open/closed, Liskov substitution, Interface segregation, Dependency inversion.
- **DRY** - Don't repeat yourself. Extract shared logic rather than duplicating it.
- **YAGNI** - You aren't gonna need it. Don't build for hypothetical future requirements; implement only what is needed now.
- Make use of path aliases when possible and where it makes sense, such as within "tsconfig" files in a TypeScript project.
- Prefer static typing where possible to know the types of the data being worked with.

## Web Development Preferences

* Use TypeScript throughout the project, both on the client and server side.
* Create types and interfaces, inheritance, and abstractions where logical to promote static typing. Avoid `any` being a type where possible.

## Scripture Copyright

The ESV and other copyrighted translations must never enter this public repository, including test fixtures, seeds, logs and mockups. Use public-domain text or invented text instead. See "ESV Rules" in `ARCHITECTURE.md`.

## Testing Preferences

* Use Vitest (through Vite+) for unit testing.
* Use Playwright for end-to-end (E2E) testing.

## Code Style

Vite+ (`vite-plus`) is the toolchain. Its configuration is in the root `vite.config.ts` (`fmt`, `lint` and `test` keys) and `apps/web/vite.config.ts`; don't add separate Oxlint, Oxfmt or Vitest config files (`vitest.emulator.config.ts` is the exception, so that `vp test` needs no emulators). Import from `vite-plus` and `vite-plus/test`, not `vite` and `vitest`.

Oxfmt (`npm run fmt`) formats the code and Oxlint (`npm run lint`) lints it. These conventions are not enforced by either but should be followed:

* Put `import type {...}` statements first as their own group, followed by a blank line, then value imports. Do not use inline `type` modifiers inside value imports (e.g. `import {foo, type Bar}`).
* Leave a blank line before a `try`, between consecutive `if` blocks, and before a `return` that follows a block.
* Do not let an imported name collide with a local method or function name; alias the import instead (e.g. `signOut as signOutFirebase` inside an action named `signOut`).
* Use `resolve.tsconfigPaths: true` for Vite path aliases rather than a hand-written `resolve.alias`.

## Documentation

Each kind of content has one home. Link to it rather than repeating it.

| File                    | Holds                                                                                                         |
| ----------------------- | ------------------------------------------------------------------------------------------------------------- |
| `README.md`           | The public introduction for visitors. `AboutDialog` is a shorter version of it, so keep the two consistent. |
| `ARCHITECTURE.md`     | How the system is designed, all the Mermaid diagrams, and Project Status.                                     |
| `docs/UI.md`          | What each page does and how it looks.                                                                         |
| `docs/DEVELOPMENT.md` | Machine setup, running locally, env files, tests, linting, known quirks.                                      |
| `docs/DEPLOYMENT.md`  | Deploying, and App Check console setup and debug tokens.                                                      |
| `SECURITY.md`         | How to report a vulnerability privately.                                                                      |

### Mermaid Diagrams

Mermaid diagrams in `ARCHITECTURE.md` are required, not optional, and a stale diagram counts as a bug.

* **Update diagrams in the same change.** Before finishing any change, check the "Diagram Index" in `ARCHITECTURE.md`: if the change touches a source listed there, update that diagram so it matches the code. Do this for behavior and structure changes, even when no other documentation changes.
* **Add a diagram for anything new that has more than one moving part**, such as a new subsystem, external service, collection, session type or multi-step flow, and add a row for it to the Diagram Index. Remove the diagram and its row when the thing it shows is removed.
* **Draw what the code does.** Read the code first, and use its real names (functions, collections, scripts, paths).
* **Keep them readable and portable.** Each diagram explains one idea at the level of design, so split one that grows hard to read. Use the type that suits it (flowchart, sequence, state, class, ER). Do not set custom colors or themes, so they work in GitHub's light and dark modes.
* **Check that they render.** GitHub shows an error in place of a diagram that does not parse, so render `ARCHITECTURE.md` before committing and look at the images for every diagram you changed. These commands use Playwright's Chromium, so they need no other browser, and write only to a scratch directory outside the repository:

  ```sh
  node -e "import('@playwright/test').then(({chromium}) => console.log(JSON.stringify({executablePath: chromium.executablePath()})))" > <scratch dir>/puppeteer.json
  npx -y -p @mermaid-js/mermaid-cli mmdc -p <scratch dir>/puppeteer.json -i ARCHITECTURE.md -o <scratch dir>/out.md -e png -s 2
  ```

## Workflow

* Keep the documentation up to date as part of each change (see "Documentation"), including the "Project Status" section of `ARCHITECTURE.md`. That file is the main handoff document between sessions.
* Work on a feature branch (e.g. `feature/<name>`) per step, never directly on `main`. The user reviews and merges pull requests, and may push follow-up tweaks to the branch.
* Only commit, push, or open a pull request when asked.
* Before opening a pull request, run `npm run check`, `npm run type-check`, `npm run build`, `npm run test:unit`, `npm run test:emulator`, and `npm run test:e2e`.
* Pull request descriptions include a Summary, a Test plan checklist, and Notes for decisions or caveats.
* Merging releases to production, so a pull request's Notes must list anything to do in the consoles of both projects before merging, and its Test plan includes trying it on staging.
