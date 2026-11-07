import type {Annotation, AnnotationType, ChapterRef, Verse, VerseSpan} from '@bible-center/core';

import {useState} from 'react';
import {Link} from 'react-router';
import {chapterIdOf, formatReference, selectVerse, spanContains, spanOf, spansOverlap, verseIdIn} from '@bible-center/core';
import {Alert} from '@mantine/core';
import {VerseText} from '@/components/VerseText';
import {useAuthStore} from '@/stores/auth';
import {NoteDialog} from './NoteDialog';
import {useChapterAnnotations} from './useChapterAnnotations';
import classes from './ChapterVerses.module.scss';

interface ChapterVersesProps {
  reference: ChapterRef;
  verses: Verse[];
  /** The verse a link pointed to, if any. */
  targetVerse: number | null;
  selection: VerseSpan | null;
  /** Called with the new selection, and the verse that was tapped to make it. */
  onSelectionChange: (selection: VerseSpan | null, tappedVerse: number | null) => void;
  /** A button among the selection's tools that shows the original words, such as "Hebrew words", on phones. */
  wordsTool?: {label: string; onClick: () => void};
}

interface NoteEditor {
  span: VerseSpan;
  note: Annotation | null;
}

function ofType(annotations: Annotation[], type: AnnotationType): Annotation[] {
  return annotations.filter((annotation) => annotation.type === type);
}

function overlapping(annotations: Annotation[], span: VerseSpan): Annotation[] {
  return annotations.filter((annotation) => spansOverlap(spanOf(annotation), span));
}

const RibbonIcon = <svg width="13" height="16" viewBox="0 0 13 16" fill="currentColor" role="img" aria-label="Bookmarked"><path d="M0 0h13v16l-6.5-4L0 16z" /></svg>;

/**
 * A chapter's verses. Anyone can select a verse, alone or as a range, to study its original words.
 * Allowlisted users can also annotate the selection.
 */
