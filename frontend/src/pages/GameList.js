import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';

const GameList = () => {
  const { user, requireAuth } = useAuth();
  const [games, setGames] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const routeMap = {
    snake: 'snake',
    fallingFruit: 'falling-fruit',
    breakBricks: 'break-bricks',
    carRacing: 'car-racing',
  };

  const fetchGames = useCallback(async () => {
    try {
      setLoading(true);
      const response = await api.get('/games');
      const fetchedGames = response.data?.games || [];
      setGames(fetchedGames);
    } catch (error) {
      setError('Failed to load games');
      console.error('Error fetching games:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchGames();
  }, [fetchGames]);

  const handleGameClick = async (e, routeId) => {
    if (!user) {
      e.preventDefault();
      const result = await requireAuth();
      if (result) {
        // Navigate after successful auth
        window.location.href = `/games/${routeId}`;
      }
    }
    // If user is already logged in, let Link handle navigation
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-white text-xl">Loading games...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-red-400 text-xl">{error}</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen py-12 px-4 sm:px-6 lg:px-8 bg-gradient-to-br from-gray-900 via-yellow-900 to-yellow-800">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-12">
          <h1 className="text-5xl font-bold text-yellow-300 mb-4 flex items-center justify-center">
            🎮 Choose Your Game
            <span className="ml-4 text-3xl">💰</span>
          </h1>
          <p className="text-xl text-yellow-100">
            Select a game to start playing and earning golden points!
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {games.map((game, index) => {
            const routeId = routeMap[game.id] || game.id;
            return (
            <div
              key={game.id}
              className={`transform transition-all duration-300 hover:scale-105 ${
                index % 2 === 0 ? 'animate-bounce-gold' : 'animate-pulse-gold'
              }`}
            >
              <Link
                to={`/games/${routeId}`}
                onClick={(e) => handleGameClick(e, routeId)}
                className="block"
              >
                <div className="bg-gradient-to-br from-yellow-800 to-yellow-900 bg-opacity-90 backdrop-blur-sm rounded-lg p-8 h-full border-2 border-yellow-400 hover:border-yellow-300 transition-all duration-300 shadow-xl hover:shadow-2xl">
                  <div className="text-center">
                    <div className={`text-6xl mb-4 ${game.color} rounded-full w-20 h-20 mx-auto flex items-center justify-center`}>
                      <span className="text-4xl">{game.icon}</span>
                    </div>
                    
                    <h3 className="text-2xl font-bold text-yellow-200 mb-4">
                      {game.name}
                    </h3>
                    
                    <p className="text-yellow-100 mb-6">
                      {game.description}
                    </p>
                    
                    <div className="bg-gradient-to-r from-yellow-500 to-yellow-600 bg-opacity-30 rounded-lg p-4 mb-6 border-2 border-yellow-400">
                      <div className="text-yellow-200 font-bold text-lg">
                        💰 {game.pointsPerItem} points per item
                      </div>
                    </div>
                    
                    <div className="text-left mb-6">
                      <h4 className="text-yellow-200 font-semibold mb-2">🎮 How to Play:</h4>
                      <ul className="text-sm text-yellow-100 space-y-1">
                        {game.rules.map((rule, ruleIndex) => (
                          <li key={ruleIndex} className="flex items-start">
                            <span className="text-yellow-400 mr-2 font-bold">•</span>
                            {rule}
                          </li>
                        ))}
                      </ul>
                    </div>
                    
                    <div className="bg-gradient-to-r from-yellow-500 to-yellow-600 text-white font-bold py-4 px-8 rounded-lg hover:from-yellow-600 hover:to-yellow-700 transition-all duration-300 shadow-lg border-2 border-yellow-300 hover:border-yellow-200">
                      🎮 Play {game.name}
                    </div>
                  </div>
                </div>
              </Link>
            </div>
          );
          })}
        </div>

        {/* Stats Section */}
        {user && (
          <div className="mt-16 bg-gradient-to-br from-yellow-800 to-yellow-900 bg-opacity-90 backdrop-blur-sm rounded-lg p-8 border-2 border-yellow-400 shadow-xl">
            <h2 className="text-3xl font-bold text-yellow-200 mb-6 text-center flex items-center justify-center">
              📊 Your Game Stats
              <span className="ml-2 text-2xl">🏆</span>
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              {['snake', 'fallingFruit', 'breakBricks', 'carRacing'].map((gameType) => {
                const game = games.find(g => g.id === gameType);
                const highScore = user.highScores?.[gameType] ?? 0;
                const gamesPlayed = user.gamesPlayed?.[gameType] ?? 0;

                return (
                  <div key={gameType} className="text-center bg-gradient-to-br from-yellow-700 to-yellow-800 rounded-lg p-4 border-2 border-yellow-500 shadow-lg">
                    <div className="text-3xl mb-2">
                      {game?.icon || '🎮'}
                    </div>
                    <h4 className="font-semibold text-yellow-200 mb-2">
                      {game?.name || gameType}
                    </h4>
                    <div className="text-yellow-300 font-bold text-lg">
                      🏆 High Score: {highScore}
                    </div>
                    <div className="text-yellow-100 text-sm">
                      🎮 Games Played: {gamesPlayed}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default GameList;
