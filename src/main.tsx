import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { registerSW } from 'virtual:pwa-register';
import App from './App';
import { requestPersistentStorage } from './storage/db';
import { initSync } from './sync/sync';
import './styles/app.css';

registerSW({ immediate: true });
void requestPersistentStorage();
initSync();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
