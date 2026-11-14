const logger = require('../config/logger');

/* Error handler */
const errorHandler = (err, req, res, next) => {
  let { statusCode = err.code === 'LIMIT_FILE_SIZE' ? 413 : 500, message = 'Internal Server Error' } = err;

  res.locals.errorMessage = message;

  const response = {
    code: statusCode,
    message,
    ...(process.env.NODE_ENV !== 'production' ? {stack:err.stack} : {}),
  };

  logger.error(err);

  res.status(statusCode).json(response);
};

module.exports = {
  errorHandler,
};
