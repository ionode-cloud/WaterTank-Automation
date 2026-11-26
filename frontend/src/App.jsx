import React, { useState, useEffect, useCallback } from 'react';
import LandingPage from './pages/LandingPage';
import Dashboard from './pages/Dashboard';
import Profile from './pages/Profile';
import Models from './pages/Models';
import History from './pages/History';
import Devices from './pages/Devices';
import AdminConsole from './pages/AdminConsole';
import RegisteredUsers from './pages/RegisteredUsers';
import UserRegisteredDevices from './pages/UserRegisteredDevices';
import AuthModal from './components/AuthModal';

const VALID_PAGES = ['landing', 'profile', 'dashboard', 'models', 'history', 'devices', 'admin', 'registered-users', 'user-devices'];
const PROTECTED_PAGES = ['profile', 'dashboard', 'models', 'history', 'devices', 'admin', 'registered-users', 'user-devices'];

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
    let userRole = 'USER';
    try {
      if (stored) {
        const parsed = JSON.parse(stored);
        userRole = String(parsed.role || 'USER').toUpperCase();
      }
    } catch {}

    const ADMIN_PAGES = ['admin', 'registered-users', 'user-devices', 'models'];
    if (pageFromUrl && VALID_PAGES.includes(pageFromUrl)) {
      if (ADMIN_PAGES.includes(pageFromUrl) && userRole !== 'ADMIN') {
        return 'dashboard';
      }
      return pageFromUrl;
    }
    const saved = localStorage.getItem('wt_current_page');
    if (VALID_PAGES.includes(saved) && saved !== 'landing') {
      if (ADMIN_PAGES.includes(saved) && userRole !== 'ADMIN') {
        return 'dashboard';
      }
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

    // Role-based route guard: Non-admins cannot access admin views (including Models)
    const ADMIN_PAGES = ['admin', 'registered-users', 'user-devices', 'models'];
    if (ADMIN_PAGES.includes(page)) {
      let isUserAdmin = false;
      try {
        if (currentUser) {
          isUserAdmin = String(currentUser.role).toUpperCase() === 'ADMIN';
        } else if (stored) {
          const parsed = JSON.parse(stored);
          isUserAdmin = String(parsed.role || '').toUpperCase() === 'ADMIN';
        }
      } catch {}

      if (!isUserAdmin) {
        setCurrentPage('dashboard');
        localStorage.setItem('wt_current_page', 'dashboard');
        window.history.replaceState({ page: 'dashboard' }, '', '/dashboard');
        return;
      }
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

  const handleAuthSuccess = (user, token) => {
    setCurrentUser(user);
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
        const ADMIN_PAGES = ['admin', 'registered-users', 'user-devices'];
        let isUserAdmin = false;
        try {
          if (currentUser) {
            isUserAdmin = String(currentUser.role).toUpperCase() === 'ADMIN';
          } else if (currentStored) {
            const parsed = JSON.parse(currentStored);
            isUserAdmin = String(parsed.role || '').toUpperCase() === 'ADMIN';
          }
        } catch {}

        if (ADMIN_PAGES.includes(page) && !isUserAdmin) {
          setCurrentPage('dashboard');
          localStorage.setItem('wt_current_page', 'dashboard');
          window.history.replaceState(null, '', '/dashboard');
        } else {
          setCurrentPage(page);
          localStorage.setItem('wt_current_page', page);
        }
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

      {/* 2. User Profile Tab (Normal Page View) */}
      {currentPage === 'profile' && (
        <Profile
          onNavigate={handleNavigate}
          currentUser={currentUser}
          onOpenAuth={handleOpenAuth}
          onLogout={handleLogout}
          onProfileUpdated={(updated) => setCurrentUser(updated)}
        />
      )}

      {/* 3. Main Dashboard (Shown after Login) */}
      {currentPage === 'dashboard' && (
        <Dashboard
          onNavigate={handleNavigate}
          currentUser={currentUser}
          onOpenAuth={handleOpenAuth}
          onLogout={handleLogout}
        />
      )}

      {/* 4. Motor Models Category Specifications */}
      {currentPage === 'models' && (
        <Models
          onNavigate={handleNavigate}
          currentUser={currentUser}
          onOpenAuth={handleOpenAuth}
          onLogout={handleLogout}
        />
      )}

      {/* 5. Devices Management */}
      {currentPage === 'devices' && (
        <Devices
          onNavigate={handleNavigate}
          currentUser={currentUser}
          onOpenAuth={handleOpenAuth}
          onLogout={handleLogout}
        />
      )}

      {/* 6. History Logs */}
      {currentPage === 'history' && (
        <History
          onNavigate={handleNavigate}
          currentUser={currentUser}
          onOpenAuth={handleOpenAuth}
          onLogout={handleLogout}
        />
      )}

      {/* 7. Admin Console (Admin Credentials Only) */}
      {currentPage === 'admin' && (
        <AdminConsole
          onNavigate={handleNavigate}
          currentUser={currentUser}
          onOpenAuth={handleOpenAuth}
          onLogout={handleLogout}
          currentPage="admin"
        />
      )}

      {/* 8. Registered Users (Separate dedicated page) */}
      {currentPage === 'registered-users' && (
        <RegisteredUsers
          onNavigate={handleNavigate}
          currentUser={currentUser}
          onOpenAuth={handleOpenAuth}
          onLogout={handleLogout}
        />
      )}

      {/* 9. User Registered Devices (Separate dedicated page) */}
      {currentPage === 'user-devices' && (
        <UserRegisteredDevices
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
