import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import Phaser from 'phaser';
import api from '../../utils/api';

const BASE_WIDTH = 600;
const BASE_HEIGHT = 400;
const POINTS_PER_BRICK = 10;

const ratio = BASE_HEIGHT / BASE_WIDTH;

const BreakBricksGame = () => {
  const { requireAuth, updateUser } = useAuth();
  const navigate = useNavigate();
  const gameRef = useRef(null);
  const phaserGameRef = useRef(null);
  const sceneRef = useRef(null);
  const [sceneReady, setSceneReady] = useState(false);
  const [isMobile, setIsMobile] = useState(
    typeof window !== 'undefined' ? window.innerWidth <= 730 : false
  );
  const computeCanvasDimensions = useCallback(() => {
    if (typeof window === 'undefined') {
      return { width: BASE_WIDTH, height: BASE_HEIGHT };
    }
    const padding = 32;
    const rawAvailable = Math.max(0, window.innerWidth - padding);
    const viewportClamp = Math.max(200, window.innerWidth - 16);
    let width = Math.min(BASE_WIDTH, Math.max(240, rawAvailable));
    if (rawAvailable > 0) {
      width = Math.min(width, rawAvailable);
    }
    width = Math.min(width, viewportClamp);
    if (width <= 0) {
      width = Math.min(BASE_WIDTH, viewportClamp);
    }
    const height = Math.round(width * ratio);
    return { width, height };
  }, []);
  const [canvasSize, setCanvasSize] = useState(() => computeCanvasDimensions());
  const [gameState, setGameState] = useState({
    score: 0,
    highScore: 0,
    pointsEarned: 0,
    gameOver: false,
    isPlaying: false
  });

  const updateGameStateValues = useCallback((updates) => {
    setGameState((prev) => ({
      ...prev,
      ...updates
    }));
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleResize = () => {
      const nextSize = computeCanvasDimensions();
      setCanvasSize(nextSize);
      setIsMobile(window.innerWidth <= 730);

      if (phaserGameRef.current?.scale) {
        phaserGameRef.current.scale.resize(nextSize.width, nextSize.height);
        phaserGameRef.current.scale.refresh();
      }
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, [computeCanvasDimensions]);

  useEffect(() => {
    if (!requireAuth()) {
      navigate('/games');
      return;
    }

    fetchHighScore();
    initializeGame();

    return () => {
      if (phaserGameRef.current) {
        phaserGameRef.current.destroy(true);
        phaserGameRef.current = null;
      }
      sceneRef.current = null;
      setSceneReady(false);
    };
  }, [requireAuth, navigate]);

  const fetchHighScore = async () => {
    try {
      const response = await api.get('/games/breakBricks/highscore');
      updateGameStateValues({ highScore: response.data.highScore || 0 });
    } catch (error) {
      console.error('Error fetching high score:', error);
    }
  };

  const submitScore = async (score) => {
    try {
      const points = score * POINTS_PER_BRICK;
      const response = await api.post('/scores/submit', {
        gameType: 'breakBricks',
        score: score,
        points: points,
        gameData: {
          bricksBroken: score,
          totalBricks: 50,
          gameCompleted: score === 50
        }
      });
      if (response.data?.user) {
        updateUser(response.data.user);
      }
      await fetchHighScore();
    } catch (error) {
      console.error('Error submitting score:', error);
    }
  };

  const initializeGame = () => {
    if (phaserGameRef.current) {
      phaserGameRef.current.destroy(true);
    }
    setSceneReady(false);

    class BreakBricksScene extends Phaser.Scene {
      constructor() {
        super({ key: 'BreakBricksScene' });
      }

      preload() {
        // No assets needed
      }

      create() {
        this.paddle = null;
        this.ball = null;
        this.bricks = [];
        this.score = 0;
        this.gameOver = false;
        this.gameStarted = false;
        this.gameWon = false;
        this.ballSpeed = 3;
        this.paddleSpeed = 5;

        // Create paddle
        this.paddle = this.add.rectangle(300, 350, 80, 15, 0xFFD700);
        this.paddle.setStrokeStyle(2, 0xFFA500);

        // Create ball
        this.ball = this.add.circle(300, 320, 6, 0xFFFFFF);
        this.ball.setStrokeStyle(2, 0xCCCCCC);
        this.ball.setData('velocity', { x: 0, y: 0 });

        // Create bricks
        this.createBricks();

        // Create UI
        this.scoreText = this.add.text(10, 10, 'Bricks Broken: 0', { fontSize: '20px', fill: '#FFD700' });
        this.instructionsText = this.add.text(300, 200, 'Press SPACE to Start\nUse A/D or Arrow Keys to Move Paddle', { 
          fontSize: '18px', 
          fill: '#FFD700',
          align: 'center'
        }).setOrigin(0.5);

        // Input handling
        this.cursors = this.input.keyboard.createCursorKeys();
        this.spaceKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
        this.adKeys = this.input.keyboard.addKeys('A,D');

        // Game over overlay
        this.gameOverOverlay = this.add.rectangle(300, 200, 600, 400, 0x000000, 0.8);
        this.gameOverText = this.add.text(300, 150, 'Game Over!', { 
          fontSize: '32px', 
          fill: '#FF0000',
          align: 'center'
        }).setOrigin(0.5);
        this.finalScoreText = this.add.text(300, 200, 'Bricks Broken: 0', { 
          fontSize: '20px', 
          fill: '#FFFFFF',
          align: 'center'
        }).setOrigin(0.5);
        this.pointsText = this.add.text(300, 230, 'Points: 0', { 
          fontSize: '18px', 
          fill: '#FFD700',
          align: 'center'
        }).setOrigin(0.5);
        this.restartText = this.add.text(300, 280, 'Press SPACE to Restart', { 
          fontSize: '18px', 
          fill: '#FFD700',
          align: 'center'
        }).setOrigin(0.5);

        // Game won overlay
        this.gameWonText = this.add.text(300, 150, '🎉 Congratulations!', { 
          fontSize: '28px', 
          fill: '#00FF00',
          align: 'center'
        }).setOrigin(0.5);
        this.wonScoreText = this.add.text(300, 200, 'All Bricks Broken!', { 
          fontSize: '20px', 
          fill: '#FFFFFF',
          align: 'center'
        }).setOrigin(0.5);
        this.wonPointsText = this.add.text(300, 230, 'Points: 0', { 
          fontSize: '18px', 
          fill: '#FFD700',
          align: 'center'
        }).setOrigin(0.5);
        this.wonRestartText = this.add.text(300, 280, 'Press SPACE to Play Again', { 
          fontSize: '18px', 
          fill: '#FFD700',
          align: 'center'
        }).setOrigin(0.5);

        this.gameOverOverlay.setVisible(false);
        this.gameOverText.setVisible(false);
        this.finalScoreText.setVisible(false);
        this.pointsText.setVisible(false);
        this.restartText.setVisible(false);
        this.gameWonText.setVisible(false);
        this.wonScoreText.setVisible(false);
        this.wonPointsText.setVisible(false);
        this.wonRestartText.setVisible(false);

        updateGameStateValues({
          score: 0,
          pointsEarned: 0,
          gameOver: false,
          isPlaying: false
        });

        const { width, height } = computeCanvasDimensions();
        this.scale.resize(width, height);
        this.scale.refresh();

        sceneRef.current = this;
        setSceneReady(true);
        this.events.once('destroy', () => {
          if (sceneRef.current === this) {
            sceneRef.current = null;
            setSceneReady(false);
          }
        });
        this.events.on('external-start', this.handleExternalStart, this);
        this.events.on('external-control', this.handleExternalControl, this);
        this.events.once('shutdown', () => {
          this.events.off('external-start', this.handleExternalStart, this);
          this.events.off('external-control', this.handleExternalControl, this);
        });
      }

      createBricks() {
        const brickWidth = 60;
        const brickHeight = 20;
        const brickRows = 5;
        const brickCols = 10;
        const startX = (600 - (brickCols * brickWidth)) / 2;
        const startY = 50;
        const colors = [0xFF0000, 0xFF6600, 0xFFFF00, 0x00FF00, 0x0066FF];

        for (let row = 0; row < brickRows; row++) {
          for (let col = 0; col < brickCols; col++) {
            const brick = this.add.rectangle(
              startX + col * brickWidth + brickWidth/2,
              startY + row * brickHeight + brickHeight/2,
              brickWidth,
              brickHeight,
              colors[row]
            );
            brick.setStrokeStyle(2, 0x000000);
            brick.setData('destroyed', false);
            this.bricks.push(brick);
          }
        }
      }

      startGame() {
        this.gameStarted = true;
        this.instructionsText.setVisible(false);
        updateGameStateValues({
          isPlaying: true,
          gameOver: false,
          pointsEarned: 0
        });
        
        // Set initial ball velocity
        const ballVelocity = this.ball.getData('velocity');
        ballVelocity.x = this.ballSpeed;
        ballVelocity.y = -this.ballSpeed;
      }

      endGame() {
        this.gameOver = true;
        this.gameOverOverlay.setVisible(true);
        this.gameOverText.setVisible(true);
        this.finalScoreText.setText(`Bricks Broken: ${this.score}`);
        this.finalScoreText.setVisible(true);
        this.pointsText.setText(`Points: ${this.score * POINTS_PER_BRICK}`);
        this.pointsText.setVisible(true);
        this.restartText.setVisible(true);

        updateGameStateValues({
          score: this.score,
          pointsEarned: this.score * POINTS_PER_BRICK,
          gameOver: true,
          isPlaying: false
        });

        // Submit score
        submitScore(this.score);
      }

      winGame() {
        this.gameWon = true;
        this.gameOverOverlay.setVisible(true);
        this.gameWonText.setVisible(true);
        this.wonScoreText.setVisible(true);
        this.wonPointsText.setText(`Points: ${this.score * POINTS_PER_BRICK}`);
        this.wonPointsText.setVisible(true);
        this.wonRestartText.setVisible(true);

        updateGameStateValues({
          score: this.score,
          pointsEarned: this.score * POINTS_PER_BRICK,
          gameOver: true,
          isPlaying: false
        });

        // Submit score
        submitScore(this.score);
      }

      restartGame() {
        // Clear bricks
        for (let brick of this.bricks) {
          brick.destroy();
        }
        this.bricks = [];

        // Reset game state
        this.score = 0;
        this.gameOver = false;
        this.gameStarted = false;
        this.gameWon = false;

        // Reset paddle and ball positions
        this.paddle.x = 300;
        this.ball.x = 300;
        this.ball.y = 320;
        this.ball.setData('velocity', { x: 0, y: 0 });

        // Create new bricks
        this.createBricks();

        // Update UI
        this.scoreText.setText('Bricks Broken: 0');
        this.instructionsText.setVisible(true);
        this.gameOverOverlay.setVisible(false);
        this.gameOverText.setVisible(false);
        this.finalScoreText.setVisible(false);
        this.pointsText.setVisible(false);
        this.restartText.setVisible(false);
        this.gameWonText.setVisible(false);
        this.wonScoreText.setVisible(false);
        this.wonPointsText.setVisible(false);
        this.wonRestartText.setVisible(false);

        updateGameStateValues({
          score: 0,
          pointsEarned: 0,
          gameOver: false,
          isPlaying: false
        });
      }

      handleExternalStart() {
        if (this.gameOver || this.gameWon) {
          this.restartGame();
          this.startGame();
        } else if (!this.gameStarted) {
          this.startGame();
        }
      }

      handleExternalControl(direction) {
        if (!this.gameStarted || this.gameOver || this.gameWon) {
          return;
        }

        const delta = this.paddleSpeed * 2;
        if (direction === 'left') {
          this.paddle.x = Math.max(40, this.paddle.x - delta);
        } else if (direction === 'right') {
          this.paddle.x = Math.min(560, this.paddle.x + delta);
        }
      }

      update(time) {
        if (this.gameOver || this.gameWon) {
          if (this.spaceKey.isDown) {
            this.restartGame();
          }
          return;
        }

        if (!this.gameStarted) {
          if (this.spaceKey.isDown) {
            this.startGame();
          }
          return;
        }

        // Move paddle
        if (this.cursors.left.isDown || this.adKeys.A.isDown) {
          this.paddle.x = Math.max(40, this.paddle.x - this.paddleSpeed);
        }
        if (this.cursors.right.isDown || this.adKeys.D.isDown) {
          this.paddle.x = Math.min(560, this.paddle.x + this.paddleSpeed);
          }

          // Move ball
        const ballVelocity = this.ball.getData('velocity');
        this.ball.x += ballVelocity.x;
        this.ball.y += ballVelocity.y;

          // Ball collision with walls
        if (this.ball.x <= 6 || this.ball.x >= 594) {
          ballVelocity.x = -ballVelocity.x;
          this.ball.x = Math.max(6, Math.min(594, this.ball.x));
        }
        if (this.ball.y <= 6) {
          ballVelocity.y = -ballVelocity.y;
          this.ball.y = 6;
          }

          // Ball collision with paddle
        if (this.ball.y >= this.paddle.y - 15 &&
            this.ball.y <= this.paddle.y + 15 &&
            this.ball.x >= this.paddle.x - 40 &&
            this.ball.x <= this.paddle.x + 40) {
          
          const paddleCenter = this.paddle.x;
          const ballCenter = this.ball.x;
          const hitPos = (ballCenter - paddleCenter) / 40;
          
          ballVelocity.x = hitPos * 4;
          ballVelocity.y = -Math.abs(ballVelocity.y);
          this.ball.y = this.paddle.y - 15;
          }

          // Ball collision with bricks
        for (let i = this.bricks.length - 1; i >= 0; i--) {
          const brick = this.bricks[i];
          if (!brick.getData('destroyed') &&
              this.ball.x >= brick.x - 30 &&
              this.ball.x <= brick.x + 30 &&
              this.ball.y >= brick.y - 10 &&
              this.ball.y <= brick.y + 10) {
            
            brick.setData('destroyed', true);
            brick.setVisible(false);
            this.score += 1;
            this.scoreText.setText(`Bricks Broken: ${this.score}`);
            updateGameStateValues({
              score: this.score,
              pointsEarned: this.score * POINTS_PER_BRICK
            });
            ballVelocity.y = -ballVelocity.y;

            // Check if all bricks are destroyed
            if (this.score === 50) {
              this.winGame();
              return;
            }
          }
          }

          // Check if ball fell below paddle
        if (this.ball.y > 400) {
          this.endGame();
        }
      }
    }

    const config = {
      type: Phaser.AUTO,
      width: BASE_WIDTH,
      height: BASE_HEIGHT,
      parent: gameRef.current,
      backgroundColor: '#1a1a1a',
      scene: BreakBricksScene,
      physics: {
        default: 'arcade',
        arcade: {
          gravity: { y: 0, x: 0 }
        }
      },
      scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH
      }
    };

    phaserGameRef.current = new Phaser.Game(config);
  };

  const handleStartPress = () => {
    if (!sceneRef.current) return;
    sceneRef.current.events.emit('external-start');
  };

  const handleControlPress = (direction) => {
    if (!sceneRef.current) return;
    sceneRef.current.events.emit('external-control', direction);
  };

  const ControlButton = ({ icon, label, onPress }) => {
    const intervalRef = useRef(null);

    useEffect(() => {
      return () => {
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
        }
      };
    }, []);

    const stopRepeating = () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };

    const handlePointerDown = (event) => {
      event.preventDefault();
      onPress();
      stopRepeating();
      intervalRef.current = setInterval(onPress, 90);
    };

    const handlePointerUp = () => {
      stopRepeating();
    };

    return (
      <button
        type="button"
        onPointerDown={handlePointerDown}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
        onPointerCancel={handlePointerUp}
        className="w-16 h-16 rounded-full bg-yellow-500 text-white text-2xl shadow-lg flex items-center justify-center active:scale-95 transition-transform focus:outline-none focus:ring-2 focus:ring-yellow-300 select-none"
        aria-label={label}
      >
        {icon}
      </button>
    );
  };

  const renderMobileControls = () => {
    if (!isMobile || !sceneReady) {
      return null;
    }

    const isRunning = gameState.isPlaying && !gameState.gameOver;

    return (
      <div className="mt-4 flex flex-col items-center gap-4">
        {!isRunning && (
          <button
            type="button"
            onClick={handleStartPress}
            className="w-full max-w-xs rounded-xl bg-yellow-500 px-6 py-3 text-base font-semibold text-white shadow-lg transition-colors duration-200 hover:bg-yellow-600 focus:outline-none focus:ring-2 focus:ring-yellow-300"
            disabled={!sceneReady}
          >
            {gameState.gameOver ? 'Restart Game' : 'Start Game'}
          </button>
        )}

        {isRunning && (
          <div className="flex w-full max-w-xs items-center justify-evenly">
            <ControlButton
              icon="◀"
              label="Move Left"
              onPress={() => handleControlPress('left')}
            />
            <ControlButton
              icon="▶"
              label="Move Right"
              onPress={() => handleControlPress('right')}
            />
          </div>
        )}
      </div>
    );
  };

  const gameContainerStyle = {
    width: `${canvasSize.width}px`,
    maxWidth: '100%',
    height: `${canvasSize.height}px`
  };

  return (
    <div className="min-h-screen w-full overflow-x-hidden py-8 px-4 sm:px-6 lg:px-8 bg-gradient-to-br from-gray-900 via-yellow-900 to-yellow-800">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <button
            onClick={() => navigate('/games')}
            className="bg-gradient-to-r from-yellow-600 to-yellow-700 hover:from-yellow-700 hover:to-yellow-800 text-white px-6 py-3 rounded-lg transition-all duration-300 shadow-lg border-2 border-yellow-400"
          >
            ← Back to Games
          </button>
          <h1 className="text-4xl font-bold text-yellow-300 text-center flex items-center">
            🧱 Break Bricks
            <span className="ml-2 text-2xl">⚡</span>
          </h1>
          <div></div>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Game Area */}
          <div className="lg:col-span-2">
            <div className="bg-gradient-to-br from-yellow-900 to-yellow-800 rounded-lg p-6 border-4 border-yellow-400 shadow-2xl">
              <div className="relative mx-auto" style={gameContainerStyle}>
                <div ref={gameRef} className="h-full w-full border-4 border-yellow-300 rounded-lg shadow-xl overflow-hidden bg-black"></div>
              </div>
            </div>
            {renderMobileControls()}
          </div>

          {/* Game Info */}
          <div className="space-y-6">
            <div className="bg-gradient-to-br from-yellow-800 to-yellow-900 bg-opacity-90 backdrop-blur-sm rounded-lg p-6 border-2 border-yellow-400 shadow-xl">
              <h3 className="text-2xl font-bold text-yellow-200 mb-4">🧱 Game Stats</h3>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-yellow-100">Bricks Broken:</span>
                  <span className="text-yellow-300 font-bold text-xl">{gameState.score}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-yellow-100">High Score:</span>
                  <span className="text-yellow-300 font-bold text-xl">{gameState.highScore}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-yellow-100">Points Earned:</span>
                  <span className="text-green-300 font-bold text-xl">{gameState.pointsEarned}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-yellow-100">Remaining:</span>
                  <span className="text-blue-300 font-bold text-xl">{50 - gameState.score}</span>
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-br from-yellow-800 to-yellow-900 bg-opacity-90 backdrop-blur-sm rounded-lg p-6 border-2 border-yellow-400 shadow-xl">
              <h3 className="text-2xl font-bold text-yellow-200 mb-4">🎮 Controls</h3>
              <div className="space-y-3 text-yellow-100">
                <div className="flex items-center">
                  <span className="w-8 h-8 bg-yellow-600 rounded text-center text-sm font-bold mr-3">←</span>
                  <span>Move Left</span>
                </div>
                <div className="flex items-center">
                  <span className="w-8 h-8 bg-yellow-600 rounded text-center text-sm font-bold mr-3">→</span>
                  <span>Move Right</span>
                </div>
                <div className="flex items-center">
                  <span className="w-8 h-8 bg-yellow-600 rounded text-center text-sm font-bold mr-3">A</span>
                  <span>Move Left</span>
                </div>
                <div className="flex items-center">
                  <span className="w-8 h-8 bg-yellow-600 rounded text-center text-sm font-bold mr-3">D</span>
                  <span>Move Right</span>
                </div>
                <div className="flex items-center">
                  <span className="w-8 h-8 bg-yellow-600 rounded text-center text-sm font-bold mr-3">SP</span>
                  <span>Start/Restart</span>
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-br from-yellow-800 to-yellow-900 bg-opacity-90 backdrop-blur-sm rounded-lg p-6 border-2 border-yellow-400 shadow-xl">
              <h3 className="text-2xl font-bold text-yellow-200 mb-4">📋 How to Play</h3>
              <ul className="space-y-3 text-yellow-100 text-sm">
                <li className="flex items-start">
                  <span className="text-yellow-400 mr-2 font-bold">•</span>
                  <span>Press SPACE to start the game</span>
                </li>
                <li className="flex items-start">
                  <span className="text-yellow-400 mr-2 font-bold">•</span>
                  <span>Move the paddle left/right with arrow keys or A/D</span>
                </li>
                <li className="flex items-start">
                  <span className="text-yellow-400 mr-2 font-bold">•</span>
                  <span>Bounce the ball to break all the bricks</span>
                </li>
                <li className="flex items-start">
                  <span className="text-yellow-400 mr-2 font-bold">•</span>
                  <span>Don't let the ball fall below the paddle</span>
                </li>
                <li className="flex items-start">
                  <span className="text-yellow-400 mr-2 font-bold">•</span>
                  <span>Each brick broken = 10 points</span>
                </li>
                <li className="flex items-start">
                  <span className="text-yellow-400 mr-2 font-bold">•</span>
                  <span>Break all 50 bricks to win!</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BreakBricksGame;