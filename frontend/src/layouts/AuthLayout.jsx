// frontend/src/layouts/AuthLayout.jsx
// Clean Authentication Layout for Login and Authorization Screens

import React from 'react';
import { Outlet } from 'react-router-dom';
import ErrorBoundary from '../components/ErrorBoundary';

export default function AuthLayout() {
  return (
    <div className="auth-layout" style={{ minHeight: '100vh', background: 'var(--bg-main, #0b1120)', display: 'flex', flexDirection: 'column' }}>
      <ErrorBoundary>
        <Outlet />
      </ErrorBoundary>
    </div>
  );
}
