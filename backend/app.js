// backend/app.js
const express = require('express');
const app = express();
const path = require('path');
const connectDB = require('./config/database');
const indexRoutes = require('./routes/index');
const authRoutes = require('./routes/auth');
const session = require('express-session');
const passport = require('./config/passport'); // our configured passport
const problemsRoutes = require('./routes/problems');
const cookieParser = require('cookie-parser');

const dashboardRouter = require('./routes/dashboard');
const jwt = require('jsonwebtoken');

const http = require('http');
const socketio = require('socket.io');
const server = http.createServer(app);
const io = socketio(server);
const contestRoutes = require('./routes/contests');




// Connect to MongoDB
connectDB();

// EJS view engine setup
// We assume that "views" directory is in ../frontend/views
app.set('views', path.join(__dirname, '../frontend/views'));
app.set('view engine', 'ejs');
app.set('io', io);
app.use(express.static(path.join(__dirname, '../frontend/public')));



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
        console.error('JWT verification error:', err);
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

app.use('/', dashboardRouter);

app.use('/', contestRoutes);

// Socket.io connection handling
io.on('connection', (socket) => {
  console.log('New client connected');
  socket.on('joinContest', (contestId) => {
    socket.join(`contest_${contestId}`);
    console.log(`Socket joined room: contest_${contestId}`);
  });
});



// Leaderboard simulation: every 10 seconds, update leaderboard for live contests
const Contest = require('./models/Contest');
function computeLeaderboard(contest) {
  // For demo purposes, assign random scores to each participant.
  const leaderboard = contest.participants.map(participant => ({
    userId: participant,
    score: Math.floor(Math.random() * 100)
  }));
  leaderboard.sort((a, b) => b.score - a.score);
  return leaderboard;
}

setInterval(async () => {
  // Here, we find a live contest (for demo, simply get one contest; you may need proper criteria)
  const contest = await Contest.findOne({ startTime: { $ne: null } });
  if (contest) {
    const leaderboard = computeLeaderboard(contest);
    io.to(`contest_${contest._id}`).emit('leaderboardUpdate', leaderboard);
  }
}, 10000);






// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
