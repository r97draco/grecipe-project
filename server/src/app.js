/* Import Statements */
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const { errorHandler } = require('./middlewares/error');
const ApiError = require('./utils/ApiError');


//Import Routes
const routes = require('./routes');

const app = express();

/* Configuring Cross-Origin Resource Sharing (CORS)*/
app.use(
  cors({
    origin: process.env.CLIENT_ORIGIN ? process.env.CLIENT_ORIGIN.split(',').map(value=>value.trim()) : (process.env.NODE_ENV === 'production' ? false : '*'),
  })
);

/* Configuring the middleware for parsing incoming requests in different formats. */
app.disable('x-powered-by');
app.use(express.json({limit:'1mb'}));
app.use(express.urlencoded({ extended: true }));
app.use(
  bodyParser.urlencoded({
    extended: true,
  })
);
app.use(bodyParser.json());

/* Root URL handler */
app.get('/health', (req,res) => res.json({status:'ok'}));
app.get('/', (req, res) => {
  console.log(`[GET /] - ${new Date().toISOString()}`);
  res.send('Server is Running!');
});

//Add routes to the app
app.use('/api', routes);

// Error handling middleware
app.use((req, res) => {
  throw new ApiError(404, 'Not Found');
});

// error handler, send stacktrace only during development
app.use(errorHandler);

module.exports = app;
