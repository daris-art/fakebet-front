import React, { useState, useContext, createContext, useEffect } from 'react';
import { placeBet } from '../services/api';
import { useAuth } from '../context/AuthContext';

// 🎯 Context pour le BetSlip
const BetSlipContext = createContext();

export const BetSlipProvider = ({ children }) => {
  const [bets, setBets] = useState([]);
  const [isOpen, setIsOpen] = useState(false);

  const addBet = (bet) => {
    setBets(prev => {
      // Vérifier si le pari existe déjà
      const existingIndex = prev.findIndex(b => b.fixtureId === bet.fixtureId && b.selectedOutcome === bet.selectedOutcome);
      
      if (existingIndex !== -1) {
        // Remplacer le pari existant
        const updated = [...prev];
        updated[existingIndex] = bet;
        return updated;
      } else {
        // Ajouter un nouveau pari
        return [...prev, bet];
      }
    });
    setIsOpen(true);
  };

  const removeBet = (fixtureId, outcome) => {
    setBets(prev => prev.filter(bet => !(bet.fixtureId === fixtureId && bet.selectedOutcome === outcome)));
  };

  const updateBetAmount = (fixtureId, outcome, amount) => {
    setBets(prev => prev.map(bet => 
      bet.fixtureId === fixtureId && bet.selectedOutcome === outcome 
        ? { ...bet, amount: parseFloat(amount) || 0 }
        : bet
    ));
  };

  const clearAllBets = () => {
    setBets([]);
  };

  const getTotalStake = () => {
    return bets.reduce((total, bet) => total + (bet.amount || 0), 0);
  };

  const getTotalPotentialWin = () => {
    return bets.reduce((total, bet) => total + ((bet.amount || 0) * bet.odds), 0);
  };

  const getValidBets = () => {
    return bets.filter(bet => bet.amount && bet.amount > 0);
  };

  return (
    <BetSlipContext.Provider value={{
      bets,
      addBet,
      removeBet,
      updateBetAmount,
      clearAllBets,
      getTotalStake,
      getTotalPotentialWin,
      getValidBets,
      isOpen,
      setIsOpen
    }}>
      {children}
    </BetSlipContext.Provider>
  );
};

export const useBetSlip = () => {
  const context = useContext(BetSlipContext);
  if (!context) {
    throw new Error('useBetSlip must be used within a BetSlipProvider');
  }
  return context;
};

