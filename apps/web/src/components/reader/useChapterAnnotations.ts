import type {Annotation, ChapterRef} from '@bible-center/core';
import type {NewAnnotation} from '@/firebase/annotations';

import {useMutation, useQuery, useQueryClient} from '@tanstack/react-query';
import {chapterIdOf} from '@bible-center/core';
import {addAnnotation, listChapterAnnotations, removeAnnotation, updateNoteText} from '@/firebase/annotations';
import {annotationQueryKeys} from '@/components/annotationQueryKeys';

const NO_ANNOTATIONS: Annotation[] = [];

/** A user's annotations on one chapter, and the ways to change them. With no user, there are none. */
export function useChapterAnnotations(uid: string | undefined, reference: ChapterRef) {
  const queryClient = useQueryClient();
  const chapterId = chapterIdOf(reference);
  const {data = NO_ANNOTATIONS, isError: hasLoadError, isLoading} = useQuery({
    queryKey: annotationQueryKeys.chapter(uid, chapterId),
    queryFn: () => listChapterAnnotations(uid ?? '', chapterId),
    enabled: uid !== undefined,
    // Unlike Bible text, annotations change, and this browser may not be the only one changing them.
    staleTime: 0,
    // Being offline counts as a failure here (see listChapterAnnotations), so give a brief one time to pass.
    retry: 4,
  });
  const change = useMutation({
    mutationFn: async (run: (userId: string) => Promise<unknown>) => {
      if (uid) {
        await run(uid);
      }
    },
    onSettled: () => queryClient.invalidateQueries({queryKey: annotationQueryKeys.forUser(uid)}),
  });

  return {
    annotations: data,
    hasLoadError,
    isLoading,
    isSaving: change.isPending,
    hasError: change.isError,
    add: (annotation: NewAnnotation) => change.mutateAsync((userId) => addAnnotation(userId, annotation)),
    removeAll: (ids: string[]) => change.mutateAsync((userId) => Promise.all(ids.map((id) => removeAnnotation(userId, id)))),
    updateNote: (id: string, text: string) => change.mutateAsync((userId) => updateNoteText(userId, id, text)),
  };
}
