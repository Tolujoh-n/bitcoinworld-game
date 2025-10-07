import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import api from '../../utils/api';

const GAME_WIDTH = 600;
const GAME_HEIGHT = 400;
const PADDLE_WIDTH = 80;
const PADDLE_HEIGHT = 15;
const BALL_SIZE = 12;
const BRICK_WIDTH = 60;
const BRICK_HEIGHT = 20;
const BRICK_ROWS = 5;
const BRICK_COLS = 10;
const INITIAL_BALL_SPEED = 3;

const BreakBricksGame = () => {
  const { requireAuth } = useAuth();
  const navigate = useNavigate();
  const gameAreaRef = useRef(null);
  const [gameState, setGameState] = useState({
    paddle: { x: GAME_WIDTH / 2 - PADDLE_WIDTH / 2, y: GAME_HEIGHT - PADDLE_HEIGHT - 10 },
    ball: { x: GAME_WIDTH / 2, y: GAME_HEIGHT - PADDLE_HEIGHT - 30, dx: INITIAL_BALL_SPEED, dy: -INITIAL_BALL_SPEED },
    bricks: [],
    score: 0,
    gameOver: false,
    isPlaying: false,
    isPaused: false,
    gameWon: false
  });
  const [highScore, setHighScore] = useState(0);
  const [gameStarted, setGameStarted] = useState(false);
  const [keys, setKeys] = useState({ left: false, right: false });

  useEffect(() => {
    if (!requireAuth()) {
      navigate('/games');
      return;
    }

    const handleKeyDown = (e) => {
      if (!gameStarted || gameState.gameOver || gameState.gameWon) return;
      
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
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [gameStarted, gameState.gameOver, gameState.gameWon, requireAuth, navigate]);

  useEffect(() => {
    if (gameState.isPlaying && !gameState.gameOver && !gameState.isPaused && !gameState.gameWon) {
      const gameLoop = setInterval(() => {
        setGameState(prev => {
          // Move paddle
          let newPaddle = { ...prev.paddle };
          const paddleSpeed = 5;
          
          if (keys.left && newPaddle.x > 0) {
            newPaddle.x -= paddleSpeed;
          }
          if (keys.right && newPaddle.x < GAME_WIDTH - PADDLE_WIDTH) {
            newPaddle.x += paddleSpeed;
          }

          // Move ball
          let newBall = {
            ...prev.ball,
            x: prev.ball.x + prev.ball.dx,
            y: prev.ball.y + prev.ball.dy
          };

          // Ball collision with walls
          if (newBall.x <= 0 || newBall.x >= GAME_WIDTH - BALL_SIZE) {
            newBall.dx = -newBall.dx;
            newBall.x = Math.max(0, Math.min(GAME_WIDTH - BALL_SIZE, newBall.x));
          }
          if (newBall.y <= 0) {
            newBall.dy = -newBall.dy;
            newBall.y = 0;
          }

          // Ball collision with paddle
          if (newBall.y >= prev.paddle.y - BALL_SIZE &&
              newBall.y <= prev.paddle.y + PADDLE_HEIGHT &&
              newBall.x >= prev.paddle.x - BALL_SIZE &&
              newBall.x <= prev.paddle.x + PADDLE_WIDTH) {
            
            const paddleCenter = prev.paddle.x + PADDLE_WIDTH / 2;
            const ballCenter = newBall.x + BALL_SIZE / 2;
            const hitPos = (ballCenter - paddleCenter) / (PADDLE_WIDTH / 2);
            
            newBall.dx = hitPos * 4;
            newBall.dy = -Math.abs(newBall.dy);
            newBall.y = prev.paddle.y - BALL_SIZE;
          }

          // Ball collision with bricks
          let newBricks = [...prev.bricks];
          let newScore = prev.score;
          let ballHitBrick = false;

          newBricks.forEach((brick, index) => {
            if (!brick.destroyed &&
                newBall.x < brick.x + BRICK_WIDTH &&
                newBall.x + BALL_SIZE > brick.x &&
                newBall.y < brick.y + BRICK_HEIGHT &&
                newBall.y + BALL_SIZE > brick.y) {
              
              newBricks[index] = { ...brick, destroyed: true };
              newScore += 1;
              ballHitBrick = true;
            }
          });

          if (ballHitBrick) {
            newBall.dy = -newBall.dy;
          }

          // Check if ball fell below paddle
          const gameOver = newBall.y > GAME_HEIGHT;
          
          // Check if all bricks are destroyed
          const gameWon = newBricks.every(brick => brick.destroyed);

          return {
            ...prev,
            paddle: newPaddle,
            ball: newBall,
            bricks: newBricks,
            score: newScore,
            gameOver: gameOver,
            gameWon: gameWon,
            isPlaying: !gameOver && !gameWon
          };
        });
      }, 16);

      return () => clearInterval(gameLoop);
    }
  }, [gameState.isPlaying, gameState.gameOver, gameState.isPaused, gameState.gameWon, keys]);

  const initializeBricks = () => {
    const bricks = [];
    const startX = (GAME_WIDTH - (BRICK_COLS * BRICK_WIDTH)) / 2;
    const startY = 50;
    
    for (let row = 0; row < BRICK_ROWS; row++) {
      for (let col = 0; col < BRICK_COLS; col++) {
        bricks.push({
          x: startX + col * BRICK_WIDTH,
          y: startY + row * BRICK_HEIGHT,
          color: ['bg-red-400', 'bg-orange-400', 'bg-yellow-400', 'bg-green-400', 'bg-blue-400'][row],
          destroyed: false
        });
      }
    }
    
    setGameState(prev => ({ ...prev, bricks }));
  };

  const startGame = () => {
    setGameStarted(true);
    initializeBricks();
    setGameState({
      paddle: { x: GAME_WIDTH / 2 - PADDLE_WIDTH / 2, y: GAME_HEIGHT - PADDLE_HEIGHT - 10 },
      ball: { x: GAME_WIDTH / 2, y: GAME_HEIGHT - PADDLE_HEIGHT - 30, dx: INITIAL_BALL_SPEED, dy: -INITIAL_BALL_SPEED },
      bricks: [],
      score: 0,
      gameOver: false,
      isPlaying: true,
      isPaused: false,
      gameWon: false
    });
  };

  const togglePause = () => {
    setGameState(prev => ({ ...prev, isPaused: !prev.isPaused }));
  };

  const resetGame = () => {
    setGameStarted(false);
    setGameState({
      paddle: { x: GAME_WIDTH / 2 - PADDLE_WIDTH / 2, y: GAME_HEIGHT - PADDLE_HEIGHT - 10 },
      ball: { x: GAME_WIDTH / 2, y: GAME_HEIGHT - PADDLE_HEIGHT - 30, dx: INITIAL_BALL_SPEED, dy: -INITIAL_BALL_SPEED },
      bricks: [],
      score: 0,
      gameOver: false,
      isPlaying: false,
      isPaused: false,
      gameWon: false
    });
    setKeys({ left: false, right: false });
  };

  const submitScore = async () => {
    try {
      const points = gameState.score * 10; // 10 points per brick
      await api.post('/scores/submit', {
        gameType: 'breakBricks',
        score: gameState.score,
        points: points,
        gameData: {
          bricksBroken: gameState.score,
          totalBricks: BRICK_ROWS * BRICK_COLS,
          gameCompleted: gameState.gameWon
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
    if (gameState.gameOver || gameState.gameWon) {
      submitScore();
    }
  }, [gameState.gameOver, gameState.gameWon]);

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
          <h1 className="text-3xl font-bold text-white">🧱 Break Bricks</h1>
          <div></div>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Game Area */}
          <div className="lg:col-span-2">
            <div className="bg-black rounded-lg p-4 border-4 border-yellow-400">
              <div
                ref={gameAreaRef}
                className="relative bg-gradient-to-b from-gray-800 to-gray-900 rounded mx-auto"
                style={{
                  width: GAME_WIDTH,
                  height: GAME_HEIGHT
                }}
              >
                {/* Paddle */}
                <div
                  className="absolute bg-yellow-400 border-2 border-yellow-300 rounded"
                  style={{
                    left: gameState.paddle.x,
                    top: gameState.paddle.y,
                    width: PADDLE_WIDTH,
                    height: PADDLE_HEIGHT
                  }}
                />

                {/* Ball */}
                <div
                  className="absolute bg-white border-2 border-gray-300 rounded-full"
                  style={{
                    left: gameState.ball.x,
                    top: gameState.ball.y,
                    width: BALL_SIZE,
                    height: BALL_SIZE
                  }}
                />

                {/* Bricks */}
                {gameState.bricks.map((brick, index) => (
                  !brick.destroyed && (
                    <div
                      key={index}
                      className={`absolute border-2 border-gray-600 ${brick.color}`}
                      style={{
                        left: brick.x,
                        top: brick.y,
                        width: BRICK_WIDTH,
                        height: BRICK_HEIGHT
                      }}
                    />
                  )
                ))}

                {/* Game Over Overlay */}
                {gameState.gameOver && (
                  <div className="absolute inset-0 bg-black bg-opacity-75 flex items-center justify-center">
                    <div className="text-center text-white">
                      <h2 className="text-3xl font-bold mb-4">Game Over!</h2>
                      <p className="text-xl mb-4">The ball fell below the paddle!</p>
                      <p className="text-lg mb-4">Bricks Broken: {gameState.score}</p>
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

                {/* Game Won Overlay */}
                {gameState.gameWon && (
                  <div className="absolute inset-0 bg-green-900 bg-opacity-75 flex items-center justify-center">
                    <div className="text-center text-white">
                      <h2 className="text-3xl font-bold mb-4">🎉 Congratulations!</h2>
                      <p className="text-xl mb-4">You broke all the bricks!</p>
                      <p className="text-lg mb-4">Bricks Broken: {gameState.score}</p>
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
                      <h2 className="text-3xl font-bold mb-4">Break Bricks</h2>
                      <p className="text-lg mb-6">Use the paddle to bounce the ball and break all bricks!</p>
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
                  <span className="text-gray-300">Bricks Broken:</span>
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
                <div className="flex justify-between">
                  <span className="text-gray-300">Remaining:</span>
                  <span className="text-blue-400 font-bold">
                    {BRICK_ROWS * BRICK_COLS - gameState.bricks.filter(b => b.destroyed).length}
                  </span>
                </div>
              </div>
            </div>

            <div className="bg-white bg-opacity-10 backdrop-blur-sm rounded-lg p-6">
              <h3 className="text-xl font-bold text-white mb-4">Controls</h3>
              <div className="space-y-2 text-gray-300">
                <div>← → Arrow Keys</div>
                <div>A D Keys</div>
                <div>SPACE - Pause/Resume</div>
              </div>
            </div>

            <div className="bg-white bg-opacity-10 backdrop-blur-sm rounded-lg p-6">
              <h3 className="text-xl font-bold text-white mb-4">How to Play</h3>
              <ul className="space-y-2 text-gray-300 text-sm">
                <li>• Move the paddle left/right with arrow keys or A/D</li>
                <li>• Bounce the ball to break all the bricks</li>
                <li>• Don't let the ball fall below the paddle</li>
                <li>• Each brick broken = 10 points</li>
                <li>• Break all bricks to win!</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BreakBricksGame;