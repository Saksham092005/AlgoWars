const express = require('express');
const axios = require('axios');
const router = express.Router();
const Contest = require('../models/Contest'); // We'll create this model next

// GET /contests - Fetch and display upcoming and past contests with pagination
router.get('/contests', async (req, res) => {
  try {
    // Fetch contest list from Codeforces API
    const response = await axios.get('https://codeforces.com/api/contest.list');
    let contests = response.data.result;
    
    // Pagination settings
    const page = Number(req.query.page) || 1;
    const pageSize = 100;
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



// custom contests

// Render the custom contest creation form
router.get('/contests/custom', (req, res) => {
    res.render('customContest');
  });


  router.post('/contests/custom', async (req, res) => {
    try {
      const { contestName, duration, numProblems, ratings } = req.body;
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
      // (We'll create the Contest model shortly)
      const newContest = new Contest({
        contestName: contestName || "Custom Contest",
        duration,
        problems: selectedProblems.map(p => ({
          contestId: p.contestId,
          index: p.index,
          name: p.name,
          rating: p.rating
        })),
        // Additional fields like startTime can be added later when contest starts
      });
  
      await newContest.save();
  
      // Render details page with contest info and problems
      res.render('customContestDetails', { contest: newContest });
    } catch (error) {
      console.error(error);
      res.status(500).send("Error creating custom contest.");
    }
  });
  



  // live contest


  // GET /contest/live/:id - Render the live contest page
router.get('/contest/live/:id', async (req, res) => {
    try {
      const contestId = req.params.id;
      const Contest = require('../models/Contest');
      const contest = await Contest.findById(contestId);
      if (!contest) return res.status(404).send("Contest not found");
      res.render('contestLive', { contest });
    } catch (error) {
      console.error(error);
      res.status(500).send("Error loading contest live page");
    }
  });
  

module.exports = router;
