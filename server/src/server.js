/* Import Statements */
require('dotenv').config();
if (Number(process.versions.node.split('.')[0]) >= 25) {
  console.error('Use Node.js 24 for this project. Run nvm use or add /opt/homebrew/opt/node@24/bin to PATH.');
  process.exit(1);
}
const requiredSettings = [
  'FIREBASE_PROJECT_ID',
  'FIREBASE_CLIENT_EMAIL',
  'FIREBASE_PRIVATE_KEY',
];
const missingSettings = requiredSettings.filter((name) => !process.env[name]);
if (missingSettings.length) {
  console.error(`Cannot start the server. Set these values in server/.env: ${missingSettings.join(', ')}. See server/.env.example.`);
  process.exit(1);
}
const app = require('./app');
const connectDB = require('./config/connectDB');
const logger = require('./config/logger');

let server;

/* Starting the server and listening on a specific port. */
connectDB()
  .then(() => {
    const PORT = process.env.PORT || 9191;
    server = app.listen(PORT, () =>
      logger.info(`[Server] - Running on port ${PORT}`)
    );
  })
  .catch((e) => {
    logger.error(e);
    process.exit(1);
  });

// Logging error using logge
const exitHandler = () => {
  if (server) {
    server.close(() => {
      logger.info('Server closed');
      process.exit(1);
    });
  } else {
    process.exit(1);
  }
};

const unexpectedErrorHandler = (error) => {
  logger.error(`Error: ${error}`);
  exitHandler();
};

// Handle unhandled promise rejections
process.on('uncaughtException', unexpectedErrorHandler);
process.on('unhandledRejection', unexpectedErrorHandler);

process.on('SIGTERM', () => {
  logger.info('SIGTERM received');
  if (server) {
    server.close();
  }
});
