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

  // Formatage du solde avec 2 décimales
  const formatBalance = (balance) => {
    return parseFloat(balance || 0).toFixed(2);
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
                  to="/mes-paris"
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
                {/* Affichage du solde */}
                <div className="hidden sm:flex items-center space-x-3">
                  <div className="flex items-center bg-gradient-to-r from-green-600/20 to-green-500/20 px-3 py-2 rounded-lg border border-green-500/30">
                    <svg className="w-4 h-4 text-green-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                    </svg>
                    <span className="text-sm font-semibold text-green-400">
                      {formatBalance(user?.balance)} 🪙
                    </span>
                  </div>
                  
                  <div className="h-6 w-px bg-gray-600"></div>
                  
                  <span className="text-sm text-gray-400">
                    <strong className="font-medium text-white">{user?.username}</strong>
                  </span>
                </div>

                {/* Version mobile du solde et username */}
                <div className="flex sm:hidden items-center space-x-2">
                  <span className="text-xs font-semibold text-green-400">
                    {formatBalance(user?.balance)}€
                  </span>
                  <span className="text-xs text-white">
                    {user?.username}
                  </span>
                </div>

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