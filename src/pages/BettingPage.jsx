import React, { useEffect, useState, useMemo, useCallback, useRef } from "react";
import { getFixtures, getLeagues } from "../services/api";
import MatchCard from "../components/MatchCard";
import { useAuth } from '../context/AuthContext';

// 🎯 Constants
const SORT_OPTIONS = {
  DATE: "date",
  LEAGUE: "league",
  NAME: "name"
};

const ANIMATION_DELAYS = {
  CARD_BASE: 50,
  STAGGER: 100,
  SIDEBAR_TRANSITION: 300
};

const BREAKPOINTS = {
  SM: 640,
  MD: 768,
  LG: 1024,
  XL: 1280
};

// 🔧 Custom Hooks
const useViewport = () => {
  const [viewport, setViewport] = useState({
    width: typeof window !== 'undefined' ? window.innerWidth : 1024,
    height: typeof window !== 'undefined' ? window.innerHeight : 768
  });

  useEffect(() => {
    const handleResize = () => {
      setViewport({
        width: window.innerWidth,
        height: window.innerHeight
      });
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return {
    ...viewport,
    isMobile: viewport.width < BREAKPOINTS.MD,
    isTablet: viewport.width >= BREAKPOINTS.MD && viewport.width < BREAKPOINTS.LG,
    isDesktop: viewport.width >= BREAKPOINTS.LG
  };
};

const useKeyboardShortcuts = (callbacks) => {
  useEffect(() => {
    const handleKeyDown = (event) => {
      // Ctrl/Cmd + K pour la recherche
      if ((event.ctrlKey || event.metaKey) && event.key === 'k') {
        event.preventDefault();
        callbacks.focusSearch?.();
      }
      // Echap pour effacer les filtres
      if (event.key === 'Escape') {
        callbacks.clearFilters?.();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [callbacks]);
};

const useIntersectionObserver = (options = {}) => {
  const [isInView, setIsInView] = useState(false);
  const targetRef = useRef(null);

  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => {
      setIsInView(entry.isIntersecting);
    }, {
      threshold: 0.1,
      ...options
    });

    if (targetRef.current) {
      observer.observe(targetRef.current);
    }

    return () => {
      if (targetRef.current) {
        observer.unobserve(targetRef.current);
      }
    };
  }, []);

  return [targetRef, isInView];
};

const useDataLoader = () => {
  const [fixtures, setFixtures] = useState([]);
  const [leagues, setLeagues] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastFetch, setLastFetch] = useState(null);

  const loadData = useCallback(async (force = false) => {
    // Cache pendant 30 secondes
    if (!force && lastFetch && Date.now() - lastFetch < 30000) {
      return;
    }

    setIsLoading(true);
    setError(null);
    
    try {
      const [fixturesRes, leaguesRes] = await Promise.all([
        getFixtures(),
        getLeagues()
      ]);
      
      setFixtures(fixturesRes.data || []);
      setLeagues(leaguesRes.data || []);
      setLastFetch(Date.now());
    } catch (error) {
      console.error("Erreur lors du chargement des données:", error);
      setError("Impossible de charger les données. Vérifiez votre connexion.");
    } finally {
      setIsLoading(false);
    }
  }, [lastFetch]);

  useEffect(() => {
    loadData();
    
    // Auto-refresh toutes les 5 minutes
    const interval = setInterval(() => loadData(true), 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [loadData]);

  return { fixtures, leagues, isLoading, error, refetch: loadData, lastFetch };
};

const useFilters = (fixtures) => {
  const [selectedLeagueId, setSelectedLeagueId] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState(SORT_OPTIONS.DATE);
  const [dateFilter, setDateFilter] = useState("all"); // today, tomorrow, week, all

  const filteredFixtures = useMemo(() => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const nextWeek = new Date(today);
    nextWeek.setDate(nextWeek.getDate() + 7);

    return fixtures
      .filter((fixture) => {
        // Filtre par ligue
        const leagueMatch = selectedLeagueId
          ? (fixture.league_id === selectedLeagueId || fixture.league?.id === selectedLeagueId)
          : true;

        // Filtre par recherche
        const searchMatch = searchQuery
          ? [fixture.home_team_name, fixture.away_team_name, fixture.league?.name]
              .some(name => name?.toLowerCase().includes(searchQuery.toLowerCase()))
          : true;

        // Filtre par date
        const fixtureDate = new Date(fixture.date);
        let dateMatch = true;
        
        switch (dateFilter) {
          case "today":
            dateMatch = fixtureDate >= today && fixtureDate < tomorrow;
            break;
          case "tomorrow":
            const dayAfterTomorrow = new Date(tomorrow);
            dayAfterTomorrow.setDate(dayAfterTomorrow.getDate() + 1);
            dateMatch = fixtureDate >= tomorrow && fixtureDate < dayAfterTomorrow;
            break;
          case "week":
            dateMatch = fixtureDate >= today && fixtureDate <= nextWeek;
            break;
          case "live":
            dateMatch = fixture.status === "live";
            break;
          default:
            dateMatch = true;
        }

        return leagueMatch && searchMatch && dateMatch;
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
  }, [fixtures, selectedLeagueId, searchQuery, sortBy, dateFilter]);

  const resetFilters = useCallback(() => {
    setSelectedLeagueId(null);
    setSearchQuery("");
    setDateFilter("all");
    setSortBy(SORT_OPTIONS.DATE);
  }, []);

  return {
    selectedLeagueId,
    setSelectedLeagueId,
    searchQuery,
    setSearchQuery,
    sortBy,
    setSortBy,
    dateFilter,
    setDateFilter,
    filteredFixtures,
    resetFilters,
    hasActiveFilters: selectedLeagueId || searchQuery || dateFilter !== "all"
  };
};

const useStats = (fixtures, filteredFixtures) => {
  return useMemo(() => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    return {
      total: fixtures.length,
      filtered: filteredFixtures.length,
      live: fixtures.filter(f => f.status === "live").length,
      today: fixtures.filter(f => {
        const fixtureDate = new Date(f.date);
        return fixtureDate >= today && fixtureDate < tomorrow;
      }).length,
      upcoming: fixtures.filter(f => new Date(f.date) > now).length,
    };
  }, [fixtures, filteredFixtures]);
};

// 🧩 Enhanced Components
const LoadingSkeleton = ({ count = 4, variant = "card" }) => {
  if (variant === "sidebar") {
    return (
      <div className="space-y-3">
        {Array.from({ length: count }, (_, i) => (
          <div key={i} className="animate-pulse">
            <div className="bg-gradient-to-r from-gray-800/20 to-gray-700/20 rounded-2xl p-4 backdrop-blur-sm">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gray-600/30 rounded-xl flex-shrink-0"></div>
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-gray-600/30 rounded w-3/4"></div>
                  <div className="h-3 bg-gray-700/30 rounded w-1/2"></div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="grid gap-6">
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className="animate-pulse">
          <div className="bg-gradient-to-r from-gray-800/10 to-gray-700/10 rounded-3xl p-6 backdrop-blur-sm border border-gray-800/20">
            <div className="flex justify-between items-start mb-4">
              <div className="space-y-3 flex-1">
                <div className="h-5 bg-gray-600/20 rounded w-2/3"></div>
                <div className="h-4 bg-gray-700/20 rounded w-1/3"></div>
              </div>
              <div className="h-6 w-16 bg-gray-600/20 rounded"></div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              {Array.from({ length: 3 }, (_, j) => (
                <div key={j} className="h-14 bg-gray-600/10 rounded-xl"></div>
              ))}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

const LiveIndicator = ({ count, size = "sm", showLabel = true }) => {
  if (count === 0) return null;
  
  const sizeClasses = {
    xs: "w-1 h-1",
    sm: "w-1.5 h-1.5", 
    md: "w-2 h-2",
    lg: "w-3 h-3"
  };

  const containerClasses = {
    xs: "px-1.5 py-0.5 text-xs",
    sm: "px-2 py-0.5 text-xs",
    md: "px-2.5 py-1 text-sm",
    lg: "px-3 py-1.5 text-base"
  };
  
  return (
    <div className={`inline-flex items-center gap-1.5 bg-green-500/15 text-green-400 rounded-full font-medium backdrop-blur-sm border border-green-500/20 ${containerClasses[size]}`}>
      <div className={`${sizeClasses[size]} bg-green-400 rounded-full animate-pulse`}></div>
      {showLabel && <span>{count} direct{count > 1 ? 's' : ''}</span>}
    </div>
  );
};

const SearchBar = ({ value, onChange, onClear, isFocused, onFocus, onBlur }) => {
  const searchRef = useRef(null);

  useKeyboardShortcuts({
    focusSearch: () => searchRef.current?.focus()
  });

  return (
    <div className="relative group">
      <div className={`absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none transition-all duration-200 ${
        isFocused ? 'text-red-400' : 'text-gray-400'
      }`}>
        <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
      </div>
      <input
        ref={searchRef}
        type="text"
        placeholder="Rechercher équipes, ligues... (⌘K)"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={onFocus}
        onBlur={onBlur}
        className={`bg-gray-800/40 border backdrop-blur-sm text-white rounded-2xl pl-12 pr-10 py-3.5 w-full sm:w-80 focus:outline-none transition-all duration-300 placeholder-gray-400 ${
          isFocused 
            ? 'border-red-500/50 ring-2 ring-red-500/20 bg-gray-800/60' 
            : 'border-gray-700/30 hover:border-gray-600/50 hover:bg-gray-800/50'
        }`}
        aria-label="Rechercher équipes ou ligues"
      />
      {value && (
        <button
          onClick={onClear}
          className="absolute inset-y-0 right-0 pr-4 flex items-center text-gray-400 hover:text-white transition-all duration-200 hover:scale-110"
          aria-label="Effacer la recherche"
        >
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      )}
      {!value && (
        <div className="absolute inset-y-0 right-0 pr-4 flex items-center pointer-events-none">
          <kbd className="hidden sm:inline-flex items-center px-2 py-1 text-xs text-gray-400 bg-gray-800/50 border border-gray-700/50 rounded">
            ⌘K
          </kbd>
        </div>
      )}
    </div>
  );
};

const DateFilter = ({ value, onChange }) => {
  const options = [
    { value: "all", label: "Tous les matchs", icon: "📅" },
    { value: "live", label: "En direct", icon: "🔴" },
    { value: "today", label: "Aujourd'hui", icon: "📍" },
    { value: "tomorrow", label: "Demain", icon: "⏰" },
    { value: "week", label: "Cette semaine", icon: "📊" }
  ];

  return (
    <div className="flex flex-wrap gap-2">
      {options.map((option) => (
        <button
          key={option.value}
          onClick={() => onChange(option.value)}
          className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium transition-all duration-200 text-sm backdrop-blur-sm ${
            value === option.value
              ? 'bg-red-600/80 text-white ring-2 ring-red-400/30 shadow-lg shadow-red-500/20'
              : 'bg-gray-800/40 text-gray-300 hover:bg-gray-700/50 hover:text-white border border-gray-700/30'
          }`}
        >
          <span className="text-base">{option.icon}</span>
          <span>{option.label}</span>
        </button>
      ))}
    </div>
  );
};

const SortSelect = ({ value, onChange }) => (
  <select
    value={value}
    onChange={(e) => onChange(e.target.value)}
    className="bg-gray-800/40 border border-gray-700/30 text-white rounded-2xl px-4 py-3.5 focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500/50 transition-all duration-300 backdrop-blur-sm hover:bg-gray-800/50 cursor-pointer"
    aria-label="Trier les matchs"
  >
    <option value={SORT_OPTIONS.DATE}>📅 Trier par date</option>
    <option value={SORT_OPTIONS.LEAGUE}>🏆 Trier par ligue</option>
    <option value={SORT_OPTIONS.NAME}>⚽ Trier par équipe</option>
  </select>
);

const LeagueButton = ({ 
  league, 
  isSelected, 
  onClick, 
  matchCount, 
  liveCount,
  collapsed = false,
  index = 0
}) => {
  const baseClasses = "group w-full p-4 rounded-2xl font-medium text-left transition-all duration-300 transform hover:scale-[1.02] will-change-transform";
  const selectedClasses = isSelected
    ? "bg-gradient-to-r from-red-600/90 to-red-500/90 text-white shadow-2xl shadow-red-500/30 ring-2 ring-red-400/40 backdrop-blur-sm"
    : "bg-gray-800/30 text-gray-300 hover:bg-gray-700/50 hover:text-white backdrop-blur-sm border border-gray-700/20 hover:border-gray-600/40";

  const logoElement = league.logo ? (
    <img 
      src={league.logo} 
      alt={league.name}
      className={`${collapsed ? 'w-8 h-8' : 'w-12 h-12'} rounded-xl object-cover border-2 border-white/10 transition-all duration-300 group-hover:border-white/20`}
      loading="lazy"
    />
  ) : (
    <div className={`${collapsed ? 'w-8 h-8 text-xs' : 'w-12 h-12 text-sm'} bg-gradient-to-br from-red-500 to-red-600 rounded-xl flex items-center justify-center font-bold border-2 border-white/10 transition-all duration-300 group-hover:border-white/20`}>
      {league.name?.charAt(0) || '?'}
    </div>
  );

  if (collapsed) {
    return (
      <div 
        className="group relative"
        style={{ 
          animationDelay: `${index * 50}ms`,
          opacity: 0,
          animation: 'fadeInUp 0.5s ease-out forwards'
        }}
      >
        <button
          onClick={onClick}
          className={`${baseClasses} ${selectedClasses} flex items-center justify-center relative`}
          aria-label={`${league.name} - ${matchCount} matchs`}
        >
          {logoElement}
          {liveCount > 0 && (
            <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full border-2 border-gray-900 animate-pulse shadow-lg shadow-green-500/50"></div>
          )}
        </button>
        <div className="absolute left-full ml-4 px-4 py-3 bg-gray-900/95 text-white text-sm rounded-xl opacity-0 group-hover:opacity-100 transition-all duration-300 whitespace-nowrap z-50 pointer-events-none backdrop-blur-sm border border-gray-700/50 shadow-2xl">
          <div className="font-semibold">{league.name}</div>
          <div className="text-xs text-gray-300 mt-1">{matchCount} matchs</div>
          {liveCount > 0 && (
            <div className="flex items-center gap-1 mt-1">
              <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
              <span className="text-xs text-green-400">{liveCount} en direct</span>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <button
      onClick={onClick}
      className={`${baseClasses} ${selectedClasses}`}
      style={{ 
        animationDelay: `${index * 50}ms`,
        opacity: 0,
        animation: 'fadeInUp 0.5s ease-out forwards'
      }}
      aria-label={`${league.name} - ${matchCount} matchs`}
    >
      <div className="flex items-center gap-4">
        <div className="relative flex-shrink-0">
          {logoElement}
          {liveCount > 0 && (
            <div className="absolute -top-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-gray-900 animate-pulse shadow-lg shadow-green-500/50"></div>
          )}
        </div>
        <div className="flex-1 min-w-0 text-left">
          <div className="font-semibold truncate text-base mb-1">{league.name}</div>
          <div className="flex items-center gap-3 text-sm opacity-80">
            <span className="text-gray-400">{matchCount} match{matchCount !== 1 ? 's' : ''}</span>
            <LiveIndicator count={liveCount} />
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
  const baseClasses = "group w-full p-4 rounded-2xl font-medium text-left transition-all duration-300 transform hover:scale-[1.02]";
  const selectedClasses = isSelected
    ? "bg-gradient-to-r from-red-600/90 to-red-500/90 text-white shadow-2xl shadow-red-500/30 ring-2 ring-red-400/40 backdrop-blur-sm"
    : "bg-gray-800/40 text-gray-300 hover:bg-gray-700/60 hover:text-white backdrop-blur-sm border border-gray-700/30 hover:border-gray-600/50";

  const icon = (
    <svg className={`${collapsed ? 'w-5 h-5' : 'w-6 h-6'} transition-all duration-300`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
          <div className={`w-8 h-8 rounded-xl flex items-center justify-center transition-all duration-300 ${
            isSelected ? 'bg-white/20' : 'bg-red-500/20 group-hover:bg-red-500/30'
          }`}>
            {icon}
          </div>
        </button>
        <div className="absolute left-full ml-4 px-4 py-3 bg-gray-900/95 text-white text-sm rounded-xl opacity-0 group-hover:opacity-100 transition-all duration-300 whitespace-nowrap z-50 pointer-events-none backdrop-blur-sm border border-gray-700/50 shadow-2xl">
          <div className="font-semibold">Toutes les ligues</div>
          <div className="text-xs text-gray-300 mt-1">{totalMatches} matchs disponibles</div>
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
        <div className="flex-1 min-w-0 text-left">
          <div className="font-semibold text-lg mb-1">Toutes les ligues</div>
          <div className="text-sm opacity-80 flex items-center gap-3">
            <span className="text-gray-400">{totalMatches} matchs disponibles</span>
            <LiveIndicator count={liveMatches} />
          </div>
        </div>
      </div>
    </button>
  );
};

const EmptyState = ({ hasFilters, onResetFilters, searchQuery, dateFilter }) => {
  const getEmptyMessage = () => {
    if (searchQuery) {
      return `Aucun match trouvé pour "${searchQuery}"`;
    }
    if (dateFilter === "live") {
      return "Aucun match en direct pour le moment";
    }
    if (dateFilter === "today") {
      return "Aucun match programmé aujourd'hui";
    }
    if (hasFilters) {
      return "Aucun match ne correspond à vos filtres";
    }
    return "Aucun match programmé";
  };

  return (
    <div className="flex flex-col items-center justify-center py-32">
      <div className="relative mb-8">
        <div className="w-40 h-40 bg-gradient-to-br from-red-900/10 to-red-800/10 rounded-3xl flex items-center justify-center backdrop-blur-sm border border-red-500/10">
          <svg className="w-20 h-20 text-red-400/40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
        </div>
        <div className="absolute inset-0 bg-gradient-to-br from-red-500/5 to-red-600/5 rounded-3xl animate-pulse"></div>
      </div>
      
      <h3 className="text-4xl font-bold text-gray-200 mb-4">
        {getEmptyMessage()}
      </h3>
      
      <p className="text-gray-400 text-lg text-center max-w-2xl leading-relaxed mb-10 px-4">
        {searchQuery || hasFilters 
          ? "Essayez de modifier vos critères de recherche ou d'élargir votre sélection."
          : "Les matchs apparaîtront ici dès qu'ils seront programmés. Revenez bientôt pour découvrir les dernières opportunités."
        }
      </p>
      
      <div className="flex flex-col sm:flex-row gap-4">
        {hasFilters && (
          <button
            onClick={onResetFilters}
            className="px-8 py-4 bg-gradient-to-r from-red-600 to-red-500 text-white rounded-2xl font-semibold hover:from-red-500 hover:to-red-400 transition-all duration-300 transform hover:scale-105 shadow-xl shadow-red-500/25 hover:shadow-2xl hover:shadow-red-500/40"
          >
            ✨ Réinitialiser les filtres
          </button>
        )}
        <button
          onClick={() => window.location.reload()}
          className="px-8 py-4 bg-gray-800/60 text-white rounded-2xl font-semibold hover:bg-gray-700/60 transition-all duration-300 transform hover:scale-105 backdrop-blur-sm border border-gray-700/50"
        >
          🔄 Actualiser la page
        </button>
      </div>
    </div>
  );
};

const ErrorState = ({ error, onRetry }) => (
  <div className="flex flex-col items-center justify-center py-32">
    <div className="w-40 h-40 bg-gradient-to-br from-red-900/20 to-red-800/20 rounded-3xl flex items-center justify-center backdrop-blur-sm mb-10 border border-red-500/20">
      <svg className="w-20 h-20 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L3.314 16.5c-.77.833.192 2.5 1.732 2.5z" />
      </svg>
    </div>
    <h3 className="text-4xl font-bold text-gray-200 mb-4">Erreur de connexion</h3>
    <p className="text-gray-400 text-lg text-center max-w-2xl leading-relaxed mb-10 px-4">{error}</p>
    <button
      onClick={onRetry}
      className="px-8 py-4 bg-gradient-to-r from-red-600 to-red-500 text-white rounded-2xl font-semibold hover:from-red-500 hover:to-red-400 transition-all duration-300 transform hover:scale-105 shadow-xl shadow-red-500/25 hover:shadow-2xl hover:shadow-red-500/40"
    >
      🔄 Réessayer
    </button>
  </div>
);

const StatsBar = ({ stats, selectedLeague, lastFetch }) => {
  const [ref, isInView] = useIntersectionObserver();

  return (
    <div ref={ref} className={`transition-all duration-700 ${isInView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-gray-800/40 backdrop-blur-sm rounded-2xl p-4 border border-gray-700/30 hover:bg-gray-800/60 transition-all duration-300">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-500/20 rounded-xl flex items-center justify-center">
              <span className="text-blue-400 text-lg">📊</span>
            </div>
            <div>
              <div className="text-2xl font-bold text-white">{stats.filtered}</div>
              <div className="text-xs text-gray-400">Matchs affichés</div>
            </div>
          </div>
        </div>
        
        <div className="bg-gray-800/40 backdrop-blur-sm rounded-2xl p-4 border border-gray-700/30 hover:bg-gray-800/60 transition-all duration-300">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-green-500/20 rounded-xl flex items-center justify-center">
              <div className="w-3 h-3 bg-green-400 rounded-full animate-pulse"></div>
            </div>
            <div>
              <div className="text-2xl font-bold text-green-400">{stats.live}</div>
              <div className="text-xs text-gray-400">En direct</div>
            </div>
          </div>
        </div>
        
        <div className="bg-gray-800/40 backdrop-blur-sm rounded-2xl p-4 border border-gray-700/30 hover:bg-gray-800/60 transition-all duration-300">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-orange-500/20 rounded-xl flex items-center justify-center">
              <span className="text-orange-400 text-lg">📍</span>
            </div>
            <div>
              <div className="text-2xl font-bold text-orange-400">{stats.today}</div>
              <div className="text-xs text-gray-400">Aujourd'hui</div>
            </div>
          </div>
        </div>
        
        <div className="bg-gray-800/40 backdrop-blur-sm rounded-2xl p-4 border border-gray-700/30 hover:bg-gray-800/60 transition-all duration-300">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-purple-500/20 rounded-xl flex items-center justify-center">
              <span className="text-purple-400 text-lg">⏰</span>
            </div>
            <div>
              <div className="text-2xl font-bold text-purple-400">{stats.upcoming}</div>
              <div className="text-xs text-gray-400">À venir</div>
            </div>
          </div>
        </div>
      </div>
      
      {lastFetch && (
        <div className="flex items-center justify-center mt-4">
          <div className="text-xs text-gray-500 bg-gray-800/30 px-3 py-1.5 rounded-full backdrop-blur-sm border border-gray-700/20">
            <span className="mr-2">🔄</span>
            Dernière mise à jour: {new Date(lastFetch).toLocaleTimeString('fr-FR')}
          </div>
        </div>
      )}
    </div>
  );
};

const FloatingActionButton = ({ onClick, icon, label, variant = "primary" }) => {
  const variants = {
    primary: "bg-red-600 hover:bg-red-500 shadow-red-500/25",
    secondary: "bg-gray-800/80 hover:bg-gray-700/80 shadow-gray-800/25"
  };

  return (
    <button
      onClick={onClick}
      className={`fixed bottom-8 right-8 w-14 h-14 ${variants[variant]} text-white rounded-full shadow-2xl backdrop-blur-sm transition-all duration-300 transform hover:scale-110 z-40 border border-white/10 group`}
      aria-label={label}
    >
      <div className="flex items-center justify-center">
        {icon}
      </div>
      <div className="absolute bottom-full mb-3 right-0 bg-gray-900/95 text-white text-sm px-3 py-2 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap backdrop-blur-sm border border-gray-700/50">
        {label}
      </div>
    </button>
  );
};

// 🏠 Main Component
const BettingPage = () => {
  const { user, isAuthenticated } = useAuth();
  const viewport = useViewport();
  
  const { fixtures, leagues, isLoading, error, refetch, lastFetch } = useDataLoader();
  const {
    selectedLeagueId,
    setSelectedLeagueId,
    searchQuery,
    setSearchQuery,
    sortBy,
    setSortBy,
    dateFilter,
    setDateFilter,
    filteredFixtures,
    resetFilters,
    hasActiveFilters
  } = useFilters(fixtures);
  
  const [sidebarCollapsed, setSidebarCollapsed] = useState(viewport.isMobile);
  const [searchFocused, setSearchFocused] = useState(false);
  const [showScrollTop, setShowScrollTop] = useState(false);
  const stats = useStats(fixtures, filteredFixtures);
  const mainContentRef = useRef(null);

  // Auto-collapse sidebar sur mobile
  useEffect(() => {
    if (viewport.isMobile && !sidebarCollapsed) {
      setSidebarCollapsed(true);
    }
  }, [viewport.isMobile, sidebarCollapsed]);

  // Gestion du scroll pour le bouton "Retour en haut"
  useEffect(() => {
    const handleScroll = () => {
      if (mainContentRef.current) {
        setShowScrollTop(mainContentRef.current.scrollTop > 400);
      }
    };

    const element = mainContentRef.current;
    if (element) {
      element.addEventListener('scroll', handleScroll);
      return () => element.removeEventListener('scroll', handleScroll);
    }
  }, []);

  // Raccourcis clavier
  useKeyboardShortcuts({
    focusSearch: () => setSearchFocused(true),
    clearFilters: resetFilters
  });

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

  // Reset scroll on filter change
  useEffect(() => {
    if (mainContentRef.current) {
      mainContentRef.current.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [selectedLeagueId, searchQuery, sortBy, dateFilter]);

  const scrollToTop = () => {
    mainContentRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
  };

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#0a0a0a] via-[#121212] to-[#1a1a1a] text-white flex items-center justify-center">
        <ErrorState error={error} onRetry={() => refetch(true)} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0a0a0a] via-[#121212] to-[#1a1a1a] text-white overflow-hidden">
      {/* 🎯 Premium Header */}
      <header className={`relative bg-gradient-to-r from-red-800 via-red-700 to-red-600 transition-all duration-${ANIMATION_DELAYS.SIDEBAR_TRANSITION} ease-in-out ${
        sidebarCollapsed ? (viewport.isMobile ? 'ml-0' : 'ml-20') : 'ml-80 lg:ml-96'
      }`}>
        <div className="absolute inset-0 bg-black/20"></div>
        <div className="relative px-6 py-8">
          <div className="text-center">
            <div className="inline-flex items-center gap-3 mb-6">
              <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center backdrop-blur-sm border border-white/20">
                <svg className="w-6 h-6 text-red-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <h1 className="text-3xl md:text-5xl font-black tracking-tight bg-gradient-to-r from-white to-red-100 bg-clip-text text-transparent">
                Paris Sportifs
              </h1>
            </div>
            <p className="text-red-100/80 text-base md:text-lg font-medium max-w-2xl mx-auto leading-relaxed mb-6">
              Découvrez les meilleures cotes et vivez l'émotion du sport en temps réel
            </p>

            <StatsBar stats={stats} selectedLeague={selectedLeague} lastFetch={lastFetch} />
          </div>
        </div>
      </header>

      <div className="flex h-screen">
        {/* 🏆 Enhanced Sidebar */}
        <aside className={`fixed top-0 left-0 bg-gradient-to-b from-[#1a1a1a]/95 to-[#0f0f0f]/95 backdrop-blur-xl border-r border-gray-800/50 transition-all duration-${ANIMATION_DELAYS.SIDEBAR_TRANSITION} ease-in-out ${
          sidebarCollapsed 
            ? (viewport.isMobile ? '-translate-x-full w-80' : 'w-20') 
            : 'w-80 lg:w-96'
        } h-screen z-50 shadow-2xl`}>
          
          {/* Sidebar Header */}
          <div className="p-6 border-b border-gray-800/50 bg-gradient-to-r from-red-900/20 to-red-800/20">
            <div className="flex items-center justify-between">
              {!sidebarCollapsed && (
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gradient-to-r from-red-500 to-red-400 rounded-xl flex items-center justify-center">
                    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                    </svg>
                  </div>
                  <div>
                    <h2 className="text-xl font-bold bg-gradient-to-r from-red-400 to-red-300 bg-clip-text text-transparent">
                      Compétitions
                    </h2>
                    <p className="text-gray-400 text-sm">{leagues.length} ligues disponibles</p>
                  </div>
                </div>
              )}
              <button
                onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
                className="p-3 rounded-xl bg-gray-800/50 hover:bg-gray-700/50 transition-all duration-300 transform hover:scale-110 backdrop-blur-sm group border border-gray-700/30"
                aria-label={sidebarCollapsed ? "Étendre la sidebar" : "Réduire la sidebar"}
              >
                <svg className={`w-5 h-5 transition-all duration-300 ${sidebarCollapsed ? 'rotate-180' : ''} group-hover:text-red-400`}
                  fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                    d={viewport.isMobile ? "M4 6h16M4 12h16M4 18h16" : "M15 19l-7-7 7-7"} />
                </svg>
              </button>
            </div>
          </div>

          {/* Sidebar Content */}
          <div className="h-[calc(100vh-120px)] overflow-hidden">
            <div className="h-full overflow-y-auto custom-scrollbar p-6">
              <div className="space-y-3">
                {/* All Leagues Button */}
                <AllLeaguesButton
                  isSelected={selectedLeagueId === null}
                  onClick={() => setSelectedLeagueId(null)}
                  totalMatches={stats.total}
                  liveMatches={stats.live}
                  collapsed={sidebarCollapsed}
                />

                {/* Leagues List */}
                {isLoading ? (
                  <LoadingSkeleton count={6} variant="sidebar" />
                ) : (
                  leagues.map((league, index) => {
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
                        index={index}
                      />
                    );
                  })
                )}
              </div>
            </div>
          </div>
        </aside>

        {/* Mobile Overlay */}
        {viewport.isMobile && !sidebarCollapsed && (
          <div 
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40"
            onClick={() => setSidebarCollapsed(true)}
          />
        )}

        {/* 📊 Main Content */}
        <main 
          ref={mainContentRef}
          className={`flex-1 h-screen overflow-y-auto transition-all duration-${ANIMATION_DELAYS.SIDEBAR_TRANSITION} ease-in-out ${
            sidebarCollapsed 
              ? (viewport.isMobile ? 'ml-0' : 'ml-20') 
              : 'ml-80 lg:ml-96'
          }`}
        >
          {/* Controls Bar */}
          <div className="sticky top-0 z-30 bg-gradient-to-r from-[#1a1a1a]/95 to-[#0f0f0f]/95 backdrop-blur-xl border-b border-gray-800/50 shadow-lg">
            <div className="px-6 lg:px-8 py-6">
              <div className="flex flex-col gap-6">
                {/* Title & Info */}
                <div>
                  <h2 className="text-2xl lg:text-4xl font-bold bg-gradient-to-r from-red-400 to-red-300 bg-clip-text text-transparent flex items-center gap-3">
                    <svg className="w-8 h-8 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2H9z" />
                    </svg>
                    Matchs Disponibles
                  </h2>
                  <div className="flex items-center flex-wrap gap-3 mt-3">
                    <span className="inline-flex items-center gap-2 px-3 py-1.5 bg-blue-500/20 text-blue-300 rounded-xl text-sm font-medium border border-blue-500/20">
                      <span className="text-base">📊</span>
                      {stats.filtered} match{stats.filtered !== 1 ? 's' : ''}
                    </span>
                    {selectedLeague && (
                      <span className="inline-flex items-center gap-2 px-3 py-1.5 bg-red-600/20 text-red-300 rounded-xl text-sm font-medium border border-red-500/20">
                        <div className="w-5 h-5 rounded-lg bg-red-500/20 flex items-center justify-center overflow-hidden">
                          {selectedLeague.logo ? (
                            <img src={selectedLeague.logo} alt={selectedLeague.name} className="w-4 h-4 rounded" />
                          ) : (
                            <span className="text-xs font-bold">{selectedLeague.name?.charAt(0)}</span>
                          )}
                        </div>
                        {selectedLeague.name}
                      </span>
                    )}
                  </div>
                </div>

                {/* Date Filters */}
                <DateFilter value={dateFilter} onChange={setDateFilter} />

                {/* Search & Sort Controls */}
                <div className="flex flex-col lg:flex-row gap-4">
                  <SearchBar 
                    value={searchQuery}
                    onChange={setSearchQuery}
                    onClear={() => setSearchQuery("")}
                    isFocused={searchFocused}
                    onFocus={() => setSearchFocused(true)}
                    onBlur={() => setSearchFocused(false)}
                  />
                  <SortSelect value={sortBy} onChange={setSortBy} />
                </div>
              </div>
            </div>
          </div>

          {/* Main Content Area */}
          <div className="px-6 lg:px-8 py-8">
            {isLoading ? (
              <LoadingSkeleton count={4} />
            ) : filteredFixtures.length === 0 ? (
              <EmptyState 
                hasFilters={hasActiveFilters}
                onResetFilters={resetFilters}
                searchQuery={searchQuery}
                dateFilter={dateFilter}
              />
            ) : (
              <div className="grid gap-6">
                {filteredFixtures.map((fixture, index) => (
                  <div 
                    key={fixture.id} 
                    className="transform transition-all duration-500 hover:scale-[1.01] will-change-transform"
                    style={{
                      animationDelay: `${Math.min(index * ANIMATION_DELAYS.CARD_BASE, 500)}ms`,
                      opacity: 0,
                      animation: 'fadeInUp 0.6s ease-out forwards'
                    }}
                  >
                    <div className="relative group">
                      <div className="absolute -inset-1 bg-gradient-to-r from-red-600/10 to-red-500/10 rounded-3xl blur-xl opacity-0 group-hover:opacity-100 transition-all duration-500"></div>
                      <div className="relative">
                        <MatchCard fixture={fixture} userId={isAuthenticated ? user?.id : null} />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </main>
      </div>

      {/* Floating Action Buttons */}
      {showScrollTop && (
        <FloatingActionButton
          onClick={scrollToTop}
          icon={<svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
          </svg>}
          label="Retour en haut"
        />
      )}

      {/* Custom Styles */}
      <style jsx>{`
        /* Enhanced Scrollbar */
        .custom-scrollbar {
          scrollbar-width: thin;
          scrollbar-color: rgba(239, 68, 68, 0.6) transparent;
        }
        
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: linear-gradient(to bottom, rgba(239, 68, 68, 0.6), rgba(220, 38, 38, 0.6));
          border-radius: 6px;
        }
        
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: linear-gradient(to bottom, rgba(239, 68, 68, 0.9), rgba(220, 38, 38, 0.9));
        }
        
        /* Animations */
        @keyframes fadeInUp {
          0% {
            opacity: 0;
            transform: translateY(20px) scale(0.95);
          }
          100% {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }
        
        @keyframes pulse-glow {
          0%, 100% {
            box-shadow: 0 0 8px rgba(34, 197, 94, 0.4);
          }
          50% {
            box-shadow: 0 0 25px rgba(34, 197, 94, 0.8), 0 0 35px rgba(34, 197, 94, 0.6);
          }
        }
        
        /* Performance Optimizations */
        .will-change-transform {
          will-change: transform;
        }
        
        /* Smooth Transitions */
        * {
          transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1);
        }
        
        /* Focus States */
        button:focus-visible,
        input:focus-visible,
        select:focus-visible {
          outline: 2px solid rgba(239, 68, 68, 0.6);
          outline-offset: 2px;
        }
        
        /* Mobile Optimizations */
        @media (max-width: 768px) {
          .animate-fade-in-up {
            animation-delay: 0ms !important;
          }
        }
        
        /* Reduce Motion */
        @media (prefers-reduced-motion: reduce) {
          * {
            animation-duration: 0.01ms !important;
            animation-iteration-count: 1 !important;
            transition-duration: 0.01ms !important;
          }
        }
        
        /* High Contrast Mode */
        @media (prefers-contrast: high) {
          .bg-gray-800\/40 {
            background-color: rgba(0, 0, 0, 0.8);
          }
          
          .border-gray-700\/30 {
            border-color: rgba(255, 255, 255, 0.3);
          }
        }
        
        /* Glass Effects */
        .backdrop-blur-xl {
          backdrop-filter: blur(24px);
        }
        
        /* Improved Button Interactions */
        button {
          transform: translateZ(0);
          backface-visibility: hidden;
        }
        
        button:active {
          transform: scale(0.98);
        }
      `}</style>
    </div>
  );
};

export default BettingPage;