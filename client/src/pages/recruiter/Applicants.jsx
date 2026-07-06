import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { apiFetch } from '../../lib/api';
import { 
  Sparkles, 
  Search, 
  Filter, 
  ChevronRight, 
  MapPin, 
  Calendar, 
  CheckCircle2, 
  XCircle, 
  User, 
  ExternalLink,
  Printer,
  X,
  FileText,
  MessageSquare
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

export const Applicants = () => {
  const navigate = useNavigate();
  const { profile } = useAuth();

  // Query States
  const [applicants, setApplicants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [chatLoading, setChatLoading] = useState(false);

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [scoreFilter, setScoreFilter] = useState(''); // 'high' (>80), 'mid' (60-80), 'low' (<60)

  // Selected Candidate Modal
  const [selectedApp, setSelectedApp] = useState(null);
  const [pdfSignedUrl, setPdfSignedUrl] = useState('');
  const [statusLoading, setStatusLoading] = useState(false);
  const [questions, setQuestions] = useState([]);
  const [generatingQuestions, setGeneratingQuestions] = useState(false);

  const fetchApplicantsList = async () => {
    setLoading(true);
    try {
      const data = await apiFetch('/applications/recruiter');
      setApplicants(data);
    } catch (err) {
      console.error('Failed to query recruiter applicants:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchApplicantsList();
  }, []);

  // Fetch temporary signed preview URL for candidate's resume
  const loadResumePreview = async (studentId) => {
    try {
      const { data, error } = await supabase.storage
        .from('resumes')
        .createSignedUrl(`${studentId}/resume.pdf`, 3600);

      if (!error && data) {
        setPdfSignedUrl(data.signedUrl);
      } else {
        setPdfSignedUrl('');
      }
    } catch (err) {
      console.error('Failed to sign resume preview url:', err);
      setPdfSignedUrl('');
    }
  };

  const handleRowClick = async (app) => {
    setSelectedApp(app);
    setQuestions([]);
    setPdfSignedUrl('');
    await loadResumePreview(app.student_id);
  };

  const handleCloseModal = () => {
    setSelectedApp(null);
    setPdfSignedUrl('');
    setQuestions([]);
  };

  const handleMessageCandidate = async () => {
    if (!selectedApp) return;
    setChatLoading(true);
    try {
      const session = await apiFetch('/chat/sessions', {
        method: 'POST',
        body: JSON.stringify({
          studentId: selectedApp.student_id,
          jobId: selectedApp.job_id
        })
      });
      navigate(`/recruiter/chat?sessionId=${session.id}`);
    } catch (err) {
      console.error('Failed to start chat session:', err);
      alert(`Could not start a chat session: ${err.message || 'Unknown error'}`);
    } finally {
      setChatLoading(false);
    }
  };

  // Update Application Status
  const handleUpdateStatus = async (newStatus) => {
    if (!selectedApp) return;

    setStatusLoading(true);
    try {
      const response = await apiFetch(`/applications/${selectedApp.id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status: newStatus })
      });

      // Update local lists
      setApplicants(applicants.map(a => a.id === selectedApp.id ? response.application : a));
      setSelectedApp(response.application);
    } catch (err) {
      alert(err.message || 'Failed to update candidate status.');
    } finally {
      setStatusLoading(false);
    }
  };

  // AI Interview Questions Generator
  const handleGenerateQuestions = async () => {
    if (!selectedApp) return;

    setGeneratingQuestions(true);
    try {
      const candName = selectedApp.student?.profileDetails?.full_name || 'Candidate';
      const candSkills = selectedApp.student?.skills || [];
      const missingSkills = selectedApp.ai_skills_missing || [];
      const jobTitle = selectedApp.job?.title || 'this position';

      const response = await apiFetch('/ai/recruiter/questions', {
        method: 'POST',
        body: JSON.stringify({
          candidateName: candName,
          skills: candSkills,
          missingSkills,
          jobTitle
        })
      });

      setQuestions(response.questions || []);
    } catch (error) {
      alert(error.message || 'Failed to generate interview questions.');
    } finally {
      setGeneratingQuestions(false);
    }
  };

  // Download/Print Questionnaire
  const handlePrintQuestions = () => {
    if (questions.length === 0) return;

    const candName = selectedApp.student?.profileDetails?.full_name || 'Candidate';
    const jobTitle = selectedApp.job?.title || 'Role';

    const printWin = window.open('', '_blank');
    printWin.document.write(`
      <html>
        <head>
          <title>Interview Sheet - ${candName}</title>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; padding: 40px; color: #222; line-height: 1.6; }
            h1 { font-size: 24px; border-bottom: 2px solid #5d5cde; padding-bottom: 10px; margin-bottom: 5px; color: #111; }
            .subtitle { font-size: 14px; color: #666; margin-bottom: 30px; }
            .question-box { margin-bottom: 25px; page-break-inside: avoid; }
            .q-num { font-weight: bold; color: #5d5cde; }
            .q-type { font-size: 10px; text-transform: uppercase; background: #e0e0f8; color: #5d5cde; padding: 2px 6px; border-radius: 4px; font-weight: bold; margin-left: 10px; }
            .q-text { font-size: 15px; font-weight: bold; margin-top: 5px; color: #111; }
            .q-focus { font-size: 12px; color: #555; margin-top: 2px; font-style: italic; }
            .answer-space { border: 1px dashed #ccc; height: 120px; margin-top: 15px; border-radius: 6px; }
            .footer { margin-top: 50px; text-align: center; font-size: 11px; color: #999; border-top: 1px solid #eee; padding-top: 20px; }
          </style>
        </head>
        <body>
          <h1>HireWise AI - Recruiter Interview Cheat Sheet</h1>
          <div class="subtitle">Candidate: <strong>${candName}</strong> | Position: <strong>${jobTitle}</strong> | Date: ${new Date().toLocaleDateString()}</div>
          
          ${questions.map((q, idx) => `
            <div class="question-box">
              <div>
                <span class="q-num">Question ${idx + 1}</span>
                <span class="q-type">${q.type}</span>
              </div>
              <div class="q-text">${q.question}</div>
              <div class="q-focus">Focus Area: ${q.focus}</div>
              <div class="answer-space"></div>
            </div>
          `).join('')}

          <div class="footer">
            Generated by Gemini AI Engine on HireWise AI Recruiting Platform. Confidential interview worksheets.
          </div>
          <script>
            window.onload = function() {
              window.print();
            }
          </script>
        </body>
      </html>
    `);
    printWin.document.close();
  };

  // Filter & Search Logic
  const filteredApplicants = applicants.filter(app => {
    const name = (app.student?.profileDetails?.full_name || '').toLowerCase();
    const jobTitle = (app.job?.title || '').toLowerCase();
    const skills = (app.student?.skills || []).map(s => s.toLowerCase()).join(' ');
    
    const matchesSearch = name.includes(searchTerm.toLowerCase()) || 
                          jobTitle.includes(searchTerm.toLowerCase()) || 
                          skills.includes(searchTerm.toLowerCase());

    const matchesStatus = !statusFilter || app.status === statusFilter;

    let matchesScore = true;
    if (scoreFilter === 'high') matchesScore = app.ai_match_score >= 80;
    else if (scoreFilter === 'mid') matchesScore = app.ai_match_score >= 60 && app.ai_match_score < 80;
    else if (scoreFilter === 'low') matchesScore = app.ai_match_score < 60;

    return matchesSearch && matchesStatus && matchesScore;
  });

  return (
    <div className="space-y-6 text-left animate-in fade-in duration-300 relative">
      {/* Ambient background glows for premium depth ("IT" Factor) */}
      <div className="absolute -top-40 -right-40 w-96 h-96 rounded-full bg-brand-500/10 blur-[100px] pointer-events-none -z-10 animate-pulse duration-[8s]"></div>
      <div className="absolute bottom-20 -left-40 w-[450px] h-[450px] rounded-full bg-brand-600/5 blur-[120px] pointer-events-none -z-10"></div>

      {/* Page Header */}
      <div className="relative z-10">
        <h2 className="text-2xl font-display font-extrabold text-white">Candidates & Applicants 🏢</h2>
        <p className="text-gray-400 text-sm mt-1">Review candidates and screen their ATS match profiles.</p>
      </div>

      {/* Query Bar */}
      <div className="glass border border-dark-border/60 p-4 rounded-2xl flex flex-col md:flex-row gap-4 items-center justify-between relative z-10">
        
        {/* Search */}
        <div className="relative w-full md:max-w-md">
          <Search className="absolute left-3.5 top-3.5 text-gray-500" size={16} />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by name, job, or skills..."
            className="w-full bg-dark-bg/40 border border-dark-border/80 focus:border-brand-500 rounded-xl py-2.5 pl-10 pr-4 text-xs text-white placeholder-gray-600 outline-none transition-all focus:shadow-md focus:shadow-brand-950/20"
          />
        </div>

        {/* Filters */}
        <div className="flex space-x-3 w-full md:w-auto">
          {/* Status filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-dark-bg/40 border border-dark-border/80 focus:border-brand-500 rounded-xl py-2.5 px-4 text-xs text-gray-300 outline-none transition-all hover:bg-dark-bg/60 cursor-pointer"
          >
            <option value="">All Statuses</option>
            <option value="applied">Applied</option>
            <option value="screening">Screening</option>
            <option value="shortlisted">Shortlisted</option>
            <option value="interviewing">Interview Scheduled</option>
            <option value="offered">Selected</option>
            <option value="rejected">Rejected</option>
          </select>

          {/* ATS score filter */}
          <select
            value={scoreFilter}
            onChange={(e) => setScoreFilter(e.target.value)}
            className="bg-dark-bg/40 border border-dark-border/80 focus:border-brand-500 rounded-xl py-2.5 px-4 text-xs text-gray-300 outline-none transition-all hover:bg-dark-bg/60 cursor-pointer"
          >
            <option value="">All Match Scores</option>
            <option value="high">High (&gt;80% Match)</option>
            <option value="mid">Mid (60-80% Match)</option>
            <option value="low">Low (&lt;60% Match)</option>
          </select>
        </div>

      </div>

      {/* Grid List view */}
      {loading ? (
        <div className="py-20 flex flex-col items-center space-y-4 text-center relative z-10">
          <div className="w-10 h-10 rounded-full border-4 border-dark-border border-t-brand-500 animate-spin"></div>
          <p className="text-dark-muted text-xs">Retrieving candidate profiles...</p>
        </div>
      ) : filteredApplicants.length === 0 ? (
        <div className="glass border border-dark-border/60 p-16 rounded-2xl text-center text-dark-muted text-xs relative z-10">
          No applicants match the query parameters.
        </div>
      ) : (
        <div className="glass border border-dark-border/60 rounded-2xl overflow-hidden shadow-xl shadow-brand-950/10 relative z-10">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-dark-border/80 bg-dark-bg/40 text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                  <th className="p-4 pl-6">Candidate</th>
                  <th className="p-4">Applied Job</th>
                  <th className="p-4">ATS Fit</th>
                  <th className="p-4">Applied Date</th>
                  <th className="p-4">Status</th>
                  <th className="p-4 pr-6 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-dark-border/40">
                {filteredApplicants.map((app) => (
                  <tr 
                    key={app.id} 
                    onClick={() => handleRowClick(app)}
                    className="hover:bg-brand-500/5 hover:backdrop-blur-sm transition-all duration-200 cursor-pointer group"
                  >
                    <td className="p-4 pl-6 flex items-center space-x-3">
                      <div className="w-9 h-9 rounded-xl bg-brand-500/10 border border-brand-500/20 flex items-center justify-center text-brand-400 font-bold shadow-sm shadow-brand-500/5 group-hover:scale-105 transition-transform">
                        {app.student?.profileDetails?.avatar_url ? (
                          <img src={app.student.profileDetails.avatar_url} alt="Avatar" className="w-full h-full rounded-xl object-cover" />
                        ) : (
                          <User size={15} />
                        )}
                      </div>
                      <div>
                        <p className="font-bold text-white group-hover:text-brand-400 transition-colors">
                          {app.student?.profileDetails?.full_name}
                        </p>
                        <p className="text-[10px] text-dark-muted mt-0.5">{app.student?.college}</p>
                      </div>
                    </td>
                    
                    <td className="p-4">
                      <p className="font-semibold text-white">{app.job?.title}</p>
                      <p className="text-[10px] text-dark-muted mt-0.5">{app.job?.job_type}</p>
                    </td>

                    <td className="p-4">
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold ${
                        app.ai_match_score >= 80 ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
                        app.ai_match_score >= 60 ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' : 
                        'bg-red-500/10 text-red-400 border border-red-500/20'
                      }`}>
                        <Sparkles size={10} className="mr-1" />
                        {Math.round(app.ai_match_score)}% Fit
                      </span>
                    </td>

                    <td className="p-4 text-dark-muted">
                      {new Date(app.created_at).toLocaleDateString()}
                    </td>

                    <td className="p-4">
                      <span className={`inline-flex items-center text-[9px] font-bold px-2.5 py-0.5 rounded-full border uppercase tracking-wider ${
                        app.status === 'rejected' ? 'bg-red-500/10 border-red-500/20 text-red-400' :
                        app.status === 'offered' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' :
                        app.status === 'interviewing' ? 'bg-indigo-500/10 border-indigo-500/20 text-indigo-400' :
                        app.status === 'shortlisted' ? 'bg-amber-500/10 border-amber-500/20 text-amber-400' :
                        'bg-brand-500/10 border-brand-500/20 text-brand-400'
                      }`}>
                        {app.status === 'offered' ? 'Selected' : app.status}
                      </span>
                    </td>

                    <td className="p-4 pr-6 text-right text-gray-500 group-hover:text-white transition-colors">
                      <ChevronRight size={16} className="inline group-hover:translate-x-0.5 transition-transform" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* CANDIDATE DETAILS OVERLAY SHEET */}
      {selectedApp && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-40 flex justify-end">
          <div className="bg-dark-card border-l border-dark-border w-full max-w-4xl h-full flex flex-col justify-between overflow-y-auto animate-in slide-in-from-right duration-250">
            
            {/* Modal Header */}
            <div className="p-6 border-b border-dark-border flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-xl bg-brand-600/20 flex items-center justify-center text-brand-400 font-bold font-display">
                  {selectedApp.student?.profileDetails?.full_name?.charAt(0)}
                </div>
                <div>
                  <h3 className="font-display font-extrabold text-lg text-white">
                    {selectedApp.student?.profileDetails?.full_name}
                  </h3>
                  <p className="text-xs text-dark-muted mt-0.5">Applied to: <strong>{selectedApp.job?.title}</strong></p>
                </div>
              </div>

              <button onClick={handleCloseModal} className="text-gray-400 hover:text-white transition-colors p-1.5 rounded-lg hover:bg-dark-border">
                <X size={18} />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 md:p-8 flex-1 overflow-y-auto space-y-8 text-left">
              
              {/* TOP STATUS CONTROL BAR */}
              <div className="bg-dark-bg/60 border border-dark-border/60 p-4 rounded-2xl flex flex-wrap gap-4 items-center justify-between">
                <div className="space-y-1">
                  <span className="text-[10px] text-dark-muted font-bold uppercase tracking-wider">Recruitment Stage</span>
                  <div className="flex items-center space-x-2">
                    <span className="text-xs font-bold text-white capitalize">{selectedApp.status === 'offered' ? 'Selected' : selectedApp.status}</span>
                  </div>
                </div>

                <div className="flex space-x-2">
                  <button
                    onClick={handleMessageCandidate}
                    disabled={chatLoading}
                    className="bg-brand-650 hover:bg-brand-700 disabled:opacity-40 text-white font-bold py-2 px-3.5 rounded-xl text-xs transition-all flex items-center space-x-1.5 shadow"
                  >
                    <MessageSquare size={13} />
                    <span>Message</span>
                  </button>
                  <button
                    onClick={() => handleUpdateStatus('shortlisted')}
                    disabled={statusLoading || selectedApp.status === 'shortlisted'}
                    className="bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 text-white font-bold py-2 px-4 rounded-xl text-xs transition-all"
                  >
                    Shortlist
                  </button>
                  <button
                    onClick={() => handleUpdateStatus('rejected')}
                    disabled={statusLoading || selectedApp.status === 'rejected'}
                    className="bg-red-950/20 border border-red-800/40 hover:bg-red-950/40 text-red-400 font-bold py-2 px-4 rounded-xl text-xs transition-all"
                  >
                    Reject
                  </button>
                  
                  {/* General Status Dropdown */}
                  <select
                    value={selectedApp.status}
                    onChange={(e) => handleUpdateStatus(e.target.value)}
                    disabled={statusLoading}
                    className="bg-dark-border border border-transparent hover:border-brand-500/20 text-gray-200 py-2 px-3 rounded-xl text-xs outline-none cursor-pointer"
                  >
                    <option value="applied">Applied</option>
                    <option value="screening">Screening</option>
                    <option value="shortlisted">Shortlisted</option>
                    <option value="interviewing">Interview Scheduled</option>
                    <option value="offered">Selected</option>
                    <option value="rejected">Rejected</option>
                  </select>
                </div>
              </div>

              {/* TIMELINE PIPELINE GRAPH */}
              <div className="relative pt-4 pb-2 border-b border-dark-border pb-6">
                <div className="absolute top-[27px] left-0 right-0 h-1 bg-dark-border rounded-full -translate-y-1/2"></div>
                
                {/* Visual Timeline Nodes */}
                <div className="relative flex justify-between">
                  {['applied', 'screening', 'shortlisted', 'interviewing', 'offered'].map((stage, idx) => {
                    const steps = ['applied', 'screening', 'shortlisted', 'interviewing', 'offered', 'rejected'];
                    const currentIdx = selectedApp.status === 'rejected' ? 5 : steps.indexOf(selectedApp.status);
                    
                    const isDone = selectedApp.status === 'rejected' ? idx < 4 : idx <= currentIdx;
                    const isCurrent = selectedApp.status !== 'rejected' && idx === currentIdx;

                    let nodeColor = 'bg-dark-border text-gray-500';
                    if (isDone) nodeColor = 'bg-brand-500 text-white';
                    if (isCurrent) nodeColor = 'bg-brand-600 text-white ring-4 ring-brand-500/20';

                    return (
                      <div key={idx} className="flex flex-col items-center space-y-1 z-10">
                        <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold ${nodeColor}`}>
                          {idx + 1}
                        </div>
                        <span className="text-[9px] font-bold text-gray-400 capitalize">{stage === 'offered' ? 'Selected' : stage}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* AI FIT SCORE BOX */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-stretch">
                <div className="bg-dark-card border border-dark-border rounded-2xl p-6 flex flex-col justify-center items-center text-center space-y-3">
                  <div className="w-16 h-16 rounded-full bg-brand-500/10 border border-brand-500/30 flex items-center justify-center">
                    <span className="font-display font-extrabold text-xl text-brand-400">
                      {Math.round(selectedApp.ai_match_score)}%
                    </span>
                  </div>
                  <div>
                    <h5 className="font-bold text-white text-xs">AI Fit Index</h5>
                    <p className="text-[10px] text-dark-muted mt-0.5">{selectedApp.ai_recommendation || 'Potential Match'}</p>
                  </div>
                </div>

                <div className="md:col-span-2 bg-dark-card border border-dark-border rounded-2xl p-6 space-y-3">
                  <h4 className="font-display font-bold text-white text-xs flex items-center space-x-1.5">
                    <Sparkles size={14} className="text-brand-400" />
                    <span>Gemini Role Match assessment</span>
                  </h4>
                  <p className="text-[11px] text-gray-300 leading-relaxed bg-dark-bg/60 p-4 rounded-xl border border-dark-border/40">
                    {selectedApp.ai_match_explanation || 'Evaluation is processing.'}
                  </p>
                </div>
              </div>

              {/* MATCHED & MISSING SKILLS */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                {/* Matched */}
                <div className="bg-dark-card border border-dark-border rounded-2xl p-6 space-y-3">
                  <h5 className="text-[10px] text-emerald-400 font-bold uppercase tracking-wider">Required Skills Matched</h5>
                  {selectedApp.ai_skills_matched?.length === 0 ? (
                    <p className="text-[10px] text-dark-muted">No overlapping skillsets identified.</p>
                  ) : (
                    <div className="flex flex-wrap gap-1.5">
                      {selectedApp.ai_skills_matched?.map(skill => (
                        <span key={skill} className="text-[9px] font-bold bg-emerald-500/10 text-emerald-400 px-2 py-0.5 rounded border border-emerald-500/25">
                          {skill}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* Missing */}
                <div className="bg-dark-card border border-dark-border rounded-2xl p-6 space-y-3">
                  <h5 className="text-[10px] text-yellow-400 font-bold uppercase tracking-wider">Missing job requirements</h5>
                  {selectedApp.ai_skills_missing?.length === 0 ? (
                    <p className="text-[10px] text-emerald-400 font-semibold">Perfect! Matches all core requirements.</p>
                  ) : (
                    <div className="flex flex-wrap gap-1.5">
                      {selectedApp.ai_skills_missing?.map(skill => (
                        <span key={skill} className="text-[9px] font-bold bg-yellow-500/10 text-yellow-400 px-2 py-0.5 rounded border border-yellow-500/25">
                          {skill}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

              </div>

              {/* MOCK INTERVIEW GENERATOR (INTERVIEW HUB) */}
              <div className="bg-dark-card border border-dark-border rounded-2xl p-6 space-y-4">
                <div className="flex justify-between items-center border-b border-dark-border pb-3">
                  <h4 className="font-display font-bold text-white text-sm">
                    Interview Cheat Sheet Hub 🎙️
                  </h4>

                  {questions.length === 0 ? (
                    <button
                      onClick={handleGenerateQuestions}
                      disabled={generatingQuestions}
                      className="bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white font-bold py-1.5 px-3.5 rounded-lg text-xs transition-all flex items-center space-x-1"
                    >
                      {generatingQuestions ? (
                        <span className="w-3 h-3 rounded-full border border-white border-t-transparent animate-spin mr-1"></span>
                      ) : (
                        <Sparkles size={12} className="mr-1" />
                      )}
                      <span>{generatingQuestions ? 'Generating...' : 'Generate custom Questions'}</span>
                    </button>
                  ) : (
                    <button
                      onClick={handlePrintQuestions}
                      className="bg-dark-border hover:bg-dark-border/80 border border-transparent text-gray-200 font-bold py-1.5 px-3.5 rounded-lg text-xs transition-all flex items-center space-x-1"
                    >
                      <Printer size={12} className="mr-1" />
                      <span>Print/Download sheet</span>
                    </button>
                  )}
                </div>

                {questions.length > 0 ? (
                  <div className="space-y-3">
                    {questions.map((q, idx) => (
                      <div key={q.id || idx} className="bg-dark-bg/60 border border-dark-border/60 p-3.5 rounded-xl text-xs space-y-1.5">
                        <div className="flex items-center space-x-2">
                          <span className="text-brand-400 font-bold">Q{idx + 1}</span>
                          <span className="text-[8px] font-bold bg-brand-500/10 text-brand-400 px-1.5 py-0.5 rounded border border-brand-500/20 capitalize">
                            {q.type}
                          </span>
                        </div>
                        <p className="text-white font-semibold leading-relaxed">{q.question}</p>
                        <p className="text-[10px] text-dark-muted italic">Focus: {q.focus}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-dark-muted leading-relaxed">
                    Click Generate to let Gemini analyze this candidate's skills and missing criteria, then generate 5 target questions to ask during their technical interview round.
                  </p>
                )}
              </div>

              {/* CANDIDATE GENERAL RESUME ATTRIBUTES */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                {/* Strengths */}
                <div className="bg-dark-card border border-dark-border rounded-2xl p-6 space-y-3">
                  <h4 className="font-display font-bold text-white text-xs">Resume Strengths</h4>
                  <ul className="space-y-1.5 text-xs text-gray-300">
                    {selectedApp.student?.strengths?.map((str, idx) => (
                      <li key={idx} className="flex items-start space-x-2">
                        <span className="text-emerald-400 font-bold">•</span>
                        <span>{str}</span>
                      </li>
                    )) || <li className="text-dark-muted italic">No parsed strengths available.</li>}
                  </ul>
                </div>

                {/* Weaknesses */}
                <div className="bg-dark-card border border-dark-border rounded-2xl p-6 space-y-3">
                  <h4 className="font-display font-bold text-white text-xs">Areas to Probe / Improve</h4>
                  <ul className="space-y-1.5 text-xs text-gray-300">
                    {selectedApp.student?.weaknesses?.map((weak, idx) => (
                      <li key={idx} className="flex items-start space-x-2">
                        <span className="text-red-400 font-bold">•</span>
                        <span>{weak}</span>
                      </li>
                    )) || <li className="text-dark-muted italic">No parsed weaknesses available.</li>}
                  </ul>
                </div>

              </div>

              {/* PDF LIVE PREVIEW PANEL */}
              {pdfSignedUrl && (
                <div className="bg-dark-card border border-dark-border rounded-2xl p-6 space-y-4">
                  <div className="flex items-center justify-between border-b border-dark-border pb-2.5">
                    <h4 className="font-display font-bold text-white text-sm">Resume Document Preview</h4>
                    <a 
                      href={pdfSignedUrl} 
                      target="_blank" 
                      rel="noopener noreferrer" 
                      className="text-xs text-brand-400 hover:underline flex items-center space-x-1"
                    >
                      <span>Open in tab</span>
                      <ExternalLink size={12} />
                    </a>
                  </div>
                  <div className="bg-dark-bg rounded-xl overflow-hidden border border-dark-border h-[450px]">
                    <iframe 
                      src={`${pdfSignedUrl}#toolbar=0`} 
                      className="w-full h-full"
                      title="Candidate Resume Preview"
                    />
                  </div>
                </div>
              )}

            </div>

          </div>
        </div>
      )}

    </div>
  );
};

export default Applicants;
