import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import { App } from './App';
import './styles.css';
import { applyMacOsWindowEffects } from './window-effects';

const rootElement = document.getElementById('root');

if (!rootElement) {
  throw new Error('missing #root container');
}

void applyMacOsWindowEffects().catch((error: unknown) => {
  console.warn('failed to apply macOS window effects', error);
});

createRoot(rootElement).render(
  <StrictMode>
    <App />
  </StrictMode>
);
