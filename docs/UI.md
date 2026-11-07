# UI

What each page does and how it looks. Pages are planned until they are built. The [mockups](../ARCHITECTURE.md#mockups) are approved. The desktop app bar also has a Search link, which the mockups do not show, so search can be reached from any page.

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

**The site icon** is a white page with a red ribbon on a lapis tile, drawn in `apps/web/public/favicon.svg`. After changing it, run `npm run icons` to regenerate the PNGs that Safari and iOS use for bookmarks and the home screen.

## Global

- Toggle between light and dark mode. The system setting applies until the user chooses.
- Works at phone widths.
- Pages showing data credit their source: OpenBible, STEP Bible, or the translation.

## Pages

| Page | Purpose | Signed in? |
| --- | --- | --- |
| Home (`/`) | Verse of the Day, the search box, and topics. Built with a fixed verse and without topics so far | No (admins can set the verse) |
| Reader (`/read/:book/:chapter`) | One chapter of a translation, with book, chapter and translation pickers, and arrows that cross between books. Built. `/read` opens Genesis 1 | No |
| Reader annotations | Tap a verse to select it and another to make a range, then highlight, bookmark or add a note. Highlights show on the text, a bookmark shows a marker on its first verse and the ribbon, and a note shows beneath its last verse with a link to edit it. Built | Yes |
| My verses (`/my-verses`) | All of a user's highlights, bookmarks and notes, filtered by type and ordered by recently added or Bible order, in the selected translation, 20 at a time with "Show more". Removing one asks first. On narrow phones the translation picker shows initialisms, such as KJV. Reached from the account and phone menus, once allowed to annotate. Built | Yes |
| Original languages | A panel in the reader with the verse's words: Hebrew (or Aramaic) in the Old Testament, Greek in the New | No |
| Search (`/search?q=`) | Passages for references, or the closest verses for wording with matched words highlighted, in the selected translation. Opened from the home page box, the app bar or the phone menu. Built. A link to a topic of that name comes with topic search | No |
| Topic | Ranked verses for "What does the Bible say about ___?" | To vote or report |
| Sign in (`/sign-in`) | Google or email and password, registering, password reset, confirming an email, and the invite-only message. Built | No |
| About | A shorter version of the [README](../README.md), with data credits | No |
