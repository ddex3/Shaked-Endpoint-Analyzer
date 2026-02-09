const express = require('express');
const analyzeRouter = require('./routes/analyze');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json({ limit: '1mb' }));
app.set('json spaces', 2);

app.use(analyzeRouter);

app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'Shaked Endpoint Analyzer',
    version: '1.0.0',
    uptime: process.uptime(),
  });
});

app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: {
      type: 'NOT_FOUND',
      message: `Route ${req.method} ${req.path} not found`,
    },
  });
});

app.use((err, req, res, _next) => {
  res.status(500).json({
    success: false,
    error: {
      type: 'INTERNAL_ERROR',
      message: 'An unexpected server error occurred',
    },
  });
});

const server = app.listen(PORT, () => {
  console.log(`Shaked Endpoint Analyzer running on port ${PORT}`);
});

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`Port ${PORT} is already in use. Kill the other process or use a different port:`);
    console.error(`  PORT=3001 npm start`);
  } else {
    console.error(`Server error: ${err.message}`);
  }
  process.exit(1);
});

process.on('uncaughtException', (err) => {
  console.error(`Uncaught exception: ${err.message}`);
  process.exit(1);
});

process.on('unhandledRejection', (reason) => {
  console.error(`Unhandled rejection: ${reason}`);
});

process.on('SIGINT', () => {
  console.log('\nShutting down...');
  server.close(() => process.exit(0));
});

module.exports = app;
