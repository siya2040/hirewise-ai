import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { apiFetch } from '../../lib/api';
import { 
  Briefcase, 
  MapPin, 
  DollarSign, 
  Sparkles, 
  X, 
  CheckCircle2, 
  AlertCircle 
} from 'lucide-react';

export const JobPost = () => {
  const navigate = useNavigate();
  const location = useLocation();

  // Mode check
  const searchParams = new URLSearchParams(location.search);
  const jobId = searchParams.get('id');
  const isEditMode = !!jobId;

  // Form Fields
  const [title, setTitle] = useState('');
  const [locationVal, setLocationVal] = useState('');
  const [experience, setExperience] = useState('');
  const [jobType, setJobType] = useState('Full-time');
  const [salaryRange, setSalaryRange] = useState('');
  const [skills, setSkills] = useState([]);
  const [skillInput, setSkillInput] = useState('');
  const [description, setDescription] = useState('');

  // Status flags
  const [loading, setLoading] = useState(false);
  const [aiGenerating, setAiGenerating] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (isEditMode) {
      const fetchJobDetails = async () => {
        setLoading(true);
        try {
          const job = await apiFetch(`/jobs/${jobId}`);
          setTitle(job.title || '');
          setLocationVal(job.location || '');
          setExperience(job.experience || '2+ Years'); // fallback
          setJobType(job.job_type || 'Full-time');
          setSalaryRange(job.salary_range || '');
          setSkills(job.requirements || []);
          setDescription(job.description || '');
        } catch (err) {
          console.error('[Fetch Job Details Error]:', err);
          setErrorMsg('Failed to retrieve job details for editing.');
        } finally {
          setLoading(false);
        }
      };
      fetchJobDetails();
    }
  }, [jobId, isEditMode]);

  // Skill pill handlers
  const handleAddSkill = (e) => {
    e.preventDefault();
    const clean = skillInput.trim();
    if (clean && !skills.includes(clean)) {
      setSkills([...skills, clean]);
      setSkillInput('');
    }
  };

  const handleRemoveSkill = (skillToRemove) => {
    setSkills(skills.filter(s => s !== skillToRemove));
  };

  // Generate description using Gemini
  const handleGenerateAI = async () => {
    if (!title || skills.length === 0 || !locationVal || !jobType) {
      setErrorMsg('Please specify Job Title, Location, Job Type, and at least one skill first.');
      return;
    }

    setAiGenerating(true);
    setErrorMsg('');
    try {
      const response = await apiFetch('/jobs/generate-description', {
        method: 'POST',
        body: JSON.stringify({
          title,
          requirements: skills,
          experience: experience || 'Not specified',
          location: locationVal,
          jobType,
          salary: salaryRange
        })
      });

      setDescription(response.description || '');
      setSuccessMsg('AI description generated! Review and publish below.');
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err) {
      console.error('[AI Generation Error]:', err);
      setErrorMsg(err.message || 'Failed to generate job description using Gemini AI.');
    } finally {
      setAiGenerating(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg('');
    setSuccessMsg('');

    if (skills.length === 0) {
      setErrorMsg('Please supply at least one core required skill tag.');
      setLoading(false);
      return;
    }

    if (!description) {
      setErrorMsg('Job description cannot be empty.');
      setLoading(false);
      return;
    }

    try {
      const url = isEditMode ? `/jobs/${jobId}` : '/jobs';
      const method = isEditMode ? 'PUT' : 'POST';

      await apiFetch(url, {
        method,
        body: JSON.stringify({
          title,
          location: locationVal,
          jobType,
          salaryRange,
          requirements: skills,
          description
        })
      });

      setSuccessMsg(isEditMode ? 'Job posting updated successfully.' : 'Job vacancy published successfully.');
      setTimeout(() => {
        navigate('/recruiter/dashboard');
      }, 1500);
    } catch (error) {
      console.error('[Submit Job Form Error]:', error);
      setErrorMsg(error.message || 'Failed to save job posting.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 text-left animate-in fade-in duration-200 max-w-4xl">
      {/* Page Header */}
      <div>
        <h2 className="text-2xl font-display font-extrabold text-white">
          {isEditMode ? 'Modify Job Posting 💼' : 'Post New Job opening 💼'}
        </h2>
        <p className="text-gray-400 text-sm mt-1">
          {isEditMode ? 'Update job details or regenerate copy.' : 'Post vacancies and find target matches with Gemini.'}
        </p>
      </div>

      {successMsg && (
        <div className="flex items-center space-x-2 bg-emerald-950/20 border border-emerald-800/40 p-4 rounded-xl text-emerald-400 text-xs">
          <CheckCircle2 size={16} />
          <span>{successMsg}</span>
        </div>
      )}

      {errorMsg && (
        <div className="flex items-center space-x-2 bg-red-950/20 border border-red-800/40 p-4 rounded-xl text-red-400 text-xs">
          <AlertCircle size={16} />
          <span>{errorMsg}</span>
        </div>
      )}

      {loading && isEditMode ? (
        <div className="py-20 flex flex-col items-center space-y-4 text-center">
          <div className="w-10 h-10 rounded-full border-4 border-dark-border border-t-brand-500 animate-spin"></div>
          <p className="text-dark-muted text-xs">Syncing job details...</p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
          
          {/* Left Columns: Parameters */}
          <div className="lg:col-span-2 bg-dark-card border border-dark-border rounded-2xl p-6 md:p-8 space-y-6">
            <h3 className="font-display font-bold text-white text-sm border-b border-dark-border pb-2.5">
              Opening Configurations
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-[10px] text-gray-300 font-semibold uppercase tracking-wider">Job Title</label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Senior Frontend React Developer"
                  className="w-full bg-dark-bg/60 border border-dark-border focus:border-brand-500 rounded-xl py-2.5 px-4 text-xs text-white outline-none transition-all"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] text-gray-300 font-semibold uppercase tracking-wider">Location</label>
                <input
                  type="text"
                  required
                  value={locationVal}
                  onChange={(e) => setLocationVal(e.target.value)}
                  placeholder="e.g. San Francisco, CA or Remote"
                  className="w-full bg-dark-bg/60 border border-dark-border focus:border-brand-500 rounded-xl py-2.5 px-4 text-xs text-white outline-none transition-all"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] text-gray-300 font-semibold uppercase tracking-wider">Employment Type</label>
                <select
                  value={jobType}
                  onChange={(e) => setJobType(e.target.value)}
                  className="w-full bg-dark-bg/60 border border-dark-border focus:border-brand-500 rounded-xl py-2.5 px-4 text-xs text-gray-400 outline-none transition-all"
                >
                  <option value="Full-time">Full-time</option>
                  <option value="Part-time">Part-time</option>
                  <option value="Remote">Remote</option>
                  <option value="Contract">Contract</option>
                  <option value="Internship">Internship</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] text-gray-300 font-semibold uppercase tracking-wider">Salary Range (Optional)</label>
                <input
                  type="text"
                  value={salaryRange}
                  onChange={(e) => setSalaryRange(e.target.value)}
                  placeholder="e.g. $120,000 - $150,000"
                  className="w-full bg-dark-bg/60 border border-dark-border focus:border-brand-500 rounded-xl py-2.5 px-4 text-xs text-white outline-none transition-all"
                />
              </div>

              <div className="space-y-1.5 md:col-span-2">
                <label className="text-[10px] text-gray-300 font-semibold uppercase tracking-wider">Experience Level</label>
                <input
                  type="text"
                  value={experience}
                  onChange={(e) => setExperience(e.target.value)}
                  placeholder="e.g. 3+ years in production React, Junior, Senior"
                  className="w-full bg-dark-bg/60 border border-dark-border focus:border-brand-500 rounded-xl py-2.5 px-4 text-xs text-white outline-none transition-all"
                />
              </div>
            </div>

            {/* AI Generator Box */}
            <div className="space-y-3 pt-2">
              <div className="flex justify-between items-center">
                <label className="text-[10px] text-gray-300 font-semibold uppercase tracking-wider">Job Description</label>
                
                <button
                  type="button"
                  onClick={handleGenerateAI}
                  disabled={aiGenerating}
                  className="bg-brand-500/10 border border-brand-500/20 text-brand-400 hover:bg-brand-500/20 font-bold px-3 py-1.5 rounded-lg text-[10px] flex items-center space-x-1 transition-all disabled:opacity-50"
                >
                  {aiGenerating ? (
                    <span className="w-3 h-3 rounded-full border border-brand-400 border-t-transparent animate-spin mr-1"></span>
                  ) : (
                    <Sparkles size={11} className="mr-1" />
                  )}
                  <span>{aiGenerating ? 'Generating Description...' : 'Generate with AI'}</span>
                </button>
              </div>

              <textarea
                rows="10"
                required
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Publish standard parameters or click Generate with AI to write a professional copy using Gemini..."
                className="w-full bg-dark-bg/60 border border-dark-border focus:border-brand-500 rounded-xl py-3 px-4 text-xs text-white placeholder-gray-600 outline-none transition-all resize-none font-mono"
              />
            </div>

            <button
              type="submit"
              disabled={loading || aiGenerating}
              className="bg-gradient-to-r from-brand-600 to-accent-purple hover:opacity-90 disabled:opacity-50 text-white font-bold py-3 px-8 rounded-xl text-xs transition-all shadow-md"
            >
              {loading ? (
                <span className="inline-block w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin"></span>
              ) : isEditMode ? (
                'Update Job posting'
              ) : (
                'Publish Job posting'
              )}
            </button>
          </div>

          {/* Right Cards: Required Skills tagger */}
          <div className="bg-dark-card border border-dark-border rounded-2xl p-6 space-y-4">
            <h4 className="font-display font-bold text-white text-xs border-b border-dark-border pb-2.5">
              Required Core Skills
            </h4>

            {/* Input tag */}
            <div className="flex space-x-2">
              <input
                type="text"
                value={skillInput}
                onChange={(e) => setSkillInput(e.target.value)}
                placeholder="e.g. React"
                className="flex-1 bg-dark-bg/60 border border-dark-border focus:border-brand-500 rounded-xl py-2 px-3 text-xs text-white outline-none transition-all"
              />
              <button
                type="button"
                onClick={handleAddSkill}
                className="bg-brand-600 hover:bg-brand-700 text-white font-bold px-3 py-2 rounded-xl text-xs transition-all"
              >
                Add
              </button>
            </div>

            {/* Pill Container */}
            {skills.length === 0 ? (
              <p className="text-[10px] text-dark-muted italic py-2">No skill requirements specified yet.</p>
            ) : (
              <div className="flex flex-wrap gap-1.5 pt-1">
                {skills.map((skill) => (
                  <span 
                    key={skill} 
                    className="text-[9px] font-bold bg-brand-500/10 text-brand-400 px-2 py-1 rounded-lg border border-brand-500/20 flex items-center space-x-1.5"
                  >
                    <span>{skill}</span>
                    <button 
                      type="button"
                      onClick={() => handleRemoveSkill(skill)}
                      className="text-gray-400 hover:text-white"
                    >
                      <X size={8} />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

        </form>
      )}
    </div>
  );
};

export default JobPost;
