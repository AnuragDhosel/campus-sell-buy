import React, { useContext } from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';

const PublicRoute = () => {
  const { isAuthenticated, loading } = useContext(AuthContext);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F8FAFC]">
        <div className="w-12 h-12 border-4 border-[#2F6B4F] border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  // If already authenticated, do not let them access public routes (like login/signup/landing)
  if (isAuthenticated) {
    // Assuming home is the dashboard after login
    return <Navigate to="/home" replace />;
  }

  // Render the public route
  return <Outlet />;
};

export default PublicRoute;
