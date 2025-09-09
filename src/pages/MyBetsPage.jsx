import React, { useEffect, useState } from "react";
import axios from "axios";

const MyBetsPage = () => {
  const [bets, setBets] = useState([]);
  const [fixtures, setFixtures] = useState({});
  const [loading, setLoading] = useState(true);
  const userId = "user123"; // à remplacer par l'utilisateur connecté

  useEffect(() => {
    axios.get(`/api/bets?user_id=${userId}`)
      .then(async (res) => {
        const betsData = res.data;
        const fixtureMap = {};

        // 🔁 Charger les fixtures associées à chaque pari
        await Promise.all(
          betsData.map(async (bet) => {
            if (!fixtureMap[bet.fixture_id]) {
              try {
                const fixtureRes = await axios.get(`/api/fixtures/${bet.fixture_id}`);
                fixtureMap[bet.fixture_id] = fixtureRes.data;
              } catch (err) {
                console.error(`Erreur chargement fixture ${bet.fixture_id}`, err);
              }
            }
          })
        );

        setFixtures(fixtureMap);
        setBets(betsData);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Erreur chargement des paris :", err);
        setLoading(false);
      });
  }, []);

  return (
    <div className="min-h-screen bg-[#121212] text-white">
      <div className="bg-gradient-to-r from-indigo-700 via-indigo-600 to-indigo-500 py-8 shadow-xl border-b border-indigo-400/20">
        <div className="max-w-7xl mx-auto px-4">
          <h1 className="text-center text-3xl md:text-4xl font-extrabold tracking-tight">
            🎯 Mes Paris
          </h1>
          <p className="text-center text-indigo-100 mt-2 text-sm md:text-base">
            Suis tes paris, découvre tes gains et analyse tes performances.
          </p>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-10">
        {loading ? (
          <div className="text-center text-gray-400 animate-pulse">Chargement des paris...</div>
        ) : bets.length === 0 ? (
          <div className="text-center text-gray-500">Aucun pari enregistré pour le moment.</div>
        ) : (
          <div className="space-y-6">
            {bets.map((bet) => {
              const fixture = fixtures[bet.fixture_id];
              const home = fixture?.home_team_name || "Équipe A";
              const away = fixture?.away_team_name || "Équipe B";

              return (
                <div key={bet.id} className="bg-[#1e1e1e] rounded-xl p-6 shadow-md border border-gray-800 hover:shadow-lg transition-all">
                  <div className="flex justify-between items-center mb-4">
                    <div className="text-lg font-semibold text-white">
                      {home} vs {away}
                    </div>
                    <div className={`px-3 py-1 rounded-full text-sm font-medium ${
                      bet.status === "won" ? "bg-green-600" :
                      bet.status === "lost" ? "bg-red-600" :
                      bet.status === "cancelled" ? "bg-gray-600" :
                      "bg-yellow-600"
                    }`}>
                      {bet.status.toUpperCase()}
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4 text-sm text-gray-300">
                    <div><span className="font-medium text-white">Montant :</span> {bet.bet_amount} €</div>
                    <div><span className="font-medium text-white">Cote :</span> {bet.odds_at_bet ?? "—"}</div>
                    <div><span className="font-medium text-white">Gain potentiel :</span> {bet.potential_payout ?? "—"} €</div>
                    <div><span className="font-medium text-white">Choix :</span> {bet.selected_outcome}</div>
                    <div><span className="font-medium text-white">Date :</span> {new Date(bet.bet_time).toLocaleString()}</div>
                    <div><span className="font-medium text-white">Résultat :</span> {bet.outcome_result ?? "—"}</div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default MyBetsPage;
