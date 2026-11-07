# Bible Center

A free, one-stop Bible resource: read the Bible, search it, study the original languages, and see what Scripture says about a topic.

> **Status:** early development. See [Project Status](ARCHITECTURE.md#project-status).

## Features

Some of these are still being built; see [Project Status](ARCHITECTURE.md#project-status).

- **Verse of the Day** on the home page.
- **Read** the Bible and switch between translations.
- **Search** by reference, such as `John 1:1; Acts 2:3-4`, or by a phrase you remember.
- **Annotate** verses and ranges with highlights, bookmarks and notes when signed in, and keep them in every translation.
- **Study** the Hebrew and Greek behind the English.
- **Explore topics** by asking "What does the Bible say about ___?", with results ranked by community upvotes.
- **Build boards** to gather related photos, notes and videos (after the first release).

## Contributing

Bible Center is a monorepo built with React, TypeScript, Mantine and Firebase.

- [docs/DEVELOPMENT.md](docs/DEVELOPMENT.md): setup, running locally and testing.
- [ARCHITECTURE.md](ARCHITECTURE.md): the design, its reasoning, and current status.
- [docs/UI.md](docs/UI.md): pages and the design language.
- [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md): deploying and App Check.

Suggestions are welcome through GitHub issues.

## License

The code is licensed under [PolyForm Noncommercial 1.0.0](LICENSE). You may use, change and share it for noncommercial purposes, but you may not sell it or charge for it.

Bible translations and datasets have their own licenses and are not covered by this license.

## Data Sources and Credits

- [OpenBible.info](https://www.openbible.info/topics/) topic data, licensed under [CC BY](https://creativecommons.org/licenses/by/4.0/).
- [STEP Bible](https://stepbible.github.io/STEPBible-Data/) Hebrew and Greek data from Tyndale House, licensed under [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/). Bible Center shortens its definitions and renumbers its words to match each translation; see [Original Languages](ARCHITECTURE.md#original-languages).
- [Berean Standard Bible](https://berean.bible), dedicated to the public domain.
- King James Version, public domain in the United States. Text from [OpenBible](https://openbible.com/textfiles/kjv.txt).
