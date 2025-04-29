// src/app.js
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';
import routes from './routes.js';
import { errorMiddleware } from './utils/errorHandler.js';

// Load environment variables
dotenv.config();

// Create Express app
const app = express();
const PORT = process.env.PORT || 3001;

// Set up middleware
app.use(cors({
  origin: process.env.NODE_ENV === 'production'
    ? ['https://trackflow.pl', 'https://www.trackflow.pl', process.env.FRONTEND_URL]
    : process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true
}));
app.use(express.json()); // Parse JSON bodies
app.use(morgan('dev')); // Request logging

// Add request ID to each request for tracing
app.use((req, res, next) => {
  req.id = crypto.randomUUID();
  next();
});

// API routes
app.use('/api', routes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: {
      message: 'Not found',
      path: req.path
    }
  });
});

// Error handler
app.use(errorMiddleware);

// Start the server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on http://localhost:${PORT}`);
  console.log(`Network access: http://<your-local-ip>:${PORT}`);
});

export default app;