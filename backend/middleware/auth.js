
const jwt = require('jsonwebtoken');

const auth = (req, res, next) => {
  // Get token from cookies
  const token = req.cookies.token;
  
  // If no token, redirect to login
  if (!token) {
    return res.redirect('/login');
  }
  
  try {
    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded; // Now you have the user's id and email in req.user
    next();
  } catch (err) {
    console.error(err);
    res.redirect('/login');
  }
};

module.exports = auth;
