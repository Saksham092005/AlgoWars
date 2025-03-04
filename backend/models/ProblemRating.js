// backend/models/ProblemRating.js
const mongoose = require('mongoose');

const problemRatingSchema = new mongoose.Schema({
  // Unique identifier for the problem in Codeforces – could be a combination of contestId and problem index.
  problemId: { type: String, required: true },
  // The contest id in which this problem is being used (if needed, optional if using global problem ratings)
  contestId: { type: String },
  // Reference to the user who rated this problem
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  // The rating value, e.g., from 1 to 10 or whatever scale you choose
  rating: { type: Number, required: true },
}, { timestamps: true });

module.exports = mongoose.model('ProblemRating', problemRatingSchema);
