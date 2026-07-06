import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { 
  createOrGetSession, 
  getUserConversations, 
  getSessionMessages, 
  sendMessage 
} from '../controllers/chatController.js';

const router = Router();

// Create or fetch a conversation session
router.post('/sessions', requireAuth, createOrGetSession);

// Fetch conversation inbox details for student/recruiter
router.get('/sessions', requireAuth, getUserConversations);

// Fetch messages inside a conversation session
router.get('/sessions/:sessionId/messages', requireAuth, getSessionMessages);

// Send message inside a conversation session
router.post('/sessions/:sessionId/messages', requireAuth, sendMessage);

export default router;
