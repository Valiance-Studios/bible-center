import {describe, expect, it, vi} from 'vite-plus/test';
import {render, screen} from '@testing-library/react';
import {App} from '@/App';

vi.mock('@/firebase', () => ({auth: {}, db: {}}));
vi.mock('@/firebase/functions', () => ({functions: {}}));
vi.mock('firebase/auth', async (importOriginal) => ({
  ...(await importOriginal<typeof import('firebase/auth')>()),
  onAuthStateChanged: vi.fn(() => () => {}),
}));

describe('App', () => {
  it('renders the home page in the app layout', () => {
    render(<App />);

    expect(screen.getByRole('link', {name: 'Bible Center'})).toBeTruthy();
    expect(screen.getByText('Verse of the day')).toBeTruthy();
    expect(screen.getByRole('navigation', {name: 'Browse by section of the Bible'})).toBeTruthy();
  });
});
