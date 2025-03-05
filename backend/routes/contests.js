const express = require('express');
const axios = require('axios');
const router = express.Router();
const Contest = require('../models/Contest'); // Your Contest model
const authMiddleware = require('../middleware/auth');

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

// --------------------------
// Custom Contests: GET /contests/custom - Render the custom contest creation form
// --------------------------
router.get('/contests/custom', (req, res) => {
  res.render('customContest'); // This EJS form should include a field for contestType
});

// --------------------------
// Custom Contests: POST /contests/custom - Process the custom contest creation form
// --------------------------
router.post('/contests/custom',authMiddleware, async (req, res) => {
  try {
    // Expecting contestName, contestType, duration, numProblems, and ratings from the form
    const { contestName, contestType, duration, numProblems, ratings } = req.body;
    
    // Parse ratings as an array (assumes comma-separated values)
    const ratingArray = ratings.split(',').map(r => Number(r.trim()));
    if (ratingArray.length !== Number(numProblems)) {
      return res.status(400).send("Number of ratings must match the number of problems.");
    }
  
    // Fetch Codeforces problems once
    const response = await axios.get('https://codeforces.com/api/problemset.problems');
    let problems = response.data.result.problems;
  
    // Function to randomly select one problem matching a given rating
    function selectProblemByRating(rating) {
      const filtered = problems.filter(problem => problem.rating == rating);
      if (!filtered.length) return null;
      const randomIndex = Math.floor(Math.random() * filtered.length);
      return filtered[randomIndex];
    }
  
    const selectedProblems = [];
    for (let r of ratingArray) {
      const problem = selectProblemByRating(r);
      if (!problem) {
        return res.status(400).send(`No problem found with rating ${r}`);
      }
      selectedProblems.push(problem);
    }
  
    // Create a new contest record in our database
    const newContest = new Contest({
      contestName: contestName || "Custom Contest",
      contestType, // "personal" or "group"
      duration,
      problems: selectedProblems.map(p => ({
        contestId: p.contestId,
        index: p.index,
        name: p.name,
        rating: p.rating
      }))
      // Additional fields like startTime can be added later when contest starts
    });
  
    await newContest.save();
  
    if (contestType === "personal") {
      // For a personal contest, fetch the logged-in user's Codeforces submissions
      const userHandle = req.user.codeforcesHandle;
      if (!userHandle) return res.status(400).send("User Codeforces handle not found");
      
      const submissionsResponse = await axios.get(`https://codeforces.com/api/user.status?handle=${userHandle}`);
      const submissions = submissionsResponse.data.result;
      
      // Compute problemsStatus array: for each problem, check if there's any accepted submission
      const problemsStatus = newContest.problems.map(problem => {
        const solved = submissions.some(sub => {
          return sub.problem.contestId == problem.contestId &&
                 sub.problem.index === problem.index &&
                 sub.verdict === "OK";
        });
        return { ...problem, solved };
      });
      
      // Render the personal contest view (personalContest.ejs)
      res.render('personalContest', { contest: newContest, problemsStatus });
    } else {
      // For group contests, render a standard contest details page
      res.render('customContestDetails', { contest: newContest });
    }
  } catch (error) {
    console.error(error);
    res.status(500).send("Error creating custom contest.");
  }
});

// --------------------------
// Live Contest: GET /contest/live/:id - Render the live contest page
// --------------------------
router.get('/contest/live/:id', async (req, res) => {
  try {
    const contestId = req.params.id;
    const contest = await Contest.findById(contestId);
    if (!contest) return res.status(404).send("Contest not found");
    res.render('contestLive', { contest });
  } catch (error) {
    console.error(error);
    res.status(500).send("Error loading contest live page");
  }
});

module.exports = router;
