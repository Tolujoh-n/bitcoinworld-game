import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import Navbar from './components/Navbar';
import Home from './pages/Home';
import GameList from './pages/GameList';
import SnakeGame from './pages/games/SnakeGame';
import FallingFruitGame from './pages/games/FallingFruitGame';
import BreakBricksGame from './pages/games/BreakBricksGame';
import CarRacingGame from './pages/games/CarRacingGame';
import Stats from './pages/Stats';
import Leaderboard from './pages/Leaderboard';
import GameRouteGuard from './components/GameRouteGuard';
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
            <Route 
              path="/games/snake" 
              element={
                <GameRouteGuard>
                  <SnakeGame />
                </GameRouteGuard>
              } 
            />
            <Route 
              path="/games/falling-fruit" 
              element={
                <GameRouteGuard>
                  <FallingFruitGame />
                </GameRouteGuard>
              } 
            />
            <Route 
              path="/games/break-bricks" 
              element={
                <GameRouteGuard>
                  <BreakBricksGame />
                </GameRouteGuard>
              } 
            />
            <Route 
              path="/games/car-racing" 
              element={
                <GameRouteGuard>
                  <CarRacingGame />
                </GameRouteGuard>
              } 
            />
            <Route path="/stats" element={<Stats />} />
            <Route path="/leaderboard" element={<Leaderboard />} />
          </Routes>
        </div>
      </Router>
    </AuthProvider>
  );
}

export default App;
