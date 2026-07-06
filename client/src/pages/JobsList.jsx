import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { apiFetch } from '../lib/api';
import { 
  Briefcase, 
  MapPin, 
  DollarSign, 
  Calendar, 
  Sparkles, 
  Search, 
  Filter, 
  AlertCircle,
  CheckCircle
} from 'lucide-react';

// Markdown Helper Functions

const formatDescription = (text) => {
  if (!text) return null;

  const lines = text.split('\n');

  return (
    <div className="space-y-2.5">
      {lines.map((line, idx) => {
        let trimmed = line.trim();
        if (!trimmed) return null;

        if (trimmed === '---') {
          return <hr key={idx} className="border-dark-border/40 my-3" />;
        }

        if (trimmed.startsWith('# ')) {
          return <h4 key={idx} className="text-sm font-bold text-white mt-3 mb-1">{trimmed.substring(2)}</h4>;
        }
        if (trimmed.startsWith('## ')) {
          return <h5 key={idx} className="text-xs font-bold text-white mt-3 mb-1">{trimmed.substring(3)}</h5>;
        }

        let isBullet = false;
        if (trimmed.startsWith('* ') || trimmed.startsWith('- ')) {
          trimmed = trimmed.substring(2);
          isBullet = true;
        }

        const parts = [];
        const boldRegex = /\*\*([^*]+)\*\*/g;
        let match;
        let lastIndex = 0;

        while ((match = boldRegex.exec(trimmed)) !== null) {
          const index = match.index;
          if (index > lastIndex) {
            parts.push(trimmed.substring(lastIndex, index));
          }
          parts.push(<strong key={index} className="font-semibold text-white">{match[1]}</strong>);
          lastIndex = boldRegex.lastIndex;
        }

        if (lastIndex < trimmed.length) {
          parts.push(trimmed.substring(lastIndex));
        }

        const content = parts.length > 0 ? parts : trimmed;

        if (isBullet) {
          return (
            <div key={idx} className="flex items-start space-x-2 pl-2">
              <span className="text-brand-400 mt-1 shrink-0">•</span>
              <span>{content}</span>
            </div>
          );
        }

        return <p key={idx}>{content}</p>;
      })}
    </div>
  );
};

