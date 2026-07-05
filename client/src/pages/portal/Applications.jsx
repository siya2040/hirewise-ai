import React, { useState, useEffect } from 'react';
import { apiFetch } from '../../lib/api';
import { 
  Briefcase, 
  MapPin, 
  Sparkles, 
  CheckCircle2, 
  Calendar, 
  ChevronDown, 
  ChevronUp, 
  Info 
} from 'lucide-react';

export const Applications = () => {
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedApp, setExpandedApp] = useState(null);

  useEffect(() => {
    const fetchApps = async () => {
      try {
        const data = await apiFetch('/applications');
        setApplications(data);
      } catch (err) {
        console.error('Failed to load student applications:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchApps();
  }, []);

  const toggleExpand = (appId) => {
    setExpandedApp(expandedApp === appId ? null : appId);
  };

  // Determine timeline step active index
  const getStatusStepIndex = (status) => {
    const steps = ['applied', 'screening', 'shortlisted', 'interviewing', 'offered', 'rejected'];
    // Map offered to Selected, rejected to Rejected
    if (status === 'offered') return 4;
    if (status === 'rejected') return 4;
    
    const idx = steps.indexOf(status);
    return idx >= 0 ? idx : 0;
  };

  const timelineSteps = [
    { label: 'Applied', key: 'applied' },
    { label: 'Screening', key: 'screening' },
    { label: 'Shortlisted', key: 'shortlisted' },
    { label: 'Interview Scheduled', key: 'interviewing' },
    { label: 'Decision', key: 'decision' } // Selected or Rejected
  ];

  if (loading) {
    return (
      <div className="flex-1 flex flex-col justify-center items-center py-20 space-y-4">
        <div className="w-12 h-12 rounded-full border-4 border-dark-border border-t-brand-500 animate-spin"></div>
        <p className="text-dark-muted font-display text-sm tracking-wide">Retrieving applications tracker...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 text-left animate-in fade-in duration-200">
      {/* Page Header */}
      <div>
        <h2 className="text-2xl font-display font-extrabold text-white">Track Applications 💼</h2>
        <p className="text-gray-400 text-sm mt-1">
          Review recruitment stages, candidate status updates, and role-specific AI match scores.
        </p>
      </div>

      {applications.length === 0 ? (
        <div className="bg-dark-card border border-dark-border p-16 rounded-2xl text-center space-y-4 max-w-3xl">
          <Briefcase size={40} className="mx-auto text-gray-600 animate-pulse" />
          <div>
            <h4 className="font-display font-bold text-white text-lg">No Applications Found</h4>
            <p className="text-xs text-dark-muted mt-1 max-w-sm mx-auto">
              You haven't submitted any applications. Search and filter open roles in the Jobs browser to begin.
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-6 max-w-4xl">
          {applications.map((app) => {
            const currentStep = getStatusStepIndex(app.status);
            const isExpanded = expandedApp === app.id;
            
            // Format status color
            const isRejected = app.status === 'rejected';
            const isSelected = app.status === 'offered';

            return (
              <div 
                key={app.id} 
                className="bg-dark-card border border-dark-border rounded-2xl hover:border-brand-500/20 transition-all overflow-hidden"
              >
                {/* Header Row */}
                <div 
                  onClick={() => toggleExpand(app.id)}
                  className="p-6 flex flex-col md:flex-row md:items-center justify-between gap-6 cursor-pointer hover:bg-dark-bg/20 transition-colors"
                >
                  <div className="space-y-1.5 flex-1">
                    <h3 className="font-display font-bold text-lg text-white">{app.job?.title}</h3>
                    <div className="flex items-center space-x-3 text-xs text-dark-muted">
                      <span className="font-semibold text-brand-400">{app.job?.recruiter?.company_name}</span>
                      <span>•</span>
                      <span className="flex items-center"><MapPin size={12} className="mr-1" /> {app.job?.location}</span>
                      <span>•</span>
                      <span>Applied: {new Date(app.created_at).toLocaleDateString()}</span>
                    </div>
                  </div>

                  {/* Badges */}
                  <div className="flex items-center space-x-4 shrink-0">
                    <div className="text-right">
                      <span className={`inline-block text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-wider border ${
                        isRejected ? 'bg-red-950/20 border-red-800/30 text-red-400' :
                        isSelected ? 'bg-emerald-950/20 border-emerald-800/30 text-emerald-400' :
                        'bg-brand-500/10 border-brand-500/20 text-brand-400'
                      }`}>
                        {app.status === 'offered' ? 'Selected' : app.status}
                      </span>
                    </div>

                    <div className="flex items-center space-x-1.5 bg-brand-500/15 border border-brand-500/20 px-3 py-1 rounded-xl">
                      <Sparkles size={12} className="text-brand-400" />
                      <span className="text-xs font-bold text-white">
                        {Math.round(app.ai_match_score)}% Fit
                      </span>
                    </div>

                    <button className="text-gray-500 hover:text-white transition-colors">
                      {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                    </button>
                  </div>
                </div>

                {/* Timeline Progress Bar (Visible Always) */}
                <div className="px-6 pb-6 border-b border-dark-border/40">
                  <div className="relative pt-4 pb-2">
                    {/* Progress Track */}
                    <div className="absolute top-[27px] left-0 right-0 h-1 bg-dark-border rounded-full -translate-y-1/2"></div>
                    <div 
                      className={`absolute top-[27px] left-0 h-1 rounded-full -translate-y-1/2 transition-all duration-500 ${
                        isRejected ? 'bg-red-500' : 'bg-brand-500'
                      }`}
                      style={{ width: `${(currentStep / 4) * 100}%` }}
                    ></div>

                    {/* Timeline Nodes */}
                    <div className="relative flex justify-between">
                      {timelineSteps.map((step, idx) => {
                        const isDone = idx <= currentStep;
                        const isCurrent = idx === currentStep;
                        
                        let nodeColor = 'bg-dark-border text-gray-500';
                        if (isDone) {
                          nodeColor = isRejected && idx === 4 
                            ? 'bg-red-500 text-white shadow-lg shadow-red-500/20' 
                            : isSelected && idx === 4 
                              ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20'
                              : 'bg-brand-500 text-white shadow-lg shadow-brand-500/20';
                        }
                        if (isCurrent && !isDone) {
                          nodeColor = 'bg-brand-950 text-brand-400 border border-brand-500/30';
                        }

                        // Labels for Decision Step
                        let stepLabel = step.label;
                        if (idx === 4) {
                          if (isRejected) stepLabel = 'Rejected';
                          else if (isSelected) stepLabel = 'Selected';
                          else stepLabel = 'Decision';
                        }

                        return (
                          <div key={idx} className="flex flex-col items-center space-y-2 z-10">
                            <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold transition-all ${nodeColor}`}>
                              {idx + 1}
                            </div>
                            <span className={`text-[10px] font-bold ${
                              isCurrent ? 'text-white font-extrabold' : isDone ? 'text-gray-300' : 'text-dark-muted'
                            }`}>
                              {stepLabel}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* Collapsible Details Panel (AI Match Breakdowns) */}
                {isExpanded && (
                  <div className="p-6 bg-dark-bg/30 border-t border-dark-border/40 grid grid-cols-1 md:grid-cols-2 gap-6 text-xs text-gray-300 animate-in slide-in-from-top duration-200">
                    <div className="space-y-4">
                      <div>
                        <h4 className="font-display font-bold text-white text-sm flex items-center space-x-2">
                          <Sparkles size={14} className="text-brand-400" />
                          <span>AI Fit Assessment</span>
                        </h4>
                        <p className="mt-2 text-gray-300 leading-relaxed bg-dark-bg/60 p-4 rounded-xl border border-dark-border/40">
                          {app.ai_match_explanation || 'Assessment is currently being updated.'}
                        </p>
                      </div>

                      <div className="bg-dark-bg/40 border border-dark-border/50 p-4 rounded-xl space-y-1.5">
                        <span className="font-bold text-brand-400 uppercase tracking-wider text-[10px]">Fit Recommendation:</span>
                        <p className="text-sm font-bold text-white">{app.ai_recommendation || 'Potential Match'}</p>
                      </div>
                    </div>

                    <div className="space-y-4">
                      {/* Skills Matching */}
                      <div className="space-y-2">
                        <span className="font-bold uppercase tracking-wider text-[10px] text-emerald-400">Core Skills Matched</span>
                        {app.ai_skills_matched?.length === 0 ? (
                          <p className="text-dark-muted">No specific skill matches detected.</p>
                        ) : (
                          <div className="flex flex-wrap gap-1.5">
                            {app.ai_skills_matched?.map((skill) => (
                              <span key={skill} className="text-[9px] font-bold bg-emerald-500/10 text-emerald-400 px-2 py-0.5 rounded border border-emerald-500/25">
                                {skill}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Skills Missing */}
                      <div className="space-y-2">
                        <span className="font-bold uppercase tracking-wider text-[10px] text-yellow-400">Skills Gaps (Required but missing)</span>
                        {app.ai_skills_missing?.length === 0 ? (
                          <p className="text-emerald-400 font-medium">Excellent! You match all requirements.</p>
                        ) : (
                          <div className="flex flex-wrap gap-1.5">
                            {app.ai_skills_missing?.map((skill) => (
                              <span key={skill} className="text-[9px] font-bold bg-yellow-500/10 text-yellow-400 px-2 py-0.5 rounded border border-yellow-500/25">
                                {skill}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>

                      <div className="flex items-start space-x-2 bg-brand-500/5 p-3 rounded-xl border border-brand-500/10 text-[10px] text-dark-muted leading-relaxed">
                        <Info size={14} className="text-brand-400 shrink-0 mt-0.5" />
                        <span>Recruiters see this fit assessment when viewing your application. Improve your standalone resume to increase matches.</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default Applications;
