const express = require('express');
const axios = require('axios');
const router = express.Router();

router.get('/problems', async (req, res) => {
  try {
    // Retrieve optional filters from query parameters
    const { rating, tag } = req.query;
    
    // Determine current page, default to 1 if not provided
    const page = Number(req.query.page) || 1;
    const pageSize = 50; // 50 problems per page

    // Fetch problems from Codeforces API
    const response = await axios.get('https://codeforces.com/api/problemset.problems');
    let problems = response.data.result.problems;

    // Filter problems by rating if provided
    if (rating) {
      problems = problems.filter(problem => problem.rating == rating);
    }

    // Filter problems by tag if provided
    if (tag) {
      problems = problems.filter(problem => {
        return problem.tags && problem.tags.includes(tag.toLowerCase());
      });
    }

    // For “latest” problems, sort by contestId descending (using contestId as a proxy for recency)
    problems.sort((a, b) => (b.contestId || 0) - (a.contestId || 0));

    // Calculate pagination values
    const totalProblems = problems.length;
    const totalPages = Math.ceil(totalProblems / pageSize);
    const paginatedProblems = problems.slice((page - 1) * pageSize, page * pageSize);

    // Render the problems template, passing along filters and pagination info
    res.render('problems', { 
      problems: paginatedProblems,
      ratingFilter: rating || "",
      tagFilter: tag || "",
      currentPage: page,
      totalPages
    });
  } catch (err) {
    console.error(err);
    res.status(500).send("Error retrieving problems from Codeforces API.");
  }
});

module.exports = router;
