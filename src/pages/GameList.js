import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const GameList = () => {
  const { user, requireAuth } = useAuth();
  const [games, setGames] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchGames();
  }, []);

  const fetchGames = async () => {
    try {
      // Static games data for now
      const gamesData = [
        {
          id: 'snake',
          name: 'Snake Game',
          description: 'Control the snake to eat coins and grow longer. Avoid hitting the walls!',
          pointsPerItem: 10,
          icon: '🐍',
          color: 'bg-green-500',
          rules: [
            'Use arrow keys or WASD to control the snake',
            'Eat coins to grow longer and earn points',
            'Avoid hitting the walls or yourself',
            'Speed increases as you progress'
          ]
        },
        {
          id: 'fallingFruit',
          name: 'Falling Fruit',
          description: 'Catch good fruits and avoid bad ones. Keep the baby safe!',
          pointsPerItem: 10,
          icon: '🍎',
          color: 'bg-red-500',
          rules: [
            'Use arrow keys or WASD to move the baby',
            'Catch green fruits (good) to grow bigger',
            'Avoid red fruits (bad) - they end the game',
            'Speed increases over time'
          ]
        },
        {
          id: 'breakBricks',
          name: 'Break Bricks',
          description: 'Use the paddle to bounce the ball and break all the bricks!',
          pointsPerItem: 10,
          icon: '🧱',
          color: 'bg-blue-500',
          rules: [
            'Use left/right arrow keys or A/D to move the paddle',
            'Bounce the ball to break bricks',
            'Don\'t let the ball fall below the paddle',
            'Each brick broken gives you points'
          ]
        },
        {
          id: 'clickCounter',
          name: 'Click Counter',
          description: 'Click as fast as you can within the time limit!',
          pointsPerItem: 5,
          icon: '🖱️',
          color: 'bg-purple-500',
          rules: [
            'Click the button as many times as possible in 10 seconds',
            'Each click gives you 5 points',
            'After the timer ends, wait 30 seconds before playing again',
            'Watch the bubble animation with each click'
          ]
        }
      ];
      setGames(gamesData);
    } catch (error) {
      setError('Failed to load games');
      console.error('Error fetching games:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleGameClick = (gameId) => {
    if (!requireAuth()) {
      return;
    }
    // Navigation will be handled by the Link component
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
    <div className="min-h-screen py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-white mb-4">
            Choose Your Game
          </h1>
          <p className="text-xl text-gray-300">
            Select a game to start playing and earning points!
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {games.map((game, index) => (
            <div
              key={game.id}
              className={`transform transition-all duration-300 hover:scale-105 ${
                index % 2 === 0 ? 'animate-bounce-gold' : 'animate-pulse-gold'
              }`}
            >
              <Link
                to={`/games/${game.id}`}
                onClick={() => handleGameClick(game.id)}
                className="block"
              >
                <div className="bg-white bg-opacity-10 backdrop-blur-sm rounded-lg p-8 h-full border-2 border-transparent hover:border-yellow-400 transition-all duration-300">
                  <div className="text-center">
                    <div className={`text-6xl mb-4 ${game.color} rounded-full w-20 h-20 mx-auto flex items-center justify-center`}>
                      <span className="text-4xl">{game.icon}</span>
                    </div>
                    
                    <h3 className="text-2xl font-bold text-white mb-4">
                      {game.name}
                    </h3>
                    
                    <p className="text-gray-300 mb-6">
                      {game.description}
                    </p>
                    
                    <div className="bg-yellow-500 bg-opacity-20 rounded-lg p-4 mb-6">
                      <div className="text-yellow-300 font-semibold">
                        {game.pointsPerItem} points per item
                      </div>
                    </div>
                    
                    <div className="text-left mb-6">
                      <h4 className="text-white font-semibold mb-2">How to Play:</h4>
                      <ul className="text-sm text-gray-300 space-y-1">
                        {game.rules.map((rule, ruleIndex) => (
                          <li key={ruleIndex} className="flex items-start">
                            <span className="text-yellow-400 mr-2">•</span>
                            {rule}
                          </li>
                        ))}
                      </ul>
                    </div>
                    
                    <div className="bg-gradient-to-r from-yellow-500 to-yellow-600 text-white font-bold py-3 px-6 rounded-lg hover:from-yellow-600 hover:to-yellow-700 transition-colors">
                      Play {game.name}
                    </div>
                  </div>
                </div>
              </Link>
            </div>
          ))}
        </div>

        {/* Stats Section */}
        {user && (
          <div className="mt-16 bg-white bg-opacity-10 backdrop-blur-sm rounded-lg p-8">
            <h2 className="text-2xl font-bold text-white mb-6 text-center">Your Game Stats</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              {Object.entries(user.highScores || {}).map(([gameType, highScore]) => {
                const game = games.find(g => g.id === gameType);
                const gamesPlayed = user.gamesPlayed?.[gameType] || 0;
                
                return (
                  <div key={gameType} className="text-center">
                    <div className="text-2xl mb-2">
                      {game?.icon || '🎮'}
                    </div>
                    <h4 className="font-semibold text-white mb-1">
                      {game?.name || gameType}
                    </h4>
                    <div className="text-yellow-400 font-bold">
                      High Score: {highScore}
                    </div>
                    <div className="text-gray-300 text-sm">
                      Games Played: {gamesPlayed}
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
