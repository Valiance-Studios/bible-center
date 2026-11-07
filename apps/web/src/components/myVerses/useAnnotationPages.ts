import type {Annotation, AnnotationOrder, AnnotationType} from '@bible-center/core';
import type {AnnotationCursor} from '@/firebase/annotations';

import {useInfiniteQuery, useMutation, useQueryClient} from '@tanstack/react-query';
import {annotationQueryKeys} from '@/components/annotationQueryKeys';
import {listAnnotationPage, removeAnnotation} from '@/firebase/annotations';

export const ANNOTATION_PAGE_SIZE = 20;

const NO_ANNOTATIONS: Annotation[] = [];

/** A user's annotations a page at a time, filtered and ordered by Firestore, and a way to remove one. */
export function useAnnotationPages(uid: string | undefined, type: AnnotationType | null, order: AnnotationOrder) {
  const queryClient = useQueryClient();
  const {data, isError, isFetchNextPageError, isLoading, refetch, hasNextPage, fetchNextPage, isFetchingNextPage} = useInfiniteQuery({
    queryKey: annotationQueryKeys.pages(uid, type, order),
    queryFn: ({pageParam}) => listAnnotationPage(uid ?? '', {type, order, after: pageParam, pageSize: ANNOTATION_PAGE_SIZE}),
    initialPageParam: null as AnnotationCursor | null,
    getNextPageParam: (lastPage) => lastPage.next,
    enabled: uid !== undefined,
    // Annotations change in the reader, and this browser may not be the only one changing them.
    staleTime: 0,
    // Being offline counts as a failure here (see listAnnotationPage), so give a brief one time to pass.
    retry: 4,
  });
  const remove = useMutation({
    mutationFn: async (id: string) => {
      if (uid) {
        await removeAnnotation(uid, id);
      }
    },
    onSettled: () => queryClient.invalidateQueries({queryKey: annotationQueryKeys.forUser(uid)}),
  });

  return {
    annotations: data?.pages.flatMap((page) => page.annotations) ?? NO_ANNOTATIONS,
    isLoading,
    /** The first page failed. A later page failing leaves what loaded in place. */
    hasLoadError: isError && !isFetchNextPageError,
    hasMoreError: isFetchNextPageError,
    reload: () => void refetch(),
    hasMore: hasNextPage,
    isLoadingMore: isFetchingNextPage,
    loadMore: () => void fetchNextPage(),
    remove: (id: string) => remove.mutateAsync(id),
    isRemoving: remove.isPending,
  };
}
