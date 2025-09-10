// 🔧 src/App.jsx - VERSION CORRIGÉE
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate
} from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import BettingPage from './pages/BettingPage';
import LoginForm from './pages/LoginForm';
import RegisterPage from './pages/RegisterPage';
import MyBetsPage from './pages/MyBetsPage';
import Navbar from './components/Navbar';
import ProtectedRoute from './components/ProtectedRoute';

function App() {
  return (
    <Router>
      <AuthProvider>
        <Navbar />
        <Routes>
          {/* Pages publiques */}
          <Route path="/" element={<BettingPage />} />
          <Route path="/login" element={<LoginForm />} />
          <Route path="/register" element={<RegisterPage />} />

          {/* Routes protégées */}
          <Route element={<ProtectedRoute />}>
            <Route path="/mes-paris" element={<MyBetsPage />} />
          </Route>

          {/* Redirection par défaut */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </Router>
  );
}

export default App;