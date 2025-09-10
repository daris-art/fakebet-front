import React, { useEffect, useState, useMemo, useCallback } from "react";
import axios from "axios";
import { getBets } from "../services/api";
import { useAuth } from '../context/AuthContext'; // 👈 Importer


// 🎯 Composants utilitaires inspirés de BettingPage
const LoadingSkeleton = ({ count = 3 }) => (
  <div className="space-y-6">
    {Array.from({ length: count }, (_, i) => (
      <div key={i} className="animate-pulse">
        <div className="bg-gradient-to-r from-gray-800/30 to-gray-700/30 rounded-2xl p-6 backdrop-blur-sm">
          <div className="flex justify-between items-center mb-4">
            <div className="space-y-2 flex-1">
              <div className="h-4 bg-gray-600/50 rounded w-2/3"></div>
              <div className="h-3 bg-gray-700/50 rounded w-1/2"></div>
            </div>
            <div className="h-6 w-16 bg-gray-600/50 rounded-full"></div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="h-4 bg-gray-700/50 rounded w-full"></div>
            <div className="h-4 bg-gray-700/50 rounded w-full"></div>
            <div className="h-4 bg-gray-700/50 rounded w-full"></div>
            <div className="h-4 bg-gray-700/50 rounded w-full"></div>
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
    </div>
    <h3 className="text-3xl font-bold text-gray-300 mb-4">Aucun pari trouvé</h3>
    <p className="text-gray-400 text-lg text-center max-w-lg leading-relaxed mb-8">
      Il semble que vous n'avez pas encore placé de paris. Explorez les matchs disponibles pour commencer !
    </p>
    <a
      href="/betting" // Lien vers la page des paris
      className="px-6 py-3 bg-gradient-to-r from-red-600 to-red-500 text-white rounded-xl font-semibold hover:from-red-500 hover:to-red-400 transition-all duration-300 transform hover:scale-105 shadow-lg shadow-red-500/25"
    >
      Placer un pari
    </a>
  </div>
);

const ErrorState = ({ onRetry }) => (
  <div className="flex flex-col items-center justify-center py-24">
    <div className="w-32 h-32 bg-gradient-to-br from-red-900/20 to-red-800/20 rounded-full flex items-center justify-center backdrop-blur-sm mb-8">
      <svg className="w-16 h-16 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L3.314 16.5c-.77.833.192 2.5 1.732 2.5z" />
      </svg>
    </div>
    <h3 className="text-3xl font-bold text-gray-300 mb-4">Erreur de chargement</h3>
    <p className="text-gray-400 text-lg text-center max-w-lg leading-relaxed mb-8">Impossible de charger vos paris. Veuillez vérifier votre connexion et réessayer.</p>
    <button
      onClick={onRetry}
      className="px-6 py-3 bg-gradient-to-r from-red-600 to-red-500 text-white rounded-xl font-semibold hover:from-red-500 hover:to-red-400 transition-all duration-300 transform hover:scale-105 shadow-lg shadow-red-500/25"
    >
      Réessayer
    </button>
  </div>
);

const BetCard = React.memo(({ bet, fixture }) => {
  const getStatusClasses = (status) => {
    switch (status) {
      case "won": return "bg-green-500/20 text-green-400";
      case "lost": return "bg-red-500/20 text-red-400";
      case "cancelled": return "bg-gray-500/20 text-gray-400";
      default: return "bg-yellow-500/20 text-yellow-400";
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case "won": return "Gagné";
      case "lost": return "Perdu";
      case "cancelled": return "Annulé";
      default: return "En attente";
    }
  };
  
  const home = fixture?.home_team_name || "Équipe A";
  const away = fixture?.away_team_name || "Équipe B";

  return (
    <div className="relative group">
      {/* Effet de glow au hover */}
      <div className="absolute -inset-1 bg-gradient-to-r from-red-600/20 to-red-500/20 rounded-3xl blur-xl opacity-0 group-hover:opacity-100 transition-all duration-500"></div>
      <div className="relative bg-gradient-to-r from-gray-800/30 to-gray-700/30 rounded-2xl p-6 shadow-md border border-gray-800 backdrop-blur-sm transform transition-all duration-300 hover:scale-[1.02]">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-4">
          <div className="flex items-center gap-4">
            {fixture?.home_team_logo && (
              <img src={fixture.home_team_logo} alt={home} className="w-10 h-10 rounded-full object-cover border-2 border-white/10" />
            )}
            <div>
              <div className="text-xl font-bold text-gray-200">
                {home} vs {away}
              </div>
              <div className="text-sm text-gray-400 mt-1">
                {new Date(bet.bet_time).toLocaleString()}
              </div>
            </div>
          </div>
          <div className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusClasses(bet.status)}`}>
            {getStatusText(bet.status)}
          </div>
        </div>
        
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 text-sm text-gray-300 border-t border-gray-700/50 pt-4 mt-4">
          <div className="flex flex-col">
            <span className="font-semibold text-white">Montant misé</span>
            <span>{bet.bet_amount} €</span>
          </div>
          <div className="flex flex-col">
            <span className="font-semibold text-white">Cote au pari</span>
            <span>{bet.odds_at_bet ?? "—"}</span>
          </div>
          <div className="flex flex-col">
            <span className="font-semibold text-white">Gain potentiel</span>
            <span>{bet.potential_payout ?? "—"} €</span>
          </div>
          <div className="flex flex-col">
            <span className="font-semibold text-white">Votre choix</span>
            <span>{bet.selected_outcome}</span>
          </div>
        </div>
      </div>
    </div>
  );
});

// 🏠 Composant principal
const MyBetsPage = () => {
  const [bets, setBets] = useState([]);
  const [fixtures, setFixtures] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const { user } = useAuth(); // ✨ On récupère l'utilisateur du contexte

  const fetchBets = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const betsRes = await getBets(); 
      const betsData = betsRes.data;
      
      const fixtureIds = [...new Set(betsData.map(bet => bet.fixture_id))];
      const fixtureMap = {};

      await Promise.all(
        fixtureIds.map(async (id) => {
          try {
            const fixtureRes = await axios.get(`/api/fixtures/${id}`);
            fixtureMap[id] = fixtureRes.data;
          } catch (err) {
            console.error(`Erreur chargement fixture ${id}:`, err);
          }
        })
      );

      setFixtures(fixtureMap);
      setBets(betsData);
    } catch (err) {
      console.error("Erreur de chargement des paris:", err);
      setError("Impossible de charger vos paris.");
    } finally {
      setIsLoading(false);
    }
  });

  useEffect(() => {
    if (user) { // On ne charge les paris que si l'utilisateur est connecté
      fetchBets();
    }
  }, [user, fetchBets]);

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#0a0a0a] via-[#121212] to-[#1a1a1a] text-white flex items-center justify-center">
        <ErrorState onRetry={fetchBets} />
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
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-2m-4-4l4 4m-4-4l-4 4m-4-4l4-4m-4 4l-4-4" />
                </svg>
              </div>
              <h1 className="text-4xl md:text-6xl font-black tracking-tight bg-gradient-to-r from-white to-red-100 bg-clip-text text-transparent">
                Mes Paris
              </h1>
            </div>
            <p className="text-red-100/80 text-lg md:text-xl font-medium max-w-2xl mx-auto leading-relaxed">
              Consultez l'historique de vos paris, suivez leur statut et gérez vos mises
            </p>
          </div>
        </div>
      </header>

      {/* 📊 Contenu principal */}
      <main className="max-w-5xl mx-auto px-6 py-12">
        {isLoading ? (
          <LoadingSkeleton />
        ) : bets.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="space-y-8">
            {bets.map((bet) => (
              <BetCard
                key={bet.id}
                bet={bet}
                fixture={fixtures[bet.fixture_id]}
              />
            ))}
          </div>
        )}
      </main>
      
      {/* Styles CSS intégrés pour la cohérence */}
      <style jsx>{`
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
      `}</style>
    </div>
  );
};

export default MyBetsPage;
