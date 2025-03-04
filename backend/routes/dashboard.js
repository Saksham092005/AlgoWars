const express = require('express');
const axios = require('axios');
const router = express.Router();
const User = require('../models/User');
const auth = require('../middleware/auth');  
  // Ensure auth is correctly imported

router.get('/dashboard', auth, async (req, res) => {
  try {
    console.log("User info:", req.user); // Debugging line to check if user is being fetched

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
      contestHistory.sort((a, b) => new Date(a.Date) - new Date(b.Date));
      const infoResponse = await axios.get(`https://codeforces.com/api/user.info?handles=${codeforcesHandle}`);
      userInfo = infoResponse.data.result[0];
    } catch (apiError) {
      console.error("Error fetching Codeforces API data:", apiError.response ? apiError.response.data : apiError.message);
      return res.status(500).send("Failed to fetch Codeforces data. Check if your handle is correct.");
    }

    // Render dashboard
    res.render('dashboard', { 
      contestHistory, 
      userInfo, 
      user 
    });

  } catch (err) {
    console.error("Dashboard Error:", err);
    res.status(500).send("Error loading dashboard data");
  }
});

module.exports = router;
