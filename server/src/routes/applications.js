import { Router } from 'express';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { 
  submitApplication, 
  getStudentApplications,
  getRecruiterApplications,
  updateApplicationStatus
} from '../controllers/applicationController.js';

const router = Router();

// Student routes for applications
router.post('/', requireAuth, requireRole(['student']), submitApplication);
router.get('/', requireAuth, requireRole(['student']), getStudentApplications);

// Recruiter routes for applications
router.get('/recruiter', requireAuth, requireRole(['recruiter']), getRecruiterApplications);
router.patch('/:id/status', requireAuth, requireRole(['recruiter']), updateApplicationStatus);

export default router;
