// frontend/src/App.jsx
// Root Application Module: Configures Context Providers, Client-Side Router, and Application Flow

import React from 'react';
import { BrowserRouter } from 'react-router-dom';
import { AreaProvider } from './context/AreaContext';
import { AuthProvider } from './context/AuthContext';
import { SettingsProvider } from './context/SettingsContext';
import AppRoutes from './routes';

export default function App() {
  return (
    <SettingsProvider>
      <AuthProvider>
        <AreaProvider>
          <BrowserRouter>
            <AppRoutes />
          </BrowserRouter>
        </AreaProvider>
      </AuthProvider>
    </SettingsProvider>
  );
}
