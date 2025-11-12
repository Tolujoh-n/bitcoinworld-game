import React, { useEffect, useRef, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import Phaser from "phaser";
import api from "../../utils/api";

const BASE_WIDTH = 400;
const BASE_HEIGHT = 600;
const POINTS_PER_FRUIT = 10;

const ratio = BASE_HEIGHT / BASE_WIDTH;

const FallingFruitGame = () => {
  const { requireAuth, updateUser } = useAuth();
  const navigate = useNavigate();
  const gameRef = useRef(null);
  const phaserGameRef = useRef(null);
  const sceneRef = useRef(null);
  const [sceneReady, setSceneReady] = useState(false);
  const [isMobile, setIsMobile] = useState(
    typeof window !== "undefined" ? window.innerWidth <= 730 : false
  );
  const computeCanvasDimensions = useCallback(() => {
    if (typeof window === "undefined") {
      return { width: BASE_WIDTH, height: BASE_HEIGHT };
    }
    const padding = 32;
    const rawAvailable = Math.max(0, window.innerWidth - padding);
    const viewportClamp = Math.max(160, window.innerWidth - 16);
    let width = Math.min(BASE_WIDTH, Math.max(200, rawAvailable));
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
    isPlaying: false,
  });

  const updateGameStateValues = useCallback((updates) => {
    setGameState((prev) => ({
      ...prev,
      ...updates,
    }));
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;

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
    window.addEventListener("resize", handleResize);
    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, [computeCanvasDimensions]);

  useEffect(() => {
    const checkAuth = async () => {
      const isAuthenticated = await requireAuth();
      if (!isAuthenticated) {
        navigate("/games");
        return;
      }

      fetchHighScore();
      initializeGame();
    };

    checkAuth();

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
      const response = await api.get("/games/fallingFruit/highscore");
      updateGameStateValues({
        highScore: response.data.highScore || 0,
      });
    } catch (error) {
      console.error("Error fetching high score:", error);
    }
  };

  const submitScore = async (score) => {
    try {
      const points = score * POINTS_PER_FRUIT;
      const response = await api.post("/scores/submit", {
        gameType: "fallingFruit",
        score: score,
        points: points,
        gameData: {
          fruitsCaught: score,
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
    setSceneReady(false);

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

        updateGameStateValues({
          score: 0,
          pointsEarned: 0,
          gameOver: false,
          isPlaying: false,
        });

        const { width, height } = computeCanvasDimensions();
        this.scale.resize(width, height);
        this.scale.refresh();

        sceneRef.current = this;
        setSceneReady(true);
        this.events.once("destroy", () => {
          if (sceneRef.current === this) {
            sceneRef.current = null;
            setSceneReady(false);
          }
        });
        this.events.on("external-start", this.handleExternalStart, this);
        this.events.on("external-control", this.handleExternalControl, this);
        this.events.once("shutdown", () => {
          this.events.off("external-start", this.handleExternalStart, this);
          this.events.off("external-control", this.handleExternalControl, this);
        });
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
        updateGameStateValues({
          isPlaying: true,
          gameOver: false,
          pointsEarned: 0,
        });
      }

      endGame() {
        this.gameOver = true;
        this.gameOverOverlay.setVisible(true);
        this.gameOverText.setVisible(true);
        this.finalScoreText.setText(`Good Fruits Caught: ${this.score}`);
        this.finalScoreText.setVisible(true);
        this.pointsText.setText(`Points: ${this.score * POINTS_PER_FRUIT}`);
        this.pointsText.setVisible(true);
        this.restartText.setVisible(true);

        updateGameStateValues({
          score: this.score,
          pointsEarned: this.score * POINTS_PER_FRUIT,
          gameOver: true,
          isPlaying: false,
        });

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

        updateGameStateValues({
          score: 0,
          pointsEarned: 0,
          gameOver: false,
          isPlaying: false,
        });
      }

      handleExternalStart() {
        if (this.gameOver) {
          this.restartGame();
          this.startGame();
        } else if (!this.gameStarted) {
          this.startGame();
        }
      }

      handleExternalControl(direction) {
        if (!this.gameStarted || this.gameOver) {
          return;
        }

        const babySpeed = 10;
        switch (direction) {
          case "left":
            this.baby.x = Math.max(20, this.baby.x - babySpeed);
            break;
          case "right":
            this.baby.x = Math.min(380, this.baby.x + babySpeed);
            break;
          case "up":
            this.baby.y = Math.max(20, this.baby.y - babySpeed);
            break;
          case "down":
            this.baby.y = Math.min(580, this.baby.y + babySpeed);
            break;
          default:
            break;
        }
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
              updateGameStateValues({
                score: this.score,
                pointsEarned: this.score * POINTS_PER_FRUIT,
              });
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
      width: BASE_WIDTH,
      height: BASE_HEIGHT,
      parent: gameRef.current,
      backgroundColor: "#87CEEB",
      scene: FallingFruitScene,
      physics: {
        default: "arcade",
        arcade: {
          gravity: { y: 0, x: 0 },
        },
      },
      scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH,
      },
    };

    phaserGameRef.current = new Phaser.Game(config);
  };

  const handleStartPress = () => {
    if (!sceneRef.current) return;
    sceneRef.current.events.emit("external-start");
  };

  const handleControlPress = (direction) => {
    if (!sceneRef.current) return;
    sceneRef.current.events.emit("external-control", direction);
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
            {gameState.gameOver ? "Restart Game" : "Start Game"}
          </button>
        )}

        {isRunning && (
          <div className="w-full max-w-xs space-y-3">
            <div className="flex justify-center">
              <ControlButton
                icon="▲"
                label="Move Up"
                onPress={() => handleControlPress("up")}
              />
            </div>
            <div className="flex items-center justify-between">
              <ControlButton
                icon="◀"
                label="Move Left"
                onPress={() => handleControlPress("left")}
              />
              <ControlButton
                icon="▼"
                label="Move Down"
                onPress={() => handleControlPress("down")}
              />
              <ControlButton
                icon="▶"
                label="Move Right"
                onPress={() => handleControlPress("right")}
              />
            </div>
          </div>
        )}
      </div>
    );
  };

  const gameContainerStyle = {
    width: `${canvasSize.width}px`,
    maxWidth: "100%",
    height: `${canvasSize.height}px`,
  };

  return (
    <div className="min-h-screen w-full overflow-x-hidden py-8 px-4 sm:px-6 lg:px-8 bg-gradient-to-br from-gray-900 via-yellow-900 to-yellow-800">
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
                style={gameContainerStyle}
              >
                <div
                  ref={gameRef}
                  className="h-full w-full border-4 border-yellow-300 rounded-lg shadow-xl overflow-hidden bg-black"
                ></div>
              </div>
            </div>
            {renderMobileControls()}
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
                    {gameState.pointsEarned}
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
