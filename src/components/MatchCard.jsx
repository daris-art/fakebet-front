import React, { useState, useEffect} from "react";
import axios from "axios";
import { placeBet, getFixturesByLeague } from "../services/api";
import { useAuth } from "../context/AuthContext"; // 🆕 Import du contexte

const MatchCard = ({ fixture, userId }) => {
  const { user, updateUserBalance, refreshUserProfile } = useAuth(); // 🆕 Utilisation du contexte
  
  const {
    id: fixtureId,
    home_team_name,
    away_team_name,
    date,
    odds,
    league_id,
  } = fixture;
  
  const [selectedOutcome, setSelectedOutcome] = useState(null);
  const [betAmount, setBetAmount] = useState("");
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [league, setLeague] = useState(null);

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

    // 🆕 Vérification de la balance
    const betAmountFloat = parseFloat(betAmount);
    if (user?.balance < betAmountFloat) {
      setMessage("❌ Solde insuffisant pour placer ce pari.");
      setTimeout(() => setMessage(""), 3000);
      return;
    }

    setIsLoading(true);
    setMessage("");

    const payload = {
      fixture_id: fixtureId,
      bet_amount: betAmountFloat,
      selected_outcome: selectedOutcome,
      odds_at_bet: oddsValue,
      potential_payout: betAmountFloat * oddsValue,
    };

    try {
      // 🆕 Déduction optimiste de la balance
      updateUserBalance(user.balance - betAmountFloat);
      
      // Placer le pari
      await placeBet(payload);
      
      setMessage("✅ Pari enregistré avec succès !");
      setBetAmount("");
      setSelectedOutcome(null);
      setTimeout(() => setMessage(""), 5000);

      // 🆕 Rafraîchir le profil pour synchroniser avec le serveur
      try {
        await refreshUserProfile();
      } catch (profileError) {
        console.warn("⚠️ Erreur lors du rafraîchissement du profil:", profileError);
        // On garde la balance optimiste mise à jour
      }
      
    } catch (err) {
      console.error("Erreur lors de l'enregistrement du pari:", err);
      
      // 🆕 En cas d'erreur, restaurer la balance
      updateUserBalance(user.balance);
      
      // Message d'erreur plus spécifique
      if (err.response?.data?.message) {
        setMessage(`❌ ${err.response.data.message}`);
      } else if (err.response?.status === 400) {
        setMessage("❌ Solde insuffisant ou pari invalide.");
      } else {
        setMessage("❌ Erreur lors de l'enregistrement du pari. Veuillez réessayer.");
      }
      
      setTimeout(() => setMessage(""), 5000);
    } finally {
      setIsLoading(false);
    }
  };

  const potentialGain = betAmount && oddsValue ? (parseFloat(betAmount) * oddsValue).toFixed(2) : "0.00";

  // Charger la ligue au montage du composant
  useEffect(() => {
    if (league_id) {
      getFixturesByLeague(league_id)
        .then((res) => {
          // Comme l'API renvoie une liste de matchs de la ligue,
          // on prend le premier pour récupérer league_name/logo
          if (res.data && res.data.length > 0) {
            setLeague({
              name: res.data[0].league_name,
              logo: res.data[0].league_logo,
            });
          }
        })
        .catch((err) => {
          console.error("Erreur chargement ligue:", err);
        });
    }
  }, [league_id]);

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
      
      {/* Date + Ligue dans la même ligne */}
      <div className="flex items-center gap-6 text-sm text-gray-400 mb-6">
        {/* Date */}
        <div className="flex items-center gap-2">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          {new Date(date).toLocaleString("fr-FR", {
            day: "numeric",
            month: "short",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
          })}
        </div>

        {/* Ligue */}
        {league && (
          <div className="flex items-center gap-2">
            {league.logo && (
              <img
                src={league.logo}
                alt="logo ligue"
                className="w-5 h-5 rounded-full"
              />
            )}
            <span>{league.name}</span>
          </div>
        )}
      </div>

      {/* 🆕 Affichage du solde utilisateur dans la carte */}
      {user?.balance !== undefined && (
        <div className="mb-4 p-3 bg-blue-600/10 border border-blue-500/30 rounded-lg">
          <div className="flex items-center justify-between">
            <span className="text-sm text-blue-300">Votre solde :</span>
            <span className="text-lg font-bold text-blue-400">
              {typeof user.balance === 'number' ? user.balance.toFixed(2) : user.balance} €
            </span>
          </div>
        </div>
      )}

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
            max={user?.balance || 1000} // 🆕 Limite au solde disponible
            className="w-full bg-[#2a2a2a] border border-gray-600 text-white rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all"
            disabled={isLoading}
          />
          {/* 🆕 Indicateur de solde insuffisant */}
          {betAmount && parseFloat(betAmount) > (user?.balance || 0) && (
            <div className="text-red-400 text-xs mt-1 flex items-center gap-1">
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L3.314 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
              Solde insuffisant
            </div>
          )}
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
          disabled={
            !selectedOutcome || 
            !betAmount || 
            isLoading || 
            parseFloat(betAmount) <= 0 || 
            !userId ||
            parseFloat(betAmount) > (user?.balance || 0) // 🆕 Désactiver si solde insuffisant
          }
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