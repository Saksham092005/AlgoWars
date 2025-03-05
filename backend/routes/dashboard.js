const express = require('express');
const axios = require('axios');
const router = express.Router();
const User = require('../models/User');
const auth = require('../middleware/auth');

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

    // Fetch contest history and user info from Codeforces
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

    // Fetch submissions for performance analytics
    let submissions = [];
    let activeDays = new Set();
    let streakData = [];
    let weakTopics = {};
    let currentStreak = 0;

    try {
      const subsResponse = await axios.get(`https://codeforces.com/api/user.status?handle=${codeforcesHandle}`);
      submissions = subsResponse.data.result;

      // Compute active days from submissions (YYYY-MM-DD format)
      const allDates = submissions.map(sub => {
        const date = new Date(sub.creationTimeSeconds * 1000);
        return date.toISOString().split('T')[0];
      });
      allDates.forEach(date => activeDays.add(date));

      // Generate streak data for the past year
      const today = new Date();
      const oneYearAgo = new Date(today);
      oneYearAgo.setFullYear(today.getFullYear() - 1);

      let currentDate = new Date(oneYearAgo);
      while (currentDate <= today) {
        const dateStr = currentDate.toISOString().split('T')[0];
        streakData.push({
          date: dateStr,
          active: activeDays.has(dateStr)
        });
        currentDate.setDate(currentDate.getDate() + 1);
      }

      // Compute current streak (count consecutive days active from today backwards)
      let checkDate = new Date(today);
      while (activeDays.has(checkDate.toISOString().split('T')[0])) {
        currentStreak++;
        checkDate.setDate(checkDate.getDate() - 1);
      }

      // Compute weak topics by counting wrong submissions per tag
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
      streakData = [];
      currentStreak = 0;
    }

    // Sort weak topics by number of wrong submissions
    const sortedWeakTopics = Object.entries(weakTopics)
      .sort((a, b) => b[1] - a[1])
      .reduce((obj, [key, value]) => {
        obj[key] = value;
        return obj;
      }, {});



    let solvedProblemsMap = new Map();
    submissions.forEach(sub => {
      if (sub.verdict === "OK" && sub.problem) {
        const key = `${sub.problem.contestId}_${sub.problem.index}`;
        if (!solvedProblemsMap.has(key)) {
          solvedProblemsMap.set(key, sub.problem);
        }
      }
    });

    // Count solved problems per tag
    let solvedTagCounts = {};
    solvedProblemsMap.forEach(problem => {
      if (problem.tags) {
        problem.tags.forEach(tag => {
          solvedTagCounts[tag] = (solvedTagCounts[tag] || 0) + 1;
        });
      }
    });

    // Count solved problems per difficulty rating
    let solvedRatingCounts = {};
    solvedProblemsMap.forEach(problem => {
      if (problem.rating) {
        solvedRatingCounts[problem.rating] = (solvedRatingCounts[problem.rating] || 0) + 1;
      }
    });








    // Render the dashboard view with all analytics data
    res.render('dashboard', {
      contestHistory,
      userInfo,
      user,
      streakData,         // Array of { date, active } objects for the past year
      currentStreak,      // Number of consecutive active days
      weakTopics: sortedWeakTopics, // Weak topics sorted by wrong submission counts
      solvedTagCounts,       // Data for pie chart: solved problems by tag
      solvedRatingCounts     // Data for bar chart: solved problems by difficulty rating
    });
  } catch (err) {
    console.error("Dashboard Error:", err);
    res.status(500).send("Error loading dashboard data");
  }
});

module.exports = router;
