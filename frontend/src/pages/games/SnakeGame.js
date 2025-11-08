import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import Phaser from "phaser";
import api from "../../utils/api";

const SnakeGame = () => {
  const { requireAuth } = useAuth();
  const navigate = useNavigate();
  const gameRef = useRef(null);
  const phaserGameRef = useRef(null);
  const [gameState, setGameState] = useState({
    score: 0,
    highScore: 0,
    gameOver: false,
    isPlaying: false,
  });

  useEffect(() => {
    if (!requireAuth()) {
      navigate("/games");
      return;
    }

    fetchHighScore();
    initializeGame();

    return () => {
      if (phaserGameRef.current) {
        phaserGameRef.current.destroy(true);
      }
    };
  }, [requireAuth, navigate]);

  const fetchHighScore = async () => {
    try {
      const response = await api.get("/games/snake/highscore");
      setGameState((prev) => ({
        ...prev,
        highScore: response.data.highScore || 0,
      }));
    } catch (error) {
      console.error("Error fetching high score:", error);
    }
  };

  const submitScore = async (score) => {
    try {
      const points = score * 10;
      await api.post("/scores/submit", {
        gameType: "snake",
        score: score,
        points: points,
        gameData: {
          speed: 150 - score * 2,
          duration: Date.now(),
        },
      });
    } catch (error) {
      console.error("Error submitting score:", error);
    }
  };

  const initializeGame = () => {
    if (phaserGameRef.current) {
      phaserGameRef.current.destroy(true);
    }

    class SnakeScene extends Phaser.Scene {
      constructor() {
        super({ key: "SnakeScene" });
      }

      preload() {
        // No assets needed
        this.load.image("snakeHead", "/assets/snake/head.png");
        this.load.image("snakeBody", "/assets/snake/body.png");
      }

      create() {
        this.snake = [];
        this.direction = { x: 0, y: 0 };
        this.nextDirection = { x: 0, y: 0 };
        this.score = 0;
        this.gameOver = false;
        this.gameStarted = false;
        this.speed = 150;
        this.lastMoveTime = 0;
        this.gridSize = 20;
        this.cellSize = 500 / this.gridSize;

        // Create snake head (circular) // Create snake head (image)
        const headX = 10 * this.cellSize;
        const headY = 10 * this.cellSize;
        const head = this.add.image(
          headX + this.cellSize / 2,
          headY + this.cellSize / 2,
          "snakeHead"
        );
        head.setDisplaySize(this.cellSize, this.cellSize);
        head.setDepth(10);

        head.setData("targetX", headX + this.cellSize / 2);
        head.setData("targetY", headY + this.cellSize / 2);
        this.snake.push(head);

        // Create food
        this.createFood();

        // Create UI
        this.scoreText = this.add.text(10, 10, "Score: 0", {
          fontSize: "20px",
          fill: "#FFD700",
        });
        this.instructionsText = this.add
          .text(250, 250, "Press SPACE to Start\nUse Arrow Keys to Move", {
            fontSize: "24px",
            fill: "#FFD700",
            align: "center",
          })
          .setOrigin(0.5);

        // Input handling
        this.cursors = this.input.keyboard.createCursorKeys();
        this.spaceKey = this.input.keyboard.addKey(
          Phaser.Input.Keyboard.KeyCodes.SPACE
        );
        this.wasdKeys = this.input.keyboard.addKeys("W,S,A,D");

        // Game over overlay
        this.gameOverOverlay = this.add.rectangle(
          250,
          250,
          500,
          500,
          0x000000,
          0.8
        );
        this.gameOverText = this.add
          .text(250, 200, "Game Over!", {
            fontSize: "32px",
            fill: "#FF0000",
            align: "center",
          })
          .setOrigin(0.5);
        this.finalScoreText = this.add
          .text(250, 250, "Final Score: 0", {
            fontSize: "20px",
            fill: "#FFFFFF",
            align: "center",
          })
          .setOrigin(0.5);
        this.restartText = this.add
          .text(250, 300, "Press SPACE to Restart", {
            fontSize: "18px",
            fill: "#FFD700",
            align: "center",
          })
          .setOrigin(0.5);

        this.gameOverOverlay.setVisible(false);
        this.gameOverText.setVisible(false);
        this.finalScoreText.setVisible(false);
        this.restartText.setVisible(false);
      }

      createFood() {
        if (this.food) {
          this.food.destroy();
        }

        let foodX, foodY;
        let validPosition = false;

        while (!validPosition) {
          foodX = Math.floor(Math.random() * this.gridSize) * this.cellSize;
          foodY = Math.floor(Math.random() * this.gridSize) * this.cellSize;

          validPosition = true;
          for (let segment of this.snake) {
            if (segment.x === foodX && segment.y === foodY) {
              validPosition = false;
              break;
            }
          }
        }

        this.food = this.add.circle(
          foodX + this.cellSize / 2,
          foodY + this.cellSize / 2,
          this.cellSize / 2 - 2,
          0xffd700
        );
        this.food.setStrokeStyle(2, 0xffa500);
      }

      moveSnake() {
        if (this.direction.x === 0 && this.direction.y === 0) return;

        const head = this.snake[0];
        const newHeadX =
          head.getData("targetX") + this.direction.x * this.cellSize;
        const newHeadY =
          head.getData("targetY") + this.direction.y * this.cellSize;

        const radius = this.cellSize / 2 - 1;
        if (
          newHeadX - radius < 0 ||
          newHeadX + radius > 500 ||
          newHeadY - radius < 0 ||
          newHeadY + radius > 500
        ) {
          this.endGame();
          return;
        }

        // Check self collision
        for (let segment of this.snake) {
          const segX = segment.getData("targetX");
          const segY = segment.getData("targetY");
          if (
            Math.abs(newHeadX - segX) < this.cellSize &&
            Math.abs(newHeadY - segY) < this.cellSize
          ) {
            this.endGame();
            return;
          }
        }

        // Update head target position
        head.setData("targetX", newHeadX);
        head.setData("targetY", newHeadY);
        head.x = newHeadX;
        head.y = newHeadY;

        // Check food collision
        if (
          Phaser.Math.Distance.Between(
            head.x,
            head.y,
            this.food.x,
            this.food.y
          ) < this.cellSize
        ) {
          this.score += 1;
          this.scoreText.setText(`Score: ${this.score}`);
          this.speed = Math.max(50, 150 - this.score * 2);
          this.createFood();

          // Add new segment to snake (circular)
          const newSegment = this.add.image(newHeadX, newHeadY, "snakeBody");
          newSegment.setDisplaySize(this.cellSize, this.cellSize);
          newSegment.setDepth(5);
          newSegment.setData("targetX", newHeadX);
          newSegment.setData("targetY", newHeadY);
          this.snake.push(newSegment);
        } else {
          // Move each segment to follow the previous one
          for (let i = this.snake.length - 1; i > 0; i--) {
            const current = this.snake[i];
            const previous = this.snake[i - 1];
            current.setData("targetX", previous.getData("targetX"));
            current.setData("targetY", previous.getData("targetY"));
          }
        }
      }

      startGame() {
        this.gameStarted = true;
        this.instructionsText.setVisible(false);
      }

      endGame() {
        this.gameOver = true;
        this.gameOverOverlay.setVisible(true);
        this.gameOverText.setVisible(true);
        this.finalScoreText.setText(`Final Score: ${this.score}`);
        this.finalScoreText.setVisible(true);
        this.restartText.setVisible(true);

        // Submit score
        submitScore(this.score);
      }

      restartGame() {
        // Clear snake
        for (let segment of this.snake) {
          segment.destroy();
        }
        this.snake = [];

        // Reset game state
        this.direction = { x: 0, y: 0 };
        this.nextDirection = { x: 0, y: 0 };
        this.score = 0;
        this.gameOver = false;
        this.gameStarted = false;
        this.speed = 150;
        this.lastMoveTime = 0;

        // Create new snake head (circular) // Create new snake head (image)
        const headX = 10 * this.cellSize;
        const headY = 10 * this.cellSize;
        const head = this.add.image(
          headX + this.cellSize / 2,
          headY + this.cellSize / 2,
          "snakeHead"
        );
        head.setDisplaySize(this.cellSize, this.cellSize);

        head.setData("targetX", headX + this.cellSize / 2);
        head.setData("targetY", headY + this.cellSize / 2);
        this.snake.push(head);

        // Create new food
        this.createFood();

        // Update UI
        this.scoreText.setText("Score: 0");
        this.instructionsText.setVisible(true);
        this.gameOverOverlay.setVisible(false);
        this.gameOverText.setVisible(false);
        this.finalScoreText.setVisible(false);
        this.restartText.setVisible(false);
      }

      update(time) {
        const head = this.snake[0];
        if (this.direction.x === 1) head.setAngle(0);
        else if (this.direction.x === -1) head.setAngle(180);
        else if (this.direction.y === -1) head.setAngle(-90);
        else if (this.direction.y === 1) head.setAngle(90);

        if (this.gameOver) {
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

        // Handle input
        if (this.cursors.left.isDown && this.direction.x === 0) {
          this.nextDirection = { x: -1, y: 0 };
        } else if (this.cursors.right.isDown && this.direction.x === 0) {
          this.nextDirection = { x: 1, y: 0 };
        } else if (this.cursors.up.isDown && this.direction.y === 0) {
          this.nextDirection = { x: 0, y: -1 };
        } else if (this.cursors.down.isDown && this.direction.y === 0) {
          this.nextDirection = { x: 0, y: 1 };
        }

        // WASD support
        if (this.wasdKeys.A.isDown && this.direction.x === 0) {
          this.nextDirection = { x: -1, y: 0 };
        } else if (this.wasdKeys.D.isDown && this.direction.x === 0) {
          this.nextDirection = { x: 1, y: 0 };
        } else if (this.wasdKeys.W.isDown && this.direction.y === 0) {
          this.nextDirection = { x: 0, y: -1 };
        } else if (this.wasdKeys.S.isDown && this.direction.y === 0) {
          this.nextDirection = { x: 0, y: 1 };
        }

        // Move snake
        if (time - this.lastMoveTime > this.speed) {
          this.direction = { ...this.nextDirection };
          this.moveSnake();
          this.lastMoveTime = time;
        }

        // Smooth interpolation for snake movement
        for (let segment of this.snake) {
          const targetX = segment.getData("targetX");
          const targetY = segment.getData("targetY");
          const currentX = segment.x;
          const currentY = segment.y;

          // Smooth movement towards target
          const lerpFactor = 0.3;
          segment.x = currentX + (targetX - currentX) * lerpFactor;
          segment.y = currentY + (targetY - currentY) * lerpFactor;
        }

        for (let i = 1; i < this.snake.length; i++) {
          const prev = this.snake[i - 1];
          const segment = this.snake[i];
          segment.rotation = Phaser.Math.Angle.Between(
            segment.x,
            segment.y,
            prev.x,
            prev.y
          );
        }
      }
    }

    const config = {
      type: Phaser.AUTO,
      width: 500,
      height: 500,
      parent: gameRef.current,
      backgroundColor: "#1a1a1a",
      scene: SnakeScene,
      physics: {
        default: "arcade",
        arcade: {
          gravity: { y: 0, x: 0 },
        },
      },
    };

    phaserGameRef.current = new Phaser.Game(config);
  };

  return (
    <div className="min-h-screen py-8 px-4 sm:px-6 lg:px-8 bg-gradient-to-br from-gray-900 via-yellow-900 to-yellow-800">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <button
            onClick={() => navigate("/games")}
            className="bg-gradient-to-r from-yellow-600 to-yellow-700 hover:from-yellow-700 hover:to-yellow-800 text-white px-6 py-3 rounded-lg transition-all duration-300 shadow-lg border-2 border-yellow-400"
          >
            ← Back to Games
          </button>
          <h1 className="text-4xl font-bold text-yellow-300 text-center flex items-center">
            🐍 Snake Game
            <span className="ml-2 text-2xl">💰</span>
          </h1>
          <div></div>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Game Area */}
          <div className="lg:col-span-2">
            <div className="bg-gradient-to-br from-yellow-900 to-yellow-800 rounded-lg p-6 border-4 border-yellow-400 shadow-2xl">
              <div
                className="relative mx-auto"
                style={{ width: "500px", height: "500px" }}
              >
                <div
                  ref={gameRef}
                  className="border-4 border-yellow-300 rounded-lg shadow-xl"
                ></div>
              </div>
            </div>
          </div>

          {/* Game Info */}
          <div className="space-y-6">
            <div className="bg-gradient-to-br from-yellow-800 to-yellow-900 bg-opacity-90 backdrop-blur-sm rounded-lg p-6 border-2 border-yellow-400 shadow-xl">
              <h3 className="text-2xl font-bold text-yellow-200 mb-4">
                💰 Game Stats
              </h3>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-yellow-100">Current Score:</span>
                  <span className="text-yellow-300 font-bold text-xl">
                    {gameState.score}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-yellow-100">High Score:</span>
                  <span className="text-yellow-300 font-bold text-xl">
                    {gameState.highScore}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-yellow-100">Points Earned:</span>
                  <span className="text-green-300 font-bold text-xl">
                    {gameState.score * 10}
                  </span>
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-br from-yellow-800 to-yellow-900 bg-opacity-90 backdrop-blur-sm rounded-lg p-6 border-2 border-yellow-400 shadow-xl">
              <h3 className="text-2xl font-bold text-yellow-200 mb-4">
                🎮 Controls
              </h3>
              <div className="space-y-3 text-yellow-100">
                <div className="flex items-center">
                  <span className="w-8 h-8 bg-yellow-600 rounded text-center text-sm font-bold mr-3">
                    ↑
                  </span>
                  <span>Move Up</span>
                </div>
                <div className="flex items-center">
                  <span className="w-8 h-8 bg-yellow-600 rounded text-center text-sm font-bold mr-3">
                    ↓
                  </span>
                  <span>Move Down</span>
                </div>
                <div className="flex items-center">
                  <span className="w-8 h-8 bg-yellow-600 rounded text-center text-sm font-bold mr-3">
                    ←
                  </span>
                  <span>Move Left</span>
                </div>
                <div className="flex items-center">
                  <span className="w-8 h-8 bg-yellow-600 rounded text-center text-sm font-bold mr-3">
                    →
                  </span>
                  <span>Move Right</span>
                </div>
                <div className="flex items-center">
                  <span className="w-8 h-8 bg-yellow-600 rounded text-center text-sm font-bold mr-3">
                    SP
                  </span>
                  <span>Start/Restart</span>
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-br from-yellow-800 to-yellow-900 bg-opacity-90 backdrop-blur-sm rounded-lg p-6 border-2 border-yellow-400 shadow-xl">
              <h3 className="text-2xl font-bold text-yellow-200 mb-4">
                📋 How to Play
              </h3>
              <ul className="space-y-3 text-yellow-100 text-sm">
                <li className="flex items-start">
                  <span className="text-yellow-400 mr-2 font-bold">•</span>
                  <span>Press SPACE to start the game</span>
                </li>
                <li className="flex items-start">
                  <span className="text-yellow-400 mr-2 font-bold">•</span>
                  <span>Control the snake with arrow keys or WASD</span>
                </li>
                <li className="flex items-start">
                  <span className="text-yellow-400 mr-2 font-bold">•</span>
                  <span>Eat golden coins to grow longer and earn points</span>
                </li>
                <li className="flex items-start">
                  <span className="text-yellow-400 mr-2 font-bold">•</span>
                  <span>Avoid hitting walls or yourself</span>
                </li>
                <li className="flex items-start">
                  <span className="text-yellow-400 mr-2 font-bold">•</span>
                  <span>Speed increases as you progress</span>
                </li>
                <li className="flex items-start">
                  <span className="text-yellow-400 mr-2 font-bold">•</span>
                  <span>Each coin = 10 points</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SnakeGame;
