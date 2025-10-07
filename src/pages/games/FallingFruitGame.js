import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import api from '../../utils/api';

const GAME_WIDTH = 400;
const GAME_HEIGHT = 600;
const BABY_SIZE = 40;
const FRUIT_SIZE = 30;
const INITIAL_SPEED = 2;

const FallingFruitGame = () => {
  const { requireAuth } = useAuth();
  const navigate = useNavigate();
  const gameAreaRef = useRef(null);
  const [gameState, setGameState] = useState({
    baby: { x: GAME_WIDTH / 2 - BABY_SIZE / 2, y: GAME_HEIGHT - BABY_SIZE - 10 },
    fruits: [],
    score: 0,
    speed: INITIAL_SPEED,
    gameOver: false,
    isPlaying: false,
    isPaused: false
  });
  const [highScore, setHighScore] = useState(0);
  const [gameStarted, setGameStarted] = useState(false);
  const [keys, setKeys] = useState({ left: false, right: false, up: false, down: false });

  useEffect(() => {
    if (!requireAuth()) {
      navigate('/games');
      return;
    }

    const handleKeyDown = (e) => {
      if (!gameStarted || gameState.gameOver) return;
      
      switch (e.key) {
        case 'ArrowLeft':
        case 'a':
        case 'A':
          e.preventDefault();
          setKeys(prev => ({ ...prev, left: true }));
          break;
        case 'ArrowRight':
        case 'd':
        case 'D':
          e.preventDefault();
          setKeys(prev => ({ ...prev, right: true }));
          break;
        case 'ArrowUp':
        case 'w':
        case 'W':
          e.preventDefault();
          setKeys(prev => ({ ...prev, up: true }));
          break;
        case 'ArrowDown':
        case 's':
        case 'S':
          e.preventDefault();
          setKeys(prev => ({ ...prev, down: true }));
          break;
        case ' ':
          e.preventDefault();
          togglePause();
          break;
      }
    };

    const handleKeyUp = (e) => {
      switch (e.key) {
        case 'ArrowLeft':
        case 'a':
        case 'A':
          setKeys(prev => ({ ...prev, left: false }));
          break;
        case 'ArrowRight':
        case 'd':
        case 'D':
          setKeys(prev => ({ ...prev, right: false }));
          break;
        case 'ArrowUp':
        case 'w':
        case 'W':
          setKeys(prev => ({ ...prev, up: false }));
          break;
        case 'ArrowDown':
        case 's':
        case 'S':
          setKeys(prev => ({ ...prev, down: false }));
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [gameStarted, gameState.gameOver, requireAuth, navigate]);

  useEffect(() => {
    if (gameState.isPlaying && !gameState.gameOver && !gameState.isPaused) {
      const gameLoop = setInterval(() => {
        setGameState(prev => {
          // Move baby based on keys
          let newBaby = { ...prev.baby };
          const moveSpeed = 5;
          
          if (keys.left && newBaby.x > 0) newBaby.x -= moveSpeed;
          if (keys.right && newBaby.x < GAME_WIDTH - BABY_SIZE) newBaby.x += moveSpeed;
          if (keys.up && newBaby.y > 0) newBaby.y -= moveSpeed;
          if (keys.down && newBaby.y < GAME_HEIGHT - BABY_SIZE) newBaby.y += moveSpeed;

          // Move fruits down
          const newFruits = prev.fruits
            .map(fruit => ({
              ...fruit,
              y: fruit.y + prev.speed
            }))
            .filter(fruit => fruit.y < GAME_HEIGHT);

          // Check collisions
          let newScore = prev.score;
          let gameOver = prev.gameOver;
          
          newFruits.forEach((fruit, index) => {
            const distance = Math.sqrt(
              Math.pow(fruit.x - newBaby.x - BABY_SIZE / 2, 2) + 
              Math.pow(fruit.y - newBaby.y - BABY_SIZE / 2, 2)
            );
            
            if (distance < (FRUIT_SIZE + BABY_SIZE) / 2) {
              if (fruit.type === 'good') {
                newScore += 1;
                newFruits.splice(index, 1);
              } else {
                gameOver = true;
              }
            }
          });

          // Generate new fruits randomly
          const newFruitsToAdd = [];
          if (Math.random() < 0.02) {
            const fruitType = Math.random() < 0.7 ? 'good' : 'bad';
            newFruitsToAdd.push({
              id: Date.now() + Math.random(),
              x: Math.random() * (GAME_WIDTH - FRUIT_SIZE),
              y: -FRUIT_SIZE,
              type: fruitType
            });
          }

          const newSpeed = Math.min(8, prev.speed + (prev.score * 0.01));

          return {
            ...prev,
            baby: newBaby,
            fruits: [...newFruits, ...newFruitsToAdd],
            score: newScore,
            speed: newSpeed,
            gameOver: gameOver,
            isPlaying: !gameOver
          };
        });
      }, 16);

      return () => clearInterval(gameLoop);
    }
  }, [gameState.isPlaying, gameState.gameOver, gameState.isPaused, keys]);

  const startGame = () => {
    setGameStarted(true);
    setGameState({
      baby: { x: GAME_WIDTH / 2 - BABY_SIZE / 2, y: GAME_HEIGHT - BABY_SIZE - 10 },
      fruits: [],
      score: 0,
      speed: INITIAL_SPEED,
      gameOver: false,
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
      baby: { x: GAME_WIDTH / 2 - BABY_SIZE / 2, y: GAME_HEIGHT - BABY_SIZE - 10 },
      fruits: [],
      score: 0,
      speed: INITIAL_SPEED,
      gameOver: false,
      isPlaying: false,
      isPaused: false
    });
    setKeys({ left: false, right: false, up: false, down: false });
  };

  const submitScore = async () => {
    try {
      const points = gameState.score * 10; // 10 points per good fruit
      await api.post('/scores/submit', {
        gameType: 'fallingFruit',
        score: gameState.score,
        points: points,
        gameData: {
          speed: gameState.speed,
          fruitsCaught: gameState.score
        }
      });
      
      if (gameState.score > highScore) {
        setHighScore(gameState.score);
      }
    } catch (error) {
      console.error('Error submitting score:', error);
      if (gameState.score > highScore) {
        setHighScore(gameState.score);
      }
    }
  };

  useEffect(() => {
    if (gameState.gameOver) {
      submitScore();
    }
  }, [gameState.gameOver]);

  return (
    <div className="min-h-screen py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <button
            onClick={() => navigate('/games')}
            className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg transition-colors"
          >
            ← Back to Games
          </button>
          <h1 className="text-3xl font-bold text-white">🍎 Falling Fruit</h1>
          <div></div>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Game Area */}
          <div className="lg:col-span-2">
            <div className="bg-gradient-to-b from-sky-200 to-sky-300 rounded-lg p-4 border-4 border-yellow-400">
              <div
                ref={gameAreaRef}
                className="relative bg-gradient-to-b from-sky-100 to-sky-200 rounded mx-auto"
                style={{
                  width: GAME_WIDTH,
                  height: GAME_HEIGHT
                }}
              >
                {/* Baby */}
                <div
                  className="absolute bg-pink-300 border-2 border-pink-400 rounded-full flex items-center justify-center"
                  style={{
                    left: gameState.baby.x,
                    top: gameState.baby.y,
                    width: BABY_SIZE,
                    height: BABY_SIZE
                  }}
                >
                  <span className="text-lg">👶</span>
                </div>

                {/* Fruits */}
                {gameState.fruits.map((fruit) => (
                  <div
                    key={fruit.id}
                    className={`absolute rounded-full flex items-center justify-center ${
                      fruit.type === 'good' 
                        ? 'bg-green-400 border-2 border-green-500 animate-bounce' 
                        : 'bg-red-400 border-2 border-red-500'
                    }`}
                    style={{
                      left: fruit.x,
                      top: fruit.y,
                      width: FRUIT_SIZE,
                      height: FRUIT_SIZE
                    }}
                  >
                    <span className="text-sm">
                      {fruit.type === 'good' ? '🍎' : '🍒'}
                    </span>
                  </div>
                ))}

                {/* Game Over Overlay */}
                {gameState.gameOver && (
                  <div className="absolute inset-0 bg-black bg-opacity-75 flex items-center justify-center">
                    <div className="text-center text-white">
                      <h2 className="text-3xl font-bold mb-4">Game Over!</h2>
                      <p className="text-xl mb-4">Bad fruit touched the baby!</p>
                      <p className="text-lg mb-4">Good Fruits Caught: {gameState.score}</p>
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
                      <h2 className="text-3xl font-bold mb-4">Falling Fruit</h2>
                      <p className="text-lg mb-6">Move the baby to catch good fruits and avoid bad ones!</p>
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
                  <span className="text-gray-300">Good Fruits:</span>
                  <span className="text-green-400 font-bold">{gameState.score}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-300">High Score:</span>
                  <span className="text-yellow-400 font-bold">{highScore}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-300">Points Earned:</span>
                  <span className="text-green-400 font-bold">{gameState.score * 10}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-300">Speed:</span>
                  <span className="text-blue-400 font-bold">{gameState.speed.toFixed(1)}</span>
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
                <li>• Move the baby with arrow keys or WASD</li>
                <li>• Catch green apples (🍎) - they're good!</li>
                <li>• Avoid red cherries (🍒) - they end the game!</li>
                <li>• Speed increases as you catch more fruits</li>
                <li>• Each good fruit = 10 points</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FallingFruitGame;