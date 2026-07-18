const mongoose = require('mongoose');

async function connectDB() {
  const uri = process.env.MONGO_URI || 'mongodb://localhost:27017/realtime_chat';

  mongoose.connection.on('connected', () => {
    console.log(`[mongo] connected -> ${mongoose.connection.name}`);
  });

  mongoose.connection.on('error', (err) => {
    console.error('[mongo] connection error:', err.message);
  });

  mongoose.connection.on('disconnected', () => {
    console.warn('[mongo] disconnected, retrying in 5s...');
    setTimeout(connectDB, 5000);
  });

  await mongoose.connect(uri, {
    autoIndex: true,
  });
}

module.exports = connectDB;
