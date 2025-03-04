// backend/routes/index.js
const express = require('express');
const router = express.Router();

// GET Home Page
router.get('/', (req, res) => {
  // Renders "index.ejs" from the views folder
  res.render('index');
});

module.exports = router;
