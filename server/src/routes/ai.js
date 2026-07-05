import { Router } from 'express';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { 
  startMockInterview, 
  submitInterviewAnswers, 
  getInterviewHistory,
  getRecruiterInterviewQuestions
} from '../controllers/aiController.js';

const router = Router();

// Student routes for mock interviews
router.post('/mock-interview/start', requireAuth, requireRole(['student']), startMockInterview);
router.post('/mock-interview/submit', requireAuth, requireRole(['student']), submitInterviewAnswers);
router.get('/mock-interview/history', requireAuth, requireRole(['student']), getInterviewHistory);

// Recruiter routes
router.post('/recruiter/questions', requireAuth, requireRole(['recruiter']), getRecruiterInterviewQuestions);

export default router;
