// src/app.js
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';
import routes from './routes.js';
import { errorMiddleware } from './utils/errorHandler.js';
import crypto from 'crypto'; // Add explicit import for crypto

// Load environment variables
dotenv.config();

// Create Express app
const app = express();
const PORT = process.env.PORT || 3001;

// Improved CORS configuration
const allowedOrigins = process.env.NODE_ENV === 'production'
  ? ['https://trackflow.pl', 'https://www.trackflow.pl', process.env.FRONTEND_URL].filter(Boolean)
  : [process.env.FRONTEND_URL || 'http://localhost:3000'];

console.log('CORS allowed origins:', allowedOrigins);

app.use(cors({
  origin: function(origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      console.warn(`CORS blocked request from origin: ${origin}`);
      callback(null, false);
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

// Parse JSON bodies
app.use(express.json());

// Request logging
app.use(morgan('dev'));

// Add request ID to each request for tracing
app.use((req, res, next) => {
  req.id = crypto.randomUUID();
  next();
});

// CORS preflight options - respond to OPTIONS requests
app.options('*', cors());

// Security headers - moved after CORS to avoid conflicts
app.use((req, res, next) => {
  // Basic CSP for API server - restrictive but functional
  res.setHeader(
    'Content-Security-Policy',
    "default-src 'self'; script-src 'self'; connect-src 'self'"
  );
  
  // Basic security headers
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  
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