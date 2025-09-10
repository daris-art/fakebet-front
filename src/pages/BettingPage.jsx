import React, { useEffect, useState, useMemo, useCallback, useRef } from "react";
import { getFixtures, getLeagues } from "../services/api";
import MatchCard from "../components/MatchCard";
import { useAuth } from '../context/AuthContext'; // 👈 Importer

// 🎯 Constants
const SORT_OPTIONS = {
  DATE: "date",
  LEAGUE: "league",
  NAME: "name"
};

const ANIMATION_DELAYS = {
  CARD_BASE: 100,
  SIDEBAR_TRANSITION: 500
};

// 🔧 Custom Hooks
const useDataLoader = () => {
  const [fixtures, setFixtures] = useState([]);
  const [leagues, setLeagues] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const [fixturesRes, leaguesRes] = await Promise.all([
        getFixtures(),
        getLeagues()
      ]);
      
      setFixtures(fixturesRes.data || []);
      setLeagues(leaguesRes.data || []);
    } catch (error) {
      console.error("Erreur lors du chargement des données:", error);
      setError("Impossible de charger les données. Veuillez réessayer.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  return { fixtures, leagues, isLoading, error, refetch: loadData };
};

const useFilters = (fixtures) => {
  const [selectedLeagueId, setSelectedLeagueId] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState(SORT_OPTIONS.DATE);

  const filteredFixtures = useMemo(() => {
    return fixtures
      .filter((fixture) => {
        const leagueMatch = selectedLeagueId
          ? (fixture.league_id === selectedLeagueId || fixture.league?.id === selectedLeagueId)
          : true;

        const searchMatch = searchQuery
          ? [fixture.home_team_name, fixture.away_team_name]
              .some(name => name?.toLowerCase().includes(searchQuery.toLowerCase()))
          : true;

        return leagueMatch && searchMatch;
      })
      .sort((a, b) => {
        switch (sortBy) {
          case SORT_OPTIONS.DATE:
            return new Date(a.date) - new Date(b.date);
          case SORT_OPTIONS.LEAGUE:
            return (a.league?.name || "").localeCompare(b.league?.name || "");
          case SORT_OPTIONS.NAME:
            return (a.home_team_name || "").localeCompare(b.home_team_name || "");
          default:
            return 0;
        }
      });
  }, [fixtures, selectedLeagueId, searchQuery, sortBy]);

  const resetFilters = useCallback(() => {
    setSelectedLeagueId(null);
    setSearchQuery("");
    setSortBy(SORT_OPTIONS.DATE);
  }, []);

  return {
    selectedLeagueId,
    setSelectedLeagueId,
    searchQuery,
    setSearchQuery,
    sortBy,
    setSortBy,
    filteredFixtures,
    resetFilters,
    hasActiveFilters: selectedLeagueId || searchQuery
  };
};

const useStats = (fixtures, filteredFixtures) => {
  return useMemo(() => ({
    total: fixtures.length,
    filtered: filteredFixtures.length,
    live: fixtures.filter(f => f.status === "live").length,
    upcoming: fixtures.filter(f => new Date(f.date) > new Date()).length,
  }), [fixtures, filteredFixtures]);
};

// 🧩 Components
const LoadingSkeleton = ({ count = 4 }) => (
  <div className="space-y-4">
    {Array.from({ length: count }, (_, i) => (
      <div key={i} className="animate-pulse">
        <div className="bg-gradient-to-r from-gray-800/30 to-gray-700/30 rounded-2xl p-4 backdrop-blur-sm">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-gray-600/50 rounded-xl"></div>
            <div className="flex-1 space-y-2">
              <div className="h-4 bg-gray-600/50 rounded w-3/4"></div>
              <div className="h-3 bg-gray-700/50 rounded w-1/2"></div>
            </div>
          </div>
        </div>
      </div>
    ))}
  </div>
);

const LiveBadge = ({ count }) => {
  if (count === 0) return null;
  
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-green-500/20 text-green-400 rounded-full text-xs">
      <div className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse"></div>
      {count} live
    </span>
  );
};

