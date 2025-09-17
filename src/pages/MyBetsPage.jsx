import React, { useEffect, useState, useCallback, useMemo } from "react";
import { Link } from "react-router-dom";
import { getBets } from "../services/api";
import { useAuth } from '../context/AuthContext';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

// 🎯 Helper Components
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
            {Array.from({ length: 4 }, (_, j) => (
              <div key={j} className="space-y-2">
                <div className="h-4 bg-gray-700/50 rounded w-full"></div>
                <div className="h-3 bg-gray-600/50 rounded w-2/3"></div>
              </div>
            ))}
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
      Il semble que vous n'ayez pas encore placé de paris. Explorez les matchs disponibles pour commencer !
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

// ----------------- Améliorations UX -----------------
// Ajout du composant pour afficher le score final si disponible
const FinalScoreDisplay = ({ score }) => {
  if (!score || score.toLowerCase().includes('n/a')) {
    return <span className="text-sm font-semibold text-gray-400">Score non disponible</span>;
  }

  const [homeScore, awayScore] = score.split('-').map(Number);
  
  return (
    <div className="flex items-center gap-2 text-white">
      <span className="text-lg font-bold">{homeScore}</span>
      <span className="text-gray-400 mx-1">-</span>
      <span className="text-lg font-bold">{awayScore}</span>
    </div>
  );
};

// Logique pour déterminer si le pari est gagnant ou perdant
const getOutcomeResult = (bet, fixture) => {
  if (bet.status !== 'won' && bet.status !== 'lost') return 'pending';
  if (!fixture || !fixture.final_score) return 'pending';

  const [homeScore, awayScore] = fixture.final_score.split('-').map(Number);
  
  if (isNaN(homeScore) || isNaN(awayScore)) return 'pending';

  let winningOutcome;
  if (homeScore > awayScore) {
    winningOutcome = 'home_win';
  } else if (awayScore > homeScore) {
    winningOutcome = 'away_win';
  } else {
    winningOutcome = 'draw';
  }

  return bet.selected_outcome === winningOutcome ? 'won' : 'lost';
};

