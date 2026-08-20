import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { MainLayout } from '../components/layout/MainLayout';
import { Login } from '../pages/Login';
import { Dashboard } from '../pages/Dashboard';
import { Clients } from '../pages/Clients';
import { Schedule } from '../pages/Schedule';
import { Payments } from '../pages/Payments';
import { Balance } from '../pages/Balance';
import { Teachers } from '../pages/Teachers';
import { Salary } from '../pages/Salary';
import { System } from '../pages/System';

const ProtectedRoute: React.FC<{ children: React.ReactNode; allowedRoles?: string[] }> = ({
  children,
  allowedRoles,
}) => {
  const { user, token, isLoading, hasRole } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-stone-50 text-stone-500 text-xs">
        Загрузка данных сессии...
      </div>
    );
  }

  if (!token && !user) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && allowedRoles.length > 0 && !hasRole(allowedRoles)) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
};

export const AppRouter: React.FC = () => {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />

      <Route
        element={
          <ProtectedRoute>
            <MainLayout />
          </ProtectedRoute>
        }
      >
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="/dashboard" element={<Dashboard />} />

        {/* Manager & Admin */}
        <Route
          path="/clients"
          element={
            <ProtectedRoute allowedRoles={['manager', 'administrator']}>
              <Clients />
            </ProtectedRoute>
          }
        />

        {/* Manager, Admin, Teacher */}
        <Route
          path="/schedule"
          element={
            <ProtectedRoute allowedRoles={['manager', 'administrator', 'teacher']}>
              <Schedule />
            </ProtectedRoute>
          }
        />

        {/* Manager & Admin */}
        <Route
          path="/payments"
          element={
            <ProtectedRoute allowedRoles={['manager', 'administrator']}>
              <Payments />
            </ProtectedRoute>
          }
        />

        {/* Manager, Admin, Teacher */}
        <Route
          path="/balance"
          element={
            <ProtectedRoute allowedRoles={['manager', 'administrator', 'teacher']}>
              <Balance />
            </ProtectedRoute>
          }
        />

        {/* Manager, Admin, Teacher */}
        <Route
          path="/teachers"
          element={
            <ProtectedRoute allowedRoles={['manager', 'administrator', 'teacher']}>
              <Teachers />
            </ProtectedRoute>
          }
        />

        {/* Manager & Teacher */}
        <Route
          path="/salary"
          element={
            <ProtectedRoute allowedRoles={['manager', 'teacher']}>
              <Salary />
            </ProtectedRoute>
          }
        />

        {/* Manager only */}
        <Route
          path="/system"
          element={
            <ProtectedRoute allowedRoles={['manager']}>
              <System />
            </ProtectedRoute>
          }
        />
      </Route>

      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
};
