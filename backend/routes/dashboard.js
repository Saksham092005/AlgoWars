const express = require('express');
const axios = require('axios');
const router = express.Router();
const User = require('../models/User');
const auth = require('../middleware/auth');  
const moment = require('moment');  // (Optional, if you want nicer date handling)

router.get('/dashboard', auth, async (req, res) => {
  try {
    console.log("User info:", req.user);

    // Fetch user from database
    const user = await User.findById(req.user.id);
    if (!user) {
      console.error("User not found in DB");
      return res.redirect('/login');
    }

    const codeforcesHandle = user.codeforcesHandle;

    // Fetch contest history from Codeforces
    let contestHistory = [];
    let userInfo = {};
    try {
      const ratingResponse = await axios.get(`https://codeforces.com/api/user.rating?handle=${codeforcesHandle}`);
      contestHistory = ratingResponse.data.result;
      // Sort contests by rating update time ascending
      contestHistory.sort((a, b) => a.ratingUpdateTimeSeconds - b.ratingUpdateTimeSeconds);
      const infoResponse = await axios.get(`https://codeforces.com/api/user.info?handles=${codeforcesHandle}`);
      userInfo = infoResponse.data.result[0];
    } catch (apiError) {
      console.error("Error fetching Codeforces API data:", apiError.response ? apiError.response.data : apiError.message);
      return res.status(500).send("Failed to fetch Codeforces data. Check if your handle is correct.");
    }

    // -------------------------------
    // Fetch submissions for performance analytics
    // -------------------------------
    let submissions = [];
    let activeDays = [];
    let currentStreak = 0;
    let weakTopics = {};
    try {
      const subsResponse = await axios.get(`https://codeforces.com/api/user.status?handle=${codeforcesHandle}`);
      submissions = subsResponse.data.result;
      
      // Compute activeDays: a Set of date strings (YYYY-MM-DD)
      const daySet = new Set();
      submissions.forEach(sub => {
          const date = new Date(sub.creationTimeSeconds * 1000);
          const dateStr = date.toISOString().split('T')[0];
          daySet.add(dateStr);
      });
      activeDays = Array.from(daySet).sort(); // sorted ascending

      // Compute current streak:
      // We'll start from today and count backwards until we find a missing active day.
      const today = new Date();
      let streak = 0;
      let currentDate = new Date(today.toISOString().split('T')[0]); // start at today's date (YYYY-MM-DD)
      while (daySet.has(currentDate.toISOString().split('T')[0])) {
          streak++;
          currentDate.setDate(currentDate.getDate() - 1);
      }
      currentStreak = streak;
      
      // Compute weak topics: count frequency of tags for wrong submissions
      // Consider submissions with verdict defined and not "OK"
      const wrongSubs = submissions.filter(sub => sub.verdict && sub.verdict !== "OK");
      wrongSubs.forEach(sub => {
          if (sub.problem && sub.problem.tags) {
              sub.problem.tags.forEach(tag => {
                  weakTopics[tag] = (weakTopics[tag] || 0) + 1;
              });
          }
      });
    } catch (subErr) {
      console.error("Error fetching submissions:", subErr.message);
    }

    // Render dashboard with additional analytics data:
    res.render('dashboard', { 
      contestHistory, 
      userInfo, 
      user,
      activeDays,         // Array of active day strings (YYYY-MM-DD)
      currentStreak,      // Number of consecutive days active (ending today)
      weakTopics          // Object with tag frequencies for wrong submissions
    });
  } catch (err) {
    console.error("Dashboard Error:", err);
    res.status(500).send("Error loading dashboard data");
  }
});

module.exports = router;
