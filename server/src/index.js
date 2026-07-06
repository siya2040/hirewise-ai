import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { requireAuth } from './middleware/auth.js';

import profileRouter from './routes/profile.js';
import jobsRouter from './routes/jobs.js';
import applicationsRouter from './routes/applications.js';
import aiRouter from './routes/ai.js';
import notificationsRouter from './routes/notifications.js';
import chatRouter from './routes/chat.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Configure CORS to accept client connection
app.use(cors({
  origin: '*', // We can restrict this in production (e.g. localhost:5173)
  credentials: true,
}));

app.use(express.json());

// 1. Public Health Check Endpoint
app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'HireWise AI API Server'
  });
});

// 2. Authenticated Profile Context Endpoint
// Confirms that the frontend can securely authenticate with backend APIs
app.get('/api/auth/me', requireAuth, (req, res) => {
  res.status(200).json({
    authenticated: true,
    user: req.user
  });
});

// Bind REST routes
app.use('/api/profile', profileRouter);
app.use('/api/jobs', jobsRouter);
app.use('/api/applications', applicationsRouter);
app.use('/api/ai', aiRouter);
app.use('/api/notifications', notificationsRouter);
app.use('/api/chat', chatRouter);


// 3. Centralized Error Handling Middleware
app.use((err, req, res, next) => {
  console.error('[Global Server Error]:', err.stack);
  res.status(500).json({
    error: 'An unexpected database or server failure occurred.'
  });
});

// 4. Start Server Listening
app.listen(PORT, () => {
  console.log(`[HireWise AI Server]: Server running on port ${PORT}`);
});
