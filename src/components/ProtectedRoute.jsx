// ProtectedRoute.jsx
import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext'; // Ajustez le chemin si nécessaire

const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, isLoading } = useAuth();
  const location = useLocation();

  // Si le contexte est toujours en train de vérifier l'authentification
  if (isLoading) {
    // Vous pouvez afficher un spinner ou un message de chargement ici
    return <div>Chargement de l'authentification...</div>;
  }

  // Si l'utilisateur n'est pas authentifié une fois le chargement terminé
  if (!isAuthenticated) {
    // Redirection vers la page de connexion
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Si l'utilisateur est authentifié, affichez la page demandée
  return children;
};

export default ProtectedRoute;