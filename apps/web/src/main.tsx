import '@mantine/core/styles.css';
import '@/styles/main.scss';
// Starts Firebase (and App Check) before anything can make a request.
import '@/firebase';

import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import {App} from '@/App';

const root = document.getElementById('root');

if (!root) {
  throw new Error('The page has no #root element to render into.');
}

createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
