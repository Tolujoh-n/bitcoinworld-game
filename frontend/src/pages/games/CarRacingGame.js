import React, { useEffect, useRef, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import Phaser from "phaser";
import api from "../../utils/api";

const CarRacingGame = () => {
  const { requireAuth, updateUser } = useAuth();
  const navigate = useNavigate();
  const gameRef = useRef(null);
  const phaserGameRef = useRef(null);
  const [gameState, setGameState] = useState({
    score: 0,
    highScore: 0,
    gameOver: false,
    isPlaying: false,
  });
  const POINTS_PER_CAR = 10;

  const updateGameStateValues = useCallback((updates) => {
    setGameState((prev) => ({
      ...prev,
      ...updates,
    }));
  }, []);

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
      const response = await api.get("/games/carRacing/highscore");
      updateGameStateValues({
        highScore: response.data.highScore || 0,
      });
    } catch (error) {
      console.error("Error fetching high score:", error);
    }
  };

  const submitScore = async (score) => {
    try {
      const points = score * POINTS_PER_CAR;
      const response = await api.post("/scores/submit", {
        gameType: "carRacing",
        score: score,
        points: points,
        gameData: {
          carsPassed: score,
          speed: 2 + score * 0.1,
        },
      });
      if (response.data?.user) {
        updateUser(response.data.user);
      }
      await fetchHighScore();
    } catch (error) {
      console.error("Error submitting score:", error);
    }
  };

  const initializeGame = () => {
    if (phaserGameRef.current) {
      phaserGameRef.current.destroy(true);
    }

    class CarRacingScene extends Phaser.Scene {
      constructor() {
        super({ key: "CarRacingScene" });
      }

      preload() {
        // No assets needed
        this.load.image("playerCar", "/assets/cars/playerCar.png");
        this.load.image("enemyCar1", "/assets/cars/enemyCar1.png");
        this.load.image("enemyCar2", "/assets/cars/enemyCar2.png");
        this.load.image("enemyCar3", "/assets/cars/enemyCar3.png");
      }

      create() {
        this.playerCar = null;
        this.enemyCars = [];
        this.score = 0;
        this.gameOver = false;
        this.gameStarted = false;
        this.speed = 2;
        this.lastEnemySpawn = 0;
        this.roadWidth = 300;
        this.laneWidth = 100;
        this.carWidth = 40;
        this.carHeight = 60;

        // Create road
        this.road = this.add.rectangle(200, 300, this.roadWidth, 600, 0x333333);

        // Create road lines
        this.roadLines = [];
        for (let i = 0; i < 20; i++) {
          const line = this.add.rectangle(200, i * 30, 4, 20, 0xffff00);
          this.roadLines.push(line);
        }

        // Create player car
        this.playerCar = this.add.sprite(200, 500, "playerCar");
        this.playerCar.setScale(1);

        // Create UI
        this.scoreText = this.add.text(10, 10, "Cars Passed: 0", {
          fontSize: "20px",
          fill: "#FFD700",
        });
        this.instructionsText = this.add
          .text(200, 300, "Press SPACE to Start\nUse Arrow Keys to Move", {
            fontSize: "20px",
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
          200,
          300,
          400,
          600,
          0x000000,
          0.8
        );
        this.gameOverText = this.add
          .text(200, 250, "💥 Crash!", {
            fontSize: "28px",
            fill: "#FF0000",
            align: "center",
          })
          .setOrigin(0.5);
        this.finalScoreText = this.add
          .text(200, 300, "Cars Passed: 0", {
            fontSize: "18px",
            fill: "#FFFFFF",
            align: "center",
          })
          .setOrigin(0.5);
        this.pointsText = this.add
          .text(200, 330, "Points: 0", {
            fontSize: "16px",
            fill: "#FFD700",
            align: "center",
          })
          .setOrigin(0.5);
        this.restartText = this.add
          .text(200, 380, "Press SPACE to Restart", {
            fontSize: "16px",
            fill: "#FFD700",
            align: "center",
          })
          .setOrigin(0.5);

        this.gameOverOverlay.setVisible(false);
        this.gameOverText.setVisible(false);
        this.finalScoreText.setVisible(false);
        this.pointsText.setVisible(false);
        this.restartText.setVisible(false);

        updateGameStateValues({
          score: 0,
          gameOver: false,
          isPlaying: false,
        });
      }

      spawnEnemyCar() {
        const lanes = [150, 200, 250];
        const randomLane = lanes[Math.floor(Math.random() * lanes.length)];
        const enemyTypes = ["enemyCar1", "enemyCar2", "enemyCar3"];
        const randomEnemy =
          enemyTypes[Math.floor(Math.random() * enemyTypes.length)];

        const enemyCar = this.add.sprite(randomLane, -60, randomEnemy);
        enemyCar.setScale(1); // adjust size
        this.enemyCars.push(enemyCar);
      }

      startGame() {
        this.gameStarted = true;
        this.instructionsText.setVisible(false);
        updateGameStateValues({
          isPlaying: true,
          gameOver: false,
        });
      }

      endGame() {
        this.gameOver = true;
        this.gameOverOverlay.setVisible(true);
        this.gameOverText.setVisible(true);
        this.finalScoreText.setText(`Cars Passed: ${this.score}`);
        this.finalScoreText.setVisible(true);
        this.pointsText.setText(`Points: ${this.score * POINTS_PER_CAR}`);
        this.pointsText.setVisible(true);
        this.restartText.setVisible(true);

        updateGameStateValues({
          score: this.score,
          gameOver: true,
          isPlaying: false,
        });

        // Submit score
        submitScore(this.score);
      }

      restartGame() {
        // Clear enemy cars
        for (let car of this.enemyCars) {
          car.destroy();
        }
        this.enemyCars = [];

        // Reset game state
        this.score = 0;
        this.gameOver = false;
        this.gameStarted = false;
        this.speed = 2;
        this.lastEnemySpawn = 0;

        // Reset player car position
        this.playerCar.x = 200;
        this.playerCar.y = 500;

        // Reset road lines
        for (let i = 0; i < this.roadLines.length; i++) {
          this.roadLines[i].y = i * 30;
        }

        // Update UI
        this.scoreText.setText("Cars Passed: 0");
        this.instructionsText.setVisible(true);
        this.gameOverOverlay.setVisible(false);
        this.gameOverText.setVisible(false);
        this.finalScoreText.setVisible(false);
        this.pointsText.setVisible(false);
        this.restartText.setVisible(false);

        updateGameStateValues({
          score: 0,
          gameOver: false,
          isPlaying: false,
        });
      }

      update(time) {
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

        // Move road lines
        for (let line of this.roadLines) {
          line.y += this.speed;
          if (line.y > 600) {
            line.y = -20;
          }
        }

        // Handle player input
        const playerSpeed = 5;
        if (this.cursors.left.isDown || this.wasdKeys.A.isDown) {
          this.playerCar.x = Math.max(150, this.playerCar.x - playerSpeed);
        }
        if (this.cursors.right.isDown || this.wasdKeys.D.isDown) {
          this.playerCar.x = Math.min(250, this.playerCar.x + playerSpeed);
        }
        if (this.cursors.up.isDown || this.wasdKeys.W.isDown) {
          this.playerCar.y = Math.max(50, this.playerCar.y - playerSpeed);
        }
        if (this.cursors.down.isDown || this.wasdKeys.S.isDown) {
          this.playerCar.y = Math.min(550, this.playerCar.y + playerSpeed);
        }

        // Spawn enemy cars
        if (time - this.lastEnemySpawn > 2000) {
          this.spawnEnemyCar();
          this.lastEnemySpawn = time;
        }

        // Move enemy cars
        for (let i = this.enemyCars.length - 1; i >= 0; i--) {
          const car = this.enemyCars[i];
          car.y += this.speed;

          // Check collision with player
          if (
            Phaser.Geom.Rectangle.Overlaps(
              this.playerCar.getBounds(),
              car.getBounds()
            )
          ) {
            this.endGame();
            return;
          }

          // Remove cars that passed
          if (car.y > 650) {
            this.score += 1;
            this.scoreText.setText(`Cars Passed: ${this.score}`);
            this.speed = Math.min(8, 2 + this.score * 0.1);
            updateGameStateValues({ score: this.score });
            car.destroy();
            this.enemyCars.splice(i, 1);
          }
        }
      }
    }

    const config = {
      type: Phaser.AUTO,
      width: 400,
      height: 600,
      parent: gameRef.current,
      backgroundColor: "#1a1a1a",
      scene: CarRacingScene,
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
            🏎️ Car Racing
            <span className="ml-2 text-2xl">🏁</span>
          </h1>
          <div></div>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Game Area */}
          <div className="lg:col-span-2">
            <div className="bg-gradient-to-br from-yellow-900 to-yellow-800 rounded-lg p-6 border-4 border-yellow-400 shadow-2xl">
              <div
                className="relative mx-auto"
                style={{ width: "400px", height: "600px" }}
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
                🏎️ Game Stats
              </h3>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-yellow-100">Cars Passed:</span>
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
                    {gameState.score * POINTS_PER_CAR}
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
                  <span>Use arrow keys or WASD to control your car</span>
                </li>
                <li className="flex items-start">
                  <span className="text-yellow-400 mr-2 font-bold">•</span>
                  <span>Avoid crashing into oncoming cars</span>
                </li>
                <li className="flex items-start">
                  <span className="text-yellow-400 mr-2 font-bold">•</span>
                  <span>Each car you avoid = 10 points</span>
                </li>
                <li className="flex items-start">
                  <span className="text-yellow-400 mr-2 font-bold">•</span>
                  <span>Speed increases over time</span>
                </li>
                <li className="flex items-start">
                  <span className="text-yellow-400 mr-2 font-bold">•</span>
                  <span>Stay alive as long as possible!</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CarRacingGame;
