// backend/config/database.js
const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    // Replace with your MongoDB connection string
    const uri = 'mongodb://127.0.0.1:27017/devbits';
    await mongoose.connect(uri, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('MongoDB connected!');
  } catch (err) {
    console.error('Database connection error:', err);
    process.exit(1);
  }
};

module.exports = connectDB;
