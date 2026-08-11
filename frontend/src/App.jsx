import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';

// Route Guards
import ProtectedRoute from './routes/ProtectedRoute';
import PublicRoute from './routes/PublicRoute';

// Pages
import Landing from './pages/Landing';
import Login from './pages/Login';
import Signup from './pages/Signup';
import Marketplace from './pages/Marketplace';
import SellItem from './pages/SellItem';
import MyListings from './pages/MyListings';
import ProductDetails from './pages/ProductDetails';
import Notifications from './pages/Notifications';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';

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
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password/:token" element={<ResetPassword />} />
        </Route>

        {/* Protected Routes (Only accessible if logged in) */}
        <Route element={<ProtectedRoute />}>
          <Route path="/home" element={<Marketplace />} />
          <Route path="/sell" element={<SellItem />} />
          <Route path="/my-listings" element={<MyListings />} />
          <Route path="/item/:id" element={<ProductDetails />} />
          <Route path="/notifications" element={<Notifications />} />
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
