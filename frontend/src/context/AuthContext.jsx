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

  // Logout function
  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
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
