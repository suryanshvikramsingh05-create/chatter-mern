const multer = require('multer');

const notFound = (req, res, next) => {
  res.status(404).json({ message: `Route not found: ${req.method} ${req.originalUrl}` });
};

const errorHandler = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    return res.status(400).json({ message: err.message });
  }

  let statusCode = err.statusCode || (res.statusCode !== 200 ? res.statusCode : 500);
  let message = err.message || 'Server error';

  if (err.name === 'CastError' || err.name === 'ValidationError') {
    statusCode = 400;
    message = 'Invalid request data';
  }

  if (err.code === 11000) {
    statusCode = 400;
    message = 'A record with that value already exists';
  }

  if (statusCode === 500) {
    console.error(err);
    if (process.env.NODE_ENV === 'production') {
      message = 'Something went wrong';
    }
  }

  res.status(statusCode).json({ message });
};

module.exports = { notFound, errorHandler };
