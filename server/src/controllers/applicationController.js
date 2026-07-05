import { supabase, supabaseAdmin } from '../config/supabase.js';
import { parsePDFText } from '../utils/pdfParser.js';
import { matchResumeToJob } from '../services/geminiService.js';
import { sendNotification } from '../utils/notifications.js';

/**
 * Submit a job application.
 * Computes job-specific AI alignment score on submit.
 */
export const submitApplication = async (req, res) => {
  try {
    const studentId = req.user.id;
    const { jobId } = req.body;

    if (!jobId) {
      return res.status(400).json({ error: 'Missing jobId parameter.' });
    }

    // 1. Check for duplicate application
    const { data: existingApp } = await supabaseAdmin
      .from('applications')
      .select('id')
      .eq('job_id', jobId)
      .eq('student_id', studentId)
      .maybeSingle();

    if (existingApp) {
      return res.status(400).json({ error: 'You have already submitted an application for this position.' });
    }

    // 2. Fetch student profile to get resume URL
    const { data: student, error: studentError } = await supabaseAdmin
      .from('student_profiles')
      .select('resume_url')
      .eq('id', studentId)
      .single();

    if (studentError || !student || !student.resume_url) {
      return res.status(400).json({ 
        error: 'Please upload a professional resume PDF in the Career Portal before applying.' 
      });
    }

    // 3. Fetch target job details
    const { data: job, error: jobError } = await supabaseAdmin
      .from('jobs')
      .select('*')
      .eq('id', jobId)
      .single();

    if (jobError || !job) {
      return res.status(404).json({ error: 'Target job opening not found.' });
    }

    // 4. Download resume PDF from Storage to compute specific match score
    // Extract storage path from resume URL
    // Public URL format: .../storage/v1/object/public/resumes/userId/resume.pdf
    // Private URL path in bucket: userId/resume.pdf
    const storagePath = `${studentId}/resume.pdf`;

    const { data: fileBlob, error: downloadError } = await supabaseAdmin.storage
      .from('resumes')
      .download(storagePath);

    if (downloadError || !fileBlob) {
      console.error('[Application Download Resume Error]:', downloadError);
      return res.status(404).json({ error: 'Failed to access your resume file from storage.' });
    }

    const arrayBuffer = await fileBlob.arrayBuffer();
    const pdfBuffer = Buffer.from(arrayBuffer);
    const resumeText = await parsePDFText(pdfBuffer);

    // 5. Run Gemini AI alignment analyzer
    const matchAnalysis = await matchResumeToJob(resumeText, job);

    // 6. Save job application record
    const { data: application, error: appError } = await supabaseAdmin
      .from('applications')
      .insert({
        job_id: jobId,
        student_id: studentId,
        resume_snapshot_url: student.resume_url,
        status: 'applied',
        ai_match_score: matchAnalysis.ai_match_score,
        ai_match_explanation: matchAnalysis.ai_match_explanation,
        ai_skills_matched: matchAnalysis.ai_skills_matched,
        ai_skills_missing: matchAnalysis.ai_skills_missing,
        ai_recommendation: matchAnalysis.ai_recommendation
      })
      .select(`
        *,
        job:jobs(
          title,
          location,
          job_type,
          recruiter:recruiter_profiles(company_name)
        )
      `)
      .single();

    if (appError) throw appError;

    // Send notifications (async, non-blocking)
    sendNotification(studentId, 'Application Submitted', `Your application for "${job.title}" has been submitted.`);
    sendNotification(job.recruiter_id, 'New Applicant Received', `"${req.user.full_name || 'A candidate'}" has applied for "${job.title}". Match score: ${Math.round(application.ai_match_score)}%.`);

    res.status(201).json({
      message: 'Application submitted and analyzed successfully.',
      application
    });
  } catch (error) {
    console.error('[submitApplication Error]:', error);
    res.status(500).json({ error: error.message || 'Failed to submit application.' });
  }
};

/**
 * Fetch list of applications submitted by the authenticated student.
 */
export const getStudentApplications = async (req, res) => {
  try {
    const studentId = req.user.id;

    const { data: apps, error } = await supabaseAdmin
      .from('applications')
      .select(`
        *,
        job:jobs(
          title,
          location,
          job_type,
          recruiter:recruiter_profiles(company_name, company_website)
        )
      `)
      .eq('student_id', studentId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    res.status(200).json(apps);
  } catch (error) {
    console.error('[getStudentApplications Error]:', error);
    res.status(500).json({ error: 'Failed to retrieve applications.' });
  }
};

/**
 * Fetch all applications submitted to jobs posted by the recruiter.
 */
export const getRecruiterApplications = async (req, res) => {
  try {
    const recruiterId = req.user.id;

    const { data: apps, error } = await supabaseAdmin
      .from('applications')
      .select(`
        *,
        student:student_profiles(
          *,
          profileDetails:profiles(*)
        ),
        job:jobs!inner(*)
      `)
      .eq('job.recruiter_id', recruiterId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    
    // Format response so frontend gets clear nested details
    res.status(200).json(apps);
  } catch (error) {
    console.error('[getRecruiterApplications Error]:', error);
    res.status(500).json({ error: 'Failed to retrieve applicant details.' });
  }
};

/**
 * Update the recruitment stage status of a candidate application.
 */
export const updateApplicationStatus = async (req, res) => {
  try {
    const recruiterId = req.user.id;
    const appId = req.params.id;
    const { status } = req.body;

    if (!status) {
      return res.status(400).json({ error: 'Missing status parameter.' });
    }

    // 1. Verify that the recruiter owns the job associated with this application
    const { data: appDetails, error: appError } = await supabaseAdmin
      .from('applications')
      .select('id, job_id, job:jobs(recruiter_id)')
      .eq('id', appId)
      .single();

    if (appError || !appDetails) {
      return res.status(404).json({ error: 'Job application not found.' });
    }

    if (appDetails.job?.recruiter_id !== recruiterId) {
      return res.status(403).json({ error: 'Access Denied. You cannot modify applicants for other recruiters.' });
    }

    // 2. Perform database update
    const { data: updatedApp, error: updateErr } = await supabaseAdmin
      .from('applications')
      .update({ status })
      .eq('id', appId)
      .select(`
        *,
        student:student_profiles(*, profileDetails:profiles(*)),
        job:jobs(*)
      `)
      .single();

    if (updateErr) throw updateErr;

    // Send notifications based on updated status (async)
    const jobTitle = updatedApp.job?.title || 'the position';
    const studentId = updatedApp.student_id;
    if (status === 'screening') {
      sendNotification(studentId, 'Application Screening', `Your application for "${jobTitle}" has progressed to the screening stage.`);
    } else if (status === 'shortlisted') {
      sendNotification(studentId, 'Application Shortlisted', `Congratulations! You have been shortlisted for "${jobTitle}".`);
    } else if (status === 'interviewing') {
      sendNotification(studentId, 'Interview Scheduled', `An interview has been scheduled for "${jobTitle}".`);
    } else if (status === 'offered') {
      sendNotification(studentId, 'Offer Received!', `Congratulations! You have received a formal offer for "${jobTitle}".`);
    } else if (status === 'rejected') {
      sendNotification(studentId, 'Application Update', `Your application for "${jobTitle}" was not selected.`);
    }

    res.status(200).json({
      message: 'Candidate application status updated successfully.',
      application: updatedApp
    });
  } catch (error) {
    console.error('[updateApplicationStatus Error]:', error);
    res.status(500).json({ error: 'Failed to update application status.' });
  }
};
