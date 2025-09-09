import axios from 'axios';

// Adresse de ton backend Flask
const BASE_URL = "http://127.0.0.1:5000/api";

// 🔹 Récupérer tous les matchs disponibles
export const getFixtures = () => {
  return axios.get(`${BASE_URL}/fixtures/`);
};

// 🔹 Récupérer toutes les ligues
export const getLeagues = () => {
  return axios.get(`${BASE_URL}/leagues/`);
};

// 🔹 Récupérer toutes les équipes
export const getTeams = () => {
  return axios.get(`${BASE_URL}/teams/`);
};

// 🔹 Récupérer tous les paris
export const getBets = () => {
  return axios.get(`${BASE_URL}/bets/`);
};

// 🔹 Enregistrer un nouveau pari
export const placeBet = (betData) => {
  return axios.post(`${BASE_URL}/bets/`, betData);
};
