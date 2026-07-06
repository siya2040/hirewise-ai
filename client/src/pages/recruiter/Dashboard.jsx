import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { apiFetch } from '../../lib/api';
import { useAuth } from '../../context/AuthContext';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  ResponsiveContainer, 
  PieChart, 
  Pie, 
  Cell, 
  LineChart, 
  Line,
  CartesianGrid,
  Legend
} from 'recharts';
import { 
  Briefcase, 
  Users, 
  CheckCircle, 
  Calendar, 
  PlusSquare, 
  Sparkles, 
  TrendingUp, 
  BarChart4, 
  ChevronRight,
  Lock,
  Unlock,
  Edit3,
  Trash2,
  MapPin
} from 'lucide-react';

export const RecruiterDashboard = () => {
  const { profile } = useAuth();
  const [activeTab, setActiveTab] = useState('overview'); // 'overview' or 'analytics'

  // Statistics state
  const [stats, setStats] = useState(null);
  const [jobs, setJobs] = useState([]);
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(null); // jobId being modified

  // Analytics Filters
  const [selectedJobFilter, setSelectedJobFilter] = useState('all');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState('all');

  const fetchDashboardData = async () => {
    try {
      // 1. Fetch recruiter stats & analytics
      const statsData = await apiFetch('/profile/recruiter/analytics');
      setStats(statsData);

      // 2. Fetch jobs list (including closed ones for the recruiter to manage)
      const jobsList = await apiFetch(`/jobs?recruiterId=${profile?.id || ''}&includeClosed=true`);
      setJobs(jobsList);

      // 3. Fetch applications to compute local time-trends and skills charts
      const apps = await apiFetch('/applications/recruiter');
      setApplications(apps);
    } catch (err) {
      console.error('Failed to sync recruiter dashboard:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const handleToggleStatus = async (jobId, currentStatus) => {
    setActionLoading(jobId);
    try {
      const newStatus = currentStatus === 'open' ? 'closed' : 'open';
      await apiFetch(`/jobs/${jobId}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status: newStatus })
      });
      await fetchDashboardData();
    } catch (err) {
      alert(err.message || 'Failed to modify job status.');
    } finally {
      setActionLoading(null);
    }
  };

  const handleDeleteJob = async (jobId) => {
    if (!confirm('Are you sure you want to delete this job posting? This will remove all associated applications.')) return;
    
    setActionLoading(jobId);
    try {
      await apiFetch(`/jobs/${jobId}`, {
        method: 'DELETE'
      });
      await fetchDashboardData();
    } catch (err) {
      alert(err.message || 'Failed to delete job.');
    } finally {
      setActionLoading(null);
    }
  };

  if (loading) {
    return (
      <div className="flex-1 flex flex-col justify-center items-center py-20 space-y-4">
        <div className="w-12 h-12 rounded-full border-4 border-dark-border border-t-brand-500 animate-spin"></div>
        <p className="text-dark-muted font-display text-sm tracking-wide">Syncing recruiter terminal...</p>
      </div>
    );
  }

  // Base metrics
  const totalJobs = stats?.totalJobs || 0;
  const activeJobsCount = stats?.activeJobs || 0;
  const totalApplicants = stats?.totalApplicants || 0;
  const shortlisted = stats?.shortlisted || 0;
  const interviewing = stats?.interviewing || 0;
  const avgAtsScore = stats?.avgAtsScore || 0;

  // Filtered applications for analytics
  const filteredApps = applications.filter(app => {
    const matchJob = selectedJobFilter === 'all' || app.job_id === selectedJobFilter;
    const matchStatus = selectedStatusFilter === 'all' || app.status === selectedStatusFilter;
    return matchJob && matchStatus;
  });

  // 1. Funnel data from filtered candidates
  const statusCounts = filteredApps.reduce((acc, app) => {
    acc[app.status] = (acc[app.status] || 0) + 1;
    return acc;
  }, {});

  const funnelData = [
    { name: 'Applied', value: statusCounts['applied'] || 0 },
    { name: 'Screening', value: statusCounts['screening'] || 0 },
    { name: 'Shortlisted', value: statusCounts['shortlisted'] || 0 },
    { name: 'Interviewing', value: statusCounts['interviewing'] || 0 },
    { name: 'Offered', value: statusCounts['offered'] || 0 },
    { name: 'Rejected', value: statusCounts['rejected'] || 0 }
  ];

  // 2. Applications by Job
  const appsByJobData = jobs.map(j => {
    const count = applications.filter(a => a.job_id === j.id).length;
    return { name: j.title.substring(0, 15), applicants: count };
  });

  // 3. Monthly Applications Timeline
  const monthlyCounts = filteredApps.reduce((acc, app) => {
    const date = new Date(app.created_at);
    const month = date.toLocaleString('default', { month: 'short' });
    acc[month] = (acc[month] || 0) + 1;
    return acc;
  }, {});

  const monthsList = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const monthlyData = monthsList
    .map(m => ({ name: m, applications: monthlyCounts[m] || 0 }))
    .filter(d => d.applications > 0 || monthsList.indexOf(d.name) <= new Date().getMonth());

  // 4. Skills Distribution from job requirements
  const skillsCounts = jobs.reduce((acc, job) => {
    (job.requirements || []).forEach(skill => {
      acc[skill] = (acc[skill] || 0) + 1;
    });
    return acc;
  }, {});

  const skillsData = Object.entries(skillsCounts)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 7);

  // 5. Hiring Success Rate (Selected / total applications)
  const offersCount = statusCounts['offered'] || 0;
  const hiringSuccessRate = filteredApps.length > 0 ? ((offersCount / filteredApps.length) * 100) : 0;

  // Chart Colors
  const COLORS = ['#5d5cde', '#a78bfa', '#34d399', '#fbbf24', '#f87171', '#6b7280'];

  return (
    <div className="space-y-8 text-left animate-in fade-in duration-300 relative">
      {/* Ambient background glows for premium feel ("IT" Factor) */}
      <div className="absolute -top-40 -right-40 w-96 h-96 rounded-full bg-brand-500/10 blur-[100px] pointer-events-none -z-10 animate-pulse duration-[8s]"></div>
      <div className="absolute top-[30%] -left-40 w-[450px] h-[450px] rounded-full bg-brand-600/5 blur-[120px] pointer-events-none -z-10"></div>
      
      {/* Top Header Row */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
        <div>
          <h2 className="text-2xl font-display font-extrabold text-white">Recruiter Dashboard 🏢</h2>
          <p className="text-gray-400 text-sm mt-1">Manage corporate vacancies, candidates, and AI screening analytics.</p>
        </div>

        {/* Tab Controls */}
        <div className="flex space-x-2 bg-dark-card border border-dark-border p-1 rounded-xl shrink-0 self-start md:self-auto">
          <button
            onClick={() => setActiveTab('overview')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'overview' 
                ? 'bg-brand-600 text-white shadow' 
                : 'text-gray-400 hover:text-white'
            }`}
          >
            Overview
          </button>
          <button
            onClick={() => setActiveTab('analytics')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'analytics' 
                ? 'bg-brand-600 text-white shadow' 
                : 'text-gray-400 hover:text-white'
            }`}
          >
            Analytics Tab
          </button>
        </div>
      </div>

      {/* STAT CARDS BLOCK */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 relative z-10">
        {/* Jobs Posted */}
        <div className="glass border border-dark-border/60 hover:border-brand-500/30 p-5 rounded-2xl space-y-3 transition-all duration-300 hover:shadow-xl hover:shadow-brand-500/5 hover:-translate-y-1 relative overflow-hidden group">
          <div className="absolute top-0 left-0 w-full h-[2px] bg-brand-500/50"></div>
          <div className="flex justify-between items-start">
            <div className="w-8 h-8 rounded-lg bg-brand-500/10 flex items-center justify-center text-brand-400">
              <Briefcase size={16} />
            </div>
            <p className="text-[9px] text-dark-muted font-bold uppercase tracking-wider">Active</p>
          </div>
          <div className="space-y-0.5">
            <p className="text-[10px] text-dark-muted font-bold uppercase tracking-wider">Jobs Posted</p>
            <p className="font-display font-extrabold text-2xl text-white">{totalJobs}</p>
          </div>
          {/* Accent light-up spot inside card */}
          <div className="absolute -bottom-10 -right-10 w-24 h-24 rounded-full bg-brand-500/0 group-hover:bg-brand-500/8 blur-xl transition-all duration-500"></div>
        </div>

        {/* Active Openings */}
        <div className="glass border border-dark-border/60 hover:border-emerald-500/30 p-5 rounded-2xl space-y-3 transition-all duration-300 hover:shadow-xl hover:shadow-emerald-500/5 hover:-translate-y-1 relative overflow-hidden group">
          <div className="absolute top-0 left-0 w-full h-[2px] bg-emerald-500/50"></div>
          <div className="flex justify-between items-start">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-400">
              <CheckCircle size={16} />
            </div>
            <p className="text-[9px] text-emerald-400 font-bold uppercase tracking-wider">Hiring</p>
          </div>
          <div className="space-y-0.5">
            <p className="text-[10px] text-dark-muted font-bold uppercase tracking-wider">Active Openings</p>
            <p className="font-display font-extrabold text-2xl text-white">{activeJobsCount}</p>
          </div>
          {/* Accent light-up spot inside card */}
          <div className="absolute -bottom-10 -right-10 w-24 h-24 rounded-full bg-emerald-500/0 group-hover:bg-emerald-500/8 blur-xl transition-all duration-500"></div>
        </div>

        {/* Total Applicants */}
        <div className="glass border border-dark-border/60 hover:border-sky-500/30 p-5 rounded-2xl space-y-3 transition-all duration-300 hover:shadow-xl hover:shadow-sky-500/5 hover:-translate-y-1 relative overflow-hidden group">
          <div className="absolute top-0 left-0 w-full h-[2px] bg-sky-500/50"></div>
          <div className="flex justify-between items-start">
            <div className="w-8 h-8 rounded-lg bg-sky-500/10 flex items-center justify-center text-sky-400">
              <Users size={16} />
            </div>
            <p className="text-[9px] text-sky-400 font-bold uppercase tracking-wider">Screening</p>
          </div>
          <div className="space-y-0.5">
            <p className="text-[10px] text-dark-muted font-bold uppercase tracking-wider">Total Applicants</p>
            <p className="font-display font-extrabold text-2xl text-white">{totalApplicants}</p>
          </div>
          {/* Accent light-up spot inside card */}
          <div className="absolute -bottom-10 -right-10 w-24 h-24 rounded-full bg-sky-500/0 group-hover:bg-sky-500/8 blur-xl transition-all duration-500"></div>
        </div>

        {/* Shortlisted */}
        <div className="glass border border-dark-border/60 hover:border-amber-500/30 p-5 rounded-2xl space-y-3 transition-all duration-300 hover:shadow-xl hover:shadow-amber-500/5 hover:-translate-y-1 relative overflow-hidden group">
          <div className="absolute top-0 left-0 w-full h-[2px] bg-amber-500/50"></div>
          <div className="flex justify-between items-start">
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center text-amber-400">
              <TrendingUp size={16} />
            </div>
            <p className="text-[9px] text-amber-400 font-bold uppercase tracking-wider">Review</p>
          </div>
          <div className="space-y-0.5">
            <p className="text-[10px] text-dark-muted font-bold uppercase tracking-wider">Shortlisted</p>
            <p className="font-display font-extrabold text-2xl text-white">{shortlisted}</p>
          </div>
          {/* Accent light-up spot inside card */}
          <div className="absolute -bottom-10 -right-10 w-24 h-24 rounded-full bg-amber-500/0 group-hover:bg-amber-500/8 blur-xl transition-all duration-500"></div>
        </div>

        {/* Interviews */}
        <div className="glass border border-dark-border/60 hover:border-indigo-500/30 p-5 rounded-2xl space-y-3 transition-all duration-300 hover:shadow-xl hover:shadow-indigo-500/5 hover:-translate-y-1 relative overflow-hidden group col-span-2 md:col-span-1">
          <div className="absolute top-0 left-0 w-full h-[2px] bg-indigo-500/50"></div>
          <div className="flex justify-between items-start">
            <div className="w-8 h-8 rounded-lg bg-indigo-500/10 flex items-center justify-center text-indigo-400">
              <Calendar size={16} />
            </div>
            <p className="text-[9px] text-indigo-400 font-bold uppercase tracking-wider">Live</p>
          </div>
          <div className="space-y-0.5">
            <p className="text-[10px] text-dark-muted font-bold uppercase tracking-wider">Interviews</p>
            <p className="font-display font-extrabold text-2xl text-white">{interviewing}</p>
          </div>
          {/* Accent light-up spot inside card */}
          <div className="absolute -bottom-10 -right-10 w-24 h-24 rounded-full bg-indigo-500/0 group-hover:bg-indigo-500/8 blur-xl transition-all duration-500"></div>
        </div>
      </div>

      {/* TAB 1: OVERVIEW TAB */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
          
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-dark-card border border-dark-border rounded-2xl p-6 space-y-4">
              <h3 className="font-display font-bold text-white text-sm">
                Corporate Postings Manager
              </h3>

              {jobs.length === 0 ? (
                <div className="py-12 text-center text-dark-muted text-xs border border-dashed border-dark-border rounded-xl space-y-4">
                  <p>You haven't posted any job openings yet.</p>
                  <Link 
                    to="/recruiter/jobs/new"
                    className="inline-block bg-brand-600 hover:bg-brand-700 text-white font-bold py-2 px-4 rounded-xl text-xs transition-all"
                  >
                    Post First Job
                  </Link>
                </div>
              ) : (
                <div className="divide-y divide-dark-border/40 space-y-4">
                  {jobs.map((job) => {
                    const isModifying = actionLoading === job.id;
                    const isOpen = job.status === 'open';

                    return (
                      <div key={job.id} className="pt-4 first:pt-0 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 text-xs">
                        <div className="space-y-1">
                          <h4 className="font-bold text-sm text-white">{job.title}</h4>
                          <div className="flex items-center space-x-3 text-[10px] text-dark-muted">
                            <span className="flex items-center"><MapPin size={11} className="mr-0.5" /> {job.location}</span>
                            <span>•</span>
                            <span>{job.job_type}</span>
                            <span>•</span>
                            <span className={`font-bold uppercase ${isOpen ? 'text-emerald-400' : 'text-red-400'}`}>
                              {job.status}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center space-x-2 shrink-0 w-full sm:w-auto justify-end">
                          <button
                            onClick={() => handleToggleStatus(job.id, job.status)}
                            disabled={isModifying}
                            title={isOpen ? 'Close Posting' : 'Reopen Posting'}
                            className="p-2 rounded-xl bg-dark-bg border border-dark-border hover:border-brand-500/20 text-gray-400 hover:text-white transition-all"
                          >
                            {isOpen ? <Lock size={13} /> : <Unlock size={13} />}
                          </button>

                          <Link
                            to={`/recruiter/jobs/new?id=${job.id}`}
                            title="Edit Job details"
                            className="p-2 rounded-xl bg-dark-bg border border-dark-border hover:border-brand-500/20 text-gray-400 hover:text-white transition-all"
                          >
                            <Edit3 size={13} />
                          </Link>

                          <button
                            onClick={() => handleDeleteJob(job.id)}
                            disabled={isModifying}
                            title="Delete Posting"
                            className="p-2 rounded-xl bg-dark-bg border border-dark-border hover:border-red-500/20 text-gray-400 hover:text-red-400 transition-all"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          <div className="space-y-6">
            <div className="bg-dark-card border border-dark-border rounded-2xl p-6 space-y-4">
              <h3 className="font-display font-bold text-white text-xs border-b border-dark-border pb-2.5">
                Quick Shortcuts
              </h3>
              
              <div className="grid grid-cols-1 gap-2.5">
                <Link
                  to="/recruiter/jobs/new"
                  className="w-full flex items-center justify-between bg-dark-bg/60 border border-dark-border hover:border-brand-500/20 p-3 rounded-xl transition-all group"
                >
                  <div className="flex items-center space-x-3 text-xs text-gray-200">
                    <PlusSquare size={16} className="text-brand-400" />
                    <span>Post New Vacancy</span>
                  </div>
                  <ChevronRight size={14} className="text-gray-500 group-hover:text-white transition-colors" />
                </Link>

                <Link
                  to="/recruiter/applicants"
                  className="w-full flex items-center justify-between bg-dark-bg/60 border border-dark-border hover:border-brand-500/20 p-3 rounded-xl transition-all group"
                >
                  <div className="flex items-center space-x-3 text-xs text-gray-200">
                    <Users size={16} className="text-accent-purple" />
                    <span>Review Applicants</span>
                  </div>
                  <ChevronRight size={14} className="text-gray-500 group-hover:text-white transition-colors" />
                </Link>
              </div>
            </div>

            <div className="bg-gradient-to-tr from-brand-900/10 to-accent-purple/10 border border-brand-500/20 rounded-2xl p-6 space-y-3">
              <h4 className="font-display font-bold text-white text-xs flex items-center space-x-1.5">
                <Sparkles size={14} className="text-brand-400" />
                <span>Screening Engine Active</span>
              </h4>
              <p className="text-[10px] text-dark-muted leading-relaxed">
                Gemini reviews submitted candidate PDFs, compares skillsets, and updates candidates fits immediately upon submission.
              </p>
            </div>
          </div>

        </div>
      )}

      {/* TAB 2: ANALYTICS TAB */}
      {activeTab === 'analytics' && (
        <div className="space-y-6">
          
          {/* ANALYTICS FILTERS PANEL */}
          <div className="bg-dark-card border border-dark-border p-4 rounded-2xl grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
            <div className="space-y-1">
              <label className="text-[9px] text-dark-muted font-bold uppercase tracking-wider">Filter by Job Posting</label>
              <select
                value={selectedJobFilter}
                onChange={(e) => setSelectedJobFilter(e.target.value)}
                className="w-full bg-dark-bg/60 border border-dark-border focus:border-brand-500 rounded-xl py-2 px-3 text-xs text-gray-400 outline-none transition-all"
              >
                <option value="all">All Jobs</option>
                {jobs.map(j => (
                  <option key={j.id} value={j.id}>{j.title}</option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-[9px] text-dark-muted font-bold uppercase tracking-wider">Filter by Candidate Status</label>
              <select
                value={selectedStatusFilter}
                onChange={(e) => setSelectedStatusFilter(e.target.value)}
                className="w-full bg-dark-bg/60 border border-dark-border focus:border-brand-500 rounded-xl py-2 px-3 text-xs text-gray-400 outline-none transition-all"
              >
                <option value="all">All Statuses</option>
                <option value="applied">Applied</option>
                <option value="screening">Screening</option>
                <option value="shortlisted">Shortlisted</option>
                <option value="interviewing">Interview Scheduled</option>
                <option value="offered">Selected</option>
                <option value="rejected">Rejected</option>
              </select>
            </div>

            <div className="bg-dark-bg/40 border border-dark-border p-3.5 rounded-xl text-center flex justify-around items-center h-full">
              <div className="text-center">
                <span className="text-[9px] text-dark-muted font-bold uppercase block">Hiring Success</span>
                <span className="text-sm font-bold text-white">{Math.round(hiringSuccessRate)}%</span>
              </div>
              <div className="h-6 w-px bg-dark-border"></div>
              <div className="text-center">
                <span className="text-[9px] text-dark-muted font-bold uppercase block">Avg ATS Match</span>
                <span className="text-sm font-bold text-emerald-400">{Math.round(avgAtsScore)}%</span>
              </div>
            </div>
          </div>

          {/* MAIN CHARTS GRID */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            
            {/* 1. Funnel Stages Bar Chart */}
            <div className="bg-dark-card border border-dark-border rounded-2xl p-6 space-y-4">
              <div>
                <h4 className="font-display font-bold text-white text-sm">Recruitment Funnel Stages</h4>
                <p className="text-[10px] text-dark-muted">Candidate stage volumes matches based on filter criteria</p>
              </div>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={funnelData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <XAxis dataKey="name" stroke="#6b7280" fontSize={10} tickLine={false} />
                    <YAxis stroke="#6b7280" fontSize={10} tickLine={false} />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#181825', borderColor: '#2e2e42', borderRadius: '12px' }}
                      labelStyle={{ color: '#fff', fontSize: '11px', fontWeight: 'bold' }}
                      itemStyle={{ color: '#5d5cde', fontSize: '11px' }}
                    />
                    <Bar dataKey="value" fill="#5d5cde" radius={[6, 6, 0, 0]}>
                      {funnelData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* 2. Monthly Applications Trend Line */}
            <div className="bg-dark-card border border-dark-border rounded-2xl p-6 space-y-4">
              <div>
                <h4 className="font-display font-bold text-white text-sm">Monthly Candidate Volumes</h4>
                <p className="text-[10px] text-dark-muted">Applications submitted per month timeline</p>
              </div>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={monthlyData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#2e2e42" vertical={false} />
                    <XAxis dataKey="name" stroke="#6b7280" fontSize={10} tickLine={false} />
                    <YAxis stroke="#6b7280" fontSize={10} tickLine={false} />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#181825', borderColor: '#2e2e42', borderRadius: '12px' }}
                      labelStyle={{ color: '#fff', fontSize: '11px', fontWeight: 'bold' }}
                      itemStyle={{ color: '#a78bfa', fontSize: '11px' }}
                    />
                    <Line type="monotone" dataKey="applications" stroke="#a78bfa" strokeWidth={3} dot={{ fill: '#a78bfa', r: 4 }} activeDot={{ r: 6 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* 3. Skills Demands Distribution */}
            <div className="bg-dark-card border border-dark-border rounded-2xl p-6 space-y-4">
              <div>
                <h4 className="font-display font-bold text-white text-sm">Corporate Requirements Demand</h4>
                <p className="text-[10px] text-dark-muted">Most requested skills across all active postings</p>
              </div>
              <div className="h-64">
                {skillsData.length === 0 ? (
                  <p className="text-xs text-dark-muted text-center py-20">Specify skills requirements in your postings to populate data.</p>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart layout="vertical" data={skillsData} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
                      <XAxis type="number" stroke="#6b7280" fontSize={10} tickLine={false} />
                      <YAxis dataKey="name" type="category" stroke="#6b7280" fontSize={10} tickLine={false} width={80} />
                      <Tooltip 
                        contentStyle={{ backgroundColor: '#181825', borderColor: '#2e2e42', borderRadius: '12px' }}
                        labelStyle={{ color: '#fff', fontSize: '11px', fontWeight: 'bold' }}
                      />
                      <Bar dataKey="count" fill="#34d399" radius={[0, 4, 4, 0]} barSize={10} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>

            {/* 4. Applications Volume by Job */}
            <div className="bg-dark-card border border-dark-border rounded-2xl p-6 space-y-4">
              <div>
                <h4 className="font-display font-bold text-white text-sm">Applicants Count per Job Posting</h4>
                <p className="text-[10px] text-dark-muted">Volumetric breakdown of applicants per vacancy</p>
              </div>
              <div className="h-64">
                {appsByJobData.length === 0 ? (
                  <p className="text-xs text-dark-muted text-center py-20">Publish postings to compute applicant counts.</p>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={appsByJobData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <XAxis dataKey="name" stroke="#6b7280" fontSize={9} tickLine={false} />
                      <YAxis stroke="#6b7280" fontSize={10} tickLine={false} />
                      <Tooltip 
                        contentStyle={{ backgroundColor: '#181825', borderColor: '#2e2e42', borderRadius: '12px' }}
                        labelStyle={{ color: '#fff', fontSize: '11px', fontWeight: 'bold' }}
                      />
                      <Bar dataKey="applicants" fill="#fbbf24" radius={[6, 6, 0, 0]} barSize={24} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};

export default RecruiterDashboard;
