import type {ReportReason} from './topics.ts';
import type {VerseId} from './verseId.ts';

/** A report waiting for a reviewer. */
export interface OpenReport {
  id: string;
  topic: string;
  verseKey: string;
  reason: ReportReason;
  details?: string;
  createdAt: Date;
}

/** Every open report on one verse of one topic, which a reviewer decides on together. */
export interface ReportGroup {
  topic: string;
  verseKey: string;
  /** Oldest first. */
  reports: OpenReport[];
}

/** What a reviewer decided about a reported verse. Keep in sync with `reports` in `firestore.rules`. */
export type ReportOutcome = 'removed' | 'kept';

/** What a reviewer decided about a topic someone started. Keep in sync with `topics` in `firestore.rules`. */
export type TopicDecision = 'approved' | 'rejected';

/** Groups reports by verse and topic, the group with the oldest report first. */
export function groupReports(reports: readonly OpenReport[]): ReportGroup[] {
  const groups = new Map<string, ReportGroup>();

  for (const report of [...reports].sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())) {
    const id = `${report.topic}/${report.verseKey}`;
    const group = groups.get(id) ?? {topic: report.topic, verseKey: report.verseKey, reports: []};

    group.reports.push(report);
    groups.set(id, group);
  }

  return [...groups.values()];
}

const VERSE_KEY_PATTERN = /^(\d{8})(?:-(\d{8}))?$/;

/** The first and last verse of a key made by `topicVerseKey`, or null if it is not one. */
export function parseTopicVerseKey(key: string): {startVerse: VerseId; endVerse: VerseId} | null {
  const match = VERSE_KEY_PATTERN.exec(key);

  if (!match?.[1]) {
    return null;
  }

  return {startVerse: match[1], endVerse: match[2] ?? match[1]};
}
