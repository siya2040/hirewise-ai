import { supabase } from '../config/supabase.js';
import { 
  generateInterviewQuestions, 
  evaluateInterviewAnswers,
  generateRecruiterQuestionsForCandidate
} from '../services/geminiService.js';

/**
 * Start a mock interview session.
 * Generates 5 custom questions based on student skills and target job.
 */
export const startMockInterview = async (req, res) => {
  try {
    const studentId = req.user.id;
    const { jobRole, appliedJobId } = req.body;

    if (!jobRole && !appliedJobId) {
      return res.status(400).json({ error: 'Please supply either a jobRole or appliedJobId.' });
    }

    // 1. Fetch student skills to customize questions
    const { data: student, error: studentError } = await supabase
      .from('student_profiles')
      .select('skills')
      .eq('id', studentId)
      .single();

    if (studentError || !student) {
      return res.status(404).json({ error: 'Student profile not found.' });
    }

    let targetTitle = jobRole;
    let targetDescription = '';
    let dbJobId = null;

    // 2. If applying to a specific job, fetch details
    if (appliedJobId) {
      const { data: job, error: jobError } = await supabase
        .from('jobs')
        .select('id, title, description')
        .eq('id', appliedJobId)
        .single();

      if (!jobError && job) {
        targetTitle = job.title;
        targetDescription = job.description;
        dbJobId = job.id;
      }
    }

    // 3. Generate questions using Gemini
    const studentSkills = student.skills || ['Software Engineering'];
    const aiQuestions = await generateInterviewQuestions(studentSkills, targetTitle, targetDescription);

    // Format questions array for DB storage
    const questionsAndAnswers = aiQuestions.questions.map(q => ({
      id: q.id,
      question: q.question,
      type: q.type,
      focus: q.focus,
      answer: ''
    }));

    // 4. Save interview session in Supabase mock_interviews
    const { data: session, error: dbError } = await supabase
      .from('mock_interviews')
      .insert({
        student_id: studentId,
        job_id: dbJobId,
        questions_and_answers: questionsAndAnswers,
        overall_score: 0.0
      })
      .select()
      .single();

    if (dbError) throw dbError;

    res.status(201).json({
      message: 'Mock interview session generated successfully.',
      sessionId: session.id,
      questions: questionsAndAnswers.map(q => ({ id: q.id, question: q.question, type: q.type, focus: q.focus }))
    });
  } catch (error) {
    console.error('[startMockInterview Error]:', error);
    res.status(500).json({ error: error.message || 'Failed to initialize mock interview.' });
  }
};

/**
 * Submit answers for a mock interview session.
 * Evaluates performance and scores technical, communication, and problem-solving skills.
 */
export const submitInterviewAnswers = async (req, res) => {
  try {
    const studentId = req.user.id;
    const { sessionId, answers } = req.body; // answers is array of { id, answer }

    if (!sessionId || !answers || !Array.isArray(answers)) {
      return res.status(400).json({ error: 'Please supply a sessionId and answers array.' });
    }

    // 1. Fetch current interview details
    const { data: session, error: sessionError } = await supabase
      .from('mock_interviews')
      .select('*')
      .eq('id', sessionId)
      .eq('student_id', studentId)
      .single();

    if (sessionError || !session) {
      return res.status(404).json({ error: 'Mock interview session not found.' });
    }

    // 2. Map answers onto questions
    const updatedQAs = session.questions_and_answers.map(q => {
      const candidateAns = answers.find(a => a.id === q.id);
      return {
        ...q,
        answer: candidateAns ? candidateAns.answer : 'No answer provided.'
      };
    });

    // 3. Format evaluations payload for Gemini
    const evaluationPayload = updatedQAs.map(q => ({
      question: q.question,
      answer: q.answer
    }));

    // 4. Request Gemini evaluation
    const evaluation = await evaluateInterviewAnswers(evaluationPayload);

    // 5. Update database mock_interviews row
    const { data: updatedSession, error: updateError } = await supabase
      .from('mock_interviews')
      .update({
        questions_and_answers: updatedQAs,
        ai_feedback: evaluation.ai_feedback,
        overall_score: evaluation.overall_score,
        // Store suggestions inside ai_feedback or a separate column if desired. 
        // We'll append suggestions to feedback object:
        ai_feedback: {
          ...evaluation.ai_feedback,
          suggestions: evaluation.suggestions,
          technical_knowledge: evaluation.technical_knowledge,
          communication: evaluation.communication,
          problem_solving: evaluation.problem_solving
        }
      })
      .eq('id', sessionId)
      .select()
      .single();

    if (updateError) throw updateError;

    res.status(200).json({
      message: 'Interview evaluated successfully.',
      evaluation: {
        overallScore: evaluation.overall_score,
        technicalKnowledge: evaluation.technical_knowledge,
        communication: evaluation.communication,
        problemSolving: evaluation.problem_solving,
        feedback: evaluation.ai_feedback,
        suggestions: evaluation.suggestions
      }
    });
  } catch (error) {
    console.error('[submitInterviewAnswers Error]:', error);
    res.status(500).json({ error: error.message || 'Failed to evaluate interview answers.' });
  }
};

/**
 * Retrieve user's mock interview history.
 */
export const getInterviewHistory = async (req, res) => {
  try {
    const studentId = req.user.id;

    const { data: history, error } = await supabase
      .from('mock_interviews')
      .select(`
        *,
        job:jobs(title, recruiter:recruiter_profiles(company_name))
      `)
      .eq('student_id', studentId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    res.status(200).json(history);
  } catch (error) {
    console.error('[getInterviewHistory Error]:', error);
    res.status(500).json({ error: 'Failed to retrieve interview history.' });
  }
};

/**
 * Generate targeted interview questions for recruiter review.
 */
export const getRecruiterInterviewQuestions = async (req, res) => {
  try {
    const { candidateName, skills, missingSkills, jobTitle } = req.body;

    if (!candidateName || !skills || !jobTitle) {
      return res.status(400).json({ error: 'Please supply candidateName, skills, and jobTitle.' });
    }

    const targetMissingSkills = missingSkills || [];
    const questionsData = await generateRecruiterQuestionsForCandidate(
      candidateName,
      skills,
      targetMissingSkills,
      jobTitle
    );

    res.status(200).json(questionsData);
  } catch (error) {
    console.error('[getRecruiterInterviewQuestions Error]:', error);
    res.status(500).json({ error: 'Failed to generate custom interview questions.' });
  }
};
