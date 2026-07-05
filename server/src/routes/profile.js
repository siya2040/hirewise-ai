import { Router } from 'express';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { 
  getProfile, 
  updateStudentProfile, 
  processResumeUpload,
  deleteAccount,
  updateRecruiterProfile,
  getRecruiterAnalytics,
  optimizeResume
} from '../controllers/profileController.js';

const router = Router();

// Retrieve full user profile context (accessible to students & recruiters)
router.get('/', requireAuth, getProfile);

// Update Student specific profile fields
router.put('/student', requireAuth, requireRole(['student']), updateStudentProfile);

// Upload and parse resume to fetch immediate ATS insights
router.post('/resume', requireAuth, requireRole(['student']), processResumeUpload);

// Optimize resume text suggestions
router.post('/resume/optimize', requireAuth, requireRole(['student']), optimizeResume);

// Update Recruiter company details
router.put('/recruiter', requireAuth, requireRole(['recruiter']), updateRecruiterProfile);

// Retrieve recruiter analytics dashboard data
router.get('/recruiter/analytics', requireAuth, requireRole(['recruiter']), getRecruiterAnalytics);

// Delete own account
router.delete('/', requireAuth, deleteAccount);

export default router;
