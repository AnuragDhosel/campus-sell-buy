import React, { useContext } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';

// Context
import { AuthContext } from './context/AuthContext';

// Route Guards
import ProtectedRoute from './routes/ProtectedRoute';
import PublicRoute from './routes/PublicRoute';

// Pages
import Landing from './pages/Landing';
import Login from './pages/Login';
import Signup from './pages/Signup';

// Temporary Home Component (will be replaced in Day 7)
const HomePlaceholder = () => {
  const { user, logout } = useContext(AuthContext);
  return (
    <div className="min-h-screen flex flex-col items-center justify-center">
      <h1 className="text-4xl font-bold mb-4 text-[#2F6B4F]">Welcome to Campus Marketplace!</h1>
      <p className="text-lg text-[#64748B] mb-6">Logged in as: <span className="font-semibold text-[#1E293B]">{user?.email || 'Student'}</span></p>
      <button 
        onClick={logout}
        className="saas-button-accent"
      >
        Logout
      </button>
    </div>
  );
};

function App() {
  return (
    <BrowserRouter>
      {/* Toast Notifications Provider */}
      <Toaster 
        position="top-right"
        toastOptions={{
          className: 'bg-white text-[#1E293B] border border-[#E2E8F0] shadow-sm',
          success: {
            iconTheme: {
              primary: '#84A98C',
              secondary: 'white',
            },
          },
          error: {
            iconTheme: {
              primary: '#D97757',
              secondary: 'white',
            },
          },
        }}
      />

      <Routes>
        {/* Public Routes (Only accessible if NOT logged in) */}
        <Route element={<PublicRoute />}>
          <Route path="/landing" element={<Landing />} />
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
        </Route>

        {/* Protected Routes (Only accessible if logged in) */}
        <Route element={<ProtectedRoute />}>
          <Route path="/home" element={<HomePlaceholder />} />
          {/* Future protected routes will go here */}
        </Route>

        {/* Redirect root to /landing by default. 
            If logged in, PublicRoute will automatically redirect /landing to /home. 
            If not logged in, they stay on /landing. */}
        <Route path="/" element={<Navigate to="/landing" replace />} />
        
        {/* 404 Catch All */}
        <Route path="*" element={<Navigate to="/landing" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
