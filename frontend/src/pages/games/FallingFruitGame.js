import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import Phaser from "phaser";
import api from "../../utils/api";

const FallingFruitGame = () => {
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
      const response = await api.get("/games/fallingFruit/highscore");
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
        gameType: "fallingFruit",
        score: score,
        points: points,
        gameData: {
          fruitsCaught: score,
          speed: 2 + score * 0.1,
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

    class FallingFruitScene extends Phaser.Scene {
      constructor() {
        super({ key: "FallingFruitScene" });
      }

      preload() {
        // No assets needed
        this.load.image("background", "/assets/fruits/background.png");
        this.load.image("baby", "/assets/fruits/baby.png");

        // Good fruits
        this.load.image("apple", "/assets/fruits/apple.png");
        this.load.image("banana", "/assets/fruits/banana.png");
        this.load.image("orange", "/assets/fruits/orange.png");
        this.load.image("grape", "/assets/fruits/grape.png");

        // Bad fruit
        this.load.image("rotten", "/assets/fruits/rotten_fruit.png");
      }

      create() {
        this.baby = null;
        this.fruits = [];
        this.score = 0;
        this.gameOver = false;
        this.gameStarted = false;
        this.speed = 2;
        this.lastFruitSpawn = 0;
        this.babySize = 40;

        // Create baby
        this.add.image(200, 300, "background").setDisplaySize(400, 600);

        // Baby sprite
        this.baby = this.add.sprite(200, 500, "baby");
        this.baby.setScale(0.3);
        this.baby.setData("type", "baby");

        // Create UI
        this.scoreText = this.add.text(10, 10, "Good Fruits: 0", {
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
          .text(200, 250, "💥 Bad Fruit!", {
            fontSize: "28px",
            fill: "#FF0000",
            align: "center",
          })
          .setOrigin(0.5);
        this.finalScoreText = this.add
          .text(200, 300, "Good Fruits Caught: 0", {
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
      }

      spawnFruit() {
        const fruitType = Math.random() < 0.7 ? "good" : "bad";
        const x = Math.random() * 350 + 25;

        const goodFruits = ["apple", "banana", "orange", "grape"];
        const fruitKey =
          fruitType === "good"
            ? Phaser.Utils.Array.GetRandom(goodFruits)
            : "rotten";

        const fruit = this.add.sprite(x, -20, fruitKey);
        fruit.setScale(0.15);
        fruit.setData("type", fruitType);

        this.fruits.push(fruit);
      }

      startGame() {
        this.gameStarted = true;
        this.instructionsText.setVisible(false);
      }

      endGame() {
        this.gameOver = true;
        this.gameOverOverlay.setVisible(true);
        this.gameOverText.setVisible(true);
        this.finalScoreText.setText(`Good Fruits Caught: ${this.score}`);
        this.finalScoreText.setVisible(true);
        this.pointsText.setText(`Points: ${this.score * 10}`);
        this.pointsText.setVisible(true);
        this.restartText.setVisible(true);

        // Submit score
        submitScore(this.score);
      }

      restartGame() {
        // Clear fruits
        for (let fruit of this.fruits) {
          fruit.destroy();
        }
        this.fruits = [];

        // Reset game state
        this.score = 0;
        this.gameOver = false;
        this.gameStarted = false;
        this.speed = 2;
        this.lastFruitSpawn = 0;

        // Reset baby position
        this.baby.x = 200;
        this.baby.y = 500;

        // Update UI
        this.scoreText.setText("Good Fruits: 0");
        this.instructionsText.setVisible(true);
        this.gameOverOverlay.setVisible(false);
        this.gameOverText.setVisible(false);
        this.finalScoreText.setVisible(false);
        this.pointsText.setVisible(false);
        this.restartText.setVisible(false);
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

        // Handle baby movement
        const babySpeed = 5;
        if (this.cursors.left.isDown || this.wasdKeys.A.isDown) {
          this.baby.x = Math.max(20, this.baby.x - babySpeed);
        }
        if (this.cursors.right.isDown || this.wasdKeys.D.isDown) {
          this.baby.x = Math.min(380, this.baby.x + babySpeed);
        }
        if (this.cursors.up.isDown || this.wasdKeys.W.isDown) {
          this.baby.y = Math.max(20, this.baby.y - babySpeed);
        }
        if (this.cursors.down.isDown || this.wasdKeys.S.isDown) {
          this.baby.y = Math.min(580, this.baby.y + babySpeed);
        }

        // Spawn fruits
        if (time - this.lastFruitSpawn > 1500) {
          this.spawnFruit();
          this.lastFruitSpawn = time;
        }

        // Move fruits and check collisions
        for (let i = this.fruits.length - 1; i >= 0; i--) {
          const fruit = this.fruits[i];
          fruit.y += this.speed;

          // Check collision with baby
          const distance = Phaser.Math.Distance.Between(
            this.baby.x,
            this.baby.y,
            fruit.x,
            fruit.y
          );
          if (distance < this.babySize / 2 + 15) {
            if (fruit.getData("type") === "good") {
              // Good fruit caught
              this.score += 1;
              this.scoreText.setText(`Good Fruits: ${this.score}`);
              this.speed = Math.min(8, 2 + this.score * 0.1);
              fruit.destroy();
              this.fruits.splice(i, 1);
            } else {
              // Bad fruit collision - game over
              this.endGame();
              return;
            }
          }

          // Remove fruits that fell off screen
          if (fruit.y > 650) {
            fruit.destroy();
            this.fruits.splice(i, 1);
          }
        }
      }
    }

    const config = {
      type: Phaser.AUTO,
      width: 400,
      height: 600,
      parent: gameRef.current,
      backgroundColor: "#87CEEB",
      scene: FallingFruitScene,
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
            🍎 Falling Fruit
            <span className="ml-2 text-2xl">👶</span>
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
                🍎 Game Stats
              </h3>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-yellow-100">Good Fruits:</span>
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
                  <span>Move the baby with arrow keys or WASD</span>
                </li>
                <li className="flex items-start">
                  <span className="text-yellow-400 mr-2 font-bold">•</span>
                  <span>Catch green fruits (good) - they give points!</span>
                </li>
                <li className="flex items-start">
                  <span className="text-yellow-400 mr-2 font-bold">•</span>
                  <span>Avoid red fruits (bad) - they end the game!</span>
                </li>
                <li className="flex items-start">
                  <span className="text-yellow-400 mr-2 font-bold">•</span>
                  <span>Speed increases as you catch more fruits</span>
                </li>
                <li className="flex items-start">
                  <span className="text-yellow-400 mr-2 font-bold">•</span>
                  <span>Each good fruit = 10 points</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FallingFruitGame;
