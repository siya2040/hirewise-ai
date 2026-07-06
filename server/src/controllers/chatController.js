import { supabaseAdmin } from '../config/supabase.js';

/**
 * Start or retrieve a chat session between a student and recruiter.
 * POST /api/chat/sessions
 */
export const createOrGetSession = async (req, res) => {
  try {
    const userId = req.user.id;
    const userRole = req.user.role;
    const { studentId, recruiterId, jobId } = req.body;

    // Validation: Require opposite roles
    if (userRole === 'student' && !recruiterId) {
      return res.status(400).json({ error: 'Please supply a recruiterId.' });
    }
    if (userRole === 'recruiter' && !studentId) {
      return res.status(400).json({ error: 'Please supply a studentId.' });
    }

    const targetStudentId = userRole === 'student' ? userId : studentId;
    const targetRecruiterId = userRole === 'recruiter' ? userId : recruiterId;
    const targetJobId = jobId || null;

    // 1. Check if session already exists
    let query = supabaseAdmin
      .from('chat_sessions')
      .select('*')
      .eq('student_id', targetStudentId)
      .eq('recruiter_id', targetRecruiterId);

    if (targetJobId) {
      query = query.eq('job_id', targetJobId);
    } else {
      query = query.is('job_id', null);
    }

    const { data: existingSession, error: checkError } = await query.maybeSingle();

    if (existingSession) {
      return res.status(200).json(existingSession);
    }

    // 2. Create new session
    const { data: newSession, error: createError } = await supabaseAdmin
      .from('chat_sessions')
      .insert({
        student_id: targetStudentId,
        recruiter_id: targetRecruiterId,
        job_id: targetJobId
      })
      .select()
      .single();

    if (createError) throw createError;

    res.status(201).json(newSession);
  } catch (error) {
    console.error('[createOrGetSession Error]:', error);
    res.status(500).json({ error: 'Failed to initialize chat session.' });
  }
};

/**
 * Fetch all chat conversations for the logged-in student or recruiter.
 * GET /api/chat/sessions
 */
export const getUserConversations = async (req, res) => {
  try {
    const userId = req.user.id;
    const userRole = req.user.role;

    // 1. Fetch conversations where user is participant
    let query = supabaseAdmin
      .from('chat_sessions')
      .select(`
        *,
        job:jobs(title)
      `);

    if (userRole === 'student') {
      query = query.eq('student_id', userId);
    } else {
      query = query.eq('recruiter_id', userId);
    }

    const { data: sessions, error: sessionErr } = await query.order('updated_at', { ascending: false });

    if (sessionErr) throw sessionErr;

    // 2. Fetch participant metadata and latest message for each session
    const conversations = await Promise.all(sessions.map(async (session) => {
      const otherUserId = userRole === 'student' ? session.recruiter_id : session.student_id;
      
      // Fetch other user base profile
      const { data: otherProfile } = await supabaseAdmin
        .from('profiles')
        .select('full_name, avatar_url, email')
        .eq('id', otherUserId)
        .single();

      // Fetch other user role details
      let otherDetails = {};
      if (userRole === 'student') {
        const { data: recruiter } = await supabaseAdmin
          .from('recruiter_profiles')
          .select('company_name, designation')
          .eq('id', otherUserId)
          .single();
        if (recruiter) otherDetails = recruiter;
      } else {
        const { data: student } = await supabaseAdmin
          .from('student_profiles')
          .select('skills, college')
          .eq('id', otherUserId)
          .single();
        if (student) otherDetails = student;
      }

      // Fetch latest message
      const { data: latestMsg } = await supabaseAdmin
        .from('chat_messages')
        .select('*')
        .eq('session_id', session.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      // Count unread messages sent by the other user
      const { count: unreadCount } = await supabaseAdmin
        .from('chat_messages')
        .select('id', { count: 'exact', head: true })
        .eq('session_id', session.id)
        .eq('is_read', false)
        .neq('sender_id', userId);

      return {
        id: session.id,
        jobId: session.job_id,
        jobTitle: session.job?.title || null,
        otherParticipant: {
          id: otherUserId,
          fullName: otherProfile?.full_name || 'Professional',
          avatarUrl: otherProfile?.avatar_url || null,
          email: otherProfile?.email || '',
          ...otherDetails
        },
        latestMessage: latestMsg || null,
        unreadCount: unreadCount || 0,
        updatedAt: session.updated_at
      };
    }));

    res.status(200).json(conversations);
  } catch (error) {
    console.error('[getUserConversations Error]:', error);
    res.status(500).json({ error: 'Failed to retrieve conversations.' });
  }
};

/**
 * Fetch messages inside a conversation session.
 * GET /api/chat/sessions/:sessionId/messages
 */
export const getSessionMessages = async (req, res) => {
  try {
    const userId = req.user.id;
    const { sessionId } = req.params;

    // 1. Verify session exists and user is participant
    const { data: session, error: sessionErr } = await supabaseAdmin
      .from('chat_sessions')
      .select('id, student_id, recruiter_id')
      .eq('id', sessionId)
      .single();

    if (sessionErr || !session) {
      return res.status(404).json({ error: 'Chat conversation not found.' });
    }

    if (session.student_id !== userId && session.recruiter_id !== userId) {
      return res.status(403).json({ error: 'Unauthorized to view this conversation.' });
    }

    // 2. Fetch messages ordered by creation
    const { data: messages, error: msgErr } = await supabaseAdmin
      .from('chat_messages')
      .select('*')
      .eq('session_id', sessionId)
      .order('created_at', { ascending: true });

    if (msgErr) throw msgErr;

    // 3. Mark incoming messages as read
    await supabaseAdmin
      .from('chat_messages')
      .update({ is_read: true })
      .eq('session_id', sessionId)
      .neq('sender_id', userId);

    res.status(200).json(messages);
  } catch (error) {
    console.error('[getSessionMessages Error]:', error);
    res.status(500).json({ error: 'Failed to retrieve message history.' });
  }
};

/**
 * Send a new message in a conversation.
 * POST /api/chat/sessions/:sessionId/messages
 */
export const sendMessage = async (req, res) => {
  try {
    const userId = req.user.id;
    const { sessionId } = req.params;
    const { content } = req.body;

    if (!content || content.trim().length === 0) {
      return res.status(400).json({ error: 'Message content cannot be empty.' });
    }

    // 1. Verify session exists and user is participant
    const { data: session, error: sessionErr } = await supabaseAdmin
      .from('chat_sessions')
      .select('id, student_id, recruiter_id')
      .eq('id', sessionId)
      .single();

    if (sessionErr || !session) {
      return res.status(404).json({ error: 'Chat conversation not found.' });
    }

    if (session.student_id !== userId && session.recruiter_id !== userId) {
      return res.status(403).json({ error: 'Unauthorized to post messages here.' });
    }

    // 2. Insert new message
    const { data: newMessage, error: msgErr } = await supabaseAdmin
      .from('chat_messages')
      .insert({
        session_id: sessionId,
        sender_id: userId,
        content: content.trim()
      })
      .select()
      .single();

    if (msgErr) throw msgErr;

    // 3. Update session updated_at timestamp to bubble it to top of inbox
    await supabaseAdmin
      .from('chat_sessions')
      .update({ updated_at: new Date().toISOString() })
      .eq('id', sessionId);

    res.status(201).json(newMessage);
  } catch (error) {
    console.error('[sendMessage Error]:', error);
    res.status(500).json({ error: 'Failed to transmit message.' });
  }
};
