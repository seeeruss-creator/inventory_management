import React, { createContext, useContext, useMemo, useState } from 'react';
import { api } from '../api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('user');
    return saved ? JSON.parse(saved) : null;
  });

  const login = (payload) => {
    setUser(payload);
    localStorage.setItem('user', JSON.stringify(payload));
  };

  const logout = async () => {
    try {
      if (user) await api.post('/logout');
    } catch (e) {
      // Ignore network errors on logout
    }
    setUser(null);
    localStorage.removeItem('user');
  };

  const value = useMemo(() => ({ user, login, logout }), [user]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => useContext(AuthContext);
