import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const Home = () => {
  const { user } = useAuth();
  const totalPoints = user?.totalPoints ?? 0;
  const mintedPoints = user?.mintedPoints ?? 0;
  const availablePoints = user?.availablePoints ?? Math.max(0, totalPoints - mintedPoints);
  const oracleBalance = user?.mintedOracles ?? (mintedPoints / 100);

  return (
    <div className="min-h-screen py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        {/* Hero Section */}
        <div className="text-center mb-16">
          <h1 className="text-4xl md:text-6xl font-bold text-white mb-6">
            Welcome to <span className="text-yellow-400">BitcoinWorld</span>
          </h1>
          <p className="text-xl text-gray-300 mb-8 max-w-3xl mx-auto">
            Play exciting games, earn points, and compete on the leaderboard. 
            Use your wallet address to track your progress and achievements!
          </p>
          
          {user ? (
            <div className="bg-gradient-to-r from-yellow-500 to-yellow-600 rounded-lg p-6 max-w-md mx-auto mb-8">
              <h3 className="text-lg font-semibold text-white mb-2">Welcome back!</h3>
              <p className="text-yellow-100 mb-4">
                Wallet: {user.walletAddress?.slice(0, 8)}...{user.walletAddress?.slice(-6)}
              </p>
              <div className="space-y-1">
                <p className="text-2xl font-bold text-white">
                  {availablePoints.toLocaleString()} Available Points
                </p>
                <p className="text-sm text-yellow-100">
                  Minted: {mintedPoints.toLocaleString()} pts • Oracle Balance: {oracleBalance.toFixed(2)} ORC
                </p>
              </div>
            </div>
          ) : (
            <div className="bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg p-6 max-w-md mx-auto mb-8">
              <p className="text-white mb-4">
                Ready to start your gaming journey?
              </p>
              <p className="text-blue-100 text-sm">
                Click on any game below to begin!
              </p>
            </div>
          )}
          
          <Link
            to="/games"
            className="inline-block bg-yellow-500 hover:bg-yellow-600 text-white font-bold py-3 px-8 rounded-lg text-lg transition-colors gold-pulse"
          >
            Start Playing Now
          </Link>
        </div>

        {/* Features Section */}
        <div className="grid md:grid-cols-3 gap-8 mb-16">
          <div className="bg-white bg-opacity-10 backdrop-blur-sm rounded-lg p-6 text-center">
            <div className="text-4xl mb-4">🎮</div>
            <h3 className="text-xl font-semibold text-white mb-2">4 Exciting Games</h3>
            <p className="text-gray-300">
              Snake, Falling Fruit, Break Bricks, and Click Counter - each with unique challenges and rewards.
            </p>
          </div>
          
          <div className="bg-white bg-opacity-10 backdrop-blur-sm rounded-lg p-6 text-center">
            <div className="text-4xl mb-4">🏆</div>
            <h3 className="text-xl font-semibold text-white mb-2">Leaderboard Competition</h3>
            <p className="text-gray-300">
              Compete with players worldwide and see who has the highest scores in each game.
            </p>
          </div>
          
          <div className="bg-white bg-opacity-10 backdrop-blur-sm rounded-lg p-6 text-center">
            <div className="text-4xl mb-4">📊</div>
            <h3 className="text-xl font-semibold text-white mb-2">Track Your Progress</h3>
            <p className="text-gray-300">
              Monitor your scores, achievements, and gaming statistics with detailed analytics.
            </p>
          </div>
        </div>

        {/* Quick Game Preview */}
        <div className="bg-white bg-opacity-10 backdrop-blur-sm rounded-lg p-8">
          <h2 className="text-2xl font-bold text-white mb-6 text-center">Game Preview</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-3xl mb-2">🐍</div>
              <h4 className="font-semibold text-white">Snake Game</h4>
              <p className="text-sm text-gray-300">Eat coins, grow longer</p>
            </div>
            <div className="text-center">
              <div className="text-3xl mb-2">🍎</div>
              <h4 className="font-semibold text-white">Falling Fruit</h4>
              <p className="text-sm text-gray-300">Catch good fruits</p>
            </div>
            <div className="text-center">
              <div className="text-3xl mb-2">🧱</div>
              <h4 className="font-semibold text-white">Break Bricks</h4>
              <p className="text-sm text-gray-300">Bounce and break</p>
            </div>
            <div className="text-center">
              <div className="text-3xl mb-2">🏎️</div>
              <h4 className="font-semibold text-white">Car Racing</h4>
              <p className="text-sm text-gray-300">Avoid crashes!</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Home;
