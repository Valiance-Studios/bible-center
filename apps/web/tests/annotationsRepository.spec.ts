import {beforeEach, describe, expect, it, vi} from 'vitest';
import {getDocs, query} from 'firebase/firestore';
import {listAnnotationPage, listChapterAnnotations} from '@/firebase/annotations';

vi.mock('@/firebase', () => ({db: {}}));
vi.mock('firebase/firestore', () => ({
  addDoc: vi.fn(),
  collection: vi.fn(),
  deleteDoc: vi.fn(),
  doc: vi.fn(),
  getDocs: vi.fn(),
  // Each constraint becomes a readable description, so tests can check what was asked of Firestore.
  limit: (count: number) => `limit ${count}`,
  orderBy: (field: string, direction = 'asc') => `orderBy ${field} ${direction}`,
  query: vi.fn(),
  serverTimestamp: vi.fn(),
  startAfter: (cursor: {id: string}) => `startAfter ${cursor.id}`,
  updateDoc: vi.fn(),
  where: (field: string, operator: string, value: string) => `where ${field} ${operator} ${value}`,
}));

function snapshot(fromCache: boolean, documents: {id: string; data: Record<string, unknown>}[] = []) {
  return {
    metadata: {fromCache},
    docs: documents.map(({id, data}) => ({id, data: () => data})),
  } as never;
}

describe('listChapterAnnotations', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('fails when offline, rather than reporting no annotations', async () => {
    vi.mocked(getDocs).mockResolvedValue(snapshot(true));

    await expect(listChapterAnnotations('uid', '43003')).rejects.toThrow('Could not reach Firestore');
  });

  it('returns what the server has, keeping text only on notes', async () => {
    vi.mocked(getDocs).mockResolvedValue(snapshot(false, [
      {id: 'one', data: {type: 'highlight', chapterId: '43003', startVerse: '43003016', endVerse: '43003018', createdAt: 'ignored'}},
      {id: 'two', data: {type: 'note', chapterId: '43003', startVerse: '43003001', endVerse: '43003001', text: 'A thought.'}},
    ]));

    await expect(listChapterAnnotations('uid', '43003')).resolves.toEqual([
      {id: 'one', type: 'highlight', chapterId: '43003', startVerse: '43003016', endVerse: '43003018'},
      {id: 'two', type: 'note', chapterId: '43003', startVerse: '43003001', endVerse: '43003001', text: 'A thought.'},
    ]);
  });
});

describe('listAnnotationPage', () => {
  const highlight = (id: string) => ({id, data: {type: 'highlight', chapterId: '19023', startVerse: '19023001', endVerse: '19023001'}});

  beforeEach(() => {
    vi.clearAllMocks();
  });

  /** The constraints the last query was built with, after the collection. */
  function constraints() {
    return vi.mocked(query).mock.calls.at(-1)?.slice(1);
  }

  it('fails when offline, rather than reporting no annotations', async () => {
    vi.mocked(getDocs).mockResolvedValue(snapshot(true));

    await expect(listAnnotationPage('uid', {type: null, order: 'recent', after: null, pageSize: 2})).rejects.toThrow('Could not reach Firestore');
  });

  it('asks for the newest first, one more than a page, and gives a cursor when more follow', async () => {
    vi.mocked(getDocs).mockResolvedValue(snapshot(false, [highlight('a'), highlight('b'), highlight('c')]));

    const page = await listAnnotationPage('uid', {type: null, order: 'recent', after: null, pageSize: 2});

    expect(constraints()).toEqual(['orderBy createdAt desc', 'limit 3']);
    expect(page.annotations.map(({id}) => id)).toEqual(['a', 'b']);
    expect(page.next).toMatchObject({id: 'b'});
  });

  it('filters by type, orders by verse, and continues after a cursor', async () => {
    vi.mocked(getDocs).mockResolvedValue(snapshot(false, [highlight('c')]));

    const page = await listAnnotationPage('uid', {type: 'note', order: 'bible', after: {id: 'b'} as never, pageSize: 2});

    expect(constraints()).toEqual(['where type == note', 'orderBy startVerse asc', 'orderBy endVerse asc', 'startAfter b', 'limit 3']);
    expect(page.annotations.map(({id}) => id)).toEqual(['c']);
    expect(page.next).toBeNull();
  });
});
