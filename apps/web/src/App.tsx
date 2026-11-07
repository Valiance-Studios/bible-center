import {createBrowserRouter, RouterProvider} from 'react-router';
import {MantineProvider} from '@mantine/core';
import {HomePage} from '@/pages/HomePage';

const router = createBrowserRouter([
  {path: '/', element: <HomePage />},
]);

export function App() {
  return (
    <MantineProvider defaultColorScheme="auto">
      <RouterProvider router={router} />
    </MantineProvider>
  );
}