// 🎯 Composant BetSlip
const BetSlip = () => {
  const { user, isAuthenticated } = useAuth();
  const {
    bets,
    removeBet,
    updateBetAmount,
    clearAllBets,
    getTotalStake,
    getTotalPotentialWin,
    getValidBets,
    isOpen,
    setIsOpen
  } = useBetSlip();

  const [isPlacing, setIsPlacing] = useState(false);
  const [message, setMessage] = useState("");
  const [betType, setBetType] = useState("single"); // single, multiple, system

  const validBets = getValidBets();
  const totalStake = getTotalStake();
  const totalPotentialWin = getTotalPotentialWin();

  // Calcul des gains combinés pour les paris multiples
  const getMultipleOdds = () => {
    return validBets.length > 1 ? validBets.reduce((acc, bet) => acc * bet.odds, 1) : 0;
  };

  const getMultiplePotentialWin = () => {
    if (validBets.length < 2 || totalStake === 0) return 0;
    return (totalStake / validBets.length) * getMultipleOdds() * validBets.length;
  };

  const handlePlaceBets = async () => {
    if (!isAuthenticated) {
      setMessage("❌ Vous devez être connecté pour parier");
      setTimeout(() => setMessage(""), 3000);
      return;
    }

    const betsToPlace = getValidBets();
    if (betsToPlace.length === 0) {
      setMessage("❌ Ajoutez au moins un pari avec un montant valide");
      setTimeout(() => setMessage(""), 3000);
      return;
    }

    setIsPlacing(true);
    setMessage("");

    try {
      const promises = betsToPlace.map(bet => {
        const payload = {
          fixture_id: bet.fixtureId,
          bet_amount: bet.amount,
          selected_outcome: bet.selectedOutcome,
          odds_at_bet: bet.odds,
          potential_payout: bet.amount * bet.odds,
        };
        return placeBet(payload);
      });

      await Promise.all(promises);
      
      setMessage(`✅ ${betsToPlace.length} pari(s) placé(s) avec succès !`);
      clearAllBets();
      setTimeout(() => setMessage(""), 5000);
    } catch (err) {
      console.error("Erreur lors de l'enregistrement des paris:", err);
      setMessage("❌ Erreur lors de l'enregistrement des paris. Veuillez réessayer.");
      setTimeout(() => setMessage(""), 5000);
    } finally {
      setIsPlacing(false);
    }
  };

  const getOutcomeLabel = (outcome, homeTeam, awayTeam) => {
    switch (outcome) {
      case 'home_win': return homeTeam;
      case 'away_win': return awayTeam;
      case 'draw': return 'Match Nul';
      default: return outcome;
    }
  };

  if (!isOpen && bets.length === 0) return null;

  return (
    <div className={`fixed top-0 right-0 h-full bg-gradient-to-b from-[#1a1a1a]/98 to-[#0f0f0f]/98 backdrop-blur-xl border-l border-gray-800/50 shadow-2xl transition-all duration-500 z-40 ${
      isOpen ? 'w-96 translate-x-0' : 'w-96 translate-x-full'
    }`}>
      
      {/* Header */}
      <div className="p-6 border-b border-gray-800/50 bg-gradient-to-r from-red-900/20 to-red-800/20">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-r from-red-500 to-red-400 rounded-xl flex items-center justify-center">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
            <div>
              <h3 className="text-xl font-bold text-white">Ticket de Paris</h3>
              <p className="text-gray-400 text-sm">{bets.length} sélection(s)</p>
            </div>
          </div>
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="p-3 rounded-xl bg-gray-800/50 hover:bg-gray-700/50 transition-all duration-300 transform hover:scale-110 group border border-gray-700/30"
          >
            <svg className={`w-5 h-5 transition-all duration-300 ${isOpen ? '' : 'rotate-180'} group-hover:text-red-400`}
              fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>

        {/* Onglets Type de Pari */}
        {bets.length > 1 && (
          <div className="flex gap-2">
            <button
              onClick={() => setBetType("single")}
              className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                betType === "single" 
                  ? "bg-red-600/80 text-white" 
                  : "bg-gray-800/40 text-gray-300 hover:bg-gray-700/40"
              }`}
            >
              Paris Simples
            </button>
            <button
              onClick={() => setBetType("multiple")}
              className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                betType === "multiple" 
                  ? "bg-red-600/80 text-white" 
                  : "bg-gray-800/40 text-gray-300 hover:bg-gray-700/40"
              }`}
            >
              Pari Multiple
            </button>
          </div>
        )}
      </div>

      {/* Liste des Paris */}
      <div className="flex-1 overflow-y-auto custom-scrollbar">
        {bets.length === 0 ? (
          <div className="p-6 text-center">
            <div className="w-20 h-20 bg-gray-800/40 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <svg className="w-10 h-10 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
            <h4 className="text-lg font-semibold text-gray-300 mb-2">Ticket Vide</h4>
            <p className="text-gray-400 text-sm">Cliquez sur les cotes des matchs pour ajouter vos paris</p>
          </div>
        ) : (
          <div className="p-4 space-y-3">
            {bets.map((bet, index) => (
              <div key={`${bet.fixtureId}-${bet.selectedOutcome}`} 
                className="bg-gray-800/40 rounded-xl p-4 border border-gray-700/30 backdrop-blur-sm">
                
                {/* Info du Match */}
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-white mb-1 truncate">
                      {bet.homeTeamName} vs {bet.awayTeamName}
                    </div>
                    <div className="flex items-center gap-2 mb-2">
                      <span className="px-2 py-1 bg-red-600/20 text-red-300 rounded text-xs font-medium">
                        {getOutcomeLabel(bet.selectedOutcome, bet.homeTeamName, bet.awayTeamName)}
                      </span>
                      <span className="text-green-400 font-bold text-sm">
                        @{bet.odds.toFixed(2)}
                      </span>
                    </div>
                    <div className="text-xs text-gray-400">
                      {new Date(bet.date).toLocaleDateString('fr-FR', {
                        day: 'numeric',
                        month: 'short',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </div>
                  </div>
                  <button
                    onClick={() => removeBet(bet.fixtureId, bet.selectedOutcome)}
                    className="p-2 rounded-lg bg-red-600/20 text-red-400 hover:bg-red-600/30 transition-all transform hover:scale-110"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>

                {/* Montant du Pari */}
                {betType === "single" && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-gray-300">Mise :</span>
                      <div className="flex-1">
                        <input
                          type="number"
                          placeholder="0.00"
                          value={bet.amount || ""}
                          onChange={(e) => updateBetAmount(bet.fixtureId, bet.selectedOutcome, e.target.value)}
                          min="0"
                          step="0.01"
                          className="w-full bg-gray-900/50 border border-gray-600/50 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-red-500 focus:border-red-500"
                        />
                      </div>
                      <span className="text-sm text-gray-400">€</span>
                    </div>
                    {bet.amount && bet.amount > 0 && (
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-gray-400">Gain potentiel :</span>
                        <span className="text-green-400 font-bold">
                          {(bet.amount * bet.odds).toFixed(2)} €
                        </span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer avec résumé et actions */}
      {bets.length > 0 && (
        <div className="border-t border-gray-800/50 bg-gradient-to-r from-gray-900/50 to-gray-800/50 backdrop-blur-sm">
          
          {/* Pari Multiple */}
          {betType === "multiple" && bets.length > 1 && (
            <div className="p-4 border-b border-gray-800/30">
              <div className="bg-blue-600/10 border border-blue-500/30 rounded-lg p-3">
                <div className="flex items-center gap-2 mb-2">
                  <svg className="w-4 h-4 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                  </svg>
                  <span className="text-sm font-medium text-blue-300">Pari Combiné</span>
                  <span className="text-xs text-blue-400">Cote: {getMultipleOdds().toFixed(2)}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-blue-300">Mise totale :</span>
                  <input
                    type="number"
                    placeholder="0.00"
                    value={totalStake || ""}
                    onChange={(e) => {
                      const amount = parseFloat(e.target.value) || 0;
                      const perBet = amount / bets.length;
                      bets.forEach(bet => {
                        updateBetAmount(bet.fixtureId, bet.selectedOutcome, perBet);
                      });
                    }}
                    min="0"
                    step="0.01"
                    className="flex-1 bg-gray-900/50 border border-gray-600/50 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                  <span className="text-sm text-blue-300">€</span>
                </div>
                {totalStake > 0 && (
                  <div className="flex justify-between items-center text-sm mt-2 pt-2 border-t border-blue-500/20">
                    <span className="text-blue-300">Gain potentiel :</span>
                    <span className="text-green-400 font-bold">
                      {getMultiplePotentialWin().toFixed(2)} €
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Résumé */}
          <div className="p-4">
            <div className="space-y-3 mb-4">
              <div className="flex justify-between items-center text-sm">
                <span className="text-gray-300">Paris sélectionnés :</span>
                <span className="text-white font-medium">{validBets.length}</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-gray-300">Mise totale :</span>
                <span className="text-white font-bold">{totalStake.toFixed(2)} €</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-gray-300">Gain potentiel :</span>
                <span className="text-green-400 font-bold">
                  {betType === "multiple" && bets.length > 1 
                    ? getMultiplePotentialWin().toFixed(2) 
                    : totalPotentialWin.toFixed(2)} €
                </span>
              </div>
            </div>

            {/* Actions */}
            <div className="space-y-2">
              <button
                onClick={handlePlaceBets}
                disabled={validBets.length === 0 || isPlacing || !isAuthenticated}
                className="w-full bg-gradient-to-r from-red-600 to-red-500 text-white py-3 rounded-xl font-bold hover:from-red-500 hover:to-red-400 transition-all duration-200 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 flex items-center justify-center gap-2"
              >
                {isPlacing ? (
                  <>
                    <svg className="animate-spin w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    Placement...
                  </>
                ) : (
                  <>
                    🎯 Placer {validBets.length > 1 ? 'les paris' : 'le pari'}
                  </>
                )}
              </button>

              <button
                onClick={clearAllBets}
                className="w-full bg-gray-800/60 text-gray-300 py-2.5 rounded-xl font-medium hover:bg-gray-700/60 transition-all duration-200"
              >
                🗑️ Vider le ticket
              </button>
            </div>

            {/* Messages */}
            {message && (
              <div className={`mt-3 p-3 rounded-lg text-sm font-medium text-center ${
                message.includes("✅") 
                  ? "bg-green-600/20 text-green-400 border border-green-500/30" 
                  : "bg-red-600/20 text-red-400 border border-red-500/30"
              }`}>
                {message}
              </div>
            )}

            {!isAuthenticated && (
              <div className="mt-3 p-3 bg-yellow-600/20 text-yellow-400 border border-yellow-500/30 rounded-lg text-sm text-center">
                ⚠️ Connectez-vous pour placer des paris
              </div>
            )}
          </div>
        </div>
      )}

      {/* Scrollbar custom */}
      <style jsx>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(239, 68, 68, 0.4);
          border-radius: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(239, 68, 68, 0.6);
        }
      `}</style>
    </div>
  );
};

// 🎯 Bouton flottant pour ouvrir/fermer le betslip
export const BetSlipToggle = () => {
  const { bets, isOpen, setIsOpen } = useBetSlip();
  
  if (bets.length === 0) return null;

  return (
    <button
      onClick={() => setIsOpen(!isOpen)}
      className={`fixed top-1/2 right-0 transform -translate-y-1/2 bg-gradient-to-l from-red-600 to-red-500 text-white px-4 py-6 rounded-l-2xl shadow-2xl transition-all duration-300 z-50 hover:shadow-red-500/25 border-l border-t border-b border-red-400/30 ${
        isOpen ? 'translate-x-96' : 'translate-x-0'
      }`}
    >
      <div className="flex flex-col items-center gap-2">
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
        </svg>
        <div className="bg-white text-red-600 rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold">
          {bets.length}
        </div>
        <div className="text-xs font-medium writing-mode-vertical text-center" style={{ writingMode: 'vertical-lr' }}>
          TICKET
        </div>
      </div>
    </button>
  );
};

export default BetSlip;