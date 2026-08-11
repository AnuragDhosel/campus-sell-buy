/**
 * @file context/AuthContext.jsx
 * @description React Context for Bearer JWT authentication.
 *
 * Architecture:
 *   - JWT is stored in localStorage under the key 'token'.
 *   - On every API request, api.js interceptor reads localStorage
 *     and attaches: Authorization: Bearer <token>.
 *   - On app load, initializeAuth() reads localStorage and restores state.
 *   - logout() removes the token from localStorage and clears React state.
 *     The calling component (Navbar) is responsible for:
 *       1. Calling the backend POST /api/auth/logout  (API acknowledgment).
 *       2. Calling context logout()                   (local cleanup).
 *       3. Calling navigate('/login')                 (redirect).
 *
 * This context does NOT:
 *   - Use HTTP-only cookies.
 *   - Use server-side sessions.
 *   - Use refresh tokens.
 *   - Handle navigation (no useNavigate — context is outside the Router).
 */

import React, { createContext, useState, useEffect } from 'react';

// Create the Context
export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);

  // Helper to decode JWT without external library
  const decodeToken = (jwtToken) => {
    try {
      const base64Url = jwtToken.split('.')[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const jsonPayload = decodeURIComponent(
        atob(base64)
          .split('')
          .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
          .join('')
      );
      return JSON.parse(jsonPayload);
    } catch (error) {
      console.error('Error decoding token:', error);
      return null;
    }
  };

  // Initialize Auth state from localStorage
  useEffect(() => {
    const initializeAuth = () => {
      const storedToken = localStorage.getItem('token');
      const storedUserStr = localStorage.getItem('user');

      if (storedToken) {
        // We also check if the token is valid/not expired by decoding it
        const decoded = decodeToken(storedToken);
        if (decoded && decoded.exp * 1000 > Date.now()) {
          setToken(storedToken);
          setIsAuthenticated(true);
          
          if (storedUserStr) {
            try {
              setUser(JSON.parse(storedUserStr));
            } catch (e) {
              // Fallback to decoded payload if user string is corrupted
              setUser({ id: decoded.id, role: decoded.role });
            }
          } else {
             setUser({ id: decoded.id, role: decoded.role });
          }
        } else {
          // Token expired or invalid
          logout();
        }
      }
      setLoading(false);
    };

    initializeAuth();
  }, []);

  // Login function
  const login = (newToken, userData) => {
    localStorage.setItem('token', newToken);
    if(userData) {
      localStorage.setItem('user', JSON.stringify(userData));
      setUser(userData);
    } else {
      // Decode from token if userData isn't explicitly passed
      const decoded = decodeToken(newToken);
      if(decoded) {
        const userObj = { id: decoded.id, role: decoded.role };
        setUser(userObj);
        localStorage.setItem('user', JSON.stringify(userObj));
      }
    }
    
    setToken(newToken);
    setIsAuthenticated(true);
  };

  // ── Logout ─────────────────────────────────────────────────────────────────
  // This function performs the CLIENT-SIDE portion of logout:
  //   1. localStorage.removeItem('token') — removes the JWT from the browser.
  //   2. localStorage.removeItem('user')  — removes cached user data.
  //   3. Clears all React state (token, user, isAuthenticated).
  //
  // IMPORTANT: This function does NOT:
  //   - Call the backend logout endpoint (the calling component does that).
  //   - Navigate the user (the calling component does that via useNavigate).
  //
  // Why is localStorage.removeItem('token') here and not elsewhere?
  //   localStorage is a browser API. The backend has no access to it.
  //   Token removal MUST happen on the frontend. This is the correct place.
  //
  // Why not navigate here?
  //   AuthContext wraps the entire <App />, which lives inside <BrowserRouter>.
  //   useNavigate() can only be called inside a component that is a CHILD of
  //   <BrowserRouter>. Since AuthProvider wraps the app, it cannot use
  //   useNavigate. Navigation is delegated to Navbar (which is inside the Router).
  const logout = () => {
    localStorage.removeItem('token'); // ← JWT removed from browser storage here
    localStorage.removeItem('user');  // ← Cached user data cleared here
    setToken(null);
    setUser(null);
    setIsAuthenticated(false);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated,
        loading,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
