import { supabase } from '../config/supabase.js';

/**
 * Get all notifications for the logged-in user.
 */
export const getNotifications = async (req, res) => {
  try {
    const userId = req.user.id;

    const { data: notifications, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw error;

    res.status(200).json(notifications);
  } catch (error) {
    console.error('[getNotifications Error]:', error);
    res.status(500).json({ error: 'Failed to retrieve notifications.' });
  }
};

/**
 * Mark a specific notification as read.
 */
export const markAsRead = async (req, res) => {
  try {
    const userId = req.user.id;
    const notificationId = req.params.id;

    const { data, error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('id', notificationId)
      .eq('user_id', userId)
      .select()
      .single();

    if (error) throw error;

    res.status(200).json(data);
  } catch (error) {
    console.error('[markAsRead Error]:', error);
    res.status(500).json({ error: 'Failed to update notification.' });
  }
};

/**
 * Mark all notifications as read for the user.
 */
export const markAllAsRead = async (req, res) => {
  try {
    const userId = req.user.id;

    const { error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('user_id', userId)
      .eq('is_read', false);

    if (error) throw error;

    res.status(200).json({ message: 'All notifications marked as read.' });
  } catch (error) {
    console.error('[markAllAsRead Error]:', error);
    res.status(500).json({ error: 'Failed to mark all as read.' });
  }
};
