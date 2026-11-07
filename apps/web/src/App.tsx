import {useEffect} from 'react';
import {createBrowserRouter, Navigate, RouterProvider} from 'react-router';
import {MantineProvider} from '@mantine/core';
import {AppLayout} from '@/components/AppLayout';
import {ComingSoonPage, HomePage} from '@/pages/HomePage';
import {SignInPage} from '@/pages/SignInPage';
import {useAuthStore} from '@/stores/auth';
import {mantineCssVariables, mantineTheme} from '@/theme/mantineTheme';

const router = createBrowserRouter([
  {
    element: <AppLayout />,
    children: [
      {path: '/', element: <HomePage />},
      {path: '/read', element: <ComingSoonPage title="Read" />},
      {path: '/topics', element: <ComingSoonPage title="Topics" />},
    ],
  },
  {path: '/sign-in', element: <SignInPage />},
  {path: '*', element: <Navigate to="/" replace />},
]);

export function App() {
  const init = useAuthStore((state) => state.init);

  useEffect(() => init(), [init]);

  return (
    <MantineProvider theme={mantineTheme} cssVariablesResolver={mantineCssVariables} defaultColorScheme="auto">
      <RouterProvider router={router} />
    </MantineProvider>
  );
}
