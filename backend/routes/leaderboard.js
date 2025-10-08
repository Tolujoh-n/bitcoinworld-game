const express = require('express');
const User = require('../models/User');
const GameScore = require('../models/GameScore');

const router = express.Router();

// Get overall leaderboard
router.get('/overall', async (req, res) => {
  try {
    const { page = 1, limit = 50 } = req.query;
    const skip = (page - 1) * limit;

    const users = await User.find({})
      .sort({ totalPoints: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .select('walletAddress totalPoints highScores gamesPlayed');

    const totalUsers = await User.countDocuments();

    res.json({
      leaderboard: users.map((user, index) => ({
        rank: skip + index + 1,
        walletAddress: user.walletAddress,
        totalPoints: user.totalPoints,
        highScores: user.highScores,
        gamesPlayed: user.gamesPlayed
      })),
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(totalUsers / limit),
        totalUsers,
        hasNextPage: page * limit < totalUsers,
        hasPrevPage: page > 1
      }
    });
  } catch (error) {
    console.error('Leaderboard error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get game-specific leaderboard
router.get('/game/:gameType', async (req, res) => {
  try {
    const { gameType } = req.params;
    const { page = 1, limit = 50 } = req.query;
    const skip = (page - 1) * limit;

    const validGameTypes = ['snake', 'fallingFruit', 'breakBricks', 'carRacing'];
    if (!validGameTypes.includes(gameType)) {
      return res.status(400).json({ message: 'Invalid game type' });
    }

    const gameScores = await GameScore.find({ gameType })
      .sort({ score: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .populate('user', 'walletAddress');

    const totalScores = await GameScore.countDocuments({ gameType });

    res.json({
      gameType,
      leaderboard: gameScores.map((score, index) => ({
        rank: skip + index + 1,
        walletAddress: score.user.walletAddress,
        score: score.score,
        points: score.points,
        playedAt: score.playedAt
      })),
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(totalScores / limit),
        totalScores,
        hasNextPage: page * limit < totalScores,
        hasPrevPage: page > 1
      }
    });
  } catch (error) {
    console.error('Game leaderboard error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get game-specific high scores (best score per user)
router.get('/game/:gameType/highscores', async (req, res) => {
  try {
    const { gameType } = req.params;
    const { page = 1, limit = 50 } = req.query;
    const skip = (page - 1) * limit;

    const validGameTypes = ['snake', 'fallingFruit', 'breakBricks', 'carRacing'];
    if (!validGameTypes.includes(gameType)) {
      return res.status(400).json({ message: 'Invalid game type' });
    }

    // Aggregate to get the highest score per user for this game
    const highScores = await GameScore.aggregate([
      { $match: { gameType } },
      {
        $group: {
          _id: '$walletAddress',
          highScore: { $max: '$score' },
          totalPoints: { $sum: '$points' },
          gamesPlayed: { $sum: 1 },
          lastPlayed: { $max: '$playedAt' }
        }
      },
      { $sort: { highScore: -1 } },
      { $skip: skip },
      { $limit: parseInt(limit) }
    ]);

    const totalUsers = await GameScore.distinct('walletAddress', { gameType }).length;

    res.json({
      gameType,
      leaderboard: highScores.map((user, index) => ({
        rank: skip + index + 1,
        walletAddress: user._id,
        highScore: user.highScore,
        totalPoints: user.totalPoints,
        gamesPlayed: user.gamesPlayed,
        lastPlayed: user.lastPlayed
      })),
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(totalUsers / limit),
        totalUsers,
        hasNextPage: page * limit < totalUsers,
        hasPrevPage: page > 1
      }
    });
  } catch (error) {
    console.error('High scores error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get game statistics (highest scores for each game)
router.get('/game-stats', async (req, res) => {
  try {
    const gameTypes = ['snake', 'fallingFruit', 'breakBricks', 'carRacing'];
    const gameStats = {};

    for (const gameType of gameTypes) {
      const topScore = await GameScore.findOne({ gameType })
        .sort({ score: -1 })
        .populate('user', 'walletAddress');

      if (topScore) {
        gameStats[gameType] = {
          highestScore: topScore.score,
          walletAddress: topScore.user.walletAddress,
          points: topScore.points,
          playedAt: topScore.playedAt
        };
      } else {
        gameStats[gameType] = {
          highestScore: 0,
          walletAddress: null,
          points: 0,
          playedAt: null
        };
      }
    }

    res.json({ gameStats });
  } catch (error) {
    console.error('Game stats error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
