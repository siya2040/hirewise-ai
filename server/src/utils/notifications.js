import { supabaseAdmin } from '../config/supabase.js';

/**
 * Dispatch an in-app notification to a user.
 * @param {string} userId - UUID of target recipient profile.
 * @param {string} title - Brief summary header.
 * @param {string} message - Descriptive notification details.
 */
export const sendNotification = async (userId, title, message) => {
  try {
    if (!supabaseAdmin) {
      console.warn('[sendNotification]: Supabase Admin is not initialized. Skipping notification.');
      return;
    }

    const { error } = await supabaseAdmin
      .from('notifications')
      .insert({
        user_id: userId,
        title,
        message,
        is_read: false
      });

    if (error) {
      console.error('[sendNotification DB Error]:', error);
    }
  } catch (err) {
    console.error('[sendNotification System Crash]:', err);
  }
};
