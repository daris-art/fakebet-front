import React, { useEffect, useState, useCallback } from "react";
import { Link } from "react-router-dom";
import { getBets } from "../services/api";
import { useAuth } from '../context/AuthContext';

// 🎯 Composants utilitaires
const LoadingSkeleton = ({ count = 3 }) => (
  <div className="space-y-6">
    {Array.from({ length: count }, (_, i) => (
      <div key={i} className="animate-pulse">
        <div className="bg-gradient-to-r from-gray-800/30 to-gray-700/30 rounded-2xl p-6 backdrop-blur-sm border border-gray-700/50">
          <div className="flex justify-between items-center mb-4">
            <div className="space-y-2 flex-1">
              <div className="h-5 bg-gray-600/50 rounded w-2/3"></div>
              <div className="h-4 bg-gray-700/50 rounded w-1/2"></div>
            </div>
            <div className="h-7 w-20 bg-gray-600/50 rounded-full"></div>
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 pt-4 border-t border-gray-700/50">
            <div className="space-y-2">
              <div className="h-4 bg-gray-700/50 rounded w-full"></div>
              <div className="h-3 bg-gray-600/50 rounded w-2/3"></div>
            </div>
            <div className="space-y-2">
              <div className="h-4 bg-gray-700/50 rounded w-full"></div>
              <div className="h-3 bg-gray-600/50 rounded w-2/3"></div>
            </div>
            <div className="space-y-2">
              <div className="h-4 bg-gray-700/50 rounded w-full"></div>
              <div className="h-3 bg-gray-600/50 rounded w-2/3"></div>
            </div>
            <div className="space-y-2">
              <div className="h-4 bg-gray-700/50 rounded w-full"></div>
              <div className="h-3 bg-gray-600/50 rounded w-2/3"></div>
            </div>
          </div>
        </div>
      </div>
    ))}
  </div>
);

const EmptyState = () => (
  <div className="flex flex-col items-center justify-center py-24">
    <div className="relative mb-8">
      <div className="w-32 h-32 bg-gradient-to-br from-red-900/20 to-red-800/20 rounded-full flex items-center justify-center backdrop-blur-sm">
        <svg className="w-16 h-16 text-red-400/60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
        </svg>
      </div>
      <div className="absolute inset-0 bg-gradient-to-br from-red-500/10 to-red-600/10 rounded-full animate-pulse"></div>
    </div>
    
    <h3 className="text-3xl font-bold text-gray-300 mb-4">Aucun pari trouvé</h3>
    <p className="text-gray-400 text-lg text-center max-w-lg leading-relaxed mb-8">
      Il semble que vous n'avez pas encore placé de paris. Explorez les matchs disponibles pour commencer !
    </p>
    
    <Link
      to="/"
      className="px-6 py-3 bg-gradient-to-r from-red-600 to-red-500 text-white rounded-xl font-semibold hover:from-red-500 hover:to-red-400 transition-all duration-300 transform hover:scale-105 shadow-lg shadow-red-500/25"
    >
      🎯 Découvrir les matchs
    </Link>
  </div>
);

const ErrorState = ({ error, onRetry }) => (
  <div className="flex flex-col items-center justify-center py-24">
    <div className="w-32 h-32 bg-gradient-to-br from-red-900/20 to-red-800/20 rounded-full flex items-center justify-center backdrop-blur-sm mb-8">
      <svg className="w-16 h-16 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L3.314 16.5c-.77.833.192 2.5 1.732 2.5z" />
      </svg>
    </div>
    <h3 className="text-3xl font-bold text-gray-300 mb-4">Erreur de chargement</h3>
    <p className="text-gray-400 text-lg text-center max-w-lg leading-relaxed mb-4">
      {error || "Impossible de charger vos paris. Veuillez vérifier votre connexion."}
    </p>
    <button
      onClick={onRetry}
      className="px-6 py-3 bg-gradient-to-r from-red-600 to-red-500 text-white rounded-xl font-semibold hover:from-red-500 hover:to-red-400 transition-all duration-300 transform hover:scale-105 shadow-lg shadow-red-500/25"
    >
      🔄 Réessayer
    </button>
  </div>
);

