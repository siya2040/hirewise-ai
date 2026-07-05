import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { apiFetch } from '../../lib/api';
import { 
  Sparkles, 
  Briefcase, 
  FileText, 
  Upload, 
  Search, 
  CheckCircle2, 
  Activity, 
  Calendar, 
  ShieldCheck 
} from 'lucide-react';

export const PortalDashboard = () => {
  const { profile, refreshProfile } = useAuth();
  const navigate = useNavigate();

  const [applications, setApplications] = useState([]);
  const [interviews, setInterviews] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadDashboardData = async () => {
      try {
        await refreshProfile();
        
        // Fetch applications submitted by student
        const apps = await apiFetch('/applications');
        setApplications(apps);

        // Fetch interview list
        const interviewHistory = await apiFetch('/ai/mock-interview/history');
        setInterviews(interviewHistory);
      } catch (error) {
        console.error('Failed to load portal dashboard stats:', error);
      } finally {
        setLoading(false);
      }
    };
    loadDashboardData();
  }, []);

  // Compute profile completion percentage
  const calculateCompletion = () => {
    if (!profile) return 0;
    const details = profile.profileDetails || {};
    let score = 0;
    
    if (profile.full_name) score += 15;
    if (profile.avatar_url) score += 10;
    if (details.bio) score += 15;
    if (details.skills && details.skills.length > 0) score += 20;
    if (details.education && details.education.length > 0) score += 20;
    if (details.experience_years > 0) score += 10;
    if (details.resume_url) score += 10;
    
    return score;
  };

  const profileCompletion = calculateCompletion();
  const atsScore = profile?.profileDetails?.ats_score || 0;
  const totalApps = applications.length;
  const activeApps = applications.filter(a => a.status !== 'rejected' && a.status !== 'offered').length;
  const scheduledInterviews = applications.filter(a => a.status === 'interviewing').length;

  if (loading) {
    return (
      <div className="flex-1 flex flex-col justify-center items-center py-20 space-y-4">
        <div className="w-12 h-12 rounded-full border-4 border-dark-border border-t-brand-500 animate-spin"></div>
        <p className="text-dark-muted font-display text-sm tracking-wide">Syncing Career Portal...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 text-left animate-in fade-in duration-300">
      {/* 1. WELCOME SECTION */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-display font-extrabold text-white tracking-tight">
            Welcome back, {profile?.full_name || 'Scholar'} 🎓
          </h2>
          <p className="text-gray-400 text-sm mt-1">
            Analyze your skill alignment, practice mock technical screens, and apply to premium roles.
          </p>
        </div>
        <div className="flex space-x-2">
          <Link
            to="/jobs"
            className="bg-brand-600 hover:bg-brand-700 text-white font-bold px-5 py-2.5 rounded-xl text-sm transition-all shadow-lg shadow-brand-600/10"
          >
            Find Opportunities
          </Link>
        </div>
      </div>

      {/* 2. STATS & ANALYTICS PANELS */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {/* Profile Completion Card */}
        <div className="bg-dark-card border border-dark-border p-6 rounded-2xl space-y-3">
          <p className="text-xs text-dark-muted font-bold uppercase tracking-wider">Profile Setup</p>
          <div className="flex items-center justify-between">
            <h4 className="text-2xl font-display font-extrabold text-white">{profileCompletion}%</h4>
            <span className="text-[10px] bg-brand-500/10 text-brand-400 px-2 py-0.5 rounded-full font-bold">
              {profileCompletion === 100 ? 'Completed' : 'Building'}
            </span>
          </div>
          <div className="w-full bg-dark-border h-2 rounded-full overflow-hidden">
            <div 
              className="bg-gradient-to-r from-brand-500 to-accent-purple h-full rounded-full transition-all duration-500"
              style={{ width: `${profileCompletion}%` }}
            ></div>
          </div>
        </div>

        {/* ATS Score Card */}
        <div className="bg-dark-card border border-dark-border p-6 rounded-2xl space-y-2 flex flex-col justify-between">
          <p className="text-xs text-dark-muted font-bold uppercase tracking-wider">Latest ATS Rating</p>
          <div className="flex items-center space-x-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-display font-extrabold text-sm ${
              atsScore >= 80 ? 'bg-emerald-500/10 text-emerald-400' :
              atsScore >= 60 ? 'bg-yellow-500/10 text-yellow-400' :
              atsScore > 0 ? 'bg-red-500/10 text-red-400' : 'bg-dark-border text-gray-500'
            }`}>
              {atsScore > 0 ? `${Math.round(atsScore)}` : 'N/A'}
            </div>
            <div>
              <p className="text-sm font-semibold text-white">
                {atsScore >= 80 ? 'Strong Match' : atsScore >= 60 ? 'Decent Fit' : atsScore > 0 ? 'Needs Work' : 'No Resume'}
              </p>
              <p className="text-[10px] text-dark-muted">Verified by Gemini AI Scanner</p>
            </div>
          </div>
        </div>

        {/* Total Applications */}
        <div className="bg-dark-card border border-dark-border p-6 rounded-2xl space-y-2">
          <p className="text-xs text-dark-muted font-bold uppercase tracking-wider">Applications</p>
          <h4 className="text-3xl font-display font-extrabold text-white">{totalApps}</h4>
          <p className="text-[10px] text-dark-muted">Submitted across all vacancies</p>
        </div>

        {/* Scheduled Interviews */}
        <div className="bg-dark-card border border-dark-border p-6 rounded-2xl space-y-2">
          <p className="text-xs text-dark-muted font-bold uppercase tracking-wider">Interviews</p>
          <h4 className="text-3xl font-display font-extrabold text-white text-emerald-400">{scheduledInterviews}</h4>
          <p className="text-[10px] text-dark-muted">Requires technical mock prep</p>
        </div>
      </div>

      {/* 3. QUICK ACTIONS GRID */}
      <div>
        <h3 className="text-lg font-display font-bold text-white mb-4">Quick Workflows</h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Link
            to="/portal/resume-insights"
            className="bg-dark-card border border-dark-border hover:border-brand-500/30 p-6 rounded-2xl transition-all duration-200 group text-left"
          >
            <div className="w-10 h-10 rounded-xl bg-brand-500/10 flex items-center justify-center text-brand-400 group-hover:bg-brand-500/20 mb-4">
              <Upload size={18} />
            </div>
            <h4 className="text-sm font-bold text-white group-hover:text-brand-400 transition-colors">Upload Resume</h4>
            <p className="text-xs text-dark-muted mt-1 leading-relaxed">Submit your resume PDF for instant AI parser scanning.</p>
          </Link>

          <Link
            to="/jobs"
            className="bg-dark-card border border-dark-border hover:border-brand-500/30 p-6 rounded-2xl transition-all duration-200 group text-left"
          >
            <div className="w-10 h-10 rounded-xl bg-teal-500/10 flex items-center justify-center text-teal-400 group-hover:bg-teal-500/20 mb-4">
              <Search size={18} />
            </div>
            <h4 className="text-sm font-bold text-white group-hover:text-teal-400 transition-colors">Browse Jobs</h4>
            <p className="text-xs text-dark-muted mt-1 leading-relaxed">Search open positions matching your domain skillset.</p>
          </Link>

          <Link
            to="/portal/resume-insights"
            className="bg-dark-card border border-dark-border hover:border-brand-500/30 p-6 rounded-2xl transition-all duration-200 group text-left"
          >
            <div className="w-10 h-10 rounded-xl bg-accent-purple/10 flex items-center justify-center text-accent-purple group-hover:bg-accent-purple/20 mb-4">
              <Sparkles size={18} />
            </div>
            <h4 className="text-sm font-bold text-white group-hover:text-accent-purple transition-colors">Resume Insights</h4>
            <p className="text-xs text-dark-muted mt-1 leading-relaxed">Check matched keywords and domain skill gaps.</p>
          </Link>

          <Link
            to="/portal/mock-interview"
            className="bg-dark-card border border-dark-border hover:border-brand-500/30 p-6 rounded-2xl transition-all duration-200 group text-left"
          >
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-400 group-hover:bg-emerald-500/20 mb-4">
              <FileText size={18} />
            </div>
            <h4 className="text-sm font-bold text-white group-hover:text-emerald-400 transition-colors">Mock Interview</h4>
            <p className="text-xs text-dark-muted mt-1 leading-relaxed">Practice coding technical questions generated by AI.</p>
          </Link>
        </div>
      </div>

      {/* 4. RECENT ACTIVITY & INTERVIEW CARD LIST */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Applications List */}
        <div className="bg-dark-card border border-dark-border rounded-2xl p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-dark-border pb-4">
            <h4 className="font-display font-bold text-white flex items-center space-x-2">
              <Activity size={18} className="text-brand-400" />
              <span>Recent Applications</span>
            </h4>
            <Link to="/portal/applications" className="text-xs text-brand-400 hover:underline">
              View all
            </Link>
          </div>

          {applications.length === 0 ? (
            <div className="py-8 text-center text-dark-muted text-sm">
              You haven't submitted any job applications yet.
            </div>
          ) : (
            <div className="space-y-4">
              {applications.slice(0, 3).map((app) => (
                <div key={app.id} className="flex items-center justify-between border-b border-dark-border/40 pb-3 last:border-0 last:pb-0">
                  <div>
                    <p className="text-sm font-bold text-white">{app.job?.title}</p>
                    <p className="text-xs text-dark-muted mt-0.5">{app.job?.recruiter?.company_name}</p>
                  </div>
                  <div className="text-right">
                    <span className="inline-block text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider bg-brand-500/10 text-brand-400">
                      {app.status}
                    </span>
                    <p className="text-[10px] text-dark-muted mt-1">Match: {Math.round(app.ai_match_score)}%</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Interviews list */}
        <div className="bg-dark-card border border-dark-border rounded-2xl p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-dark-border pb-4">
            <h4 className="font-display font-bold text-white flex items-center space-x-2">
              <Calendar size={18} className="text-accent-purple" />
              <span>AI Mock Interviews</span>
            </h4>
            <Link to="/portal/mock-interview" className="text-xs text-brand-400 hover:underline">
              Start new
            </Link>
          </div>

          {interviews.length === 0 ? (
            <div className="py-8 text-center text-dark-muted text-sm">
              No interview sessions completed. Start mock technical screens to prepare.
            </div>
          ) : (
            <div className="space-y-4">
              {interviews.slice(0, 3).map((session) => (
                <div key={session.id} className="flex items-center justify-between border-b border-dark-border/40 pb-3 last:border-0 last:pb-0">
                  <div>
                    <p className="text-sm font-bold text-white">Mock Interview Session</p>
                    <p className="text-xs text-dark-muted mt-0.5">
                      {new Date(session.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <div>
                    <span className="text-sm font-display font-extrabold text-emerald-400">
                      Score: {Math.round(session.overall_score)}/100
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PortalDashboard;
