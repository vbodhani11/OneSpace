import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { ProtectedRoute } from './components/layout/ProtectedRoute';
import { AppLayout } from './components/layout/AppLayout';

const Login = lazy(async () => ({ default: (await import('./pages/Login')).Login }));
const Signup = lazy(async () => ({ default: (await import('./pages/Signup')).Signup }));
const Dashboard = lazy(async () => ({ default: (await import('./pages/Dashboard')).Dashboard }));
const Calendar = lazy(async () => ({ default: (await import('./pages/Calendar')).Calendar }));
const Journal = lazy(async () => ({ default: (await import('./pages/Journal')).Journal }));
const Tasks = lazy(async () => ({ default: (await import('./pages/Tasks')).Tasks }));
const Profile = lazy(async () => ({ default: (await import('./pages/Profile')).Profile }));
const Settings = lazy(async () => ({ default: (await import('./pages/Settings')).Settings }));
const InvitePage = lazy(async () => ({ default: (await import('./pages/InvitePage')).InvitePage }));

function RouteFallback() {
  return (
    <div className="min-h-screen flex items-center justify-center" aria-label="Loading page">
      <div className="w-10 h-10 border-2 border-accent-purple border-t-transparent rounded-full animate-spin" />
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ThemeProvider>
        <Suspense fallback={<RouteFallback />}>
          <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />

          {/* Public invite route — handles auth state internally */}
          <Route path="/invite/:inviteToken" element={<InvitePage />} />

          <Route element={<ProtectedRoute />}>
            <Route element={<AppLayout />}>
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/calendar" element={<Calendar />} />
              <Route path="/journal" element={<Journal />} />
              <Route path="/tasks" element={<Tasks />} />
              <Route path="/profile" element={<Profile />} />
              <Route path="/settings" element={<Settings />} />
            </Route>
          </Route>

          <Route path="/" element={<Navigate to="/login" replace />} />
          <Route path="*" element={<Navigate to="/login" replace />} />
          </Routes>
        </Suspense>
        </ThemeProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
