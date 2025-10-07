import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import api from '../../utils/api';

const GRID_SIZE = 20;
const INITIAL_SPEED = 150;

const SnakeGame = () => {
  const { user, requireAuth } = useAuth();
  const navigate = useNavigate();
  const gameAreaRef = useRef(null);
  const [gameState, setGameState] = useState({
    snake: [{ x: 10, y: 10 }],
    food: { x: 15, y: 15 },
    direction: { x: 0, y: 0 },
    gameOver: false,
    score: 0,
    speed: INITIAL_SPEED,
    isPlaying: false,
    isPaused: false
  });
  const [highScore, setHighScore] = useState(0);
  const [gameStarted, setGameStarted] = useState(false);

  useEffect(() => {
    if (!requireAuth()) {
      navigate('/games');
      return;
    }

    fetchHighScore();
    
    const handleKeyPress = (e) => {
      if (!gameStarted || gameState.gameOver) return;
      
      switch (e.key) {
        case 'ArrowUp':
        case 'w':
        case 'W':
          e.preventDefault();
          if (gameState.direction.y === 0) {
            setGameState(prev => ({ ...prev, direction: { x: 0, y: -1 } }));
          }
          break;
        case 'ArrowDown':
        case 's':
        case 'S':
          e.preventDefault();
          if (gameState.direction.y === 0) {
            setGameState(prev => ({ ...prev, direction: { x: 0, y: 1 } }));
          }
          break;
        case 'ArrowLeft':
        case 'a':
        case 'A':
          e.preventDefault();
          if (gameState.direction.x === 0) {
            setGameState(prev => ({ ...prev, direction: { x: -1, y: 0 } }));
          }
          break;
        case 'ArrowRight':
        case 'd':
        case 'D':
          e.preventDefault();
          if (gameState.direction.x === 0) {
            setGameState(prev => ({ ...prev, direction: { x: 1, y: 0 } }));
          }
          break;
        case ' ':
          e.preventDefault();
          togglePause();
          break;
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [gameStarted, gameState.direction, gameState.gameOver, requireAuth, navigate]);

  useEffect(() => {
    if (gameState.isPlaying && !gameState.gameOver && !gameState.isPaused) {
      const gameLoop = setInterval(() => {
        setGameState(prev => {
          const newSnake = [...prev.snake];
          const head = { ...newSnake[0] };
          
          head.x += prev.direction.x;
          head.y += prev.direction.y;

          // Check wall collision
          if (head.x < 0 || head.x >= GRID_SIZE || head.y < 0 || head.y >= GRID_SIZE) {
            return { ...prev, gameOver: true, isPlaying: false };
          }

          // Check self collision
          if (newSnake.some(segment => segment.x === head.x && segment.y === head.y)) {
            return { ...prev, gameOver: true, isPlaying: false };
          }

          newSnake.unshift(head);

          // Check food collision
          if (head.x === prev.food.x && head.y === prev.food.y) {
            const newScore = prev.score + 1;
            const newSpeed = Math.max(50, INITIAL_SPEED - (newScore * 2));
            const newFood = generateFood(newSnake);
            
            return {
              ...prev,
              snake: newSnake,
              food: newFood,
              score: newScore,
              speed: newSpeed
            };
          } else {
            newSnake.pop();
          }

          return { ...prev, snake: newSnake };
        });
      }, gameState.speed);

      return () => clearInterval(gameLoop);
    }
  }, [gameState.isPlaying, gameState.gameOver, gameState.isPaused, gameState.speed]);

  const fetchHighScore = async () => {
    try {
      const response = await api.get('/games/snake/highscore');
      setHighScore(response.data.highScore || 0);
    } catch (error) {
      console.error('Error fetching high score:', error);
      setHighScore(0);
    }
  };

  const generateFood = (snake) => {
    let food;
    do {
      food = {
        x: Math.floor(Math.random() * GRID_SIZE),
        y: Math.floor(Math.random() * GRID_SIZE)
      };
    } while (snake.some(segment => segment.x === food.x && segment.y === food.y));
    
    return food;
  };

  const startGame = () => {
    setGameStarted(true);
    setGameState({
      snake: [{ x: 10, y: 10 }],
      food: generateFood([{ x: 10, y: 10 }]),
      direction: { x: 0, y: 0 },
      gameOver: false,
      score: 0,
      speed: INITIAL_SPEED,
      isPlaying: true,
      isPaused: false
    });
  };

  const togglePause = () => {
    setGameState(prev => ({ ...prev, isPaused: !prev.isPaused }));
  };

  const resetGame = () => {
    setGameStarted(false);
    setGameState({
      snake: [{ x: 10, y: 10 }],
      food: { x: 15, y: 15 },
      direction: { x: 0, y: 0 },
      gameOver: false,
      score: 0,
      speed: INITIAL_SPEED,
      isPlaying: false,
      isPaused: false
    });
  };

  const submitScore = async () => {
    try {
      const points = gameState.score * 10; // 10 points per coin
      await api.post('/scores/submit', {
        gameType: 'snake',
        score: gameState.score,
        points: points,
        gameData: {
          speed: gameState.speed,
          duration: Date.now() - gameStartTime.current
        }
      });
      
      if (gameState.score > highScore) {
        setHighScore(gameState.score);
      }
    } catch (error) {
      console.error('Error submitting score:', error);
      // Still update local high score even if API fails
      if (gameState.score > highScore) {
        setHighScore(gameState.score);
      }
    }
  };

  const gameStartTime = useRef(Date.now());

  useEffect(() => {
    if (gameState.gameOver) {
      submitScore();
    }
  }, [gameState.gameOver]);

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
          <h1 className="text-3xl font-bold text-white">🐍 Snake Game</h1>
          <div></div>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Game Area */}
          <div className="lg:col-span-2">
            <div className="bg-black rounded-lg p-4 border-4 border-yellow-400">
              <div
                ref={gameAreaRef}
                className="relative bg-green-900 rounded"
                style={{
                  width: '100%',
                  height: '500px',
                  maxWidth: '500px',
                  margin: '0 auto'
                }}
              >
                {/* Snake */}
                {gameState.snake.map((segment, index) => (
                  <div
                    key={index}
                    className="absolute bg-green-400 border border-green-300"
                    style={{
                      left: `${(segment.x / GRID_SIZE) * 100}%`,
                      top: `${(segment.y / GRID_SIZE) * 100}%`,
                      width: `${100 / GRID_SIZE}%`,
                      height: `${100 / GRID_SIZE}%`,
                      backgroundColor: index === 0 ? '#10b981' : '#34d399'
                    }}
                  />
                ))}

                {/* Food */}
                <div
                  className="absolute bg-yellow-400 border border-yellow-300 rounded-full animate-bounce"
                  style={{
                    left: `${(gameState.food.x / GRID_SIZE) * 100}%`,
                    top: `${(gameState.food.y / GRID_SIZE) * 100}%`,
                    width: `${100 / GRID_SIZE}%`,
                    height: `${100 / GRID_SIZE}%`
                  }}
                >
                  <div className="flex items-center justify-center h-full text-lg">🪙</div>
                </div>

                {/* Game Over Overlay */}
                {gameState.gameOver && (
                  <div className="absolute inset-0 bg-black bg-opacity-75 flex items-center justify-center">
                    <div className="text-center text-white">
                      <h2 className="text-3xl font-bold mb-4">Game Over!</h2>
                      <p className="text-xl mb-4">Final Score: {gameState.score}</p>
                      <p className="text-lg mb-6">Points Earned: {gameState.score * 10}</p>
                      <button
                        onClick={resetGame}
                        className="bg-yellow-500 hover:bg-yellow-600 text-white px-6 py-3 rounded-lg font-bold transition-colors"
                      >
                        Play Again
                      </button>
                    </div>
                  </div>
                )}

                {/* Start Screen */}
                {!gameStarted && (
                  <div className="absolute inset-0 bg-black bg-opacity-75 flex items-center justify-center">
                    <div className="text-center text-white">
                      <h2 className="text-3xl font-bold mb-4">Snake Game</h2>
                      <p className="text-lg mb-6">Use arrow keys or WASD to control the snake</p>
                      <button
                        onClick={startGame}
                        className="bg-yellow-500 hover:bg-yellow-600 text-white px-6 py-3 rounded-lg font-bold transition-colors"
                      >
                        Start Game
                      </button>
                    </div>
                  </div>
                )}

                {/* Pause Overlay */}
                {gameState.isPaused && (
                  <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center">
                    <div className="text-center text-white">
                      <h2 className="text-3xl font-bold mb-4">Paused</h2>
                      <p className="text-lg">Press SPACE to resume</p>
                    </div>
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
                  <span className="text-gray-300">Current Score:</span>
                  <span className="text-yellow-400 font-bold">{gameState.score}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-300">High Score:</span>
                  <span className="text-yellow-400 font-bold">{highScore}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-300">Points Earned:</span>
                  <span className="text-green-400 font-bold">{gameState.score * 10}</span>
                </div>
              </div>
            </div>

            <div className="bg-white bg-opacity-10 backdrop-blur-sm rounded-lg p-6">
              <h3 className="text-xl font-bold text-white mb-4">Controls</h3>
              <div className="space-y-2 text-gray-300">
                <div>↑↓←→ Arrow Keys</div>
                <div>W A S D Keys</div>
                <div>SPACE - Pause/Resume</div>
              </div>
            </div>

            <div className="bg-white bg-opacity-10 backdrop-blur-sm rounded-lg p-6">
              <h3 className="text-xl font-bold text-white mb-4">How to Play</h3>
              <ul className="space-y-2 text-gray-300 text-sm">
                <li>• Control the snake with arrow keys or WASD</li>
                <li>• Eat coins (🪙) to grow longer and earn points</li>
                <li>• Avoid hitting walls or yourself</li>
                <li>• Speed increases as you progress</li>
                <li>• Each coin = 10 points</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SnakeGame;
