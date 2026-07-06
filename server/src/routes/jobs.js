import { Router } from 'express';
import { supabase, supabaseAdmin } from '../config/supabase.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { generateJobDescriptionText } from '../services/geminiService.js';

const router = Router();

/**
 * Fetch all job listings with filters.
 * GET /api/jobs
 */
router.get('/', async (req, res) => {
  try {
    const { search, location, type, skills, recruiterId, includeClosed } = req.query;

    let query = supabaseAdmin
      .from('jobs')
      .select('*, recruiter:recruiter_profiles(company_name, company_website)');

    // Only filter by open status if includeClosed is not explicitly 'true'
    if (includeClosed !== 'true') {
      query = query.eq('status', 'open');
    }

    // Filter by specific recruiter if requested
    if (recruiterId) {
      query = query.eq('recruiter_id', recruiterId);
    }

    // Apply Search Filter (ILIKE title or description)
    if (search) {
      query = query.or(`title.ilike.%${search}%,description.ilike.%${search}%`);
    }

    // Apply Location Filter
    if (location) {
      query = query.ilike('location', `%${location}%`);
    }

    // Apply Job Type (Full-time, Part-time, Remote, Internship)
    if (type) {
      query = query.eq('job_type', type);
    }

    // Apply Skills Filter (PostgreSQL overlapping array && operator)
    if (skills) {
      const skillsArray = skills.split(',');
      query = query.contains('requirements', skillsArray);
    }

    const { data: jobs, error } = await query.order('created_at', { ascending: false });

    if (error) throw error;
    res.status(200).json(jobs);
  } catch (error) {
    console.error('[GET jobs Error]:', error);
    res.status(500).json({ error: 'Failed to retrieve job listings.' });
  }
});

/**
 * Fetch detailed view of a single job.
 * GET /api/jobs/:id
 */
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { data: job, error } = await supabaseAdmin
      .from('jobs')
      .select('*, recruiter:recruiter_profiles(company_name, company_website, designation)')
      .eq('id', id)
      .single();

    if (error || !job) {
      return res.status(404).json({ error: 'Job opening not found.' });
    }

    res.status(200).json(job);
  } catch (error) {
    console.error('[GET job detail Error]:', error);
    res.status(500).json({ error: 'Failed to retrieve job details.' });
  }
});

/**
 * Create a new job opening (Recruiter restricted).
 * POST /api/jobs
 */
router.post('/', requireAuth, requireRole(['recruiter']), async (req, res) => {
  try {
    const recruiterId = req.user.id;
    const { title, description, requirements, salaryRange, location, jobType } = req.body;

    if (!title || !description || !requirements || !location || !jobType) {
      return res.status(400).json({ error: 'Please supply all required job details.' });
    }

    const { data: job, error } = await supabaseAdmin
      .from('jobs')
      .insert({
        recruiter_id: recruiterId,
        title,
        description,
        requirements,
        salary_range: salaryRange || null,
        location,
        job_type: jobType,
        status: 'open'
      })
      .select()
      .single();

    if (error) throw error;
    res.status(201).json(job);
  } catch (error) {
    console.error('[POST job Error]:', error);
    res.status(500).json({ error: 'Failed to create job posting.' });
  }
});

/**
 * AI-Assisted Job Description Generator (Recruiter only).
 * POST /api/jobs/generate-description
 */
router.post('/generate-description', requireAuth, requireRole(['recruiter']), async (req, res) => {
  try {
    const { title, requirements, experience, location, jobType, salary } = req.body;
    if (!title || !requirements || !experience || !location || !jobType) {
      return res.status(400).json({ error: 'Please supply title, requirements, experience, location, and jobType.' });
    }

    const description = await generateJobDescriptionText(title, requirements, experience, location, jobType, salary);
    res.status(200).json({ description });
  } catch (error) {
    console.error('[AI Job Description Error]:', error);
    res.status(500).json({ error: 'Failed to generate job description with AI.' });
  }
});

/**
 * Update an existing job opening (Recruiter restricted).
 * PUT /api/jobs/:id
 */
router.put('/:id', requireAuth, requireRole(['recruiter']), async (req, res) => {
  try {
    const recruiterId = req.user.id;
    const { id } = req.params;
    const { title, description, requirements, salaryRange, location, jobType } = req.body;

    // Verify ownership
    const { data: existingJob, error: checkError } = await supabaseAdmin
      .from('jobs')
      .select('recruiter_id')
      .eq('id', id)
      .single();

    if (checkError || !existingJob) {
      return res.status(404).json({ error: 'Job opening not found.' });
    }

    if (existingJob.recruiter_id !== recruiterId) {
      return res.status(403).json({ error: 'Unauthorized to modify this job posting.' });
    }

    const { data: job, error } = await supabaseAdmin
      .from('jobs')
      .update({
        title,
        description,
        requirements,
        salary_range: salaryRange || null,
        location,
        job_type: jobType,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    res.status(200).json(job);
  } catch (error) {
    console.error('[PUT job Error]:', error);
    res.status(500).json({ error: 'Failed to update job posting.' });
  }
});

/**
 * Update job posting status (close/reopen) (Recruiter restricted).
 * PATCH /api/jobs/:id/status
 */
router.patch('/:id/status', requireAuth, requireRole(['recruiter']), async (req, res) => {
  try {
    const recruiterId = req.user.id;
    const { id } = req.params;
    const { status } = req.body; // 'open' or 'closed'

    if (!status || !['open', 'closed'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status value. Must be open or closed.' });
    }

    // Verify ownership
    const { data: existingJob, error: checkError } = await supabaseAdmin
      .from('jobs')
      .select('recruiter_id')
      .eq('id', id)
      .single();

    if (checkError || !existingJob) {
      return res.status(404).json({ error: 'Job opening not found.' });
    }

    if (existingJob.recruiter_id !== recruiterId) {
      return res.status(403).json({ error: 'Unauthorized to modify status of this job posting.' });
    }

    const { data: job, error } = await supabaseAdmin
      .from('jobs')
      .update({
        status,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    res.status(200).json(job);
  } catch (error) {
    console.error('[PATCH job status Error]:', error);
    res.status(500).json({ error: 'Failed to toggle job status.' });
  }
});

/**
 * Delete a job posting (Recruiter restricted).
 * DELETE /api/jobs/:id
 */
router.delete('/:id', requireAuth, requireRole(['recruiter']), async (req, res) => {
  try {
    const recruiterId = req.user.id;
    const { id } = req.params;

    // Verify ownership
    const { data: existingJob, error: checkError } = await supabaseAdmin
      .from('jobs')
      .select('recruiter_id')
      .eq('id', id)
      .single();

    if (checkError || !existingJob) {
      return res.status(404).json({ error: 'Job opening not found.' });
    }

    if (existingJob.recruiter_id !== recruiterId) {
      return res.status(403).json({ error: 'Unauthorized to delete this job posting.' });
    }

    const { error } = await supabaseAdmin
      .from('jobs')
      .delete()
      .eq('id', id);

    if (error) throw error;
    res.status(200).json({ message: 'Job posting deleted successfully.' });
  } catch (error) {
    console.error('[DELETE job Error]:', error);
    res.status(500).json({ error: 'Failed to delete job posting.' });
  }
});

export default router;
