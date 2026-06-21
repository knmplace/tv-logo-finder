import { useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { Center, Loader } from '@mantine/core';
import useAuthStore from './store/auth';
import LoginPage from './pages/LoginPage';
import SetupPage from './pages/SetupPage';
import Layout from './pages/Layout';
import DashboardPage from './pages/DashboardPage';
import SearchPage from './pages/SearchPage';
import SettingsPage from './pages/SettingsPage';

export default function App() {
  const { isAuthenticated, setupRequired, loading, checkStatus } = useAuthStore();

  useEffect(() => {
    checkStatus();
  }, [checkStatus]);

  if (loading) {
    return (
      <Center mih="100vh" bg="#18181b">
        <Loader color="teal" size="lg" />
      </Center>
    );
  }

  if (setupRequired) {
    return <SetupPage />;
  }

  if (!isAuthenticated) {
    return <LoginPage />;
  }

  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<DashboardPage />} />
        <Route path="/search" element={<SearchPage />} />
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}
