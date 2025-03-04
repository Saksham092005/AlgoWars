// backend/routes/api.js (or a dedicated ratings route)
const express = require('express');
const router = express.Router();
const ProblemRating = require('../models/ProblemRating');
const authMiddleware = require('../middleware/auth'); // Ensure the user is logged in

// POST rating
router.post('/problem-rating', authMiddleware, async (req, res) => {
  try {
    const { problemId, contestId, rating } = req.body;
    const userId = req.user.id; // Set by the auth middleware

    // Optional: Check if user already rated this problem to prevent duplicates.
    const existing = await ProblemRating.findOne({ problemId, userId });
    if (existing) {
      // Update the rating if already exists.
      existing.rating = rating;
      await existing.save();
      return res.json({ message: "Rating updated" });
    }

    const newRating = new ProblemRating({ problemId, contestId, userId, rating });
    await newRating.save();
    res.json({ message: "Rating submitted" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error submitting rating" });
  }
});

module.exports = router;
