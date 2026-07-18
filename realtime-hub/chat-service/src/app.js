const express = require('express');
const cors = require('cors');
const helmet = require('helmet');

const authRoutes = require('./routes/authRoutes');
const roomRoutes = require('./routes/roomRoutes');

function createApp(clientOrigin) {
  const app = express();

  app.use(helmet());
  app.use(cors({ origin: clientOrigin || process.env.CLIENT_ORIGIN, credentials: true }));
  app.use(express.json());

  app.get('/health', (req, res) => {
    res.json({ status: 'ok', service: 'chat-service', time: new Date().toISOString() });
  });

  app.use('/api/auth', authRoutes);
  app.use('/api/rooms', roomRoutes);

  app.use((req, res) => {
    res.status(404).json({ error: 'Not found' });
  });

  // Centralized error handler
  // eslint-disable-next-line no-unused-vars
  app.use((err, req, res, next) => {
    console.error('[error]', err);
    res.status(err.status || 500).json({ error: err.message || 'Internal server error' });
  });

  return app;
}

module.exports = createApp;
