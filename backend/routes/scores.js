const express = require('express');
const GameScore = require('../models/GameScore');
const User = require('../models/User');
const auth = require('../middleware/auth');

const router = express.Router();

// Submit a game score
router.post('/submit', auth, async (req, res) => {
  try {
    const { gameType, score, points, gameData } = req.body;

    if (!gameType || score === undefined || points === undefined) {
      return res.status(400).json({ message: 'Game type, score, and points are required' });
    }

    const validGameTypes = ['snake', 'fallingFruit', 'breakBricks', 'clickCounter'];
    if (!validGameTypes.includes(gameType)) {
      return res.status(400).json({ message: 'Invalid game type' });
    }

    // Create game score record
    const gameScore = new GameScore({
      user: req.user.userId,
      walletAddress: req.user.walletAddress,
      gameType,
      score,
      points,
      gameData: gameData || {}
    });

    await gameScore.save();

    // Update user's total points and game statistics
    const user = await User.findById(req.user.userId);
    if (user) {
      user.totalPoints += points;
      user.gamesPlayed[gameType] += 1;
      
      // Update high score if this is higher
      if (score > user.highScores[gameType]) {
        user.highScores[gameType] = score;
      }
      
      user.lastPlayed = new Date();
      await user.save();
    }

    res.json({
      message: 'Score submitted successfully',
      score: gameScore,
      newTotalPoints: user.totalPoints
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

    // Get detailed statistics for each game
    const gameStats = {};
    const gameTypes = ['snake', 'fallingFruit', 'breakBricks', 'clickCounter'];

    for (const gameType of gameTypes) {
      const scores = await GameScore.find({
        user: req.user.userId,
        gameType
      }).sort({ score: -1 });

      gameStats[gameType] = {
        totalGames: scores.length,
        highScore: scores.length > 0 ? scores[0].score : 0,
        totalPoints: scores.reduce((sum, score) => sum + score.points, 0),
        averageScore: scores.length > 0 ? scores.reduce((sum, score) => sum + score.score, 0) / scores.length : 0
      };
    }

    res.json({
      user: {
        walletAddress: user.walletAddress,
        totalPoints: user.totalPoints,
        highScores: user.highScores,
        gamesPlayed: user.gamesPlayed
      },
      gameStats
    });
  } catch (error) {
    console.error('Stats error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
