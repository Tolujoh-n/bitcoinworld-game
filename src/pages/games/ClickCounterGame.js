import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import api from '../../utils/api';

const GAME_TIME = 10;
const COOLDOWN_TIME = 30;
const POINTS_PER_CLICK = 5;

const ClickCounterGame = () => {
  const { requireAuth } = useAuth();
  const navigate = useNavigate();
  const [gameState, setGameState] = useState({
    clicks: 0,
    timeLeft: GAME_TIME,
    isPlaying: false,
    gameOver: false,
    cooldownLeft: 0,
    isCooldown: false,
    canPlay: true
  });
  const [highScore, setHighScore] = useState(0);
  const [gameStarted, setGameStarted] = useState(false);
  const [bubbles, setBubbles] = useState([]);
  const timerRef = useRef(null);
  const cooldownRef = useRef(null);

  useEffect(() => {
    if (!requireAuth()) {
      navigate('/games');
      return;
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (cooldownRef.current) clearInterval(cooldownRef.current);
    };
  }, [requireAuth, navigate]);

  useEffect(() => {
    if (gameState.isPlaying && gameState.timeLeft > 0) {
      timerRef.current = setInterval(() => {
        setGameState(prev => {
          const newTimeLeft = prev.timeLeft - 1;
          if (newTimeLeft <= 0) {
            return {
              ...prev,
              timeLeft: 0,
              isPlaying: false,
              gameOver: true,
              canPlay: false,
              isCooldown: true,
              cooldownLeft: COOLDOWN_TIME
            };
          }
          return { ...prev, timeLeft: newTimeLeft };
        });
      }, 1000);

      return () => clearInterval(timerRef.current);
    }
  }, [gameState.isPlaying, gameState.timeLeft]);

  useEffect(() => {
    if (gameState.isCooldown && gameState.cooldownLeft > 0) {
      cooldownRef.current = setInterval(() => {
        setGameState(prev => {
          const newCooldownLeft = prev.cooldownLeft - 1;
          if (newCooldownLeft <= 0) {
            return {
              ...prev,
              cooldownLeft: 0,
              isCooldown: false,
              canPlay: true
            };
          }
          return { ...prev, cooldownLeft: newCooldownLeft };
        });
      }, 1000);

      return () => clearInterval(cooldownRef.current);
    }
  }, [gameState.isCooldown, gameState.cooldownLeft]);

  const createBubble = (x, y) => {
    const bubble = {
      id: Date.now() + Math.random(),
      x: x - 25,
      y: y - 25,
      size: Math.random() * 20 + 20,
      opacity: 1,
      velocity: {
        x: (Math.random() - 0.5) * 4,
        y: -Math.random() * 3 - 2
      }
    };

    setBubbles(prev => [...prev, bubble]);

    setTimeout(() => {
      setBubbles(prev => prev.filter(b => b.id !== bubble.id));
    }, 1000);
  };

  const animateBubbles = () => {
    setBubbles(prev => 
      prev.map(bubble => ({
        ...bubble,
        x: bubble.x + bubble.velocity.x,
        y: bubble.y + bubble.velocity.y,
        opacity: Math.max(0, bubble.opacity - 0.02),
        velocity: {
          ...bubble.velocity,
          y: bubble.velocity.y + 0.1
        }
      })).filter(bubble => bubble.opacity > 0)
    );
  };

  useEffect(() => {
    if (bubbles.length > 0) {
      const animationFrame = setInterval(animateBubbles, 16);
      return () => clearInterval(animationFrame);
    }
  }, [bubbles.length]);

  const handleClick = (e) => {
    if (!gameState.canPlay || !gameState.isPlaying) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    createBubble(x, y);

    setGameState(prev => ({
      ...prev,
      clicks: prev.clicks + 1
    }));
  };

  const startGame = () => {
    setGameStarted(true);
    setGameState({
      clicks: 0,
      timeLeft: GAME_TIME,
      isPlaying: true,
      gameOver: false,
      cooldownLeft: 0,
      isCooldown: false,
      canPlay: true
    });
    setBubbles([]);
  };

  const resetGame = () => {
    setGameStarted(false);
    setGameState({
      clicks: 0,
      timeLeft: GAME_TIME,
      isPlaying: false,
      gameOver: false,
      cooldownLeft: 0,
      isCooldown: false,
      canPlay: true
    });
    setBubbles([]);
  };

  const submitScore = async () => {
    try {
      const points = gameState.clicks * POINTS_PER_CLICK;
      await api.post('/scores/submit', {
        gameType: 'clickCounter',
        score: gameState.clicks,
        points: points,
        gameData: {
          timeLimit: GAME_TIME,
          clicksPerSecond: gameState.clicks / GAME_TIME,
          totalClicks: gameState.clicks
        }
      });
      
      if (gameState.clicks > highScore) {
        setHighScore(gameState.clicks);
      }
    } catch (error) {
      console.error('Error submitting score:', error);
      if (gameState.clicks > highScore) {
        setHighScore(gameState.clicks);
      }
    }
  };

  useEffect(() => {
    if (gameState.gameOver) {
      submitScore();
    }
  }, [gameState.gameOver]);

  const getButtonText = () => {
    if (gameState.isCooldown) return 'Cooldown';
    if (gameState.gameOver) return 'Game Over';
    if (gameState.isPlaying) return 'Click!';
    if (!gameStarted) return 'Start';
    return 'Start';
  };

  const getButtonColor = () => {
    if (gameState.isCooldown) return 'bg-gray-500 cursor-not-allowed';
    if (gameState.gameOver) return 'bg-red-500 cursor-not-allowed';
    if (gameState.isPlaying) return 'bg-yellow-500 hover:bg-yellow-600';
    return 'bg-yellow-500 hover:bg-yellow-600';
  };

  return (
    <div className="min-h-screen py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <button
            onClick={() => navigate('/games')}
            className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg transition-colors"
          >
            ← Back to Games
          </button>
          <h1 className="text-3xl font-bold text-white">🖱️ Click Counter</h1>
          <div></div>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Game Area */}
          <div className="lg:col-span-2">
            <div className="bg-gradient-to-br from-purple-600 to-pink-600 rounded-lg p-8 border-4 border-yellow-400">
              <div className="text-center">
                {/* Timer Display */}
                <div className="mb-8">
                  <div className="text-4xl font-bold text-white mb-2">
                    {gameState.isPlaying || gameState.gameOver ? gameState.timeLeft : GAME_TIME}
                  </div>
                  <div className="text-lg text-purple-100">
                    {gameState.isCooldown ? 'Cooldown' : 'Seconds Remaining'}
                  </div>
                  {gameState.isCooldown && (
                    <div className="text-2xl font-bold text-yellow-300 mt-2">
                      {gameState.cooldownLeft}s
                    </div>
                  )}
                </div>

                {/* Click Button */}
                <div className="relative inline-block">
                  <button
                    onClick={handleClick}
                    disabled={!gameState.canPlay || !gameState.isPlaying}
                    className={`${getButtonColor()} text-white font-bold text-2xl py-8 px-16 rounded-full transition-all duration-200 transform hover:scale-105 disabled:hover:scale-100 disabled:cursor-not-allowed border-4 border-white shadow-2xl`}
                    style={{
                      width: '200px',
                      height: '200px',
                      fontSize: gameState.isPlaying ? '2rem' : '1.5rem'
                    }}
                  >
                    {getButtonText()}
                  </button>

                  {/* Bubbles Animation */}
                  {bubbles.map(bubble => (
                    <div
                      key={bubble.id}
                      className="absolute pointer-events-none"
                      style={{
                        left: bubble.x,
                        top: bubble.y,
                        width: bubble.size,
                        height: bubble.size,
                        opacity: bubble.opacity,
                        background: 'rgba(255, 255, 255, 0.8)',
                        borderRadius: '50%',
                        transform: 'translate(-50%, -50%)',
                        transition: 'all 0.1s ease-out'
                      }}
                    />
                  ))}
                </div>

                {/* Score Display */}
                <div className="mt-8">
                  <div className="text-3xl font-bold text-white mb-2">
                    {gameState.clicks} Clicks
                  </div>
                  <div className="text-lg text-purple-100">
                    {gameState.clicks * POINTS_PER_CLICK} Points
                  </div>
                </div>

                {/* Game Over Message */}
                {gameState.gameOver && (
                  <div className="mt-8 bg-black bg-opacity-50 rounded-lg p-6">
                    <h2 className="text-2xl font-bold text-white mb-4">Time's Up!</h2>
                    <p className="text-lg text-purple-100 mb-4">
                      You clicked {gameState.clicks} times in {GAME_TIME} seconds!
                    </p>
                    <p className="text-lg text-yellow-300 mb-6">
                      Points Earned: {gameState.clicks * POINTS_PER_CLICK}
                    </p>
                    <p className="text-sm text-gray-300">
                      Wait {COOLDOWN_TIME} seconds before playing again
                    </p>
                  </div>
                )}

                {/* Start Game Button */}
                {!gameStarted && !gameState.isCooldown && (
                  <div className="mt-8">
                    <button
                      onClick={startGame}
                      className="bg-green-500 hover:bg-green-600 text-white px-8 py-3 rounded-lg font-bold text-lg transition-colors"
                    >
                      Start Clicking!
                    </button>
                  </div>
                )}

                {/* Play Again Button */}
                {gameState.gameOver && !gameState.isCooldown && (
                  <div className="mt-6">
                    <button
                      onClick={resetGame}
                      className="bg-yellow-500 hover:bg-yellow-600 text-white px-6 py-3 rounded-lg font-bold transition-colors"
                    >
                      Play Again
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Game Info */}
          <div className="space-y-6">
            <div className="bg-white bg-opacity-10 backdrop-blur-sm rounded-lg p-6">
              <h3 className="text-xl font-bold text-white mb-4">Game Stats</h3>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-300">Current Clicks:</span>
                  <span className="text-yellow-400 font-bold">{gameState.clicks}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-300">High Score:</span>
                  <span className="text-yellow-400 font-bold">{highScore}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-300">Points Earned:</span>
                  <span className="text-green-400 font-bold">{gameState.clicks * POINTS_PER_CLICK}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-300">Clicks/Second:</span>
                  <span className="text-blue-400 font-bold">
                    {gameState.clicks > 0 && gameState.timeLeft < GAME_TIME 
                      ? (gameState.clicks / (GAME_TIME - gameState.timeLeft)).toFixed(1)
                      : '0.0'
                    }
                  </span>
                </div>
              </div>
            </div>

            <div className="bg-white bg-opacity-10 backdrop-blur-sm rounded-lg p-6">
              <h3 className="text-xl font-bold text-white mb-4">How to Play</h3>
              <ul className="space-y-2 text-gray-300 text-sm">
                <li>• Click the button as fast as you can!</li>
                <li>• You have 10 seconds to click</li>
                <li>• Each click = 5 points</li>
                <li>• Watch the bubble animation</li>
                <li>• 30 second cooldown between games</li>
              </ul>
            </div>

            <div className="bg-white bg-opacity-10 backdrop-blur-sm rounded-lg p-6">
              <h3 className="text-xl font-bold text-white mb-4">Tips</h3>
              <ul className="space-y-2 text-gray-300 text-sm">
                <li>• Click rapidly but accurately</li>
                <li>• Find your rhythm</li>
                <li>• Stay focused on the button</li>
                <li>• Practice makes perfect!</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ClickCounterGame;