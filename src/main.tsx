import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import V3App from './public/V3App.tsx';
import {initAnalytics} from './lib/analytics';
import './design-system.css';
import './v3-polish.css';

initAnalytics();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <V3App />
  </StrictMode>,
);
