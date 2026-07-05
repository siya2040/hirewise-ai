import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

/**
 * Route protection wrapper.
 * Ensures the user is logged in, and optionally checks role-based access.
 */
export const ProtectedRoute = ({ children, allowedRoles }) => {
  const { user, userRole, loading } = useAuth();
  const location = useLocation();

  // Show a premium dashboard shell loading skeleton while resolving session
  if (loading) {
    return (
      <div className="min-h-screen bg-dark-bg flex flex-col items-center justify-center space-y-4">
        <div className="relative w-16 h-16">
          <div className="absolute inset-0 rounded-full border-4 border-dark-border"></div>
          <div className="absolute inset-0 rounded-full border-4 border-brand-500 border-t-transparent animate-spin"></div>
        </div>
        <p className="text-dark-muted font-display text-sm tracking-wide animate-pulse">
          Verifying security keys...
        </p>
      </div>
    );
  }

  // Redirect to login if user session is absent
  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Redirect to correct dashboard area if role is not authorized for this route
  if (allowedRoles && !allowedRoles.includes(userRole)) {
    console.warn(`[ProtectedRoute Access Warning]: User role "${userRole}" is not authorized for this path.`);
    if (userRole === 'recruiter') {
      return <Navigate to="/recruiter/dashboard" replace />;
    } else {
      return <Navigate to="/portal/dashboard" replace />;
    }
  }

  return children;
};
export default ProtectedRoute;