export const JobsList = () => {
  const { user, userRole } = useAuth();
  const navigate = useNavigate();

  // State
  const [jobs, setJobs] = useState([]);
  const [appliedJobIds, setAppliedJobIds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [applyLoading, setApplyLoading] = useState(null); // stores jobId being applied to
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [expandedJobs, setExpandedJobs] = useState({});

  const toggleExpandJob = (jobId) => {
    setExpandedJobs(prev => ({
      ...prev,
      [jobId]: !prev[jobId]
    }));
  };

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [locationFilter, setLocationFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');

  const loadJobsData = async () => {
    setLoading(true);
    try {
      // Build query string
      const params = new URLSearchParams();
      if (searchTerm) params.append('search', searchTerm);
      if (locationFilter) params.append('location', locationFilter);
      if (typeFilter) params.append('type', typeFilter);

      const jobList = await apiFetch(`/jobs?${params.toString()}`);
      setJobs(jobList);

      // Fetch user's applications if logged in as student
      if (user && userRole === 'student') {
        const apps = await apiFetch('/applications');
        setAppliedJobIds(apps.map(a => a.job_id));
      }
    } catch (err) {
      console.error('Failed to retrieve jobs:', err);
      setErrorMsg('Failed to sync job openings from database.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadJobsData();
  }, [user, userRole]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    loadJobsData();
  };

  const handleApply = async (jobId) => {
    if (!user) {
      navigate('/login');
      return;
    }

    if (userRole === 'recruiter') {
      alert('Recruiters cannot apply for jobs. Please register or log in as a student.');
      return;
    }

    setApplyLoading(jobId);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      await apiFetch('/applications', {
        method: 'POST',
        body: JSON.stringify({ jobId })
      });

      setSuccessMsg('Applied successfully! AI match scoring complete.');
      // Add to local state
      setAppliedJobIds([...appliedJobIds, jobId]);
      
      // Auto clear success msg
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (error) {
      console.error('[Apply Job Error]:', error.message);
      setErrorMsg(error.message || 'Failed to submit application. Check if you have uploaded a resume.');
    } finally {
      setApplyLoading(null);
    }
  };

  return (
    <div className="min-h-screen bg-dark-deep relative overflow-hidden flex flex-col justify-between">
      {/* Decorative Glow */}
      <div className="absolute top-[10%] left-[-15%] w-[60vw] h-[60vw] bg-brand-500/10 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute bottom-[20%] right-[-15%] w-[60vw] h-[60vw] bg-accent-purple/10 rounded-full blur-[140px] pointer-events-none" />

      {/* Header */}
      <header className="w-full max-w-7xl mx-auto px-6 h-20 flex items-center justify-between z-10 relative">
        <Link to="/" className="flex items-center space-x-2.5">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-brand-600 to-accent-purple flex items-center justify-center shadow-lg">
            <span className="font-display font-extrabold text-white text-xl">H</span>
          </div>
          <span className="font-display font-bold text-2xl text-white tracking-tight">
            HireWise <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-400 to-accent-purple font-extrabold">AI</span>
          </span>
        </Link>
        
        <div className="flex items-center space-x-4">
          <Link to="/" className="text-gray-400 hover:text-white transition-colors text-sm font-medium">
            Home
          </Link>
          <div className="h-4 w-px bg-dark-border"></div>
          {user ? (
            <Link 
              to={userRole === 'recruiter' ? '/recruiter/dashboard' : '/portal/dashboard'}
              className="bg-brand-600 hover:bg-brand-700 text-white px-5 py-2 rounded-xl text-sm font-bold shadow-lg transition-all"
            >
              Dashboard
            </Link>
          ) : (
            <>
              <Link to="/login" className="text-gray-400 hover:text-white transition-colors text-sm font-medium">
                Sign In
              </Link>
              <Link 
                to="/register"
                className="bg-brand-600 hover:bg-brand-700 text-white px-5 py-2.5 rounded-xl text-sm font-bold shadow-lg transition-all"
              >
                Register
              </Link>
            </>
          )}
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-5xl mx-auto w-full px-6 py-12 flex-1 relative z-10 text-left space-y-8">
        <div>
          <h1 className="font-display font-extrabold text-4xl text-white">Explore Careers</h1>
          <p className="text-gray-400 text-sm mt-1">Discover opportunities from top technology enterprises integrated with Gemini matching engines.</p>
        </div>

        {errorMsg && (
          <div className="flex items-center space-x-2 bg-red-950/20 border border-red-800/40 p-4 rounded-xl text-red-400 text-xs">
            <AlertCircle size={16} className="shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {successMsg && (
          <div className="flex items-center space-x-2 bg-emerald-950/20 border border-emerald-800/40 p-4 rounded-xl text-emerald-400 text-xs">
            <CheckCircle size={16} className="shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Filter controls bar */}
        <form onSubmit={handleSearchSubmit} className="bg-dark-card border border-dark-border p-4 rounded-2xl grid grid-cols-1 md:grid-cols-4 gap-4 items-center">
          {/* Keyword Search */}
          <div className="relative">
            <Search className="absolute left-3 top-3 text-gray-500" size={16} />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Title, description..."
              className="w-full bg-dark-bg/60 border border-dark-border focus:border-brand-500 rounded-xl py-2 pl-10 pr-4 text-xs text-white placeholder-gray-600 outline-none transition-all"
            />
          </div>

          {/* Location */}
          <div className="relative">
            <MapPin className="absolute left-3 top-3 text-gray-500" size={16} />
            <input
              type="text"
              value={locationFilter}
              onChange={(e) => setLocationFilter(e.target.value)}
              placeholder="Location..."
              className="w-full bg-dark-bg/60 border border-dark-border focus:border-brand-500 rounded-xl py-2 pl-10 pr-4 text-xs text-white placeholder-gray-600 outline-none transition-all"
            />
          </div>

          {/* Job Type Dropdown */}
          <div className="relative">
            <Filter className="absolute left-3 top-3 text-gray-500" size={16} />
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="w-full bg-dark-bg/60 border border-dark-border focus:border-brand-500 rounded-xl py-2 pl-10 pr-4 text-xs text-gray-400 outline-none transition-all appearance-none"
            >
              <option value="">All Job Types</option>
              <option value="Full-time">Full-time</option>
              <option value="Part-time">Part-time</option>
              <option value="Remote">Remote</option>
              <option value="Internship">Internship</option>
            </select>
          </div>

          {/* Action button */}
          <button 
            type="submit"
            className="w-full bg-brand-600 hover:bg-brand-700 text-white font-bold py-2 rounded-xl text-xs transition-all shadow-md shadow-brand-600/10"
          >
            Apply Filters
          </button>
        </form>

        {/* Listings view */}
        {loading ? (
          <div className="py-20 flex flex-col items-center space-y-4 text-center">
            <div className="w-10 h-10 rounded-full border-4 border-dark-border border-t-brand-500 animate-spin"></div>
            <p className="text-dark-muted text-xs">Querying open roles...</p>
          </div>
        ) : jobs.length === 0 ? (
          <div className="bg-dark-card border border-dark-border p-16 rounded-2xl text-center text-dark-muted text-sm">
            No vacancies matching your queries were found.
          </div>
        ) : (
          <div className="space-y-6">
            {jobs.map((job) => {
              const isApplied = appliedJobIds.includes(job.id);
              const isApplying = applyLoading === job.id;

              return (
                <div key={job.id} className="bg-dark-card border border-dark-border hover:border-brand-500/30 p-6 rounded-2xl transition-all duration-200 space-y-4">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div>
                      <h3 className="font-display font-bold text-xl text-white">{job.title}</h3>
                      <p className="text-brand-400 font-semibold text-sm mt-0.5">{job.recruiter?.company_name}</p>
                    </div>
                    
                    <button 
                      onClick={() => handleApply(job.id)}
                      disabled={isApplied || isApplying}
                      className={`font-bold px-6 py-2.5 rounded-xl text-sm transition-all shadow-md min-w-[120px] ${
                        isApplied 
                          ? 'bg-dark-border text-gray-500 cursor-not-allowed shadow-none border border-transparent' 
                          : 'bg-brand-600 hover:bg-brand-700 text-white shadow-brand-600/10'
                      }`}
                    >
                      {isApplying ? (
                        <span className="inline-block w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin"></span>
                      ) : isApplied ? (
                        'Applied'
                      ) : (
                        'Apply Now'
                      )}
                    </button>
                  </div>

                  <div className="relative">
                    <div 
                      className={`text-xs text-gray-300 leading-relaxed font-light pl-3.5 border-l border-dark-border/40 transition-all duration-300 relative ${
                        expandedJobs[job.id] ? '' : 'max-h-[160px] overflow-hidden'
                      }`}
                    >
                      {formatDescription(job.description)}
                      
                      {/* Fading overlay to fade out cut-off text when collapsed */}
                      {!expandedJobs[job.id] && (
                        <div className="absolute bottom-0 left-0 w-full h-12 bg-gradient-to-t from-dark-card to-transparent pointer-events-none"></div>
                      )}
                    </div>
                    
                    <button
                      onClick={() => toggleExpandJob(job.id)}
                      className="text-brand-400 hover:text-brand-300 font-semibold text-[11px] mt-2.5 transition-colors"
                    >
                      {expandedJobs[job.id] ? 'Show Less' : 'Read More'}
                    </button>
                  </div>

                  {/* Tag Details */}
                  <div className="flex flex-wrap gap-4 text-xs text-gray-400 border-t border-dark-border/30 pt-3">
                    <div className="flex items-center space-x-1">
                      <MapPin size={14} className="text-dark-muted" />
                      <span>{job.location}</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <Briefcase size={14} className="text-dark-muted" />
                      <span>{job.job_type}</span>
                    </div>
                    {job.salary_range && (
                      <div className="flex items-center space-x-1">
                        <DollarSign size={14} className="text-dark-muted" />
                        <span>{job.salary_range}</span>
                      </div>
                    )}
                    <div className="flex items-center space-x-1">
                      <Calendar size={14} className="text-dark-muted" />
                      <span>{new Date(job.created_at).toLocaleDateString()}</span>
                    </div>
                  </div>

                  {/* Skill Badges */}
                  <div className="flex flex-wrap gap-2 pt-1">
                    {job.requirements?.map((skill) => (
                      <span 
                        key={skill} 
                        className="text-[10px] font-bold text-gray-300 bg-dark-bg px-2.5 py-1 rounded-full border border-dark-border"
                      >
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="w-full border-t border-dark-border bg-dark-deep py-8 mt-12 z-10">
        <div className="max-w-7xl mx-auto px-6 text-center text-xs text-dark-muted">
          &copy; {new Date().getFullYear()} HireWise AI. All rights reserved.
        </div>
      </footer>
    </div>
  );
};

export default JobsList;
