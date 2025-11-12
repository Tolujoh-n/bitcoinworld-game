import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';

const ORACLE_POINT_RATE = 100;

const Leaderboard = () => {
  const { user, socket } = useAuth();
  const [leaderboard, setLeaderboard] = useState([]);
  const [gameStats, setGameStats] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [selectedGame, setSelectedGame] = useState('overall');
  const [activeTab, setActiveTab] = useState('overall');

  const fetchLeaderboard = useCallback(async () => {
    try {
      setLoading(true);
      let endpoint = '/leaderboard/overall';

      if (selectedGame !== 'overall') {
        endpoint = `/leaderboard/game/${selectedGame}/highscores`;
      }

      const response = await api.get(`${endpoint}?page=${currentPage}&limit=50`);
      setLeaderboard(response.data.leaderboard || []);
      setTotalPages(response.data.pagination?.totalPages || 1);
    } catch (error) {
      setError('Failed to load leaderboard');
      console.error('Error fetching leaderboard:', error);
    } finally {
      setLoading(false);
    }
  }, [currentPage, selectedGame]);

  const fetchGameStats = useCallback(async () => {
    try {
      const response = await api.get('/leaderboard/game-stats');
      setGameStats(response.data.gameStats || {});
    } catch (error) {
      console.error('Error fetching game stats:', error);
    }
  }, []);

  useEffect(() => {
    fetchLeaderboard();
    fetchGameStats();
  }, [fetchLeaderboard, fetchGameStats]);

  const getGameIcon = (gameType) => {
    const icons = {
      snake: '🐍',
      fallingFruit: '🍎',
      breakBricks: '🧱',
      carRacing: '🏎️'
    };
    return icons[gameType] || '🎮';
  };

  const getGameName = (gameType) => {
    const names = {
      snake: 'Snake Game',
      fallingFruit: 'Falling Fruit',
      breakBricks: 'Break Bricks',
      carRacing: 'Car Racing'
    };
    return names[gameType] || gameType;
  };

  const formatWalletAddress = (address) => {
    if (!address) return 'Unknown';
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    setSelectedGame(tab);
    setCurrentPage(1);
  };

  useEffect(() => {
    if (!socket) return;

    const handleLeaderboardUpdate = (payload = {}) => {
      if (!payload.type || !payload.leaderboard) return;
      if (payload.type === selectedGame) {
        setLeaderboard(payload.leaderboard);
      } else if (selectedGame === 'overall' && payload.type === 'overall') {
        setLeaderboard(payload.leaderboard);
      }
    };

    const handleGameStatsUpdate = (stats) => {
      if (stats && typeof stats === 'object') {
        setGameStats(stats);
      }
    };

    socket.on('leaderboard:update', handleLeaderboardUpdate);
    socket.on('gameStats:update', handleGameStatsUpdate);

    return () => {
      socket.off('leaderboard:update', handleLeaderboardUpdate);
      socket.off('gameStats:update', handleGameStatsUpdate);
    };
  }, [socket, selectedGame]);

  const totalPoints = user?.totalPoints ?? 0;
  const mintedPoints = user?.mintedPoints ?? 0;
  const availablePoints = user?.availablePoints ?? Math.max(0, totalPoints - mintedPoints);
  const mintedOracleBalance = user?.mintedOracles ?? (mintedPoints / ORACLE_POINT_RATE);

  if (loading && leaderboard.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-white text-xl">Loading leaderboard...</div>
      </div>
    );
  }
  return (
    <div className="min-h-screen py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-white mb-4">🏆 Leaderboard</h1>
          <p className="text-xl text-gray-300">
            See how you rank against other players worldwide!
          </p>
        </div>

        {/* Game Stats - Highest Scores */}
        <div className="bg-white bg-opacity-10 backdrop-blur-sm rounded-lg p-6 mb-8">
          <h2 className="text-2xl font-bold text-white mb-6">🏆 Highest Scores by Game</h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {Object.entries(gameStats).map(([gameType, stats]) => (
              <div key={gameType} className="bg-gradient-to-br from-yellow-500 to-yellow-600 rounded-lg p-4">
                <div className="text-center">
                  <div className="text-3xl mb-2">{getGameIcon(gameType)}</div>
                  <h3 className="text-lg font-bold text-white mb-2">
                    {getGameName(gameType)}
                  </h3>
                  <div className="text-2xl font-bold text-white mb-1">
                    {stats?.highestScore || 0}
                  </div>
                  <div className="text-yellow-100 text-sm">
                    {stats?.topPlayer?.walletAddress
                      ? formatWalletAddress(stats.topPlayer.walletAddress)
                      : 'No scores yet'}
                  </div>
                  <div className="text-yellow-200 text-xs mt-1">
                    Total Points: {stats?.points ?? 0}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Leaderboard Table */}
        <div className="bg-white bg-opacity-10 backdrop-blur-sm rounded-lg p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-white">🏆 Overall Rankings</h2>
            
            {/* Tab Navigation */}
            <div className="flex space-x-2">
              {['overall', 'snake', 'fallingFruit', 'breakBricks', 'carRacing'].map((tab) => (
                <button
                  key={tab}
                  onClick={() => handleTabChange(tab)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    activeTab === tab
                      ? 'bg-yellow-500 text-white'
                      : 'bg-gray-600 text-gray-300 hover:bg-gray-500'
                  }`}
                >
                  {tab === 'overall' ? 'Overall' : getGameName(tab)}
                </button>
              ))}
            </div>
          </div>

          {error && (
            <div className="bg-red-500 bg-opacity-20 border border-red-500 text-red-300 px-4 py-3 rounded mb-4">
              {error}
            </div>
          )}

          {leaderboard.length === 0 ? (
            <div className="text-center py-8">
              <div className="text-4xl mb-4">🏆</div>
              <p className="text-gray-300 text-lg">No rankings available yet!</p>
              <p className="text-gray-400">Be the first to play and earn points.</p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b border-gray-600">
                      <th className="pb-3 text-white font-semibold">Rank</th>
                      <th className="pb-3 text-white font-semibold">Player</th>
                      <th className="pb-3 text-white font-semibold">
                        {activeTab === 'overall' ? 'Total Points' : 'Score'}
                      </th>
                      {activeTab === 'overall' && (
                        <th className="pb-3 text-white font-semibold">Games Played</th>
                      )}
                      {activeTab !== 'overall' && (
                        <th className="pb-3 text-white font-semibold">Points</th>
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {leaderboard.map((player, index) => (
                      <tr 
                        key={player._id || player.walletAddress} 
                        className={`border-b border-gray-700 ${
                          user?.walletAddress === player.walletAddress ? 'bg-yellow-500 bg-opacity-20' : ''
                        }`}
                      >
                        <td className="py-3">
                          <div className="flex items-center space-x-2">
                            {index < 3 && (
                              <span className="text-lg">
                                {index === 0 ? '🥇' : index === 1 ? '🥈' : '🥉'}
                              </span>
                            )}
                            <span className="text-gray-300 font-semibold">
                              {(currentPage - 1) * 50 + index + 1}
                            </span>
                          </div>
                        </td>
                        <td className="py-3">
                          <div className="flex items-center space-x-2">
                            <span className="text-white font-medium">
                              {formatWalletAddress(player.walletAddress)}
                            </span>
                            {user?.walletAddress === player.walletAddress && (
                              <span className="text-xs bg-yellow-500 text-white px-2 py-1 rounded">
                                YOU
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="py-3 text-yellow-400 font-semibold">
                          {activeTab === 'overall'
                            ? player.totalPoints
                            : (player.score ?? player.highScore ?? 0)}
                        </td>
                        {activeTab === 'overall' && (
                          <td className="py-3 text-blue-400 font-semibold">
                            {player.totalGames || 0}
                          </td>
                        )}
                        {activeTab !== 'overall' && (
                          <td className="py-3 text-green-400 font-semibold">
                            {player.points ?? player.totalPoints ?? 0}
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex justify-center items-center space-x-4 mt-6">
                  <button
                    onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                    disabled={currentPage === 1}
                    className="px-4 py-2 bg-gray-600 hover:bg-gray-700 disabled:bg-gray-800 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
                  >
                    Previous
                  </button>
                  
                  <span className="text-white">
                    Page {currentPage} of {totalPages}
                  </span>
                  
                  <button
                    onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                    disabled={currentPage === totalPages}
                    className="px-4 py-2 bg-gray-600 hover:bg-gray-700 disabled:bg-gray-800 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
                  >
                    Next
                  </button>
                </div>
              )}
            </>
          )}
        </div>

        {/* User's Current Status */}
        {user && (
          <div className="mt-8 bg-gradient-to-r from-yellow-500 to-yellow-600 rounded-lg p-6">
            <h2 className="text-2xl font-bold text-white mb-4">Your Current Status</h2>
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-white bg-opacity-20 rounded-lg p-4">
                <div className="text-center">
                  <div className="text-2xl mb-2">🏆</div>
                  <div className="text-white font-bold text-lg">{totalPoints.toLocaleString()}</div>
                  <div className="text-yellow-100 text-sm">Total Points Earned</div>
                </div>
              </div>
              <div className="bg-white bg-opacity-20 rounded-lg p-4">
                <div className="text-center">
                  <div className="text-2xl mb-2">💰</div>
                  <div className="text-white font-bold text-lg">{availablePoints.toLocaleString()}</div>
                  <div className="text-yellow-100 text-sm">Available Points</div>
                </div>
              </div>
              <div className="bg-white bg-opacity-20 rounded-lg p-4">
                <div className="text-center">
                  <div className="text-2xl mb-2">🪙</div>
                  <div className="text-white font-bold text-lg">{mintedOracleBalance.toFixed(2)} ORC</div>
                  <div className="text-yellow-100 text-sm">Oracle Balance</div>
                </div>
              </div>
              <div className="bg-white bg-opacity-20 rounded-lg p-4">
                <div className="text-center">
                  <div className="text-2xl mb-2">🎮</div>
                  <div className="text-white font-bold text-lg">{user.totalGames || 0}</div>
                  <div className="text-yellow-100 text-sm">Games Played</div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Leaderboard;