// backend/models/Contest.js
const mongoose = require('mongoose');

const contestSchema = new mongoose.Schema({
  contestName: { type: String, default: "Custom Contest" },
  duration: { type: Number, required: true }, // in minutes
  problems: [
    {
      contestId: { type: Number },
      index: { type: String },
      name: { type: String },
      rating: { type: Number }
    }
  ],
  startTime: { type: Date }, // will be set when contest starts
  creator: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  participants: { type: [mongoose.Schema.Types.ObjectId], default: [] }
}, { timestamps: true });

module.exports = mongoose.model('Contest', contestSchema);