const BetCard = ({ bet, index }) => {
  const getStatusInfo = (status) => {
    switch (status?.toLowerCase()) {
      case "won":
      case "gagne":
        return {
          classes: "bg-green-500/20 text-green-400 border-green-500/30",
          text: "✅ Gagné",
          icon: "🏆"
        };
      case "lost":
      case "perdu":
        return {
          classes: "bg-red-500/20 text-red-400 border-red-500/30",
          text: "❌ Perdu",
          icon: "💔"
        };
      case "cancelled":
      case "annule":
        return {
          classes: "bg-gray-500/20 text-gray-400 border-gray-500/30",
          text: "🚫 Annulé",
          icon: "⏸️"
        };
      case "pending":
      case "en_attente":
      default:
        return {
          classes: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
          text: "⏳ En attente",
          icon: "⏱️"
        };
    }
  };

  const getOutcomeText = (outcome) => {
    switch (outcome) {
      case "home_win": return "Victoire domicile";
      case "away_win": return "Victoire extérieur"; 
      case "draw": return "Match nul";
      default: return outcome;
    }
  };

  const formatDate = (dateString) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleString('fr-FR', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return "Date inconnue";
    }
  };

  const statusInfo = getStatusInfo(bet.status);

  return (
    <div 
      className="relative group opacity-0 animate-fade-in-up"
      style={{
        animationDelay: `${index * 100}ms`,
        animationFillMode: 'forwards'
      }}
    >
      {/* Effet de glow au hover */}
      <div className="absolute -inset-1 bg-gradient-to-r from-red-600/20 to-red-500/20 rounded-3xl blur-xl opacity-0 group-hover:opacity-100 transition-all duration-500"></div>
      
      <div className="relative bg-gradient-to-r from-[#1a1a1a] to-[#1f1f1f] rounded-2xl p-6 shadow-xl border border-gray-700/50 backdrop-blur-sm transform transition-all duration-300 hover:scale-[1.02]">
        
        {/* Header avec statut */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
          <div>
            <h3 className="text-xl font-bold text-white mb-2">
              Pari #{bet.id}
            </h3>
            <div className="flex items-center gap-2 text-sm text-gray-400">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {formatDate(bet.bet_time)}
            </div>
          </div>
          
          <div className={`px-4 py-2 rounded-full text-sm font-semibold border ${statusInfo.classes}`}>
            {statusInfo.text}
          </div>
        </div>

        {/* Détails du match */}
        <div className="mb-6 p-4 bg-gray-800/30 rounded-xl border border-gray-700/30">
          <div className="text-lg font-semibold text-gray-200 mb-2">
            Match #{bet.fixture_id}
          </div>
          <div className="text-red-400 font-medium">
            Choix : {getOutcomeText(bet.selected_outcome)}
          </div>
        </div>

        {/* Statistiques du pari */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 text-sm border-t border-gray-700/50 pt-4">
          <div className="flex flex-col items-center p-3 bg-gray-800/30 rounded-lg">
            <div className="text-xs text-gray-400 mb-1">💰 Montant misé</div>
            <div className="text-lg font-bold text-white">{bet.bet_amount}€</div>
          </div>
          
          <div className="flex flex-col items-center p-3 bg-gray-800/30 rounded-lg">
            <div className="text-xs text-gray-400 mb-1">📊 Cote</div>
            <div className="text-lg font-bold text-blue-400">
              {bet.odds_at_bet ? parseFloat(bet.odds_at_bet).toFixed(2) : "N/A"}
            </div>
          </div>
          
          <div className="flex flex-col items-center p-3 bg-gray-800/30 rounded-lg">
            <div className="text-xs text-gray-400 mb-1">🎯 Gain potentiel</div>
            <div className="text-lg font-bold text-green-400">
              {bet.potential_payout ? parseFloat(bet.potential_payout).toFixed(2) : "N/A"}€
            </div>
          </div>
          
          <div className="flex flex-col items-center p-3 bg-gray-800/30 rounded-lg">
            <div className="text-xs text-gray-400 mb-1">{statusInfo.icon} Statut</div>
            <div className="text-sm font-semibold text-center">
              {statusInfo.text.replace(/[✅❌🚫⏳]/g, '').trim()}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// 🏠 Composant principal
const MyBetsPage = () => {
  const [bets, setBets] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const { user, isAuthenticated } = useAuth();

  const fetchBets = useCallback(async () => {
    if (!isAuthenticated || !user) {
      console.log("⚠️ Utilisateur non authentifié, pas de chargement des paris");
      return;
    }

    console.log("🔍 Chargement des paris pour l'utilisateur:", user.id);
    setIsLoading(true);
    setError(null);

    try {
      const response = await getBets();
      console.log("✅ Paris récupérés:", response.data);
      setBets(response.data || []);
    } catch (err) {
      console.error("❌ Erreur chargement des paris:", err);
      
      let errorMessage = "Impossible de charger vos paris.";
      if (err.response?.status === 401) {
        errorMessage = "Session expirée. Veuillez vous reconnecter.";
      } else if (err.response?.status === 500) {
        errorMessage = "Erreur serveur. Réessayez plus tard.";
      } else if (err.message) {
        errorMessage = err.message;
      }
      
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated, user]);

  // Chargement initial
  useEffect(() => {
    fetchBets();
  }, [fetchBets]);

  // États de chargement et d'erreur
  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#0a0a0a] via-[#121212] to-[#1a1a1a] text-white flex items-center justify-center">
        <ErrorState error={error} onRetry={fetchBets} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0a0a0a] via-[#121212] to-[#1a1a1a] text-white">
      {/* 🎯 Header Premium */}
      <header className="relative bg-gradient-to-r from-red-800 via-red-700 to-red-600 shadow-2xl">
        <div className="absolute inset-0 bg-black/20"></div>
        <div className="relative max-w-7xl mx-auto px-6 py-12">
          <div className="text-center">
            <div className="inline-flex items-center gap-3 mb-6">
              <div className="w-12 h-12 bg-white/10 rounded-full flex items-center justify-center backdrop-blur-sm">
                <svg className="w-6 h-6 text-red-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2H9z" />
                </svg>
              </div>
              <h1 className="text-4xl md:text-6xl font-black tracking-tight bg-gradient-to-r from-white to-red-100 bg-clip-text text-transparent">
                Mes Paris
              </h1>
            </div>
            <p className="text-red-100/80 text-lg md:text-xl font-medium max-w-2xl mx-auto leading-relaxed">
              Consultez l'historique de vos paris, suivez leur statut et gérez vos mises
            </p>
            
            {/* Stats rapides */}
            <div className="flex justify-center gap-8 mt-8">
              <div className="text-center">
                <div className="text-2xl font-bold text-white">{bets.length}</div>
                <div className="text-sm text-red-200/70">Paris total</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-yellow-400">
                  {bets.filter(bet => bet.status === 'pending').length}
                </div>
                <div className="text-sm text-red-200/70">En attente</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-400">
                  {bets.filter(bet => bet.status === 'won').length}
                </div>
                <div className="text-sm text-red-200/70">Gagnés</div>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* 📊 Contenu principal */}
      <main className="max-w-5xl mx-auto px-6 py-12">
        {isLoading ? (
          <LoadingSkeleton count={4} />
        ) : bets.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="space-y-8">
            <div className="flex justify-between items-center mb-8">
              <h2 className="text-2xl font-bold text-white">
                Historique des paris ({bets.length})
              </h2>
              <button
                onClick={fetchBets}
                disabled={isLoading}
                className="px-4 py-2 bg-gray-700/50 hover:bg-gray-600/50 text-gray-300 rounded-lg transition-all duration-200 flex items-center gap-2 disabled:opacity-50"
              >
                <svg className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Actualiser
              </button>
            </div>
            
            {bets.map((bet, index) => (
              <BetCard key={bet.id} bet={bet} index={index} />
            ))}
          </div>
        )}
      </main>
      
      {/* Styles CSS intégrés */}
      <style jsx>{`
        @keyframes fade-in-up {
          0% {
            opacity: 0;
            transform: translateY(30px);
          }
          100% {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        .animate-fade-in-up {
          animation: fade-in-up 0.6s ease-out;
        }
        
        .backdrop-blur-sm {
          backdrop-filter: blur(4px);
        }
        
        .backdrop-blur-xl {
          backdrop-filter: blur(24px);
        }
        
        .animate-pulse {
          animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
        }
        
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
        
        .transform {
          transform: translateZ(0);
        }
        
        /* Scrollbar personnalisée */
        ::-webkit-scrollbar {
          width: 6px;
        }
        
        ::-webkit-scrollbar-track {
          background: transparent;
        }
        
        ::-webkit-scrollbar-thumb {
          background: linear-gradient(to bottom, rgba(239, 68, 68, 0.5), rgba(220, 38, 38, 0.5));
          border-radius: 10px;
        }
        
        ::-webkit-scrollbar-thumb:hover {
          background: linear-gradient(to bottom, rgba(239, 68, 68, 0.8), rgba(220, 38, 38, 0.8));
        }
      `}</style>
    </div>
  );
};

export default MyBetsPage;