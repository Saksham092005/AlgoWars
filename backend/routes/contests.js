// backend/routes/contests.js
const express = require('express');
const axios = require('axios');
const router = express.Router();
const Contest = require('../models/Contest');
const authMiddleware = require('../middleware/auth');
const User = require('../models/User');

// GET /contests - Display Codeforces contests and the user's running custom contests
router.get('/contests', authMiddleware, async (req, res) => {
  try {
    // --- Fetch Codeforces contests ---
    const response = await axios.get('https://codeforces.com/api/contest.list');
    let cfContests = response.data.result;
    
    // Pagination settings
    const page = Number(req.query.page) || 1;
    const pageSize = 50;
    const totalContests = cfContests.length;
    const totalPages = Math.ceil(totalContests / pageSize);
    
    // Paginate
    cfContests = cfContests.slice((page - 1) * pageSize, page * pageSize);
    
    // Separate upcoming and past contests
    const upcomingContests = cfContests.filter(contest => contest.phase === 'BEFORE');
    const pastContests = cfContests.filter(contest => contest.phase === 'FINISHED');

    // --- Fetch custom contests created by the logged-in user ---
    const myContests = await Contest.find({ creator: req.user.id });
    const now = new Date();
    const runningContests = myContests.filter(contest => {
      if (!contest.startTime) return false;
      const endTime = new Date(contest.startTime.getTime() + contest.duration * 60 * 1000);
      return now >= contest.startTime && now < endTime;
    });

    // Render the contests page with all data
    res.render('contests', { 
      upcomingContests, 
      pastContests, 
      currentPage: page, 
      totalPages,
      runningContests
    });
  } catch (error) {
    console.error(error);
    res.status(500).send("Error fetching contests from Codeforces API.");
  }
});

// GET /contests/custom - Render the custom contest creation form
router.get('/contests/custom', authMiddleware, (req, res) => {
  res.render('customContest'); // This renders customContest.ejs
});

// POST /contests/custom - Process custom contest creation
router.post('/contests/custom', authMiddleware, async (req, res) => {
  try {
    const { contestName, duration, numProblems, ratings } = req.body;
    const numProblemsInt = Number(numProblems);
    const ratingArray = ratings.split(',').map(r => Number(r.trim()));
    if (ratingArray.length !== numProblemsInt) {
      return res.status(400).send('Number of ratings must match number of problems');
    }
    
    // Fetch all Codeforces problems
    const response = await axios.get('https://codeforces.com/api/problemset.problems');
    const allProblems = response.data.result.problems;
    
    // Select random problems for each rating
    const selectedProblems = [];
    for (let r of ratingArray) {
      const filtered = allProblems.filter(p => p.rating === r);
      if (!filtered.length) {
        return res.status(400).send(`No problem found with rating ${r}`);
      }
      const randomIndex = Math.floor(Math.random() * filtered.length);
      selectedProblems.push(filtered[randomIndex]);
    }
    
    // Create a new contest with the logged-in user as creator; start immediately.
    const newContest = new Contest({
      contestName: contestName || 'Custom Contest',
      duration,
      problems: selectedProblems.map(p => ({
        contestId: p.contestId,
        index: p.index,
        name: p.name,
        rating: p.rating
      })),
      startTime: new Date(),
      creator: req.user.id
    });
    
    await newContest.save();
    res.redirect(`/contest/live/${newContest._id}`);
  } catch (err) {
    console.error('Error creating contest:', err);
    res.status(500).send('Error creating custom contest.');
  }
});

// GET /contest/live/:id - Render the live contest page
router.get('/contest/live/:id', authMiddleware, async (req, res) => {
  try {
    const contestId = req.params.id;
    const contest = await Contest.findById(contestId);
    if (!contest) {
      return res.status(404).send('Contest not found');
    }
    res.render('contestLive', { contest });
  } catch (err) {
    console.error('Error loading live contest:', err);
    res.status(500).send('Error loading live contest.');
  }
});

// GET /contest/status/:id - Check contest problem statuses (submissions within contest time)
router.get('/contest/status/:id', authMiddleware, async (req, res) => {
  try {
    const contest = await Contest.findById(req.params.id);
    if (!contest) return res.status(404).json({ error: "Contest not found" });
    
    // Calculate contest start and end times in seconds
    const startSec = Math.floor(contest.startTime.getTime() / 1000);
    const endSec = startSec + (contest.duration * 60);
    
    const user = await User.findById(req.user.id);
    if (!user || !user.codeforcesHandle) {
      return res.status(400).json({ error: "No Codeforces handle for user" });
    }
    
    const submissionsRes = await axios.get(`https://codeforces.com/api/user.status?handle=${user.codeforcesHandle}`);
    const submissions = submissionsRes.data.result;
    
    const problemsStatus = contest.problems.map(problem => {
      const solved = submissions.some(sub => 
        sub.verdict == "OK" &&
        sub.problem.contestId == problem.contestId &&
        sub.problem.index == problem.index &&
        sub.creationTimeSeconds >= startSec &&
        sub.creationTimeSeconds <= endSec
      );
      return { contestId: problem.contestId, index: problem.index, solved };
    });
    
    res.json({ problemsStatus });
  } catch (err) {
    console.error("Error in /contest/status:", err);
    res.status(500).json({ error: "Failed to check contest status" });
  }
});

module.exports = router;
