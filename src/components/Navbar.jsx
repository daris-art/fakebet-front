import React from 'react';
import { NavLink, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const Navbar = () => {
  const { isAuthenticated, user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login'); // Redirige vers la page de connexion après la déconnexion
  };

  // Style pour les liens de navigation actifs
  const activeLinkStyle = {
    background: 'linear-gradient(to right, rgba(239, 68, 68, 0.2), rgba(220, 38, 38, 0.2))',
    color: '#F87171', // red-400
    boxShadow: 'inset 0 2px 4px 0 rgba(0, 0, 0, 0.05)',
  };

  return (
    <header className="sticky top-0 z-50 bg-[#121212]/80 backdrop-blur-lg border-b border-gray-800/50">
      <nav className="max-w-7xl mx-auto px-6">
        <div className="flex items-center justify-between h-20">
          
          {/* Logo et liens principaux */}
          <div className="flex items-center space-x-8">
            <Link to="/" className="flex-shrink-0 flex items-center space-x-2">
              <span className="text-2xl font-bold bg-gradient-to-r from-red-500 to-red-400 bg-clip-text text-transparent">
                BetSphere
              </span>
            </Link>
            
            <div className="hidden md:flex items-center space-x-4">
               <NavLink
                to="/"
                className="px-4 py-2 text-sm font-medium text-gray-300 hover:text-white rounded-lg transition-colors"
                style={({ isActive }) => isActive ? activeLinkStyle : undefined}
              >
                Paris Sportifs
              </NavLink>
              {isAuthenticated && (
                <NavLink
                  to="/my-bets"
                  className="px-4 py-2 text-sm font-medium text-gray-300 hover:text-white rounded-lg transition-colors"
                  style={({ isActive }) => isActive ? activeLinkStyle : undefined}
                >
                  Mes Paris
                </NavLink>
              )}
            </div>
          </div>

          {/* Section Authentification */}
          <div className="flex items-center space-x-4">
            {isAuthenticated ? (
              <>
                <span className="hidden sm:block text-sm text-gray-400">
                  Bienvenue, <strong className="font-medium text-white">{user?.username}</strong>
                </span>
                <button
                  onClick={handleLogout}
                  className="px-4 py-2 text-sm font-semibold bg-gray-700/50 text-white rounded-lg hover:bg-gray-600/50 transition-all transform hover:scale-105"
                >
                  Déconnexion
                </button>
              </>
            ) : (
              <>
                <Link
                  to="/login"
                  className="px-4 py-2 text-sm font-semibold text-gray-300 hover:text-white transition-colors"
                >
                  Connexion
                </Link>
                <Link
                  to="/register"
                  className="px-4 py-2 text-sm font-semibold text-white bg-gradient-to-r from-red-600 to-red-500 rounded-lg hover:from-red-500 hover:to-red-400 transition-all transform hover:scale-105 shadow-lg shadow-red-500/20"
                >
                  Inscription
                </Link>
              </>
            )}
          </div>
        </div>
      </nav>
    </header>
  );
};

export default Navbar;