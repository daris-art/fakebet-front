import React, { useState } from "react";
import axios from "axios";

const MatchCard = ({ fixture, userId }) => {
  const {
    id: fixtureId,
    home_team_name,
    away_team_name,
    date,
    odds,
  } = fixture;

  const [selectedOutcome, setSelectedOutcome] = useState(null);
  const [betAmount, setBetAmount] = useState("");
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  if (!odds || !Object.keys(odds).length) {
    return (
      <div className="bg-gradient-to-r from-[#1a1a1a] to-[#1f1f1f] text-white shadow-lg rounded-2xl p-6 border border-gray-700/50 backdrop-blur-sm">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-bold bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">
            {home_team_name} vs {away_team_name}
          </h3>
          <div className="px-3 py-1 bg-red-600/20 text-red-400 rounded-full text-xs font-medium">
            Cotes indisponibles
          </div>
        </div>
        <div className="flex items-center gap-2 text-sm text-gray-400 mb-4">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          {new Date(date).toLocaleString('fr-FR', {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
          })}
        </div>
        <div className="flex items-center justify-center py-8 text-red-400">
          <svg className="w-8 h-8 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L3.314 16.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
          Aucune cote disponible pour ce match
        </div>
      </div>
    );
  }

  // 🔎 on prend par défaut "parionssport_fr" si dispo, sinon le premier bookmaker
  // --- Normalisation odds ---
  let oddsObj = {};
  try {
    oddsObj = typeof odds === "string" ? JSON.parse(odds) : odds;
  } catch (e) {
    console.error("Erreur parsing odds:", e, odds);
    oddsObj = {};
  }

  // Choix du bookmaker
  const bookmakerKey = oddsObj.parionssport_fr
    ? "parionssport_fr"
    : Object.keys(oddsObj)[0];

  const bookmaker = oddsObj[bookmakerKey] || {};
  const oddsValue =
    selectedOutcome && bookmaker ? bookmaker[selectedOutcome] : null;

  const handleBet = async () => {
    if (!selectedOutcome || !betAmount || isNaN(betAmount) || parseFloat(betAmount) <= 0) {
      setMessage("⚠️ Choisis une issue et un montant valide.");
      setTimeout(() => setMessage(""), 3000);
      return;
    }

    setIsLoading(true);
    setMessage("");

    const payload = {
      fixture_id: fixtureId,
      bet_amount: parseFloat(betAmount),
      selected_outcome: selectedOutcome,
      odds_at_bet: oddsValue,
      potential_payout: parseFloat(betAmount) * oddsValue,
    };

    try {
      // Utiliser une URL relative si vous avez configuré le proxy Vite
      await placeBet(payload);
      // OU utiliser l'URL complète si pas de proxy :
      // await axios.post("http://127.0.0.1:5000/api/bets", payload);
      
      setMessage("✅ Pari enregistré avec succès !");
      setBetAmount("");
      setSelectedOutcome(null);
      setTimeout(() => setMessage(""), 5000);
    } catch (err) {
      console.error("Erreur lors de l'enregistrement du pari:", err);
      setMessage("❌ Erreur lors de l'enregistrement du pari. Veuillez réessayer.");
      setTimeout(() => setMessage(""), 5000);
    } finally {
      setIsLoading(false);
    }
  };

  const potentialGain = betAmount && oddsValue ? (parseFloat(betAmount) * oddsValue).toFixed(2) : "0.00";

  return (
    <div className="bg-gradient-to-r from-[#1a1a1a] to-[#1f1f1f] text-white shadow-xl rounded-2xl p-6 border border-gray-700/50 backdrop-blur-sm hover:shadow-2xl transition-all duration-300">
      {/* Header du match */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-xl font-bold bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">
          {home_team_name} vs {away_team_name}
        </h3>
        <div className="px-3 py-1 bg-green-600/20 text-green-400 rounded-full text-xs font-medium">
          Cotes disponibles
        </div>
      </div>

      {/* Date et heure */}
      <div className="flex items-center gap-2 text-sm text-gray-400 mb-6">
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        {new Date(date).toLocaleString('fr-FR', {
          day: 'numeric',
          month: 'short',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        })}
      </div>

      {/* Boutons des cotes */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        <button
          className={`py-4 px-3 rounded-xl font-semibold transition-all duration-200 transform hover:scale-105 ${
            selectedOutcome === "home_win"
              ? "bg-gradient-to-r from-red-600 to-red-500 text-white shadow-lg ring-2 ring-red-400/50"
              : "bg-[#2a2a2a] text-gray-200 hover:bg-[#333] border border-gray-600/50"
          }`}
          onClick={() => setSelectedOutcome("home_win")}
          disabled={isLoading}
        >
          <div className="text-xs opacity-80 mb-1">Victoire</div>
          <div className="text-sm font-bold">{home_team_name}</div>
          <div className="text-lg font-bold mt-1">
            {bookmaker.home_win?.toFixed(2) || "N/A"}
          </div>
        </button>

        <button
          className={`py-4 px-3 rounded-xl font-semibold transition-all duration-200 transform hover:scale-105 ${
            selectedOutcome === "draw"
              ? "bg-gradient-to-r from-red-600 to-red-500 text-white shadow-lg ring-2 ring-red-400/50"
              : "bg-[#2a2a2a] text-gray-200 hover:bg-[#333] border border-gray-600/50"
          }`}
          onClick={() => setSelectedOutcome("draw")}
          disabled={isLoading}
        >
          <div className="text-xs opacity-80 mb-1">Match</div>
          <div className="text-sm font-bold">Nul</div>
          <div className="text-lg font-bold mt-1">
            {bookmaker.draw?.toFixed(2) || "N/A"}
          </div>
        </button>

        <button
          className={`py-4 px-3 rounded-xl font-semibold transition-all duration-200 transform hover:scale-105 ${
            selectedOutcome === "away_win"
              ? "bg-gradient-to-r from-red-600 to-red-500 text-white shadow-lg ring-2 ring-red-400/50"
              : "bg-[#2a2a2a] text-gray-200 hover:bg-[#333] border border-gray-600/50"
          }`}
          onClick={() => setSelectedOutcome("away_win")}
          disabled={isLoading}
        >
          <div className="text-xs opacity-80 mb-1">Victoire</div>
          <div className="text-sm font-bold">{away_team_name}</div>
          <div className="text-lg font-bold mt-1">
            {bookmaker.away_win?.toFixed(2) || "N/A"}
          </div>
        </button>
      </div>

      {/* Sélection visible */}
      {selectedOutcome && (
        <div className="bg-red-600/10 border border-red-500/30 rounded-lg p-3 mb-4">
          <div className="text-sm text-red-300 font-medium">
            Sélection : {selectedOutcome === "home_win" ? home_team_name : selectedOutcome === "away_win" ? away_team_name : "Match Nul"}
          </div>
          <div className="text-xs text-red-400 mt-1">
            Cote : {oddsValue?.toFixed(2)}
          </div>
        </div>
      )}

      {/* Saisie montant */}
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            💶 Montant du pari (€)
          </label>
          <input
            type="number"
            placeholder="0.00"
            value={betAmount}
            onChange={(e) => setBetAmount(e.target.value)}
            min="0"
            step="0.01"
            className="w-full bg-[#2a2a2a] border border-gray-600 text-white rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all"
            disabled={isLoading}
          />
        </div>

        {/* Gain potentiel */}
        {betAmount && selectedOutcome && (
          <div className="bg-green-600/10 border border-green-500/30 rounded-lg p-3">
            <div className="flex justify-between items-center">
              <span className="text-sm text-green-300">Gain potentiel :</span>
              <span className="text-lg font-bold text-green-400">{potentialGain} €</span>
            </div>
          </div>
        )}

        {/* Bouton parier */}
        <button
          onClick={handleBet}
          disabled={!selectedOutcome || !betAmount || isLoading || parseFloat(betAmount) <= 0 || !userId}
          className="w-full bg-gradient-to-r from-red-600 to-red-500 text-white py-4 rounded-xl font-bold hover:from-red-500 hover:to-red-400 transition-all duration-200 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 flex items-center justify-center gap-2"
        >
          {isLoading ? (
            <>
              <svg className="animate-spin w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Traitement...
            </>
          ) : (
            "🎯 Placer le pari"
          )}
        </button>
      </div>

      {/* Messages */}
      {message && (
        <div className={`mt-4 p-3 rounded-lg text-sm font-medium text-center ${
          message.includes("✅") 
            ? "bg-green-600/20 text-green-400 border border-green-500/30" 
            : "bg-red-600/20 text-red-400 border border-red-500/30"
        }`}>
          {message}
        </div>
      )}
    </div>
  );
};

export default MatchCard;