const express = require('express');
const axios = require('axios');
const router = express.Router();

router.get('/problems', async (req, res) => {
  try {
    // Retrieve optional filters from query parameters
    const { rating, tag } = req.query;

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

    // Optionally, limit the number of displayed problems (e.g., 50)
    problems = problems.slice(0, 50);

    // Render the problems template, passing along filters for display
    res.render('problems', { 
      problems,
      ratingFilter: rating || "",
      tagFilter: tag || ""
    });
  } catch (err) {
    console.error(err);
    res.status(500).send("Error retrieving problems from Codeforces API.");
  }
});

module.exports = router;
