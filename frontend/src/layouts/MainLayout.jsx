// frontend/src/layouts/MainLayout.jsx
// Standardized Master Layout for Main Application (Navbar, Sidebar, Container, ErrorBoundary, Chatbot)

import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import Navbar from '../components/Navbar';
import ThreadLineChatbot from '../components/ThreadLineChatbot';
import ErrorBoundary from '../components/ErrorBoundary';

export default function MainLayout() {
  const [isCollapsed, setIsCollapsed] = useState(() => {
    return localStorage.getItem('threadline_sidebar_collapsed') === 'true';
  });

  const toggleSidebar = () => {
    setIsCollapsed(prev => {
      const next = !prev;
      localStorage.setItem('threadline_sidebar_collapsed', next.toString());
      return next;
    });
  };

  return (
    <div id="app-layout">
      <Sidebar isCollapsed={isCollapsed} onToggle={toggleSidebar} />
      <main className="main-wrapper">
        <Navbar isCollapsed={isCollapsed} onToggleSidebar={toggleSidebar} />
        <div className="page-container">
          <ErrorBoundary>
            <Outlet />
          </ErrorBoundary>
        </div>
      </main>
      <ThreadLineChatbot />
    </div>
  );
}
