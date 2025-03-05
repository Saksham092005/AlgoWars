// backend/routes/auth.js
const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const passport = require('passport');
const jwt = require('jsonwebtoken');

// GET Sign Up page
router.get('/register', (req, res) => {
  res.render('register', { error: req.query.error });
});

// POST Sign Up form
router.post('/register', async (req, res) => {
  try {
    const { username, email, password, codeforcesHandle } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ $or: [{ email }, { username }] });
    if (existingUser) {
      return res.redirect('/register?error=' + encodeURIComponent('User with that email/username already exists'));
    }
    // Validate Codeforces handle by calling the Codeforces API
    try {
      const cfResponse = await axios.get(`https://codeforces.com/api/user.info?handles=${codeforcesHandle}`);
      // The API should return status "OK" if the handle exists
      if (cfResponse.data.status !== "OK") {
        return res.redirect('/register?error=' + encodeURIComponent('Codeforces handle not found'));
      }
    } catch (cfError) {
      // If there's an error in the API call, treat it as an invalid handle
      return res.redirect('/register?error=' + encodeURIComponent('Codeforces handle not found'));
    }
    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create new user
    const newUser = new User({
      username,
      email,
      password: hashedPassword,
      codeforcesHandle,
    });
    await newUser.save();

    // Redirect to login after successful registration
    res.redirect('/login');
  } catch (error) {
    console.error(error);
    res.status(500).send('Server error');
  }
});

// GET Login page
router.get('/login', (req, res) => {
  res.render('login', { error: req.query.error });
});

// POST Login form
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    // Find user by email
    const user = await User.findOne({ email });
    if (!user) {
      return res.redirect('/login?error=' + encodeURIComponent('Incorrect Password or Username'));
    }

    // Compare password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.redirect('/login?error=' + encodeURIComponent('Incorrect Password or Username'));
    }

    // Generate JWT token
    const payload = { id: user._id, email: user.email };
    const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '1h' });

    // Set token in an HTTP-only cookie
    res.cookie('token', token, { httpOnly: true, secure: process.env.NODE_ENV === 'production' });

    // Redirect or render success message
    res.redirect('/dashboard');
  } catch (error) {
    console.error(error);
    res.status(500).send('Server error');
  }

});



// logout

router.get('/logout', (req, res) => {
  req.logout(function(err) {
    if (err) {
      console.error(err);
    }
    // Clear the JWT token cookie
    res.clearCookie('token');
    // Optionally destroy the session
    req.session.destroy(() => {
      res.redirect('/');
    });
  });
});




// google auth

router.get(
  '/auth/google',
  passport.authenticate('google', { scope: ['profile', 'email'] })
);

// Google OAuth: callback route
router.get(
  '/auth/google/callback',
  passport.authenticate('google', { failureRedirect: '/register?error=not_registered' }),
  (req, res) => {
    // Generate JWT token for the authenticated user
    const payload = { id: req.user._id, email: req.user.email };
    const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '1h' });
    // Set token as an HTTP-only cookie
    res.cookie('token', token, { httpOnly: true, secure: process.env.NODE_ENV === 'production' });
    // Redirect to dashboard after successful login
    res.redirect('/dashboard');
  }
);

module.exports = router;
