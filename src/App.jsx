import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import BettingPage from './pages/BettingPage';
import MyBetsPage from './pages/MyBetsPage';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<BettingPage />} />
        <Route path="/mes-paris" element={<MyBetsPage />} />
      </Routes>
    </Router>
  );
}

export default App;

