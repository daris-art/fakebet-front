import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { Search, Trophy, TrendingUp, Zap, Calendar, Clock, Globe, ArrowUp, Menu, X } from 'lucide-react';
import { getFixtures, getLeagues, placeBet, getFixturesByLeague } from '../services/api';
import { useAuth } from '../context/AuthContext';
import MatchCard from '../components/MatchCard';

// Custom hook pour le chargement des données
const useDataLoader = () => {
  const [fixtures, setFixtures] = useState([]);
  const [leagues, setLeagues] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const cacheRef = useRef({ fixtures: null, leagues: null, timestamp: 0 });

  const loadData = useCallback(async (force = false) => {
    const now = Date.now();
    const CACHE_DURATION = 30000; // 30 secondes
    
    if (!force && cacheRef.current.timestamp && (now - cacheRef.current.timestamp < CACHE_DURATION)) {
      setFixtures(cacheRef.current.fixtures);
      setLeagues(cacheRef.current.leagues);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);
    
    try {
      const [fixturesRes, leaguesRes] = await Promise.all([
        getFixtures(),
        getLeagues()
      ]);
      
      const fixturesData = fixturesRes.data || [];
      const leaguesData = leaguesRes.data || [];

      // ✅ Mappage des données de ligue et de cotes pour les intégrer à chaque match
      // filter: ne garder que les matchs avec des cotes
      const formattedFixtures = fixturesData.filter(fixture => fixture.odds && fixture.odds !== '{}')
      .map(fixture => {
        const league = leaguesData.find(l => l.id === fixture.league_id);
        return {
          ...fixture,
          league: {
            id: league?.id || null,
            name: fixture.league_name || 'Ligue inconnue',
            logo: fixture.league_logo || '/api/placeholder/24/24'
          }
        };
      });
      
      cacheRef.current = {
        fixtures: formattedFixtures,
        leagues: leaguesData,
        timestamp: now
      };
      
      setFixtures(formattedFixtures);
      setLeagues(leaguesData);
    } catch (err) {
      console.error("Erreur lors du chargement des données:", err);
      setError("Impossible de charger les données. Vérifiez votre connexion.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
    const interval = setInterval(() => loadData(true), 5 * 60 * 1000); // Rechargement toutes les 5 minutes
    return () => clearInterval(interval);
  }, [loadData]);

  return { fixtures, leagues, isLoading, error, refetch: loadData };
};

const useFilters = (fixtures) => {
  const [filters, setFilters] = useState({
    selectedLeagueId: null,
    searchQuery: "",
    dateFilter: "all",
    sortBy: "date"
  });

  const filteredFixtures = useMemo(() => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const tomorrow = new Date(today.getTime() + 24 * 60 * 60 * 1000);
    const nextWeek = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);

    return fixtures
      .filter((fixture) => {
        if (filters.selectedLeagueId && 
            fixture.league_id !== filters.selectedLeagueId) {
          return false;
        }

        if (filters.searchQuery) {
          const query = filters.searchQuery.toLowerCase();
          const searchableText = [
            fixture.home_team_name,
            fixture.away_team_name,
            fixture.league?.name
          ].filter(Boolean).join(' ').toLowerCase();
          
          if (!searchableText.includes(query)) {
            return false;
          }
        }

        if (fixture.date) {
          const fixtureDate = new Date(fixture.date);
          switch (filters.dateFilter) {
            case "today":
              return fixtureDate >= today && fixtureDate < tomorrow;
            case "tomorrow":
              const dayAfter = new Date(tomorrow.getTime() + 24 * 60 * 60 * 1000);
              return fixtureDate >= tomorrow && fixtureDate < dayAfter;
            case "week":
              return fixtureDate >= today && fixtureDate <= nextWeek;
            case "live":
              return fixture.status === "live";
            default:
              return true;
          }
        }
        
        return filters.dateFilter === "all" || filters.dateFilter === "live" && fixture.status === "live";
      })
      .sort((a, b) => {
        switch (filters.sortBy) {
          case "date":
            const dateA = a.date ? new Date(a.date) : new Date(0);
            const dateB = b.date ? new Date(b.date) : new Date(0);
            return dateA - dateB;
          case "league":
            return (a.league?.name || "").localeCompare(b.league?.name || "");
          case "name":
            return (a.home_team_name || "").localeCompare(b.home_team_name || "");
          default:
            return 0;
        }
      });
  }, [fixtures, filters]);

  const updateFilter = useCallback((key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  }, []);

  const resetFilters = useCallback(() => {
    setFilters({
      selectedLeagueId: null,
      searchQuery: "",
      dateFilter: "all",
      sortBy: "date"
    });
  }, []);

  return {
    ...filters,
    filteredFixtures,
    updateFilter,
    resetFilters,
    hasActiveFilters: filters.selectedLeagueId || filters.searchQuery || filters.dateFilter !== "all"
  };
};

