import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';

const ORACLE_POINT_RATE = 100;

const Stats = () => {
  const { user, socket, requireAuth, updateUser } = useAuth();
  const [gameHistory, setGameHistory] = useState([]);
  const [gameStats, setGameStats] = useState({});
  const [userStats, setUserStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [mintPointsInput, setMintPointsInput] = useState('');
  const [mintError, setMintError] = useState('');
  const [mintSuccess, setMintSuccess] = useState('');
  const [isMinting, setIsMinting] = useState(false);

  const fetchGameHistory = useCallback(async (page = currentPage) => {
    try {
      setLoading(true);
      const response = await api.get(`/scores/history?page=${page}&limit=10`);
      setGameHistory(response.data.scores);
      setTotalPages(response.data.pagination.totalPages);
    } catch (error) {
      setError('Failed to load game history');
      console.error('Error fetching game history:', error);
    } finally {
      setLoading(false);
    }
  }, [currentPage]);

  const fetchGameStats = useCallback(async () => {
    try {
      const response = await api.get('/scores/stats');
      if (response.data?.gameStats) {
        setGameStats(response.data.gameStats);
      }
      if (response.data?.user) {
        setUserStats(response.data.user);
        updateUser(response.data.user);
      }
    } catch (error) {
      console.error('Error fetching game stats:', error);
    }
  }, [updateUser]);

  useEffect(() => {
    if (!requireAuth()) return;

    fetchGameHistory(currentPage);
    fetchGameStats();
  }, [requireAuth, currentPage, fetchGameHistory, fetchGameStats]);

  useEffect(() => {
    if (!socket) return;

    const handleRealtimeUpdate = () => {
      fetchGameHistory(currentPage);
      fetchGameStats();
    };

    socket.on('scores:refresh', handleRealtimeUpdate);
    socket.on('user:update', handleRealtimeUpdate);

    return () => {
      socket.off('scores:refresh', handleRealtimeUpdate);
      socket.off('user:update', handleRealtimeUpdate);
    };
  }, [socket, currentPage, fetchGameHistory, fetchGameStats]);

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

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const resolvedHighScores = userStats?.highScores || user?.highScores || {};
  const resolvedGamesPlayed = userStats?.gamesPlayed || user?.gamesPlayed || {};
  const totalPointsValue = userStats?.totalPoints ?? user?.totalPoints ?? 0;
  const mintedPointsValue = userStats?.mintedPoints ?? user?.mintedPoints ?? 0;
  const availablePointsValue = userStats?.availablePoints ?? user?.availablePoints ?? Math.max(0, totalPointsValue - mintedPointsValue);
  const mintedOracleBalance = userStats?.mintedOracles ?? user?.mintedOracles ?? (mintedPointsValue / ORACLE_POINT_RATE);

  useEffect(() => {
    if (!mintPointsInput) return;
    const numeric = parseInt(mintPointsInput, 10);
    if (Number.isNaN(numeric)) {
      setMintPointsInput('');
      return;
    }
    if (numeric > availablePointsValue) {
      setMintPointsInput(String(availablePointsValue));
    }
  }, [availablePointsValue, mintPointsInput]);

  const mintPreview = useMemo(() => {
    const parsed = parseInt(mintPointsInput, 10);
    if (!Number.isFinite(parsed) || parsed <= 0) {
      return 0;
    }
    return parsed / ORACLE_POINT_RATE;
  }, [mintPointsInput]);

  const handleMintInputChange = (event) => {
    const value = event.target.value;
    setMintSuccess('');
    if (value === '') {
      setMintPointsInput('');
      setMintError('');
      return;
    }
    const sanitized = value.replace(/[^\d]/g, '');
    const numericValue = parseInt(sanitized, 10);
    if (!Number.isFinite(numericValue) || numericValue < 0) {
      setMintPointsInput('');
      return;
    }
    const capped = Math.min(numericValue, availablePointsValue);
    setMintPointsInput(String(capped));
    if (numericValue > availablePointsValue) {
      setMintError('Exceeds available points.');
    } else {
      setMintError('');
    }
  };

  const handleMintMax = () => {
    setMintSuccess('');
    setMintError('');
    setMintPointsInput(String(availablePointsValue));
  };

  const handleMintSubmit = async (event) => {
    event.preventDefault();
    const parsed = parseInt(mintPointsInput, 10);
    if (!Number.isFinite(parsed) || parsed <= 0) {
      setMintError('Enter the number of points you want to mint.');
      return;
    }
    if (parsed > availablePointsValue) {
      setMintError('Mint amount exceeds your available points.');
      return;
    }
    setIsMinting(true);
    setMintError('');
    setMintSuccess('');

    try {
      const response = await api.post('/scores/mint', { points: parsed });
      if (response.data?.user) {
        setUserStats(response.data.user);
        updateUser(response.data.user);
      }
      const mintedOracles = (parsed / ORACLE_POINT_RATE).toFixed(2);
      setMintSuccess(`Successfully minted ${mintedOracles} Oracle tokens.`);
      setMintPointsInput('');
    } catch (mintErrorResponse) {
      const message = mintErrorResponse.response?.data?.message || 'Failed to mint points. Please try again.';
      setMintError(message);
    } finally {
      setIsMinting(false);
    }
  };

  if (loading && gameHistory.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-white text-xl">Loading your stats...</div>
      </div>
    );
  }
  return (
    <div className="min-h-screen py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-white mb-4">My Game Statistics</h1>
          <p className="text-xl text-gray-300">
            Track your gaming progress and achievements
          </p>
        </div>

        {/* Total Points Summary */}
        <div className="bg-gradient-to-r from-yellow-500 to-yellow-600 rounded-lg p-6 mb-8">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-white mb-2">Total Points Earned</h2>
            <div className="text-5xl font-bold text-white mb-2">
              {totalPointsValue.toLocaleString()}
            </div>
            <p className="text-yellow-100">
              Keep playing to increase your total score!
            </p>
          </div>
          <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-3 text-sm text-white">
            <div className="rounded-lg bg-white bg-opacity-10 px-4 py-3 shadow-sm">
              <div className="text-yellow-100 uppercase tracking-wide text-xs">Available Points</div>
              <div className="text-xl font-semibold">{availablePointsValue.toLocaleString()}</div>
            </div>
            <div className="rounded-lg bg-white bg-opacity-10 px-4 py-3 shadow-sm">
              <div className="text-yellow-100 uppercase tracking-wide text-xs">Minted Points</div>
              <div className="text-xl font-semibold">{mintedPointsValue.toLocaleString()}</div>
            </div>
            <div className="rounded-lg bg-white bg-opacity-10 px-4 py-3 shadow-sm">
              <div className="text-yellow-100 uppercase tracking-wide text-xs">Oracle Balance</div>
              <div className="text-xl font-semibold">{mintedOracleBalance.toFixed(2)} ORC</div>
            </div>
          </div>
        </div>

        {/* Mint Oracle Section */}
        <form onSubmit={handleMintSubmit} className="bg-white bg-opacity-10 backdrop-blur-sm rounded-lg p-6 mb-8 border border-yellow-500/40">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
            <div>
              <h3 className="text-2xl font-bold text-white">Mint Oracle Tokens</h3>
              <p className="text-sm text-yellow-100">
                Convert your available points into Oracle tokens. 1 Oracle equals {ORACLE_POINT_RATE} points.
              </p>
            </div>
            <div className="rounded-lg bg-yellow-500 bg-opacity-20 px-4 py-2 text-sm text-yellow-100">
              Oracle Balance: <span className="font-semibold text-white">{mintedOracleBalance.toFixed(2)} ORC</span>
            </div>
          </div>

          <div className="grid gap-4 lg:grid-cols-[2fr,1fr]">
            <div className="space-y-3">
              <label className="text-sm font-semibold text-white flex items-center justify-between">
                Points to Mint
                <button
                  type="button"
                  onClick={handleMintMax}
                  className="ml-3 rounded-md border border-yellow-400 px-3 py-1 text-xs font-semibold text-yellow-100 hover:bg-yellow-500 hover:text-white transition-colors disabled:opacity-50"
                  disabled={availablePointsValue <= 0 || isMinting}
                >
                  Max ({availablePointsValue.toLocaleString()})
                </button>
              </label>
              <input
                type="number"
                min="0"
                step="1"
                value={mintPointsInput}
                onChange={handleMintInputChange}
                placeholder="Enter points to mint"
                className="w-full rounded-lg border border-yellow-400/60 bg-black/30 px-4 py-3 text-white placeholder-yellow-200/60 focus:border-yellow-200 focus:outline-none focus:ring-1 focus:ring-yellow-200"
              />
            </div>

            <div className="rounded-lg bg-black/30 border border-yellow-400/60 px-4 py-3">
              <div className="text-sm text-yellow-100">Will receive</div>
              <div className="text-3xl font-semibold text-white">
                {mintPreview.toFixed(2)} <span className="text-base font-normal text-yellow-200">ORC</span>
              </div>
              <div className="text-xs text-yellow-200/80 mt-1">
                Conversion rate: {ORACLE_POINT_RATE.toLocaleString()} points = 1 ORC
              </div>
            </div>
          </div>

          {mintError && (
            <div className="mt-4 rounded-lg border border-red-500 bg-red-500/20 px-4 py-3 text-sm text-red-200">
              {mintError}
            </div>
          )}
          {mintSuccess && (
            <div className="mt-4 rounded-lg border border-green-500 bg-green-500/15 px-4 py-3 text-sm text-green-200">
              {mintSuccess}
            </div>
          )}

          <div className="mt-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="text-xs text-yellow-200/80">
              Available to mint: <span className="text-yellow-100 font-semibold">{availablePointsValue.toLocaleString()} points</span>
            </div>
            <button
              type="submit"
              disabled={isMinting || availablePointsValue <= 0 || !mintPointsInput || parseInt(mintPointsInput, 10) <= 0}
              className="inline-flex items-center justify-center rounded-lg bg-yellow-500 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-yellow-600 focus:outline-none focus:ring-2 focus:ring-yellow-300 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isMinting ? 'Minting...' : 'Mint Oracle Tokens'}
            </button>
          </div>
        </form>

        {/* Game Statistics Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {['snake', 'fallingFruit', 'breakBricks', 'carRacing'].map((gameType) => {
            const stats = gameStats[gameType] || {};
            const highScore = stats.highScore ?? resolvedHighScores[gameType] ?? 0;
            const gamesPlayed = stats.totalGames ?? resolvedGamesPlayed[gameType] ?? 0;
            return (
              <div key={gameType} className="bg-white bg-opacity-10 backdrop-blur-sm rounded-lg p-6">
                <div className="text-center">
                  <div className="text-4xl mb-3">{getGameIcon(gameType)}</div>
                  <h3 className="text-lg font-semibold text-white mb-3">
                    {getGameName(gameType)}
                  </h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-300">High Score:</span>
                      <span className="text-yellow-400 font-bold">{highScore}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-300">Games Played:</span>
                      <span className="text-blue-400 font-bold">{gamesPlayed}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-300">Total Points:</span>
                      <span className="text-green-400 font-bold">{stats.totalPoints || 0}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-300">Avg Score:</span>
                      <span className="text-purple-400 font-bold">
                        {stats.averageScore ? stats.averageScore.toFixed(1) : '0.0'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Game History Table */}
        <div className="bg-white bg-opacity-10 backdrop-blur-sm rounded-lg p-6">
          <h2 className="text-2xl font-bold text-white mb-6">Recent Game History</h2>
          
          {error && (
            <div className="bg-red-500 bg-opacity-20 border border-red-500 text-red-300 px-4 py-3 rounded mb-4">
              {error}
            </div>
          )}

          {gameHistory.length === 0 ? (
            <div className="text-center py-8">
              <div className="text-4xl mb-4">🎮</div>
              <p className="text-gray-300 text-lg">No games played yet!</p>
              <p className="text-gray-400">Start playing games to see your history here.</p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b border-gray-600">
                      <th className="pb-3 text-white font-semibold">#</th>
                      <th className="pb-3 text-white font-semibold">Game</th>
                      <th className="pb-3 text-white font-semibold">Score</th>
                      <th className="pb-3 text-white font-semibold">Points</th>
                      <th className="pb-3 text-white font-semibold">Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {gameHistory.map((game, index) => (
                      <tr key={game._id} className="border-b border-gray-700">
                        <td className="py-3 text-gray-300">
                          {(currentPage - 1) * 10 + index + 1}
                        </td>
                        <td className="py-3">
                          <div className="flex items-center space-x-2">
                            <span className="text-lg">{getGameIcon(game.gameType)}</span>
                            <span className="text-white">{getGameName(game.gameType)}</span>
                          </div>
                        </td>
                        <td className="py-3 text-yellow-400 font-semibold">
                          {game.score}
                        </td>
                        <td className="py-3 text-green-400 font-semibold">
                          {game.points}
                        </td>
                        <td className="py-3 text-gray-300 text-sm">
                          {formatDate(game.playedAt)}
                        </td>
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
      </div>
    </div>
  );
};

export default Stats;