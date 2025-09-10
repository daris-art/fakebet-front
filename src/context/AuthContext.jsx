// AuthContext.jsx
import React, { createContext, useState, useEffect } from 'react';
import { loginUser, registerUser, getUserProfile } from '../services/api';
import { useContext } from "react";

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [isLoading, setIsLoading] = useState(true); // Initialisé à true

  useEffect(() => {
    const initAuth = async () => {
      // Si un token existe, on essaie de récupérer le profil
      if (token) {
        try {
          // On s'assure que le token est à jour
          localStorage.setItem('token', token);
          const profileRes = await getUserProfile();
          setUser(profileRes.data);
        } catch (error) {
          console.error("Session invalide, déconnexion.", error);
          setToken(null);
          localStorage.removeItem('token');
        }
      }
      setIsLoading(false); // Le chargement est terminé, que le token soit valide ou non
    };

    initAuth();
  }, [token]);

  const login = async (username, password) => {
    try {
      const response = await loginUser({ username, password });
      // Après un login réussi, mettez à jour le token
      setToken(response.data.access_token);
      return response;
    } catch (error) {
      throw error;
    }
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('token');
  };

  const value = {
    user,
    token,
    isLoading,
    isAuthenticated: !!user,
    login,
    logout,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);