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
      return res.send('User with that email/username already exists');
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
  res.render('login');
});

// POST Login form
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    // Find user by email
    const user = await User.findOne({ email });
    if (!user) {
      return res.send('Incorrect Password or Username');
    }

    // Compare password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.send('Incorrect Password or Username');
    }

    // Generate JWT token
    const payload = { id: user._id, email: user.email };
    const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '1h' });

    // Set token in an HTTP-only cookie
    res.cookie('token', token, { httpOnly: true, secure: process.env.NODE_ENV === 'production' });

    // Redirect or render success message
    res.redirect('/problems');
  } catch (error) {
    console.error(error);
    res.status(500).send('Server error');
  }

});



// logout

router.get('/logout', (req, res) => {
  res.clearCookie('token');
  res.redirect('/');
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
    // Successful authentication, redirect to dashboard or home.
    // console.log("Login succesfful");
    res.redirect('/');
  }
);

module.exports = router;
