import {useEffect} from 'react';
import {MutationCache, QueryClient, QueryClientProvider} from '@tanstack/react-query';
import {createBrowserRouter, Navigate, RouterProvider} from 'react-router';
import {MantineProvider} from '@mantine/core';
import {MEMORIZE_PRACTICE_PATH, READER_START_PATH} from '@/bible/paths';
import {AppLayout} from '@/components/AppLayout';
import {HomePage} from '@/pages/HomePage';
import {MemorizePage} from '@/pages/MemorizePage';
import {MemorizePracticePage} from '@/pages/MemorizePracticePage';
import {MyVersesPage} from '@/pages/MyVersesPage';
import {PeoplePage} from '@/pages/PeoplePage';
import {ReaderPage} from '@/pages/ReaderPage';
import {ReviewPage} from '@/pages/ReviewPage';
import {SearchPage} from '@/pages/SearchPage';
import {PrivacyPage} from '@/pages/PrivacyPage';
import {SignInPage} from '@/pages/SignInPage';
import {TopicPage} from '@/pages/TopicPage';
import {TopicsPage} from '@/pages/TopicsPage';
import {useAuthStore, wasRefusedForBlock} from '@/stores/auth';
import {useTranslationSync} from '@/stores/useTranslationSync';
import {mantineCssVariables, mantineTheme} from '@/theme/mantineTheme';

const router = createBrowserRouter([
  {
    element: <AppLayout />,
    children: [
      {path: '/', element: <HomePage />},
      {path: '/read', element: <Navigate to={READER_START_PATH} replace />},
      {path: '/read/:book/:chapter', element: <ReaderPage />},
      {path: '/search', element: <SearchPage />},
      {path: '/topics', element: <TopicsPage />},
      {path: '/topics/:slug', element: <TopicPage />},
      {path: '/memorize', element: <MemorizePage />},
      {path: MEMORIZE_PRACTICE_PATH, element: <MemorizePracticePage />},
      {path: '/my-verses', element: <MyVersesPage />},
      {path: '/review', element: <ReviewPage />},
      {path: '/people', element: <PeoplePage />},
      {path: '/privacy', element: <PrivacyPage />},
    ],
  },
  {path: '/sign-in', element: <SignInPage />},
  {path: '*', element: <Navigate to="/" replace />},
]);

// Published Bible text does not change while someone is reading it.
const queryClient = new QueryClient({
  defaultOptions: {queries: {staleTime: Infinity, retry: 1}},
  // A save refused because an admin blocked the account during this visit switches the pages to the blocked notice.
  mutationCache: new MutationCache({onError: (error) => void wasRefusedForBlock(error)}),
});

export function App() {
  const init = useAuthStore((state) => state.init);

  useEffect(() => init(), [init]);
  useTranslationSync();

  return (
    <MantineProvider theme={mantineTheme} cssVariablesResolver={mantineCssVariables} defaultColorScheme="auto">
      <QueryClientProvider client={queryClient}>
        <RouterProvider router={router} />
      </QueryClientProvider>
    </MantineProvider>
  );
}
