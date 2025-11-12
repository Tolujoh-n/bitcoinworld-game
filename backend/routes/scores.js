const express = require('express');
const GameScore = require('../models/GameScore');
const User = require('../models/User');
const auth = require('../middleware/auth');
const {
  GAME_TYPES,
  getUserGameStats,
  getGlobalGameStats,
  getOverallLeaderboard,
  getGameLeaderboard,
  buildUserSummary,
} = require('../utils/stats');

const router = express.Router();

// Submit a game score
router.post('/submit', auth, async (req, res) => {
  try {
    const { gameType, score, points, gameData } = req.body;

    if (!gameType || score === undefined || points === undefined) {
      return res.status(400).json({ message: 'Game type, score, and points are required' });
    }

    if (!GAME_TYPES.includes(gameType)) {
      return res.status(400).json({ message: 'Invalid game type' });
    }

    const gameScore = new GameScore({
      user: req.user.userId,
      walletAddress: req.user.walletAddress,
      gameType,
      score,
      points,
      gameData: gameData || {},
    });

    await gameScore.save();

    const user = await User.findById(req.user.userId);
    let userSummary = null;

    if (user) {
      user.totalPoints = (user.totalPoints || 0) + points;
      user.gamesPlayed = user.gamesPlayed || {};
      user.highScores = user.highScores || {};

      user.gamesPlayed[gameType] = (user.gamesPlayed[gameType] || 0) + 1;

      if ((user.highScores[gameType] || 0) < score) {
        user.highScores[gameType] = score;
      }

      user.lastPlayed = new Date();
      await user.save();
      userSummary = buildUserSummary(user);
    }

    const [userGameStats, globalGameStats, overallLeaderboard, gameLeaderboard] = await Promise.all([
      getUserGameStats(req.user.userId),
      getGlobalGameStats(),
      getOverallLeaderboard(10),
      getGameLeaderboard(gameType, 10),
    ]);

    const scorePayload = gameScore.toObject();
    delete scorePayload.__v;

    const io = req.app.get('io');
    if (io) {
      if (userSummary) {
        const userRooms = [req.user.userId, userSummary.walletAddress].filter(Boolean);
        for (const room of userRooms) {
          io.to(room).emit('user:update', {
            user: userSummary,
            gameStats: userGameStats,
          });
          io.to(room).emit('scores:refresh', { gameType });
        }
      }

      io.emit('scores:new', { gameType, score: scorePayload });
      io.emit('leaderboard:update', { type: 'overall', leaderboard: overallLeaderboard });
      io.emit('leaderboard:update', { type: gameType, leaderboard: gameLeaderboard });
      io.emit('gameStats:update', globalGameStats);
    }

    res.json({
      message: 'Score submitted successfully',
      score: scorePayload,
      user: userSummary,
      userGameStats,
      globalGameStats,
      leaderboards: {
        overall: overallLeaderboard,
        game: {
          gameType,
          entries: gameLeaderboard,
        },
      },
    });
  } catch (error) {
    console.error('Score submission error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get user's game history
router.get('/history', auth, async (req, res) => {
  try {
    const { gameType, page = 1, limit = 10 } = req.query;
    const skip = (page - 1) * limit;

    let query = { user: req.user.userId };
    if (gameType) {
      query.gameType = gameType;
    }

    const scores = await GameScore.find(query)
      .sort({ playedAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .populate('user', 'walletAddress');

    const total = await GameScore.countDocuments(query);

    res.json({
      scores,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / limit),
        totalScores: total,
        hasNextPage: page * limit < total,
        hasPrevPage: page > 1
      }
    });
  } catch (error) {
    console.error('Score history error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get user's statistics
router.get('/stats', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const [gameStats, globalGameStats] = await Promise.all([
      getUserGameStats(req.user.userId),
      getGlobalGameStats(),
    ]);

    res.json({
      user: buildUserSummary(user),
      gameStats,
      globalGameStats,
    });
  } catch (error) {
    console.error('Stats error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
