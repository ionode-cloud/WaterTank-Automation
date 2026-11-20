import React, { useState, useEffect, useCallback } from 'react';
import LandingPage from './pages/LandingPage';
import Dashboard from './pages/Dashboard';
import History from './pages/History';
import Devices from './pages/Devices';
import AdminConsole from './pages/AdminConsole';
import AuthModal from './components/AuthModal';

const VALID_PAGES = ['landing', 'dashboard', 'history', 'devices', 'admin'];
const PROTECTED_PAGES = ['dashboard', 'history', 'devices', 'admin'];

const getPageFromUrl = () => {
  // If an old hash exists (e.g. #dashboard), strip it
  if (window.location.hash) {
    const hash = window.location.hash.replace('#', '').toLowerCase();
    if (VALID_PAGES.includes(hash)) return hash;
  }
  const pathname = window.location.pathname.replace(/^\/+|\/+$/g, '').toLowerCase();
  if (VALID_PAGES.includes(pathname)) {
    return pathname;
  }
  if (!pathname || pathname === '') {
    return 'landing';
  }
  return null;
};

const getUrlForPage = (page) => {
  if (page === 'landing') return '/';
  return `/${page}`;
};

function App() {
  // 1. Persistent Auth State (Retained across reloads and browser restarts - NO auto-logout)
  const [currentUser, setCurrentUser] = useState(() => {
    try {
      const token = localStorage.getItem('wt_token');
      const stored = localStorage.getItem('wt_user');
      if (token && stored) {
        return JSON.parse(stored);
      }
      return null;
    } catch {
      return null;
    }
  });

  // 2. Page Navigation State (Clean Path URLs without '#')
  const [currentPage, setCurrentPage] = useState(() => {
    const token = localStorage.getItem('wt_token');
    const stored = localStorage.getItem('wt_user');
    const isAuthenticated = Boolean(token && stored);

    // If user is NOT logged in, always show landing page first
    if (!isAuthenticated) {
      return 'landing';
    }

    // If user is authenticated, check clean URL pathname
    const pageFromUrl = getPageFromUrl();
    if (pageFromUrl && VALID_PAGES.includes(pageFromUrl)) {
      return pageFromUrl;
    }
    const saved = localStorage.getItem('wt_current_page');
    if (VALID_PAGES.includes(saved) && saved !== 'landing') {
      return saved;
    }
    return 'dashboard';
  });

  // 3. Popup Auth Modal State
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authModalMode, setAuthModalMode] = useState('signin'); // 'signin' or 'signup'

  const handleOpenAuth = (mode = 'signin') => {
    setAuthModalMode(mode);
    setIsAuthModalOpen(true);
  };

  const handleNavigate = useCallback((page) => {
    if (!VALID_PAGES.includes(page)) return;

    // Check authentication for protected pages
    const token = localStorage.getItem('wt_token');
    const stored = localStorage.getItem('wt_user');
    const isAuthenticated = Boolean(token && stored);

    if (PROTECTED_PAGES.includes(page) && !isAuthenticated) {
      // Prompt sign in modal and remain on landing page
      handleOpenAuth('signin');
      setCurrentPage('landing');
      window.history.pushState(null, '', '/');
      return;
    }

    setCurrentPage(page);
    localStorage.setItem('wt_current_page', page);

    const targetUrl = getUrlForPage(page);
    // Push new clean path without '#' and clear any trailing hash
    if (window.location.pathname !== targetUrl || window.location.hash) {
      window.history.pushState({ page }, '', targetUrl);
    }
    window.scrollTo(0, 0);
  }, []);

  // Requirement: "after login show dashboard"
  const handleAuthSuccess = (user, token) => {
    setCurrentUser(user);
    // As soon as user logs in or registers, immediately direct them to Dashboard
    handleNavigate('dashboard');
  };

  const handleLogout = () => {
    localStorage.removeItem('wt_token');
    localStorage.removeItem('wt_user');
    localStorage.removeItem('wt_current_page');
    setCurrentUser(null);
    setCurrentPage('landing');
    window.history.pushState(null, '', '/');
  };

  // Sync with browser back/forward buttons and enforce clean path URLs
  useEffect(() => {
    const token = localStorage.getItem('wt_token');
    const stored = localStorage.getItem('wt_user');
    const isAuthenticated = Boolean(token && stored);

    // If an existing hash (#) is in the URL, replace it with clean path immediately
    if (window.location.hash) {
      const pageFromHash = window.location.hash.replace('#', '').toLowerCase();
      const targetPage = VALID_PAGES.includes(pageFromHash) ? pageFromHash : currentPage;
      const cleanPath = getUrlForPage(targetPage);
      window.history.replaceState({ page: targetPage }, '', cleanPath);
    } else {
      const currentPath = getUrlForPage(currentPage);
      if (window.location.pathname !== currentPath) {
        window.history.replaceState({ page: currentPage }, '', currentPath);
      }
    }

    if (!isAuthenticated && currentPage !== 'landing') {
      setCurrentPage('landing');
      window.history.replaceState(null, '', '/');
    }

    const handlePopState = () => {
      const page = getPageFromUrl() || 'landing';
      const currentToken = localStorage.getItem('wt_token');
      const currentStored = localStorage.getItem('wt_user');
      const isAuth = Boolean(currentToken && currentStored);

      if (PROTECTED_PAGES.includes(page) && !isAuth) {
        handleOpenAuth('signin');
        setCurrentPage('landing');
        window.history.replaceState(null, '', '/');
      } else {
        setCurrentPage(page);
        localStorage.setItem('wt_current_page', page);
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [currentPage]);

  return (
    <>
      {/* 1. Landing Page (Shown First) */}
      {currentPage === 'landing' && (
        <LandingPage
          onNavigate={handleNavigate}
          onOpenAuth={handleOpenAuth}
          currentUser={currentUser}
          onLogout={handleLogout}
        />
      )}

      {/* 2. Main Dashboard (Shown after Login) */}
      {currentPage === 'dashboard' && (
        <Dashboard
          onNavigate={handleNavigate}
          currentUser={currentUser}
          onOpenAuth={handleOpenAuth}
          onLogout={handleLogout}
        />
      )}

      {/* 3. Devices Management */}
      {currentPage === 'devices' && (
        <Devices
          onNavigate={handleNavigate}
          currentUser={currentUser}
          onOpenAuth={handleOpenAuth}
          onLogout={handleLogout}
        />
      )}

      {/* 4. History Logs */}
      {currentPage === 'history' && (
        <History
          onNavigate={handleNavigate}
          currentUser={currentUser}
          onOpenAuth={handleOpenAuth}
          onLogout={handleLogout}
        />
      )}

      {/* 5. Admin Console */}
      {currentPage === 'admin' && (
        <AdminConsole
          onNavigate={handleNavigate}
          currentUser={currentUser}
          onOpenAuth={handleOpenAuth}
          onLogout={handleLogout}
        />
      )}

      {/* Global Sign Up / Sign In Popup Modal */}
      <AuthModal
        isOpen={isAuthModalOpen}
        initialMode={authModalMode}
        onClose={() => setIsAuthModalOpen(false)}
        onSuccess={handleAuthSuccess}
      />
    </>
  );
}

export default App;
