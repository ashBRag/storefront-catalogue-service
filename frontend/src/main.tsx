import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App.tsx';
import './ui/styles/tokens.css';
import './ui/styles/global.css';

const root = document.getElementById('root');
if (root === null) {
  throw new Error('Missing #root element in index.html');
}

createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
