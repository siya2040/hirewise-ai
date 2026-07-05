import { supabase, supabaseAdmin } from '../config/supabase.js';
import { parsePDFText } from '../utils/pdfParser.js';
import { analyzeResume, optimizeResumeContent } from '../services/geminiService.js';
import { sendNotification } from '../utils/notifications.js';

/**
 * Fetch complete profile details for the authenticated user.
 */
export const getProfile = async (req, res) => {
  try {
    const userId = req.user.id;

    // Join profiles with student_profiles or recruiter_profiles
    const { data: baseProfile, error: baseError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (baseError || !baseProfile) {
      return res.status(404).json({ error: 'Base profile not found.' });
    }

    let detailProfile = null;

    if (baseProfile.role === 'student') {
      const { data, error } = await supabase
        .from('student_profiles')
        .select('*')
        .eq('id', userId)
        .single();
      if (!error) detailProfile = data;
    } else {
      const { data, error } = await supabase
        .from('recruiter_profiles')
        .select('*')
        .eq('id', userId)
        .single();
      if (!error) detailProfile = data;
    }

    res.status(200).json({
      ...baseProfile,
      profileDetails: detailProfile
    });
  } catch (error) {
    console.error('[getProfile Error]:', error);
    res.status(500).json({ error: 'Failed to retrieve profile data.' });
  }
};

/**
 * Update Student profile fields.
 */
export const updateStudentProfile = async (req, res) => {
  try {
    const userId = req.user.id;
    const { fullName, avatarUrl, skills, experienceYears, education, bio } = req.body;

    // 1. Update base profile details if provided
    if (fullName || avatarUrl) {
      const updateData = {};
      if (fullName) updateData.full_name = fullName;
      if (avatarUrl) updateData.avatar_url = avatarUrl;

      const { error } = await supabase
        .from('profiles')
        .update(updateData)
        .eq('id', userId);

      if (error) throw error;
    }

    // 2. Update student details
    const studentUpdate = {
      updated_at: new Date().toISOString(),
    };
    if (skills !== undefined) studentUpdate.skills = skills;
    if (experienceYears !== undefined) studentUpdate.experience_years = parseFloat(experienceYears);
    if (education !== undefined) studentUpdate.education = education;
    if (bio !== undefined) studentUpdate.bio = bio;

    const { error: studentError } = await supabase
      .from('student_profiles')
      .update(studentUpdate)
      .eq('id', userId);

    if (studentError) throw studentError;

    res.status(200).json({ message: 'Profile updated successfully.' });
  } catch (error) {
    console.error('[updateStudentProfile Error]:', error);
    res.status(500).json({ error: 'Failed to update student profile.' });
  }
};

/**
 * Process a resume uploaded to Supabase Storage:
 * 1. Download PDF bytes from storage bucket
 * 2. Parse text layout using pdf-parse
 * 3. Send text to Gemini AI for ATS scoring & gap evaluation
 * 4. Write results directly to student_profiles table
 */
export const processResumeUpload = async (req, res) => {
  try {
    const userId = req.user.id;
    const { storagePath } = req.body; // Path relative to resumes bucket, e.g. "userId/resume.pdf"

    if (!storagePath) {
      return res.status(400).json({ error: 'Missing resume storage path.' });
    }

    // Confirm that the storagePath belongs to the active user to enforce security
    if (!storagePath.startsWith(userId)) {
      return res.status(403).json({ error: 'Access denied. You can only process your own resume files.' });
    }

    // 1. Download file bytes from Supabase storage
    const { data: fileBlob, error: downloadError } = await supabaseAdmin.storage
      .from('resumes')
      .download(storagePath);

    if (downloadError || !fileBlob) {
      console.error('[Resume Download Error]:', downloadError);
      return res.status(404).json({ error: 'Could not fetch uploaded resume file from storage.' });
    }

    // 2. Parse PDF buffer into text layout
    const arrayBuffer = await fileBlob.arrayBuffer();
    const pdfBuffer = Buffer.from(arrayBuffer);
    const parsedText = await parsePDFText(pdfBuffer);

    if (!parsedText.trim()) {
      return res.status(400).json({ error: 'Resume appears to be empty or image-only scanned PDF.' });
    }

    // 3. Request Gemini ATS Score & Gap analysis
    const aiAnalysis = await analyzeResume(parsedText);

    // Get public URL or signed URL for storage
    const { data: urlData } = supabaseAdmin.storage
      .from('resumes')
      .getPublicUrl(storagePath);

    const fileUrl = urlData?.publicUrl || '';

    const parsed = aiAnalysis.parsed_profile || {};

    // 4. Update profiles table with parsed name
    if (parsed.name) {
      await supabase
        .from('profiles')
        .update({ full_name: parsed.name })
        .eq('id', userId);
    }

    // 5. Update student_profiles with parsed fields and ATS results
    const educationArray = Array.isArray(parsed.education) ? parsed.education : [];
    educationArray.push({
      type: 'metadata',
      projects: parsed.projects || '',
      certifications: parsed.certifications || ''
    });

    const { error: updateError } = await supabase
      .from('student_profiles')
      .update({
        resume_url: fileUrl,
        skills: parsed.skills || [],
        experience_years: parseFloat(parsed.experience_years) || 0.0,
        education: educationArray,
        ats_score: aiAnalysis.ats_score,
        skills_matched: aiAnalysis.skills_matched,
        skills_missing: aiAnalysis.skills_missing,
        strengths: aiAnalysis.strengths,
        weaknesses: aiAnalysis.weaknesses,
        improvement_suggestions: aiAnalysis.improvement_suggestions,
        overall_recommendation: aiAnalysis.overall_recommendation,
        updated_at: new Date().toISOString()
      })
      .eq('id', userId);

    if (updateError) throw updateError;

    // Send notifications (async, non-blocking)
    sendNotification(userId, 'Resume Uploaded', 'Your resume document has been uploaded to Supabase Storage.');
    sendNotification(userId, 'Resume Analysis Completed', `ATS Score: ${Math.round(aiAnalysis.ats_score)}% | Found ${aiAnalysis.skills_matched?.length || 0} skill matches.`);

    res.status(200).json({
      message: 'Resume analyzed and profile insights synchronized successfully.',
      insights: aiAnalysis,
      resumeUrl: fileUrl
    });
  } catch (error) {
    console.error('[processResumeUpload Error]:', error);
    res.status(500).json({ error: error.message || 'Failed to process resume analysis.' });
  }
};

/**
 * Delete own account (utilizes Supabase Admin to clear Auth tables).
 * Since public profile tables cascade on delete, they will automatically clear.
 */
export const deleteAccount = async (req, res) => {
  try {
    const userId = req.user.id;
    if (!supabaseAdmin) {
      return res.status(500).json({ error: 'Supabase admin client key is not configured.' });
    }

    // Delete user from Supabase Auth
    const { error } = await supabaseAdmin.auth.admin.deleteUser(userId);
    if (error) throw error;

    res.status(200).json({ message: 'User account successfully deleted.' });
  } catch (error) {
    console.error('[deleteAccount Error]:', error);
    res.status(500).json({ error: 'Failed to delete user account.' });
  }
};

/**
 * Update Recruiter company details.
 */
export const updateRecruiterProfile = async (req, res) => {
  try {
    const userId = req.user.id;
    const { fullName, avatarUrl, companyName, companyWebsite, designation } = req.body;

    // 1. Update base profile
    if (fullName || avatarUrl) {
      const updateData = {};
      if (fullName) updateData.full_name = fullName;
      if (avatarUrl) updateData.avatar_url = avatarUrl;
      const { error } = await supabase.from('profiles').update(updateData).eq('id', userId);
      if (error) throw error;
    }

    // 2. Update recruiter details
    const recruiterUpdate = { updated_at: new Date().toISOString() };
    if (companyName) recruiterUpdate.company_name = companyName;
    if (companyWebsite !== undefined) recruiterUpdate.company_website = companyWebsite;
    if (designation !== undefined) recruiterUpdate.designation = designation;

    const { error: recError } = await supabase
      .from('recruiter_profiles')
      .update(recruiterUpdate)
      .eq('id', userId);

    if (recError) throw recError;

    res.status(200).json({ message: 'Recruiter profile updated successfully.' });
  } catch (error) {
    console.error('[updateRecruiterProfile Error]:', error);
    res.status(500).json({ error: 'Failed to update recruiter profile.' });
  }
};

/**
 * Fetch recruiter statistics for analytics and dashboards.
 */
export const getRecruiterAnalytics = async (req, res) => {
  try {
    const recruiterId = req.user.id;

    // 1. Fetch total jobs posted by recruiter
    const { data: jobs, error: jobsErr } = await supabase
      .from('jobs')
      .select('id, status, requirements')
      .eq('recruiter_id', recruiterId);

    if (jobsErr) throw jobsErr;

    const defaultStats = {
      totalJobs: 0,
      activeJobs: 0,
      totalApplicants: 0,
      shortlisted: 0,
      interviewing: 0,
      avgAtsScore: 0,
      funnel: { applied: 0, screening: 0, shortlisted: 0, interviewing: 0, selected: 0, rejected: 0 },
      statusDistribution: {}
    };

    if (jobs.length === 0) {
      return res.status(200).json(defaultStats);
    }

    const jobIds = jobs.map(j => j.id);

    // 2. Fetch applications submitted to recruiter's jobs
    const { data: apps, error: appsErr } = await supabase
      .from('applications')
      .select('id, status, ai_match_score')
      .in('job_id', jobIds);

    if (appsErr) throw appsErr;

    const totalJobs = jobs.length;
    const activeJobs = jobs.filter(j => j.status === 'open').length;
    const totalApplicants = apps.length;

    // Group by status
    const statusCounts = apps.reduce((acc, app) => {
      acc[app.status] = (acc[app.status] || 0) + 1;
      return acc;
    }, {});

    const shortlisted = statusCounts['shortlisted'] || 0;
    const interviewing = statusCounts['interviewing'] || 0;

    // Avg match score
    const totalMatchScore = apps.reduce((sum, app) => sum + (parseFloat(app.ai_match_score) || 0), 0);
    const avgAtsScore = totalApplicants > 0 ? (totalMatchScore / totalApplicants) : 0;

    // Compile funnel stage lists
    const funnel = {
      applied: statusCounts['applied'] || 0,
      screening: statusCounts['screening'] || 0,
      shortlisted: shortlisted,
      interviewing: interviewing,
      selected: statusCounts['offered'] || 0,
      rejected: statusCounts['rejected'] || 0
    };

    res.status(200).json({
      totalJobs,
      activeJobs,
      totalApplicants,
      shortlisted,
      interviewing,
      avgAtsScore,
      funnel,
      statusDistribution: statusCounts
    });
  } catch (error) {
    console.error('[getRecruiterAnalytics Error]:', error);
    res.status(500).json({ error: 'Failed to compute recruiter analytics.' });
  }
};

/**
 * Optimize candidate resume text (suggest rewrites, formatting, keywords).
 * POST /api/profile/resume/optimize
 */
export const optimizeResume = async (req, res) => {
  try {
    const userId = req.user.id;

    // 1. Fetch resume URL path
    const { data: student, error: fetchErr } = await supabase
      .from('student_profiles')
      .select('resume_url')
      .eq('id', userId)
      .single();

    if (fetchErr || !student || !student.resume_url) {
      return res.status(400).json({ error: 'Please upload a PDF resume document first.' });
    }

    // Parse storage path from public/signed URL
    const resumesMarker = '/resumes/';
    const index = student.resume_url.indexOf(resumesMarker);
    if (index === -1) {
      return res.status(400).json({ error: 'Invalid resume URL configuration in database.' });
    }
    const storagePath = student.resume_url.substring(index + resumesMarker.length);

    // 2. Download from storage
    const { data: fileBlob, error: downloadError } = await supabaseAdmin.storage
      .from('resumes')
      .download(storagePath);

    if (downloadError || !fileBlob) {
      return res.status(404).json({ error: 'Could not fetch resume document from storage.' });
    }

    // 3. Extract text
    const arrayBuffer = await fileBlob.arrayBuffer();
    const pdfBuffer = Buffer.from(arrayBuffer);
    const parsedText = await parsePDFText(pdfBuffer);

    if (!parsedText.trim()) {
      return res.status(400).json({ error: 'Parsed resume text is empty.' });
    }

    // 4. Request Gemini optimizations
    const suggestions = await optimizeResumeContent(parsedText);

    res.status(200).json({ suggestions });
  } catch (error) {
    console.error('[optimizeResume Error]:', error);
    res.status(500).json({ error: 'Failed to generate resume optimizations.' });
  }
};