const SearchBar = ({ value, onChange, className = "" }) => {
  const [isFocused, setIsFocused] = useState(false);
  const inputRef = useRef(null);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <div className={`relative ${className}`}>
      <Search className={`absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 transition-colors ${
        isFocused ? 'text-blue-400' : 'text-gray-400'
      }`} />
      <input
        ref={inputRef}
        type="text"
        placeholder="Rechercher équipes, ligues... (⌘K)"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        className={`w-full pl-12 pr-4 py-3 bg-gray-800/50 border rounded-xl text-white placeholder-gray-400 transition-all duration-200 ${
          isFocused 
            ? 'border-blue-500/50 bg-gray-800/70 ring-2 ring-blue-500/20' 
            : 'border-gray-700/50 hover:border-gray-600/50'
        }`}
      />
      {value && (
        <button
          onClick={() => onChange("")}
          className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      )}
    </div>
  );
};

const DateFilterTabs = ({ value, onChange }) => {
  const tabs = [
    { value: "all", label: "Tous", icon: Globe },
    { value: "live", label: "Live", icon: Zap },
    { value: "today", label: "Aujourd'hui", icon: Clock },
    { value: "tomorrow", label: "Demain", icon: Calendar },
    { value: "week", label: "Semaine", icon: TrendingUp }
  ];

  return (
    <div className="flex flex-wrap gap-2">
      {tabs.map(({ value: tabValue, label, icon: Icon }) => (
        <button
          key={tabValue}
          onClick={() => onChange(tabValue)}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
            value === tabValue
              ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/25'
              : 'bg-gray-800/50 text-gray-300 hover:bg-gray-700/50 hover:text-white'
          }`}
        >
          <Icon className="w-4 h-4" />
          {label}
        </button>
      ))}
    </div>
  );
};

const LeagueList = ({ leagues, selectedId, onSelect, fixtures }) => {
  const getLeagueStats = useCallback((leagueId) => {
    const leagueFixtures = fixtures.filter(f => 
      f.league_id === leagueId
    );
    return {
      total: leagueFixtures.length,
      live: leagueFixtures.filter(f => f.status === "live").length
    };
  }, [fixtures]);

  const allStats = useMemo(() => ({
    total: fixtures.length,
    live: fixtures.filter(f => f.status === "live").length
  }), [fixtures]);

  return (
    <div className="space-y-2">
      {/* Toutes les ligues */}
      <button
        onClick={() => onSelect(null)}
        className={`w-full p-3 rounded-xl text-left transition-all duration-200 ${
          selectedId === null
            ? 'bg-blue-600/90 text-white shadow-lg'
            : 'bg-gray-800/50 text-gray-300 hover:bg-gray-700/50'
        }`}
      >
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-gray-700/50 rounded-lg flex items-center justify-center">
            <Globe className="w-4 h-4" />
          </div>
          <div className="flex-1">
            <div className="font-medium">Toutes les ligues</div>
            <div className="text-xs opacity-80">
              {allStats.total} matchs {allStats.live > 0 && `• ${allStats.live} live`}
            </div>
          </div>
        </div>
      </button>

      {/* Ligues individuelles */}
      {leagues.map((league) => {
        const stats = getLeagueStats(league.id);

        return (
          <button
            key={league.id}
            onClick={() => onSelect(league.id)}
            className={`w-full p-3 rounded-xl text-left transition-all duration-200 ${
              selectedId === league.id
                ? 'bg-blue-600/90 text-white shadow-lg'
                : 'bg-gray-800/50 text-gray-300 hover:bg-gray-700/50'
            }`}
          >
            <div className="flex items-center justify-between gap-3">
              {/* Logo + Texte */}
              <div className="flex items-center gap-3 min-w-0">
                <div className="relative">
                  <img 
                    src={league.logo} 
                    alt={league.name}
                    className="w-8 h-8 rounded-lg object-cover"
                  />
                  {stats.live > 0 && (
                    <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full border border-gray-900" />
                  )}
                </div>
                <div className="flex flex-col justify-center min-w-0">
                  <div className="font-medium truncate">{league.name}</div>
                  <div className="text-xs opacity-80 truncate">
                    {stats.total} matchs {stats.live > 0 && `• ${stats.live} live`}
                  </div>
                </div>
              </div>

              {/* Drapeau à droite */}
              <div className="flex items-center">
                <img 
                  src={league.flag} 
                  alt=""
                  title={league.country}
                  className="w-5 h-4 rounded-sm object-cover"
                />
              </div>
            </div>
          </button>
        );
      })}

    </div>
  );
};

const StatsGrid = ({ stats }) => {
  const items = [
    { label: "Matchs", value: stats.filtered, icon: Trophy, bgColor: "bg-blue-500/20", textColor: "text-blue-400" },
    { label: "En direct", value: stats.live, icon: Zap, bgColor: "bg-red-500/20", textColor: "text-red-400" },
    { label: "Aujourd'hui", value: stats.today, icon: Clock, bgColor: "bg-green-500/20", textColor: "text-green-400" },
    { label: "À venir", value: stats.upcoming, icon: Calendar, bgColor: "bg-purple-500/20", textColor: "text-purple-400" }
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {items.map(({ label, value, icon: Icon, bgColor, textColor }) => (
        <div key={label} className="bg-gray-800/50 rounded-xl p-4 border border-gray-700/50">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${bgColor}`}>
              <Icon className={`w-5 h-5 ${textColor}`} />
            </div>
            <div>
              <div className="text-2xl font-bold text-white">{value}</div>
              <div className="text-xs text-gray-400">{label}</div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

const LoadingSpinner = () => (
  <div className="flex items-center justify-center py-32">
    <div className="relative">
      <div className="w-16 h-16 border-4 border-gray-700 rounded-full animate-spin border-t-blue-500" />
      <div className="absolute inset-0 flex items-center justify-center">
        <Zap className="w-6 h-6 text-blue-400 animate-pulse" />
      </div>
    </div>
  </div>
);

const EmptyState = ({ hasFilters, onReset, message }) => (
  <div className="flex flex-col items-center justify-center py-32">
    <div className="w-32 h-32 bg-gray-800/30 rounded-full flex items-center justify-center mb-8">
      <Trophy className="w-16 h-16 text-gray-400" />
    </div>
    <h3 className="text-2xl font-bold text-gray-200 mb-4">{message || "Aucun match trouvé"}</h3>
    <p className="text-gray-400 text-center max-w-md mb-8">
      {hasFilters 
        ? "Essayez de modifier vos critères de recherche."
        : "Les matchs apparaîtront ici dès qu'ils seront programmés."
      }
    </p>
    {hasFilters && (
      <button
        onClick={onReset}
        className="px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-500 transition-colors"
      >
        Réinitialiser les filtres
      </button>
    )}
  </div>
);

const BettingPage = () => {
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const { fixtures, leagues, isLoading, error, refetch } = useDataLoader();
  const {
    selectedLeagueId,
    searchQuery,
    dateFilter,
    sortBy,
    filteredFixtures,
    updateFilter,
    resetFilters,
    hasActiveFilters
  } = useFilters(fixtures);
  
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [leagueMap, setLeagueMap] = useState({});

  const mainRef = useRef(null);

  useEffect(() => {
    const handleScroll = () => {
      if (mainRef.current) {
        setShowScrollTop(mainRef.current.scrollTop > 400);
      }
    };

    const element = mainRef.current;
    if (element) {
      element.addEventListener('scroll', handleScroll);
      return () => element.removeEventListener('scroll', handleScroll);
    }
  }, []);

  useEffect(() => {
    const uniqueLeagueIds = [...new Set(fixtures.map(f => f.league_id))];
    Promise.all(uniqueLeagueIds.map(id => getFixturesByLeague(id)))
      .then(responses => {
        const map = {};
        responses.forEach((res, i) => {
          const data = res.data;
          if (data.length > 0) {
            map[uniqueLeagueIds[i]] = {
              name: data[0].league_name,
              logo: data[0].league_logo
            };
          }
        });
        setLeagueMap(map);
      })
      .catch(err => {
        console.error("Erreur chargement des ligues:", err);
      });
  }, [fixtures]);

  const stats = useMemo(() => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const tomorrow = new Date(today.getTime() + 24 * 60 * 60 * 1000);

    return {
      total: fixtures.length,
      filtered: filteredFixtures.length,
      live: fixtures.filter(f => f.status === "live").length,
      today: fixtures.filter(f => {
        if (!f.date) return false;
        const fixtureDate = new Date(f.date);
        return fixtureDate >= today && fixtureDate < tomorrow;
      }).length,
      upcoming: fixtures.filter(f => {
        if (!f.date) return false;
        return new Date(f.date) > now;
      }).length,
    };
  }, [fixtures, filteredFixtures]);

  const scrollToTop = () => {
    mainRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleBetPlaced = () => {
    refetch(true);
  };

  if (authLoading || isLoading) {
    return (
      <div className="min-h-screen bg-gray-950 text-white flex items-center justify-center">
        <LoadingSpinner />
      </div>
    );
    }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-950 text-white flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4">Erreur de connexion</h2>
          <p className="text-gray-400 mb-6">{error}</p>
          <button
            onClick={() => refetch(true)}
            className="px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-500 transition-colors"
          >
            Réessayer
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <div className="flex min-h-[calc(100vh-5rem)]">
        {/* Sidebar */}
        <aside className={`fixed lg:static top-20 bottom-0 left-0 z-50 w-80 bg-gray-900/95 backdrop-blur-sm border-r border-gray-800 transition-transform duration-300 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}>
          <div className="h-full flex flex-col">
            <div className="p-6 border-b border-gray-800">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold">Compétitions</h2>
                <button
                  onClick={() => setSidebarOpen(false)}
                  className="lg:hidden p-2 rounded-lg hover:bg-gray-800 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
            
            <div className="flex-1 overflow-y-auto p-6">
              <LeagueList
                leagues={leagues}
                selectedId={selectedLeagueId}
                onSelect={(id) => updateFilter('selectedLeagueId', id)}
                fixtures={fixtures}
              />
            </div>
          </div>
        </aside>

        {/* Overlay mobile */}
        {sidebarOpen && (
          <div 
            className="fixed inset-0 bg-black/50 z-40 lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* Main content */}
        <main className="flex-1 lg:ml-0">
          <div 
            ref={mainRef}
            className="overflow-y-auto"
          >
            {/* Header moved inside main so sidebar starts under Navbar */}
            <header className="bg-gradient-to-r from-blue-900 via-blue-800 to-blue-700 border-b border-gray-800">
              <div className="px-6 py-8">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-4">
                    <button
                      onClick={() => setSidebarOpen(!sidebarOpen)}
                      className="lg:hidden p-2 rounded-lg bg-white/10 hover:bg-white/20 transition-colors"
                    >
                      <Menu className="w-6 h-6" />
                    </button>
                    <div>
                      <h1 className="text-4xl font-bold">Paris Sportifs</h1>
                      <p className="text-blue-200 mt-2">Découvrez les meilleures cotes en temps réel</p>
                      {isAuthenticated && (
                        <p className="text-blue-300 text-sm mt-1">
                          Connecté en tant que {user?.username}
                        </p>
                      )}
                    </div>
                  </div>
                  <Zap className="w-12 h-12 text-blue-300" />
                </div>
                
                <StatsGrid stats={stats} />
              </div>
            </header>

            {/* Controls */}
            <div className="sticky top-0 z-30 bg-gray-900/95 backdrop-blur-sm border-b border-gray-800">
              <div className="p-6 space-y-6">
                <div className="flex flex-col md:flex-row gap-4">
                  <SearchBar
                    value={searchQuery}
                    onChange={(value) => updateFilter('searchQuery', value)}
                    className="flex-1"
                  />
                  <select
                    value={sortBy}
                    onChange={(e) => updateFilter('sortBy', e.target.value)}
                    className="px-4 py-3 bg-gray-800/50 border border-gray-700/50 rounded-xl text-white"
                  >
                    <option value="date">Trier par date</option>
                    <option value="league">Trier par ligue</option>
                    <option value="name">Trier par équipe</option>
                  </select>
                </div>
                
                <DateFilterTabs
                  value={dateFilter}
                  onChange={(value) => updateFilter('dateFilter', value)}
                />
              </div>
            </div>

            {/* Content */}
            <div className="p-6">
              {filteredFixtures.length === 0 ? (
                <EmptyState
                  hasFilters={hasActiveFilters}
                  onReset={resetFilters}
                  message={searchQuery ? `Aucun match trouvé pour "${searchQuery}"` : undefined}
                />
              ) : (
                <div className="grid gap-6">
                  {filteredFixtures.map((fixture, index) => (
                    <div
                      key={fixture.id}
                      className="animate-fade-in"
                      style={{ animationDelay: `${Math.min(index * 50, 500)}ms` }}
                    >
                      <MatchCard 
                        fixture={fixture}
                        userId={user?.id}
                        league={leagueMap[fixture.league_id]}
                        onBetPlaced={handleBetPlaced}
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </main>
      </div>

      {/* Scroll to top */}
      {showScrollTop && (
        <button
          onClick={scrollToTop}
          className="fixed bottom-8 right-8 w-12 h-12 bg-blue-600 hover:bg-blue-500 text-white rounded-full shadow-lg transition-all duration-300 z-50"
        >
          <ArrowUp className="w-6 h-6 mx-auto" />
        </button>
      )}

      <style>{`
        @keyframes fade-in {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in {
          opacity: 0;
          animation: fade-in 0.3s ease-out forwards;
        }
      `}</style>
    </div>
  );
};

export default BettingPage;