const LeagueButton = ({ 
  league, 
  isSelected, 
  onClick, 
  matchCount, 
  liveCount,
  collapsed = false 
}) => {
  const baseClasses = "group w-full p-4 rounded-2xl font-semibold text-left transition-all duration-300 transform hover:scale-105";
  const selectedClasses = isSelected
    ? "bg-gradient-to-r from-red-600 to-red-500 text-white shadow-2xl shadow-red-500/25 ring-2 ring-red-400/50"
    : "bg-gradient-to-r from-gray-800/30 to-gray-700/30 text-gray-300 hover:from-gray-700/50 hover:to-gray-600/50 hover:text-white backdrop-blur-sm";

  const logoElement = league.logo ? (
    <img 
      src={league.logo} 
      alt={league.name}
      className={`${collapsed ? 'w-8 h-8' : 'w-12 h-12'} rounded-xl object-cover border-2 border-white/10`}
      loading="lazy"
    />
  ) : (
    <div className={`${collapsed ? 'w-8 h-8 text-xs' : 'w-12 h-12 text-sm'} bg-gradient-to-br from-red-500 to-red-600 rounded-xl flex items-center justify-center font-bold border-2 border-white/10`}>
      {league.name?.charAt(0) || '?'}
    </div>
  );

  if (collapsed) {
    return (
      <div className="group relative">
        <button
          onClick={onClick}
          className={`${baseClasses} ${selectedClasses} flex items-center justify-center relative`}
          aria-label={league.name}
        >
          {logoElement}
          {liveCount > 0 && (
            <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full border border-gray-900 animate-pulse"></div>
          )}
        </button>
        <div className="absolute left-full ml-3 px-3 py-2 bg-gray-900 text-white text-sm rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap z-50 pointer-events-none">
          {league.name} ({matchCount})
          {liveCount > 0 && <span className="text-green-400 ml-2">• {liveCount} live</span>}
        </div>
      </div>
    );
  }

  return (
    <button
      onClick={onClick}
      className={`${baseClasses} ${selectedClasses}`}
      aria-label={`${league.name} - ${matchCount} matchs`}
    >
      <div className="flex items-center gap-4">
        <div className="relative">
          {logoElement}
          {liveCount > 0 && (
            <div className="absolute -top-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-gray-900 animate-pulse"></div>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-bold truncate text-base">{league.name}</div>
          <div className="flex items-center gap-3 text-sm opacity-80 mt-1">
            <span>{matchCount} matchs</span>
            <LiveBadge count={liveCount} />
          </div>
        </div>
      </div>
    </button>
  );
};

const AllLeaguesButton = ({ 
  isSelected, 
  onClick, 
  totalMatches, 
  liveMatches, 
  collapsed = false 
}) => {
  const baseClasses = "group w-full p-4 rounded-2xl font-semibold text-left transition-all duration-300 transform hover:scale-105";
  const selectedClasses = isSelected
    ? "bg-gradient-to-r from-red-600 to-red-500 text-white shadow-2xl shadow-red-500/25 ring-2 ring-red-400/50"
    : "bg-gradient-to-r from-gray-800/50 to-gray-700/50 text-gray-300 hover:from-gray-700/70 hover:to-gray-600/70 hover:text-white backdrop-blur-sm";

  const icon = (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064" />
    </svg>
  );

  if (collapsed) {
    return (
      <div className="group relative">
        <button
          onClick={onClick}
          className={`${baseClasses} ${selectedClasses} flex items-center justify-center`}
          aria-label="Toutes les ligues"
        >
          {icon}
        </button>
        <div className="absolute left-full ml-3 px-3 py-2 bg-gray-900 text-white text-sm rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap z-50 pointer-events-none">
          Toutes les ligues ({totalMatches})
        </div>
      </div>
    );
  }

  return (
    <button
      onClick={onClick}
      className={`${baseClasses} ${selectedClasses}`}
      aria-label={`Toutes les ligues - ${totalMatches} matchs`}
    >
      <div className="flex items-center gap-4">
        <div className={`w-12 h-12 rounded-xl flex items-center justify-center transition-all duration-300 ${
          isSelected ? 'bg-white/20' : 'bg-red-500/20 group-hover:bg-red-500/30'
        }`}>
          {icon}
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-bold text-lg">Toutes les ligues</div>
          <div className="text-sm opacity-80 flex items-center gap-2">
            <span>{totalMatches} matchs disponibles</span>
            <LiveBadge count={liveMatches} />
          </div>
        </div>
      </div>
    </button>
  );
};

const SearchBar = ({ value, onChange, onClear }) => (
  <div className="relative">
    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
      <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
      </svg>
    </div>
    <input
      type="text"
      placeholder="Rechercher une équipe..."
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="bg-gray-800/50 border border-gray-700/50 text-white rounded-xl pl-12 pr-4 py-3 w-full sm:w-64 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all backdrop-blur-sm"
      aria-label="Rechercher une équipe"
    />
    {value && (
      <button
        onClick={onClear}
        className="absolute inset-y-0 right-0 pr-4 flex items-center text-gray-400 hover:text-white transition-colors"
        aria-label="Effacer la recherche"
      >
        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    )}
  </div>
);

const SortSelect = ({ value, onChange }) => (
  <select
    value={value}
    onChange={(e) => onChange(e.target.value)}
    className="bg-gray-800/50 border border-gray-700/50 text-white rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all backdrop-blur-sm"
    aria-label="Trier les matchs"
  >
    <option value={SORT_OPTIONS.DATE}>Trier par date</option>
    <option value={SORT_OPTIONS.LEAGUE}>Trier par ligue</option>
    <option value={SORT_OPTIONS.NAME}>Trier par équipe</option>
  </select>
);

const EmptyState = ({ hasFilters, onResetFilters, searchQuery }) => (
  <div className="flex flex-col items-center justify-center py-24">
    <div className="relative mb-8">
      <div className="w-32 h-32 bg-gradient-to-br from-red-900/20 to-red-800/20 rounded-full flex items-center justify-center backdrop-blur-sm">
        <svg className="w-16 h-16 text-red-400/60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
        </svg>
      </div>
      <div className="absolute inset-0 bg-gradient-to-br from-red-500/10 to-red-600/10 rounded-full animate-pulse"></div>
    </div>
    
    <h3 className="text-3xl font-bold text-gray-300 mb-4">Aucun match trouvé</h3>
    
    <p className="text-gray-400 text-lg text-center max-w-lg leading-relaxed mb-8">
      {searchQuery ? (
        <>Aucun match ne correspond à votre recherche "<span className="text-red-400 font-medium">{searchQuery}</span>". Essayez d'autres termes.</>
      ) : hasFilters ? (
        <>Aucun match ne correspond aux filtres sélectionnés. Essayez d'élargir votre recherche.</>
      ) : (
        <>Les matchs apparaîtront ici dès qu'ils seront programmés. Revenez bientôt pour découvrir les dernières opportunités de paris.</>
      )}
    </p>
    
    <div className="flex gap-4">
      {hasFilters && (
        <button
          onClick={onResetFilters}
          className="px-6 py-3 bg-gradient-to-r from-red-600 to-red-500 text-white rounded-xl font-semibold hover:from-red-500 hover:to-red-400 transition-all duration-300 transform hover:scale-105 shadow-lg shadow-red-500/25"
        >
          Réinitialiser les filtres
        </button>
      )}
      <button
        onClick={() => window.location.reload()}
        className="px-6 py-3 bg-gradient-to-r from-gray-700 to-gray-600 text-white rounded-xl font-semibold hover:from-gray-600 hover:to-gray-500 transition-all duration-300 transform hover:scale-105"
      >
        Actualiser
      </button>
    </div>
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
    <p className="text-gray-400 text-lg text-center max-w-lg leading-relaxed mb-8">{error}</p>
    <button
      onClick={onRetry}
      className="px-6 py-3 bg-gradient-to-r from-red-600 to-red-500 text-white rounded-xl font-semibold hover:from-red-500 hover:to-red-400 transition-all duration-300 transform hover:scale-105 shadow-lg shadow-red-500/25"
    >
      Réessayer
    </button>
  </div>
);

// 🏠 Main Component
const BettingPage = () => {
  const { user, isAuthenticated } = useAuth(); 

  const { fixtures, leagues, isLoading, error, refetch } = useDataLoader();
  const {
    selectedLeagueId,
    setSelectedLeagueId,
    searchQuery,
    setSearchQuery,
    sortBy,
    setSortBy,
    filteredFixtures,
    resetFilters,
    hasActiveFilters
  } = useFilters(fixtures);
  
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const stats = useStats(fixtures, filteredFixtures);
  

  // 1. Créez une référence pour le conteneur des matchs
  const mainContentRef = useRef(null);

  const selectedLeague = useMemo(() => 
    leagues.find(l => l.id === selectedLeagueId), 
    [leagues, selectedLeagueId]
  );

  const getLeagueStats = useCallback((leagueId) => {
    const leagueFixtures = fixtures.filter(f => 
      f.league_id === leagueId || f.league?.id === leagueId
    );
    return {
      total: leagueFixtures.length,
      live: leagueFixtures.filter(f => f.status === "live").length
    };
  }, [fixtures]);

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#0a0a0a] via-[#121212] to-[#1a1a1a] text-white flex items-center justify-center">
        <ErrorState error={error} onRetry={refetch} />
      </div>
    );
  }

  // 2. Utilisez un effet pour réinitialiser le défilement
  useEffect(() => {
    // Si la référence existe et qu'une ligue est sélectionnée, ou si les filtres sont réinitialisés
    if (mainContentRef.current) {
      mainContentRef.current.scrollTo({
        top: 0,
        behavior: 'smooth' // Pour une animation de défilement fluide
      });
    }
  }, [selectedLeagueId, searchQuery, sortBy]); // Déclenchez l'effet sur les changements de filtre


  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0a0a0a] via-[#121212] to-[#1a1a1a] text-white">
      {/* 🎯 Header Premium */}
      <header
        className={`relative bg-gradient-to-r from-red-800 via-red-700 to-red-600 shadow-2xl transition-all duration-500 ease-in-out ${
          sidebarCollapsed ? 'ml-20' : 'ml-96'
        }`}
      >
        <div className="absolute inset-0 bg-black/20"></div>
        <div className="px-6 py-6 w-full text-center">
          <div className="text-center">
            <div className="inline-flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-white/10 rounded-full flex items-center justify-center backdrop-blur-sm">
                <svg className="w-5 h-5 text-red-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <h1 className="text-2xl md:text-4xl font-extrabold tracking-tight bg-gradient-to-r from-white to-red-100 bg-clip-text text-transparent">
                Paris Sportifs
              </h1>
            </div>
            <p className="text-red-100/80 text-sm md:text-base font-medium max-w-xl mx-auto leading-relaxed">
              Découvrez les meilleures cotes, placez vos paris en temps réel et vivez l'émotion du sport
            </p>

            {/* Stats rapides */}
            <div className="flex justify-center gap-6 mt-4">
              <div className="text-center">
                <div className="text-xl font-bold text-white">{stats.total}</div>
                <div className="text-xs text-red-200/70">Matchs total</div>
              </div>
              <div className="text-center">
                <div className="text-xl font-bold text-green-400">{stats.live}</div>
                <div className="text-xs text-red-200/70">En direct</div>
              </div>
              <div className="text-center">
                <div className="text-xl font-bold text-blue-400">{stats.upcoming}</div>
                <div className="text-xs text-red-200/70">À venir</div>
              </div>
            </div>
          </div>
        </div>
      </header>


      <div className="flex">
        {/* 🏆 Sidebar Premium */}
        <aside 
          className={`fixed top-0 left-0 bg-gradient-to-b from-[#1a1a1a] to-[#0f0f0f] border-r border-gray-800/50 transition-all duration-500 ease-in-out ${
            sidebarCollapsed ? 'w-20' : 'w-96'
          } h-screen z-50 shadow-2xl backdrop-blur-xl`}
        >
          {/* Header Sidebar */}
          <div className="p-6 border-b border-gray-800/50 bg-gradient-to-r from-red-900/20 to-red-800/20 backdrop-blur-sm">
            <div className="flex items-center justify-between">
              {!sidebarCollapsed && (
                <div>
                  <h2 className="text-xl font-bold bg-gradient-to-r from-red-400 to-red-300 bg-clip-text text-transparent flex items-center gap-3">
                    <div className="w-8 h-8 bg-gradient-to-r from-red-500 to-red-400 rounded-lg flex items-center justify-center">
                      <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                      </svg>
                    </div>
                    Compétitions
                  </h2>
                  <p className="text-gray-400 text-sm mt-1">{leagues.length} ligues disponibles</p>
                </div>
              )}
              <button
                onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
                className="p-3 rounded-xl bg-gray-800/50 hover:bg-gray-700/50 transition-all duration-300 transform hover:scale-110 backdrop-blur-sm group"
                aria-label={sidebarCollapsed ? "Étendre la sidebar" : "Réduire la sidebar"}
              >
                <svg 
                  className={`w-5 h-5 transition-all duration-300 ${sidebarCollapsed ? 'rotate-180' : ''} group-hover:text-red-400`}
                  fill="none" 
                  stroke="currentColor" 
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
            </div>
          </div>

          {/* Contenu Sidebar */}
          <div className="h-[calc(100vh-120px)] overflow-hidden">
            <div className="h-full overflow-y-auto custom-scrollbar p-6">
              <div className="space-y-4">
                {/* Bouton "Toutes les ligues" */}
                <AllLeaguesButton
                  isSelected={selectedLeagueId === null}
                  onClick={() => setSelectedLeagueId(null)}
                  totalMatches={stats.total}
                  liveMatches={stats.live}
                  collapsed={sidebarCollapsed}
                />

                {/* Loading ou Ligues */}
                {isLoading ? (
                  <LoadingSkeleton count={sidebarCollapsed ? 6 : 4} />
                ) : (
                  leagues.map((league) => {
                    const leagueStats = getLeagueStats(league.id);
                    return (
                      <LeagueButton
                        key={league.id}
                        league={league}
                        isSelected={selectedLeagueId === league.id}
                        onClick={() => setSelectedLeagueId(league.id)}
                        matchCount={leagueStats.total}
                        liveCount={leagueStats.live}
                        collapsed={sidebarCollapsed}
                      />
                    );
                  })
                )}
              </div>
            </div>
          </div>
        </aside>

        {/* 📊 Zone principale */}
        <main ref={mainContentRef} className={`flex-1 transition-all duration-500 ease-in-out ${sidebarCollapsed ? 'ml-20' : 'ml-96'}`}>
          {/* Barre de contrôles */}
          <div className="sticky top-0 z-40 bg-gradient-to-r from-[#1a1a1a]/95 to-[#0f0f0f]/95 backdrop-blur-xl border-b border-gray-800/50 shadow-lg">
            <div className="px-8 py-6">
              <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
                {/* Titre et infos */}
                <div>
                  <h2 className="text-3xl font-bold bg-gradient-to-r from-red-400 to-red-300 bg-clip-text text-transparent flex items-center gap-3">
                    <svg className="w-8 h-8 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2H9z" />
                    </svg>
                    Matchs Disponibles
                  </h2>
                  <div className="flex items-center gap-4 mt-2">
                    <span className="inline-flex items-center gap-2 px-3 py-1 bg-blue-500/20 text-blue-300 rounded-full text-sm font-medium">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2H9z" />
                      </svg>
                      {stats.filtered} match{stats.filtered !== 1 ? 's' : ''}
                    </span>
                    {selectedLeague && (
                      <span className="inline-flex items-center gap-2 px-3 py-1 bg-red-600/20 text-red-300 rounded-full text-sm font-medium">
                        <div className="w-4 h-4 rounded bg-red-500/20 flex items-center justify-center">
                          {selectedLeague.logo ? (
                            <img src={selectedLeague.logo} alt={selectedLeague.name} className="w-3 h-3 rounded" />
                          ) : (
                            <span className="text-xs">{selectedLeague.name?.charAt(0)}</span>
                          )}
                        </div>
                        {selectedLeague.name}
                      </span>
                    )}
                  </div>
                </div>

                {/* Contrôles */}
                <div className="flex flex-col sm:flex-row gap-4">
                  <SearchBar 
                    value={searchQuery}
                    onChange={setSearchQuery}
                    onClear={() => setSearchQuery("")}
                  />
                  <SortSelect 
                    value={sortBy}
                    onChange={setSortBy}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Contenu principal */}
          <div className="px-8 py-8">
            {isLoading ? (
              /* Loading state premium */
              <div className="grid gap-8">
                {Array.from({ length: 3 }, (_, i) => (
                  <div key={i} className="animate-pulse">
                    <div className="bg-gradient-to-r from-gray-800/30 to-gray-700/30 rounded-3xl p-8 backdrop-blur-sm">
                      <div className="flex justify-between items-start mb-6">
                        <div className="space-y-3 flex-1">
                          <div className="h-6 bg-gray-600/50 rounded w-2/3"></div>
                          <div className="h-4 bg-gray-700/50 rounded w-1/3"></div>
                        </div>
                        <div className="h-6 w-20 bg-gray-600/50 rounded"></div>
                      </div>
                      <div className="grid grid-cols-3 gap-4">
                        {Array.from({ length: 3 }, (_, j) => (
                          <div key={j} className="h-16 bg-gray-600/30 rounded-xl"></div>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : filteredFixtures.length === 0 ? (
              <EmptyState 
                hasFilters={hasActiveFilters}
                onResetFilters={resetFilters}
                searchQuery={searchQuery}
              />
            ) : (
              /* Liste des matchs avec animations */
              <div className="grid gap-8">
                {filteredFixtures.map((fixture, index) => (
                  <div 
                    key={fixture.id} 
                    className="transform transition-all duration-500 hover:scale-[1.02] opacity-0 animate-fade-in-up"
                    style={{
                      animationDelay: `${index * ANIMATION_DELAYS.CARD_BASE}ms`,
                      animationFillMode: 'forwards'
                    }}
                  >
                    <div className="relative group">
                      {/* Effet de glow au hover */}
                      <div className="absolute -inset-1 bg-gradient-to-r from-red-600/20 to-red-500/20 rounded-3xl blur-xl opacity-0 group-hover:opacity-100 transition-all duration-500"></div>
                      <div className="relative">
                        <MatchCard fixture={fixture} userId={isAuthenticated ? user.id : null} />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </main>
      </div>

      {/* Styles CSS intégrés */}
      <style jsx>{`
        .custom-scrollbar {
          scrollbar-width: thin;
          scrollbar-color: rgba(239, 68, 68, 0.5) transparent;
        }
        
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: linear-gradient(to bottom, rgba(239, 68, 68, 0.5), rgba(220, 38, 38, 0.5));
          border-radius: 10px;
        }
        
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: linear-gradient(to bottom, rgba(239, 68, 68, 0.8), rgba(220, 38, 38, 0.8));
        }
        
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
        
        /* Effet de glassmorphism */
        .backdrop-blur-xl {
          backdrop-filter: blur(24px);
        }
        
        /* Transitions fluides pour les boutons */
        button {
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }
        
        /* Animation pour les éléments live */
        @keyframes pulse-glow {
          0%, 100% {
            box-shadow: 0 0 5px rgba(34, 197, 94, 0.5);
          }
          50% {
            box-shadow: 0 0 20px rgba(34, 197, 94, 0.8), 0 0 30px rgba(34, 197, 94, 0.6);
          }
        }
        
        .animate-pulse-glow {
          animation: pulse-glow 2s ease-in-out infinite;
        }

        /* Optimisations pour les animations */
        .transform {
          transform: translateZ(0);
        }
        
        /* Amélioration des performances d'animation */
        .will-change-transform {
          will-change: transform;
        }
        
        /* Focus states accessibles */
        button:focus-visible {
          outline: 2px solid rgba(239, 68, 68, 0.5);
          outline-offset: 2px;
        }
        
        input:focus-visible {
          outline: 2px solid rgba(239, 68, 68, 0.5);
          outline-offset: 2px;
        }
        
        /* Responsive breakpoints */
        @media (max-width: 768px) {
          .animate-fade-in-up {
            animation-delay: 0ms !important;
          }
        }
      `}</style>
    </div>
  );
};

export default BettingPage;