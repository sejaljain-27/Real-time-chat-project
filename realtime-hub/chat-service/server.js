require('dotenv').config();

const http = require('http');
const createApp = require('./src/app');
const connectDB = require('./src/config/db');
const initChatSocket = require('./src/sockets/chatSocket');

const PORT = process.env.PORT || 5000;
const rawOrigins = process.env.CLIENT_ORIGIN || 'http://localhost:5173';
const CLIENT_ORIGIN = rawOrigins.split(',').map(o => o.trim());

const app = createApp(CLIENT_ORIGIN);
const httpServer = http.createServer(app);
initChatSocket(httpServer, CLIENT_ORIGIN);

async function start() {
  await connectDB();
  httpServer.listen(PORT, () => {
    console.log(`[chat-service] listening on port ${PORT}`);
  });
}

start().catch((err) => {
  console.error('[chat-service] failed to start:', err);
  process.exit(1);
});

// Trigger nodemon reload to load updated env values
