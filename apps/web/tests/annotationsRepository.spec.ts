import {beforeEach, describe, expect, it, vi} from 'vitest';
import {getDocs} from 'firebase/firestore';
import {listChapterAnnotations} from '@/firebase/annotations';

vi.mock('@/firebase', () => ({db: {}}));
vi.mock('firebase/firestore', () => ({
  addDoc: vi.fn(),
  collection: vi.fn(),
  deleteDoc: vi.fn(),
  doc: vi.fn(),
  getDocs: vi.fn(),
  query: vi.fn(),
  serverTimestamp: vi.fn(),
  updateDoc: vi.fn(),
  where: vi.fn(),
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
      {id: 'one', data: {type: 'highlight', startVerse: '43003016', endVerse: '43003018', createdAt: 'ignored'}},
      {id: 'two', data: {type: 'note', startVerse: '43003001', endVerse: '43003001', text: 'A thought.'}},
    ]));

    await expect(listChapterAnnotations('uid', '43003')).resolves.toEqual([
      {id: 'one', type: 'highlight', chapterId: '43003', startVerse: '43003016', endVerse: '43003018'},
      {id: 'two', type: 'note', chapterId: '43003', startVerse: '43003001', endVerse: '43003001', text: 'A thought.'},
    ]);
  });
});
