import axios from 'axios';

// Adresse de ton backend Flask
const BASE_URL = "http://127.0.0.1:5000/api";

// On crée une instance d'axios
export const api = axios.create({
  baseURL: BASE_URL,
});

// 🚀 Intercepteur pour ajouter le token JWT à chaque requête
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// --- Fonctions d'Authentification ---
export const registerUser = (userData) => api.post('/auth/register', userData);
export const loginUser = (credentials) => api.post('/auth/login', credentials);
export const getUserProfile = () => api.get('/auth/profile');

// --- Fonctions existantes utilisant l'instance `api` ---

// 🔹 Récupérer tous les matchs disponibles
export const getFixtures = () => api.get('/fixtures/');

// 🔹 Récupérer toutes les ligues
export const getLeagues = () => api.get('/leagues/');

// 🔹 Récupérer toutes les équipes
export const getTeams = () => api.get('/teams/');

// 🔹 Récupérer les paris de l'utilisateur connecté (le backend identifie l'user via le token)
export const getBets = () => api.get('/bets/');

// 🔹 Enregistrer un nouveau pari
export const placeBet = (betData) => api.post('/bets/', betData);

export const getFixturesByLeague = (leagueId) => {
  return api.get(`/fixtures/league/${leagueId}`);
};


export default api;