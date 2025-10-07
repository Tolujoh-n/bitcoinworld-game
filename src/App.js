import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import Navbar from './components/Navbar';
import Home from './pages/Home';
import GameList from './pages/GameList';
import SnakeGame from './pages/games/SnakeGame';
import FallingFruitGame from './pages/games/FallingFruitGame';
import FallingFruitGameDebug from './pages/games/FallingFruitGameDebug';
import BreakBricksGame from './pages/games/BreakBricksGame';
import ClickCounterGame from './pages/games/ClickCounterGame';
import BreakBricksGameDebug from './pages/games/BreakBricksGameDebug';
import ClickCounterGameDebug from './pages/games/ClickCounterGameDebug';
import Stats from './pages/Stats';
import Leaderboard from './pages/Leaderboard';
import LoginModal from './components/LoginModal';
import './App.css';

function App() {
  return (
    <AuthProvider>
      <Router>
        <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-purple-900">
          <Navbar />
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/games" element={<GameList />} />
            <Route path="/games/snake" element={<SnakeGame />} />
            <Route path="/games/falling-fruit" element={<FallingFruitGameDebug />} />
            <Route path="/games/break-bricks" element={<BreakBricksGameDebug />} />
            <Route path="/games/click-counter" element={<ClickCounterGameDebug />} />
            <Route path="/stats" element={<Stats />} />
            <Route path="/leaderboard" element={<Leaderboard />} />
          </Routes>
          <LoginModal />
        </div>
      </Router>
    </AuthProvider>
  );
}

export default App;