const BetCard = React.memo(({ bet, index }) => {
  const getStatusInfo = (status) => {
    switch (status?.toLowerCase()) {
      case "won":
        return {
          classes: "bg-green-500/20 text-green-400 border-green-500/30",
          text: "✅ Gagné",
          icon: "🏆"
        };
      case "lost":
        return {
          classes: "bg-red-500/20 text-red-400 border-red-500/30",
          text: "❌ Perdu",
          icon: "💔"
        };
      case "cancelled":
        return {
          classes: "bg-gray-500/20 text-gray-400 border-gray-500/30",
          text: "🚫 Annulé",
          icon: "⏸️"
        };
      case "pending":
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
      case "home_win": return "Victoire Domicile";
      case "away_win": return "Victoire Extérieur"; 
      case "draw": return "Match Nul";
      default: return outcome || "Non spécifié";
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return "Date inconnue";
    try {
      const date = new Date(dateString);
      return format(date, 'dd MMM yyyy à HH:mm', { locale: fr });
    } catch {
      return "Date inconnue";
    }
  };

  const formatCurrency = (amount) => {
    if (amount === null || amount === undefined || isNaN(amount)) {
      return "N/A";
    }
    return parseFloat(amount).toFixed(2);
  };
  
  const safeBet = bet;
  const statusInfo = getStatusInfo(safeBet.status);

  // Vérifier si le match est terminé pour afficher le score final
  const isCompleted = safeBet.status?.toLowerCase() !== 'pending' && safeBet.status?.toLowerCase() !== 'cancelled';

  return (
    <div 
      className="relative group opacity-0 animate-fade-in-up"
      style={{
        animationDelay: `${index * 100}ms`,
        animationFillMode: 'forwards'
      }}
    >
      {/* Effet de glow au hover */}
      <div className="absolute -inset-1 bg-gradient-to-r from-indigo-600/20 to-purple-500/20 rounded-3xl blur-xl opacity-0 group-hover:opacity-100 transition-all duration-500"></div>
      
      <div className="relative bg-gradient-to-r from-[#1a1a1a] to-[#1f1f1f] rounded-2xl p-6 shadow-xl border border-gray-700/60 backdrop-blur-sm transform transition-all duration-300 hover:scale-[1.02]">
        
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
          <div>
            <h3 className="text-xl font-bold text-white mb-2">
              Pari #{safeBet.id}
            </h3>
            <div className="flex items-center gap-2 text-sm text-gray-400">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {formatDate(safeBet.bet_time)}
            </div>
          </div>
          
          <div className={`px-4 py-2 rounded-full text-sm font-semibold border ${statusInfo.classes}`}>
            {statusInfo.text}
          </div>
        </div>

        {/* Détails du match */}
        <div className="mb-6 p-4 bg-[#222836] rounded-xl border border-gray-700/50">
          <div className="flex justify-between items-center mb-2">
            <div className="text-lg font-semibold text-gray-200">
              {safeBet.fixture.home_team_name} vs {safeBet.fixture.away_team_name}
            </div>
            {isCompleted && <FinalScoreDisplay score={safeBet.fixture.final_score} />}
          </div>
          
          <div className="text-sm text-gray-400 mb-2">
            Match du {formatDate(safeBet.fixture.date)}
          </div>
          <div className="text-indigo-400 font-medium">
            Choix : {getOutcomeText(safeBet.selected_outcome)}
          </div>
        </div>

        {/* Statistiques */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 text-sm border-t border-gray-700/50 pt-4">
          <div className="flex flex-col items-center p-3 bg-[#252525] rounded-lg">
            <div className="text-xs text-gray-400 mb-1">💰 Montant misé</div>
            <div className="text-lg font-bold text-white">{formatCurrency(safeBet.bet_amount)}€</div>
          </div>
          
          <div className="flex flex-col items-center p-3 bg-[#2a2f3d] rounded-lg">
            <div className="text-xs text-gray-400 mb-1">📊 Cote</div>
            <div className="text-lg font-bold text-blue-400">
              {formatCurrency(safeBet.odds_at_bet)}
            </div>
          </div>
          
          <div className="flex flex-col items-center p-3 bg-[#26322f] rounded-lg">
            <div className="text-xs text-gray-400 mb-1">🎯 Gain potentiel</div>
            <div className="text-lg font-bold text-green-400">
              {formatCurrency(safeBet.potential_payout)}€
            </div>
          </div>
          
          <div className="flex flex-col items-center p-3 bg-[#322b2b] rounded-lg">
            <div className="text-xs text-gray-400 mb-1">{statusInfo.icon} Statut</div>
            <div className="text-sm font-semibold text-center">
              {statusInfo.text.replace(/[✅❌🚫⏳]/g, '').trim()}
            </div>
          </div>
        </div>
      </div>
    </div>

  );
});

// 🏠 Composant principal
const MyBetsPage = () => {
  const [bets, setBets] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const { isAuthenticated, isLoading: authLoading } = useAuth();

  const fetchBets = useCallback(async () => {
    if (!isAuthenticated) {
      console.log("⚠️ Utilisateur non authentifié, pas de chargement des paris");
      return;
    }

    console.log("🔍 Chargement des paris pour l'utilisateur...");
    setIsLoading(true);
    setError(null);

    try {
      const response = await getBets();
      console.log("✅ Paris récupérés:", response.data);
      
      const betsData = Array.isArray(response.data) ? response.data : [];
      setBets(betsData);
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
  }, [isAuthenticated]);

  useEffect(() => {
    if (!authLoading) {
      fetchBets();
    }
  }, [fetchBets, authLoading]);

  // Utilisation de useMemo pour optimiser le calcul des statistiques
  const stats = useMemo(() => {
    const total = bets.length;
    const pending = bets.filter(bet => bet?.status?.toLowerCase() === 'pending' || !bet?.status).length;
    const won = bets.filter(bet => bet?.status?.toLowerCase() === 'won').length;
    
    return { total, pending, won };
  }, [bets]);

  if (authLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#0a0a0a] via-[#121212] to-[#1a1a1a] text-white flex items-center justify-center">
        <div className="text-white text-center">
          <div className="animate-spin w-12 h-12 border-4 border-red-500 border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-lg">Chargement de l'utilisateur...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0a0a0a] via-[#121212] to-[#1a1a1a] text-white">
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
            
            <div className="flex justify-center gap-8 mt-8">
              <div className="text-center">
                <div className="text-2xl font-bold text-white">{stats.total}</div>
                <div className="text-sm text-red-200/70">Paris total</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-yellow-400">{stats.pending}</div>
                <div className="text-sm text-red-200/70">En attente</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-400">{stats.won}</div>
                <div className="text-sm text-red-200/70">Gagnés</div>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-12">
        {isLoading ? (
          <LoadingSkeleton count={4} />
        ) : error ? (
          <ErrorState error={error} onRetry={fetchBets} />
        ) : bets.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="space-y-8">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
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
              <BetCard key={bet?.id || index} bet={bet} index={index} />
            ))}
          </div>
        )}
      </main>
      
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
        
        @media (max-width: 640px) {
          .animate-fade-in-up {
            animation-delay: 0ms !important;
          }
        }
      `}</style>
    </div>
  );
};

export default MyBetsPage;