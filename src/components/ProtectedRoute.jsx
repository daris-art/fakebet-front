// 🔧 src/components/ProtectedRoute.jsx - VERSION CORRIGÉE
import React from 'react';
import { Navigate, useLocation, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const ProtectedRoute = () => {
  const { isAuthenticated, isLoading } = useAuth();
  const location = useLocation();

  console.log('🔍 ProtectedRoute - Auth:', { isAuthenticated, isLoading });

  // Afficher un loader pendant la vérification
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#0a0a0a] via-[#121212] to-[#1a1a1a] flex items-center justify-center">
        <div className="text-white text-center">
          <div className="animate-spin w-12 h-12 border-4 border-red-500 border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-lg">Vérification de l'authentification...</p>
        </div>
      </div>
    );
  }

  // Si pas authentifié, rediriger vers login
  if (!isAuthenticated) {
    console.log('❌ Utilisateur non authentifié, redirection vers /login');
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  console.log('✅ Utilisateur authentifié, accès autorisé');
  // Si authentifié, afficher la page demandée
  return <Outlet />;
};

export default ProtectedRoute;