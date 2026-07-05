import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { 
  getNotifications, 
  markAsRead, 
  markAllAsRead 
} from '../controllers/notificationsController.js';

const router = Router();

// Retrieve all user notifications
router.get('/', requireAuth, getNotifications);

// Mark all as read
router.patch('/read-all', requireAuth, markAllAsRead);

// Mark specific notification as read
router.patch('/:id/read', requireAuth, markAsRead);

export default router;
