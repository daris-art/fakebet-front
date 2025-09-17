import { useState, useEffect } from "react";
import { Dialog } from "@headlessui/react";
import toast from "react-hot-toast";
import { placeBet, getFixturesByLeague } from "../services/api"; // adapte selon ton projet

const MatchCard = ({ fixture, userId }) => {
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
  const [isLoading, setIsLoading] = useState(false);
  const [league, setLeague] = useState(null);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);

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
          {new Date(date).toLocaleString("fr-FR", {
            day: "numeric",
            month: "short",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
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

  const potentialGain =
    betAmount && oddsValue
      ? (parseFloat(betAmount) * oddsValue).toFixed(2)
      : "0.00";

  // Confirmation avant pari
  const handleBetClick = () => {
    if (
      !selectedOutcome ||
      !betAmount ||
      isNaN(betAmount) ||
      parseFloat(betAmount) <= 0
    ) {
      toast.error("⚠️ Choisis une issue et un montant valide.");
      return;
    }
    setIsConfirmOpen(true);
  };

  const confirmBet = async () => {
    setIsLoading(true);
    setIsConfirmOpen(false);

    const payload = {
      fixture_id: fixtureId,
      bet_amount: parseFloat(betAmount),
      selected_outcome: selectedOutcome,
      odds_at_bet: oddsValue,
      potential_payout: parseFloat(betAmount) * oddsValue,
    };

    try {
      await placeBet(payload);
      toast.success("✅ Pari enregistré avec succès !");
      setBetAmount("");
      setSelectedOutcome(null);
    } catch (err) {
      console.error("Erreur lors de l'enregistrement du pari:", err);
      toast.error("❌ Erreur lors de l'enregistrement du pari. Réessaie.");
    } finally {
      setIsLoading(false);
    }
  };

  // Charger la ligue
  useEffect(() => {
    if (league_id) {
      getFixturesByLeague(league_id)
        .then((res) => {
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
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-xl font-bold bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">
          {home_team_name} vs {away_team_name}
        </h3>
        <div className="px-3 py-1 bg-green-600/20 text-green-400 rounded-full text-xs font-medium">
          Cotes disponibles
        </div>
      </div>

      {/* Date + Ligue */}
      <div className="flex items-center gap-6 text-sm text-gray-400 mb-6">
        <div className="flex items-center gap-2">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          {new Date(date).toLocaleString("fr-FR", {
            day: "numeric",
            month: "short",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
          })}
        </div>
        {league && (
          <div className="flex items-center gap-2">
            {league.logo && (
              <img src={league.logo} alt="logo ligue" className="w-5 h-5 rounded-full" />
            )}
            <span>{league.name}</span>
          </div>
        )}
      </div>

      {/* Boutons des cotes */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        {["home_win", "draw", "away_win"].map((outcome) => (
          <button
            key={outcome}
            className={`py-4 px-3 rounded-xl font-semibold transition-all duration-200 transform hover:scale-105 ${
              selectedOutcome === outcome
                ? "bg-gradient-to-r from-red-600 to-red-500 text-white shadow-lg ring-2 ring-red-400/50"
                : "bg-[#2a2a2a] text-gray-200 hover:bg-[#333] border border-gray-600/50"
            }`}
            onClick={() => setSelectedOutcome(outcome)}
            disabled={isLoading}
          >
            <div className="text-xs opacity-80 mb-1">
              {outcome === "home_win" ? "Victoire" : outcome === "away_win" ? "Victoire" : "Match"}
            </div>
            <div className="text-sm font-bold">
              {outcome === "home_win"
                ? home_team_name
                : outcome === "away_win"
                ? away_team_name
                : "Nul"}
            </div>
            <div className="text-lg font-bold mt-1">
              {bookmaker[outcome]?.toFixed(2) || "N/A"}
            </div>
          </button>
        ))}
      </div>

      {/* Sélection */}
      {selectedOutcome && (
        <div className="bg-red-600/10 border border-red-500/30 rounded-lg p-3 mb-4">
          <div className="text-sm text-red-300 font-medium">
            Sélection :{" "}
            {selectedOutcome === "home_win"
              ? home_team_name
              : selectedOutcome === "away_win"
              ? away_team_name
              : "Match Nul"}
          </div>
          <div className="text-xs text-red-400 mt-1">
            Cote : {oddsValue?.toFixed(2)}
          </div>
        </div>
      )}

      {/* Montant */}
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

        {betAmount && selectedOutcome && (
          <div className="bg-green-600/10 border border-green-500/30 rounded-lg p-3">
            <div className="flex justify-between items-center">
              <span className="text-sm text-green-300">Gain potentiel :</span>
              <span className="text-lg font-bold text-green-400">{potentialGain} €</span>
            </div>
          </div>
        )}

        {/* Bouton */}
        <button
          onClick={handleBetClick}
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

      {/* Modal confirmation */}
      <Dialog open={isConfirmOpen} onClose={() => setIsConfirmOpen(false)} className="relative z-50">
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" aria-hidden="true" />
        <div className="fixed inset-0 flex items-center justify-center p-4">
          <Dialog.Panel className="bg-[#1f1f1f] text-white rounded-2xl p-6 shadow-2xl max-w-sm w-full border border-gray-700/50">
            <Dialog.Title className="text-lg font-bold mb-4">
              📋 Confirmation du pari
            </Dialog.Title>
            <p className="text-sm text-gray-300 mb-4">
              Tu veux parier <span className="font-semibold">{betAmount}€</span> sur{" "}
              <span className="text-red-400 font-semibold">
                {selectedOutcome === "home_win"
                  ? home_team_name
                  : selectedOutcome === "away_win"
                  ? away_team_name
                  : "Match Nul"}
              </span>{" "}
              avec une cote de{" "}
              <span className="text-indigo-400 font-bold">
                {oddsValue?.toFixed(2)}
              </span>
              ?
            </p>
            <div className="bg-green-600/10 border border-green-500/30 rounded-lg p-3 mb-4">
              <div className="flex justify-between text-sm">
                <span>Gain potentiel :</span>
                <span className="text-green-400 font-bold">{potentialGain} €</span>
              </div>
            </div>
            <div className="flex gap-3">
              <button
                className="flex-1 py-2 rounded-lg border border-gray-600 hover:bg-gray-700 transition"
                onClick={() => setIsConfirmOpen(false)}
              >
                Annuler
              </button>
              <button
                className="flex-1 py-2 rounded-lg bg-gradient-to-r from-red-600 to-red-500 hover:from-red-500 hover:to-red-400 font-bold"
                onClick={confirmBet}
              >
                Confirmer
              </button>
            </div>
          </Dialog.Panel>
        </div>
      </Dialog>
    </div>
  );
};

export default MatchCard;
