const express = require('express');
const axios = require('axios');
const router = express.Router();
const Contest = require('../models/Contest'); // Your Contest model
const authMiddleware = require('../middleware/auth');
const User = require('../models/User');

// --------------------------
// GET /contests - Fetch and display upcoming and past contests with pagination
// --------------------------
router.get('/contests', async (req, res) => {
  try {
    // Fetch contest list from Codeforces API
    const response = await axios.get('https://codeforces.com/api/contest.list');
    let contests = response.data.result;
    
    // Pagination settings
    const page = Number(req.query.page) || 1;
    const pageSize = 50;
    const totalContests = contests.length;
    const totalPages = Math.ceil(totalContests / pageSize);
    
    // Slice the contests array based on the current page
    contests = contests.slice((page - 1) * pageSize, page * pageSize);
    
    // Filter contests by phase on this paginated set
    const upcomingContests = contests.filter(contest => contest.phase === 'BEFORE');
    const pastContests = contests.filter(contest => contest.phase === 'FINISHED');
    
    // Pass pagination info to the view
    res.render('contests', { 
      upcomingContests, 
      pastContests, 
      currentPage: page, 
      totalPages 
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

// POST /contests/custom
router.post('/contests/custom', authMiddleware, async (req, res) => {
  try {
    const { contestName, duration, numProblems, ratings } = req.body;

    // Convert to integer
    const numProblemsInt = Number(numProblems);

    // Split comma-separated ratings into an array of integers
    const ratingArray = ratings.split(',').map(r => Number(r.trim()));
    if (ratingArray.length !== numProblemsInt) {
      return res.status(400).send('Number of ratings must match number of problems');
    }

    // Fetch all Codeforces problems
    const response = await axios.get('https://codeforces.com/api/problemset.problems');
    const allProblems = response.data.result.problems;

    // Select random problems based on each rating
    const selectedProblems = [];
    for (let r of ratingArray) {
      const filtered = allProblems.filter(p => p.rating === r);
      if (!filtered.length) {
        return res.status(400).send(`No problem found with rating ${r}`);
      }
      const randomIndex = Math.floor(Math.random() * filtered.length);
      selectedProblems.push(filtered[randomIndex]);
    }

    // Create new contest
    const newContest = new Contest({
      contestName: contestName || 'Custom Contest',
      duration, // in minutes
      problems: selectedProblems.map(p => ({
        contestId: p.contestId,
        index: p.index,
        name: p.name,
        rating: p.rating
      })),
      // Option A: Start the contest immediately upon creation
      startTime: new Date() 
      // Option B: Keep startTime null, and set it in a "Start Contest" route
    });

    await newContest.save();

    // Redirect to the live contest page
    res.redirect(`/contest/live/${newContest._id}`);
  } catch (err) {
    console.error('Error creating contest:', err);
    res.status(500).send('Error creating custom contest.');
  }
});
router.get('/contest/live/:id', authMiddleware, async (req, res) => {
  try {
    const contestId = req.params.id;
    const contest = await Contest.findById(contestId);
    if (!contest) {
      return res.status(404).send('Contest not found');
    }

    // Render the live contest page
    res.render('contestLive', { contest });
  } catch (err) {
    console.error('Error loading live contest:', err);
    res.status(500).send('Error loading live contest.');
  }
});
// routes/contests.js (continued)
router.get('/contest/status/:id', authMiddleware, async (req, res) => {
  try {
    const contest = await Contest.findById(req.params.id);
    if (!contest) return res.status(404).json({ error: "Contest not found" });

    // Convert times to seconds
    const startSec = Math.floor(contest.startTime.getTime() / 1000);
    const endSec = startSec + (contest.duration * 60);

    // Get the user's Codeforces handle
    const user = await User.findById(req.user.id);
    if (!user || !user.codeforcesHandle) {
      return res.status(400).json({ error: "No Codeforces handle for user" });
    }

    // Fetch user's submissions
    const submissionsRes = await axios.get(`https://codeforces.com/api/user.status?handle=${user.codeforcesHandle}`);
    const submissions = submissionsRes.data.result;

    // Determine problem statuses
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
