export interface BibleSection {
  name: string;
  books: readonly string[];
}

/** The 66 books in canonical order, grouped the way the thumb index shows them. */
export const BIBLE_SECTIONS: readonly BibleSection[] = [
  {name: 'Law', books: ['Genesis', 'Exodus', 'Leviticus', 'Numbers', 'Deuteronomy']},
  {name: 'History', books: ['Joshua', 'Judges', 'Ruth', '1 Samuel', '2 Samuel', '1 Kings', '2 Kings', '1 Chronicles', '2 Chronicles', 'Ezra', 'Nehemiah', 'Esther']},
  {name: 'Wisdom', books: ['Job', 'Psalms', 'Proverbs', 'Ecclesiastes', 'Song of Solomon']},
  {name: 'Prophets', books: ['Isaiah', 'Jeremiah', 'Lamentations', 'Ezekiel', 'Daniel', 'Hosea', 'Joel', 'Amos', 'Obadiah', 'Jonah', 'Micah', 'Nahum', 'Habakkuk', 'Zephaniah', 'Haggai', 'Zechariah', 'Malachi']},
  {name: 'Gospels', books: ['Matthew', 'Mark', 'Luke', 'John', 'Acts']},
  {name: 'Letters', books: ['Romans', '1 Corinthians', '2 Corinthians', 'Galatians', 'Ephesians', 'Philippians', 'Colossians', '1 Thessalonians', '2 Thessalonians', '1 Timothy', '2 Timothy', 'Titus', 'Philemon', 'Hebrews', 'James', '1 Peter', '2 Peter', '1 John', '2 John', '3 John', 'Jude']},
  {name: 'Revelation', books: ['Revelation']},
];
