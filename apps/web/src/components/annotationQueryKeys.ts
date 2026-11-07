import type {AnnotationOrder, AnnotationType} from '@bible-center/core';

/**
 * Query keys for a user's annotations. Every key starts with `forUser`, so invalidating it refreshes
 * both the reader's chapters and My verses after a change made on either page.
 */
export const annotationQueryKeys = {
  forUser: (uid: string | undefined) => ['annotations', uid] as const,
  chapter: (uid: string | undefined, chapterId: string) => ['annotations', uid, 'chapter', chapterId] as const,
  pages: (uid: string | undefined, type: AnnotationType | null, order: AnnotationOrder) => ['annotations', uid, 'pages', type, order] as const,
};
