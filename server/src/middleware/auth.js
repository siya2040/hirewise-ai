import { supabase } from '../config/supabase.js';

/**
 * Middleware to authenticate requests using Supabase JWT.
 * Verifies token, sets req.user.
 */
export const requireAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Authorization header missing or malformed.' });
    }

    const token = authHeader.split(' ')[1];
    
    // Call Supabase Auth to verify JWT and retrieve user profile metadata
    const { data: { user }, error } = await supabase.auth.getUser(token);

    if (error || !user) {
      return res.status(401).json({ error: 'Invalid or expired session token.' });
    }

    // Attach user profile metadata to request object
    req.user = {
      id: user.id,
      email: user.email,
      meta: user.user_metadata,
    };

    // Retrieve user's role from public.profiles table
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role, full_name')
      .eq('id', user.id)
      .single();

    if (profileError || !profile) {
      return res.status(403).json({ error: 'User profile not found in registration database.' });
    }

    // Inject database role details
    req.user.role = profile.role;
    req.user.fullName = profile.full_name;

    next();
  } catch (error) {
    console.error('[Auth Middleware Error]:', error);
    res.status(500).json({ error: 'Internal server authentication failure.' });
  }
};

/**
 * Middleware to restrict route access to specific roles.
 * Must be used AFTER requireAuth.
 * @param {string[]} roles - Allowed roles (e.g. ['student', 'recruiter'])
 */
export const requireRole = (roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required.' });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ 
        error: `Access Denied. Required role: [${roles.join(' or ')}]. Your role: ${req.user.role}` 
      });
    }

    next();
  };
};