export function ChapterVerses({reference, verses, targetVerse, selection, onSelectionChange, wordsTool}: ChapterVersesProps) {
  const status = useAuthStore((state) => state.status);
  const user = useAuthStore((state) => state.user);
  const canAnnotate = status === 'allowed';
  const {annotations, hasLoadError, isLoading, isSaving, hasError, add, removeAll, updateNote} = useChapterAnnotations(canAnnotate ? user?.uid : undefined, reference);
  // Until annotations load, an action cannot know what is already marked, and could add a duplicate instead of removing.
  const areActionsDisabled = isLoading || isSaving || hasLoadError;
  const [noteEditor, setNoteEditor] = useState<NoteEditor | null>(null);
  const highlights = ofType(annotations, 'highlight');
  const bookmarks = ofType(annotations, 'bookmark');
  const notes = ofType(annotations, 'note');

  const describe = ({start, end}: VerseSpan) => formatReference({
    book: reference.book,
    startChapter: reference.chapter,
    startVerse: start,
    endChapter: reference.chapter,
    endVerse: end,
  });

  function setSelection(next: VerseSpan | null) {
    onSelectionChange(next, null);
  }

  function tapVerse(verse: number): void {
    // Dragging across words to copy them should not also select the verse.
    if (!window.getSelection()?.toString()) {
      const next = selectVerse(selection, verse);

      onSelectionChange(next, next ? verse : null);
    }
  }

  function toNewAnnotation(type: AnnotationType, {start, end}: VerseSpan) {
    return {type, chapterId: chapterIdOf(reference), startVerse: verseIdIn(reference, start), endVerse: verseIdIn(reference, end)};
  }

  /** Removes this kind of mark from the selection if it has any, and otherwise adds it. */
  async function toggle(type: 'highlight' | 'bookmark', existing: Annotation[], span: VerseSpan): Promise<void> {
    const covering = overlapping(existing, span);

    if (covering.length > 0) {
      await removeAll(covering.map(({id}) => id));
    } else {
      await add(toNewAnnotation(type, span));
    }

    setSelection(null);
  }

  async function saveNote(text: string): Promise<void> {
    if (!noteEditor) {
      return;
    }

    if (noteEditor.note) {
      await updateNote(noteEditor.note.id, text);
    } else {
      await add({...toNewAnnotation('note', noteEditor.span), text});
    }

    setNoteEditor(null);
    setSelection(null);
  }

  async function deleteNote(): Promise<void> {
    if (noteEditor?.note) {
      await removeAll([noteEditor.note.id]);
    }

    setNoteEditor(null);
    setSelection(null);
  }

  return (
    <>
      {bookmarks.length > 0 && <div className={classes.ribbon} aria-hidden="true" />}

      {status === 'signedOut' && (
        <p className={classes.signInHint}>
          <Link to="/sign-in">Sign in</Link>
          {' to highlight, bookmark and add notes to verses.'}
        </p>
      )}

      {/* Without this, a failed load would look like having no annotations. */}
      {hasLoadError && <Alert color="red" mb="md">Your highlights, bookmarks and notes could not be loaded. Check your connection and refresh the page.</Alert>}

      {verses.map(({verse, text}) => {
        const isSelected = selection !== null && spanContains(selection, verse);
        const isBookmarkStart = bookmarks.some((bookmark) => spanOf(bookmark).start === verse);
        const verseNotes = notes.filter((note) => spanOf(note).end === verse);

        return (
          <div key={verse}>
            <VerseText
              id={`v${verse}`}
              verse={verse}
              text={text}
              isMarked={isSelected || targetVerse === verse}
              isHighlighted={highlights.some((highlight) => spanContains(spanOf(highlight), verse))}
              marker={isBookmarkStart ? <span className={classes.bookmarkMarker}>{RibbonIcon}</span> : null}
              onSelect={() => tapVerse(verse)}
              isSelected={isSelected}
            />

            {verseNotes.map((note) => (
              <div key={note.id} className={classes.note}>
                <p className={classes.noteText}>
                  {note.text}
                </p>
                <button type="button" className={classes.noteEdit} onClick={() => setNoteEditor({span: spanOf(note), note})}>
                  {`Edit note on ${describe(spanOf(note))}`}
                </button>
              </div>
            ))}

            {selection?.end === verse && (
              <div className={classes.tools} role="group" aria-label={`Actions for ${describe(selection)}`}>
                <p className={classes.toolsLabel}>
                  {selection.start === selection.end && canAnnotate
                    ? `${describe(selection)} selected. Select another verse to make a range.`
                    : `${describe(selection)} selected.`}
                </p>
                <div className={classes.toolButtons}>
                  {wordsTool && <button type="button" className={classes.tool} onClick={wordsTool.onClick}>{wordsTool.label}</button>}
                  {canAnnotate && (
                    <>
                      <button type="button" className={classes.tool} disabled={areActionsDisabled} onClick={() => void toggle('highlight', highlights, selection)}>
                        {overlapping(highlights, selection).length > 0 ? 'Remove highlight' : 'Highlight'}
                      </button>
                      <button type="button" className={classes.tool} disabled={areActionsDisabled} onClick={() => void toggle('bookmark', bookmarks, selection)}>
                        {overlapping(bookmarks, selection).length > 0 ? 'Remove bookmark' : 'Bookmark'}
                      </button>
                      <button
                        type="button"
                        className={classes.tool}
                        disabled={areActionsDisabled}
                        onClick={() => setNoteEditor({span: selection, note: overlapping(notes, selection)[0] ?? null})}
                      >
                        {overlapping(notes, selection).length > 0 ? 'Edit note' : 'Add note'}
                      </button>
                    </>
                  )}
                  <button type="button" className={classes.tool} onClick={() => setSelection(null)}>Clear selection</button>
                </div>
              </div>
            )}
          </div>
        );
      })}

      {hasError && <Alert color="red" mt="md">Your change could not be saved. Check your connection and try again.</Alert>}

      {noteEditor && (
        <NoteDialog
          title={`Note on ${describe(noteEditor.span)}`}
          initialText={noteEditor.note?.text ?? ''}
          isExisting={noteEditor.note !== null}
          isSaving={isSaving}
          onSave={(text) => void saveNote(text)}
          onDelete={() => void deleteNote()}
          onClose={() => setNoteEditor(null)}
        />
      )}
    </>
  );
}
