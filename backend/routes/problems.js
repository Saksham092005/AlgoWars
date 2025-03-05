// routes/problems.js
const express = require('express');
const axios = require('axios');
const router = express.Router();
const authMiddleware = require('../middleware/auth'); 
const User = require('../models/User'); // or wherever your User model is

router.get('/problems', authMiddleware, async (req, res) => {
  try {
    // Retrieve optional filters
    const { minRating, maxRating, tag, page = 1 } = req.query;
    const pageSize = 50;

    // Fetch problems from Codeforces
    const response = await axios.get('https://codeforces.com/api/problemset.problems');
    let problems = response.data.result.problems;

    // Filter by rating range
    if (minRating) {
      problems = problems.filter(p => p.rating && p.rating >= Number(minRating));
    }
    if (maxRating) {
      problems = problems.filter(p => p.rating && p.rating <= Number(maxRating));
    }
    // Filter by tag
    if (tag) {
      problems = problems.filter(p => p.tags && p.tags.includes(tag.toLowerCase()));
    }

    // Sort by recency (descending contestId)
    problems.sort((a, b) => (b.contestId || 0) - (a.contestId || 0));

    // Pagination
    const totalProblems = problems.length;
    const totalPages = Math.ceil(totalProblems / pageSize);
    const currentPage = Number(page);
    const paginatedProblems = problems.slice((currentPage - 1) * pageSize, currentPage * pageSize);

    // --------------------------
    // Build a submissions map to highlight solved or wrong-only
    // --------------------------
    let problemStatusMap = {}; // key: "contestId-index", value: "solved" | "wrong-only" | undefined

    // Check if user is logged in & has a CF handle
    let codeforcesHandle = null;
    if (req.user && req.user.id) {
      const fullUser = await User.findById(req.user.id);
      codeforcesHandle = fullUser && fullUser.codeforcesHandle;
    }

    if (codeforcesHandle) {
      // Fetch user submissions from Codeforces
      const submissionsRes = await axios.get(`https://codeforces.com/api/user.status?handle=${codeforcesHandle}`);
      const userSubmissions = submissionsRes.data.result;

      // Build map of problem -> { tried: boolean, solved: boolean }
      const tempMap = {}; // key: "contestId-index"
      userSubmissions.forEach(sub => {
        const key = `${sub.problem.contestId}-${sub.problem.index}`;
        if (!tempMap[key]) {
          tempMap[key] = { tried: false, solved: false };
        }
        tempMap[key].tried = true;
        if (sub.verdict === 'OK') {
          tempMap[key].solved = true;
        }
      });

      // Convert to final statuses
      Object.entries(tempMap).forEach(([key, val]) => {
        if (val.solved) {
          problemStatusMap[key] = 'solved'; 
        } else if (val.tried) {
          problemStatusMap[key] = 'wrong-only';
        }
      });
    }

    // Render template
    res.render('problems', {
      problems: paginatedProblems,
      minRating: minRating || "",
      maxRating: maxRating || "",
      tagFilter: tag || "",
      currentPage,
      totalPages,
      problemStatusMap // pass the map to EJS
    });
  } catch (err) {
    console.error(err);
    res.status(500).send("Error retrieving problems from Codeforces API.");
  }
});

module.exports = router;

