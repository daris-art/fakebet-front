// App.jsx

import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
  Outlet,
  useLocation
} from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import BettingPage from './pages/BettingPage';
import LoginForm from './pages/LoginForm';
import MyBetsPage from './pages/MyBetsPage';
import Navbar from './components/Navbar';
import ProtectedRoute from './components/ProtectedRoute';

function App() {
  return (
    <AuthProvider>
      <Navbar />
      <Routes>
        <Route path="/" element={<BettingPage />} />
        <Route path="/login" element={<LoginForm />} />

        {/* Protected routes here */}
        <Route element={<ProtectedRoute />}>
          <Route path="/mes-paris" element={<MyBetsPage />} />
        </Route>
      </Routes>
    </AuthProvider>
  );
}

export default App;