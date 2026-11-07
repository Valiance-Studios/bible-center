import {useEffect} from 'react';
import {QueryClient, QueryClientProvider} from '@tanstack/react-query';
import {createBrowserRouter, Navigate, RouterProvider} from 'react-router';
import {MantineProvider} from '@mantine/core';
import {READER_START_PATH} from '@/bible/paths';
import {AppLayout} from '@/components/AppLayout';
import {ComingSoonPage, HomePage} from '@/pages/HomePage';
import {ReaderPage} from '@/pages/ReaderPage';
import {SearchPage} from '@/pages/SearchPage';
import {SignInPage} from '@/pages/SignInPage';
import {useAuthStore} from '@/stores/auth';
import {mantineCssVariables, mantineTheme} from '@/theme/mantineTheme';

const router = createBrowserRouter([
  {
    element: <AppLayout />,
    children: [
      {path: '/', element: <HomePage />},
      {path: '/read', element: <Navigate to={READER_START_PATH} replace />},
      {path: '/read/:book/:chapter', element: <ReaderPage />},
      {path: '/search', element: <SearchPage />},
      {path: '/topics', element: <ComingSoonPage title="Topics" />},
    ],
  },
  {path: '/sign-in', element: <SignInPage />},
  {path: '*', element: <Navigate to="/" replace />},
]);

// Published Bible text does not change while someone is reading it.
const queryClient = new QueryClient({defaultOptions: {queries: {staleTime: Infinity, retry: 1}}});

export function App() {
  const init = useAuthStore((state) => state.init);

  useEffect(() => init(), [init]);

  return (
    <MantineProvider theme={mantineTheme} cssVariablesResolver={mantineCssVariables} defaultColorScheme="auto">
      <QueryClientProvider client={queryClient}>
        <RouterProvider router={router} />
      </QueryClientProvider>
    </MantineProvider>
  );
}
