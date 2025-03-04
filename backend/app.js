// backend/app.js
const express = require('express');
const path = require('path');
const connectDB = require('./config/database');
const indexRoutes = require('./routes/index');
const authRoutes = require('./routes/auth');
const session = require('express-session');
const passport = require('./config/passport'); // our configured passport
const problemsRoutes = require('./routes/problems');
const cookieParser = require('cookie-parser');


const app = express();

// Connect to MongoDB
connectDB();

// EJS view engine setup
// We assume that "views" directory is in ../frontend/views
app.set('views', path.join(__dirname, '../frontend/views'));
app.set('view engine', 'ejs');



// Body parser
app.use(express.urlencoded({ extended: false }));
app.use(express.json());
app.use(cookieParser());



// Serve static files (CSS, JS) from frontend/public
app.use(express.static(path.join(__dirname, '../frontend/public')));


// Session management
app.use(
    session({
        secret: 'yourSecretKey', // Replace with a strong secret; consider using an env variable
        resave: false,
        saveUninitialized: false,
    })
);
// middleware to check for JWT and attach user info
app.use((req, res, next) => {
    const token = req.cookies.token;
    if (token) {
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        res.locals.user = decoded; // available in all views
      } catch (err) {
        res.locals.user = null;
      }
    } else {
      res.locals.user = null;
    }
    next();
  });
  

// Initialize Passport and session
app.use(passport.initialize());
app.use(passport.session());


// Routes
app.use('/', indexRoutes);
app.use('/', authRoutes);
app.use('/', problemsRoutes);



// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
