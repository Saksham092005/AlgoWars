// const passport = require('passport');
// const GoogleStrategy = require('passport-google-oauth20').Strategy;
// const User = require('../models/User');
// require('dotenv').config();


// // Serialize user to store in session
// passport.serializeUser((user, done) => {
//   done(null, user.id);
// });

// // Deserialize user from session
// passport.deserializeUser((id, done) => {
//   User.findById(id, (err, user) => done(err, user));
// });

// // Google OAuth Strategy
// passport.use(
//   new GoogleStrategy(
//     {
//       clientID: process.env.GOOGLE_CLIENT_ID,           // Set these in your .env file
//       clientSecret: process.env.GOOGLE_CLIENT_SECRET,
//       callbackURL: "/auth/google/callback",
//     },
//     async (accessToken, refreshToken, profile, done) => {
//       try {
//         // Check if user already exists based on googleId
//         let existingUser = await User.findOne({ googleId: profile.id });
//         if (existingUser) {
//           return done(null, existingUser);
//         }
//         // If not, create a new user record.
//         // Note: password is set to an empty string; you may prompt the user later to complete their profile.
//         const newUser = new User({
//           username: profile.displayName,
//           email: profile.emails[0].value,
//           password: '',
//           codeforcesHandle: '', // User can update this later
//           googleId: profile.id,
//         });
//         await newUser.save();
//         done(null, newUser);
//       } catch (err) {
//         done(err, null);
//       }
//     }
//   )
// );

// module.exports = passport;















const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const User = require('../models/User');
require('dotenv').config();

passport.serializeUser((user, done) => {
  done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
    try {
      const user = await User.findById(id);
      done(null, user);
    } catch (err) {
      done(err);
    }
  });
  

passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: "http://localhost:3000/auth/google/callback"
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        // Retrieve the email from Google profile
        const googleEmail = profile.emails && profile.emails[0].value;
        if (!googleEmail) {
          return done(null, false, { message: "No email found in Google profile" });
        }
        
        // Look for an existing user by email
        let user = await User.findOne({ email: googleEmail });
        if (user) {
          // Optional: update the user record with googleId if not set already
          if (!user.googleId) {
            user.googleId = profile.id;
            await user.save();
          }
          return done(null, user);
        } else {
          // If no user is found, reject the login attempt.
          return done(null, false, { message: "User not found. Please register first." });
        }
      } catch (err) {
        return done(err, false);
      }
    }
  )
);

module.exports = passport;
