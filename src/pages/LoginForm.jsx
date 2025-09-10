import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import axios from "axios";

const LoginForm = () => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [usernameError, setUsernameError] = useState("");
  const [loading, setLoading] = useState(false);
  const [toastError, setToastError] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    if (username.length > 0 && username.length < 3) {
      setUsernameError("Nom trop court (min 3 caractères)");
    } else {
      setUsernameError("");
    }
  }, [username]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setToastError("");

    try {
      const response = await axios.post("/api/auth/login", {
        username,
        password,
      });

      const token = response.data.access_token;
      localStorage.setItem("jwt_token", token);

      // ✅ Redirection après succès
      navigate("/mes-paris");
    } catch (err) {
      const message =
        err.response?.data?.error || "Erreur de connexion. Vérifiez vos identifiants.";
      setToastError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#0a0a0a] to-[#1a1a1a] relative">
      {/* 🚨 Toast d'erreur */}
      {toastError && (
        <div className="absolute top-6 right-6 bg-red-600 text-white px-4 py-2 rounded-lg shadow-lg animate-slide-in">
          {toastError}
        </div>
      )}

      <div className="w-full max-w-md p-8 space-y-8 bg-gray-800/50 rounded-2xl shadow-2xl backdrop-blur-lg border border-red-500/20 animate-fade-in">
        <h2 className="text-3xl font-bold text-center text-white">Connexion</h2>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Username */}
          <div>
            <label htmlFor="username" className="block text-sm font-medium text-gray-300 mb-1">
              Nom d'utilisateur
            </label>
            <input
              type="text"
              id="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              className={`w-full px-4 py-2 bg-gray-900 text-white rounded-lg border ${
                usernameError ? "border-red-500" : "border-gray-700"
              } focus:outline-none focus:ring-2 focus:ring-red-500`}
            />
            {usernameError && <p className="text-red-400 text-sm mt-1">{usernameError}</p>}
          </div>

          {/* Password */}
          <div className="relative">
            <label htmlFor="password" className="block text-sm font-medium text-gray-300 mb-1">
              Mot de passe
            </label>
            <input
              type={showPassword ? "text" : "password"}
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full px-4 py-2 bg-gray-900 text-white rounded-lg border border-gray-700 focus:outline-none focus:ring-2 focus:ring-red-500"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-9 text-gray-400 hover:text-red-400"
            >
              {showPassword ? "🙈" : "👁️"}
            </button>
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={loading}
            className={`w-full py-2 px-4 font-semibold rounded-lg transition-all duration-300 ${
              loading
                ? "bg-gray-700 text-gray-400 cursor-not-allowed"
                : "bg-red-600 hover:bg-red-700 text-white"
            }`}
          >
            {loading ? "Connexion..." : "Se connecter"}
          </button>
        </form>

        <p className="text-center text-gray-400">
          Pas encore de compte ?{" "}
          <Link to="/register" className="font-medium text-red-400 hover:text-red-300">
            Inscrivez-vous
          </Link>
        </p>
      </div>
    </div>
  );
};

export default LoginForm;
