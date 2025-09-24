// 🔧 src/context/AuthContext.jsx - VERSION AVEC GESTION DE LA BALANCE
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

  // 🆕 Fonction pour mettre à jour la balance après un pari
  const updateUserBalance = (newBalance) => {
    if (user) {
      setUser(prevUser => ({
        ...prevUser,
        balance: newBalance
      }));
    }
  };

  // 🆕 Fonction pour recharger le profil utilisateur
  const refreshUserProfile = async () => {
    try {
      const profileRes = await getUserProfile();
      setUser(profileRes.data);
      return profileRes.data;
    } catch (error) {
      console.error('❌ Erreur lors du rechargement du profil:', error);
      throw error;
    }
  };

  // 🆕 Fonction pour déduire un montant de la balance (optimiste)
  const deductBalance = (amount) => {
    if (user && user.balance >= amount) {
      setUser(prevUser => ({
        ...prevUser,
        balance: prevUser.balance - amount
      }));
      return true;
    }
    return false;
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
    isAuthenticated: !!user,
    login,
    register,
    logout,
    updateUserBalance,     // 🆕 Nouvelle fonction
    refreshUserProfile,    // 🆕 Nouvelle fonction
    deductBalance          // 🆕 Nouvelle fonction
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);