# UI

What each page does and how it looks. Pages are planned until they are built. The [mockups](../ARCHITECTURE.md#mockups) are approved.

## Design Language

The look comes from a printed study Bible: blue-black ink on thin paper, red verse numbers, a ribbon marker, and a thumb index.

**The thumb index is the signature element.** Stepped tabs for each section of the Bible (Law, History, Wisdom, Prophets, Gospels, Letters, Revelation) sit on the right edge of the page, and the current section sticks out further. On phones they move into a menu that slides in from the left, opened with a menu button: the tabs step along the drawer's edge, and selecting one lists its books. Everything around them stays quiet, so avoid adding other decoration.

| Token | Light | Dark | Used for |
| --- | --- | --- | --- |
| Page | `#F6F7F5` | `#0F1830` | Background |
| Ink | `#16213A` | `#E8EAF0` | Text |
| Muted | `#55607A` | `#A5AEC4` | Secondary text |
| Line | `#D5DAE3` | `#2A3556` | Borders |
| Accent (lapis) | `#1F3F94` | `#9DB4F5` | Actions, links, current tab |
| Rubric | `#A8231C` | `#F4978B` | Verse numbers, references, selected words |
| Ribbon | `#A8231C` | `#D9584C` | Bookmark ribbon |
| Highlight | `#F7E7AE` | `#51451C` | Highlighted verses |
| Panel | `#ECEFF4` | `#16213F` | Study panel, notices |
| Field | `#FFFFFF` | `#16213F` | Inputs |

| Role | Typeface |
| --- | --- |
| Scripture and headings | Literata |
| Interface | Schibsted Grotesk |
| Hebrew | Noto Serif Hebrew |
| Greek | To be chosen when Greek is designed. Gentium Book Plus is the candidate |

Other rules:

- Left-align content, with scripture line lengths under about 70 characters.
- Touch targets are at least 44px, and focus is always visible.
- Use sentence case. Avoid all-caps labels and decorative numbering.
- Hebrew reads right to left and is never reversed or flattened.

## Global

- Toggle between light and dark mode. The system setting applies until the user chooses.
- Works at phone widths.
- Pages showing data credit their source: OpenBible, STEP Bible, or the translation.

## Pages

| Page | Purpose | Signed in? |
| --- | --- | --- |
| Home (`/`) | Verse of the Day, search and a way into reading. Built with a fixed verse so far | No (admins can set the verse) |
| Reader | One chapter of a translation, with translation switching | No |
| Reader annotations | Highlights and bookmarks in the reader | Yes |
| Original languages | Word-by-word Hebrew or Greek for a verse | No |
| Search results | Verses for a reference or phrase | No |
| Topic | Ranked verses for "What does the Bible say about ___?" | To vote or report |
| Sign in (`/sign-in`) | Google or email and password, registering, password reset, confirming an email, and the invite-only message. Built | No |
| About | A shorter version of the [README](../README.md), with data credits | No |
