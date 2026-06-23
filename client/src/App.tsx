import { useEffect, useState } from 'react';
import { LoginPage } from './pages/LoginPage';
import { DashboardPage } from './pages/DashboardPage';
import { RecycleBinPage } from './pages/RecycleBinPage';
import { SettingsPage } from './pages/SettingsPage';
import { AppLayout } from './components/layout/AppLayout';
import { Toaster } from '@/components/ui/toaster';
import { api } from '@/lib/api';
import { Loader2 } from 'lucide-react';

type Page = 'dashboard' | 'recycle' | 'settings';

export default function App() {
  const [loading, setLoading] = useState(true);
  const [hasUser, setHasUser] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [currentPage, setCurrentPage] = useState<Page>('dashboard');
  const [recycleCount, setRecycleCount] = useState(0);
  const [isDark, setIsDark] = useState(true);

  useEffect(() => {
    checkStatus();
    const isDarkMode = document.documentElement.classList.contains('dark');
    setIsDark(isDarkMode);
  }, []);

  const toggleTheme = () => {
    if (isDark) {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    } else {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    }
    setIsDark(!isDark);
  };

  const checkStatus = async () => {
    try {
      const { hasUser } = await api.get('/auth/check');
      setHasUser(hasUser);
      if (hasUser) {
        try {
          await api.get('/auth/me');
          setIsLoggedIn(true);
          updateRecycleCount();
        } catch {
          setIsLoggedIn(false);
        }
      }
    } catch (e) {
      console.error('Failed to check auth status', e);
    } finally {
      setLoading(false);
    }
  };

  const updateRecycleCount = async () => {
    try {
      const recycle = await api.get('/recycle');
      setRecycleCount(recycle.length);
    } catch (e) {
      // ignore
    }
  };

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isLoggedIn) {
    return (
      <>
        <LoginPage onLogin={() => { setIsLoggedIn(true); updateRecycleCount(); }} hasUser={hasUser} />
        <Toaster />
      </>
    );
  }

  const handleLogout = async () => {
    try {
      await api.post('/auth/logout');
    } catch (e) {
      console.error('Failed to logout on backend', e);
    } finally {
      setIsLoggedIn(false);
      setCurrentPage('dashboard');
    }
  };

  return (
    <AppLayout 
      currentPage={currentPage} 
      onNavigate={(p) => { setCurrentPage(p); updateRecycleCount(); }} 
      onLogout={handleLogout}
      isDark={isDark}
      toggleTheme={toggleTheme}
      recycleCount={recycleCount}
    >
      {currentPage === 'dashboard' && <DashboardPage onRecycleUpdate={updateRecycleCount} />}
      {currentPage === 'recycle' && <RecycleBinPage onUpdate={updateRecycleCount} />}
      {currentPage === 'settings' && <SettingsPage />}
      <Toaster />
    </AppLayout>
  );
}
