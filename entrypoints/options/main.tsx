import React from 'react';
import ReactDOM from 'react-dom/client';
// CORREÇÃO: Adicionamos a extensão explícita .tsx
import OptionsApp from './OptionsApp.tsx'; 
import '../popup/App.css'; // Carrega o Tailwind v4 global

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <OptionsApp />
  </React.StrictMode>
);