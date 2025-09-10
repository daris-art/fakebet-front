// 🔧 src/context/AuthContext.jsx - VERSION CORRIGÉE
import React, { createContext, useState, useEffect, useContext } from 'react';
import { loginUser, getUserProfile, registerUser } from '../services/api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const initAuth = async () => {
      // Récupérer le token depuis localStorage
      const storedToken = localStorage.getItem('token');
      
      if (storedToken) {
        try {
          setToken(storedToken);
          // Essayer de récupérer le profil utilisateur
          const profileRes = await getUserProfile();
          setUser(profileRes.data);
          console.log('✅ Utilisateur connecté:', profileRes.data);
        } catch (error) {
          console.error("❌ Session invalide, déconnexion.", error);
          // Token invalide, on nettoie
          setToken(null);
          setUser(null);
          localStorage.removeItem('token');
        }
      }
      
      setIsLoading(false);
    };

    initAuth();
  }, []);

  const login = async (username, password) => {
    try {
      const response = await loginUser({ username, password });
      const newToken = response.data.access_token;
      
      // Sauvegarder le token
      localStorage.setItem('token', newToken);
      setToken(newToken);
      
      // Récupérer le profil utilisateur après connexion
      try {
        const profileRes = await getUserProfile();
        setUser(profileRes.data);
        console.log('✅ Connexion réussie:', profileRes.data);
      } catch (profileError) {
        console.error('❌ Erreur récupération profil:', profileError);
        throw profileError;
      }
      
      return response;
    } catch (error) {
      console.error('❌ Erreur de connexion:', error);
      throw error;
    }
  };

  const register = async (username, email, password) => {
    try {
      const response = await registerUser({ username, email, password });
      console.log('✅ Inscription réussie:', response.data);
      return response;
    } catch (error) {
      console.error('❌ Erreur d\'inscription:', error);
      throw error;
    }
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('token');
    console.log('✅ Déconnexion réussie');
  };

  const value = {
    user,
    token,
    isLoading,
    isAuthenticated: !!user, // Important: basé sur l'existence de l'user
    login,
    register, // ✅ Ajout de la fonction register
    logout,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);

