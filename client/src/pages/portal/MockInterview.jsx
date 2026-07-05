import React, { useState, useEffect } from 'react';
import { apiFetch } from '../../lib/api';
import { 
  Sparkles, 
  Play, 
  ArrowRight, 
  ArrowLeft, 
  Send, 
  RotateCcw, 
  Award, 
  MessageSquare, 
  BrainCircuit, 
  HelpCircle,
  FileText 
} from 'lucide-react';

export const MockInterview = () => {
  // Setup States
  const [applications, setApplications] = useState([]);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  // Setup Form inputs
  const [targetType, setTargetType] = useState('role'); // 'role' or 'job'
  const [jobRoleInput, setJobRoleInput] = useState('');
  const [selectedAppId, setSelectedAppId] = useState('');

  // Active Session States
  const [sessionActive, setSessionActive] = useState(false);
  const [sessionId, setSessionId] = useState('');
  const [questions, setQuestions] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState({}); // maps question id to answer text
  const [submitting, setSubmitting] = useState(false);

  // Results State
  const [evaluation, setEvaluation] = useState(null);

  const loadInitialData = async () => {
    try {
      const apps = await apiFetch('/applications');
      setApplications(apps);

      const hist = await apiFetch('/ai/mock-interview/history');
      setHistory(hist);
    } catch (err) {
      console.error('Failed to load mock interview initial data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadInitialData();
  }, []);

  const handleStart = async (e) => {
    e.preventDefault();
    setLoading(true);
    setEvaluation(null);

    try {
      const body = {};
      if (targetType === 'role') {
        if (!jobRoleInput) throw new Error('Please input a target job role.');
        body.jobRole = jobRoleInput;
      } else {
        if (!selectedAppId) throw new Error('Please select one of your applied jobs.');
        body.appliedJobId = selectedAppId;
      }

      const response = await apiFetch('/ai/mock-interview/start', {
        method: 'POST',
        body: JSON.stringify(body)
      });

      setSessionId(response.sessionId);
      setQuestions(response.questions);
      setCurrentIndex(0);
      setAnswers({});
      setSessionActive(true);
    } catch (error) {
      alert(error.message || 'Failed to start interview session.');
    } finally {
      setLoading(false);
    }
  };

  const handleAnswerChange = (e) => {
    const qId = questions[currentIndex].id;
    setAnswers({
      ...answers,
      [qId]: e.target.value
    });
  };

  const handleNext = () => {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex(currentIndex + 1);
    }
  };

  const handlePrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    }
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      // Map answers state to required API format: [{ id, answer }]
      const payloadAnswers = questions.map(q => ({
        id: q.id,
        answer: answers[q.id] || ''
      }));

      const evalData = await apiFetch('/ai/mock-interview/submit', {
        method: 'POST',
        body: JSON.stringify({
          sessionId,
          answers: payloadAnswers
        })
      });

      setEvaluation(evalData.evaluation);
      setSessionActive(false);
      
      // Reload history
      const hist = await apiFetch('/ai/mock-interview/history');
      setHistory(hist);
    } catch (error) {
      alert(error.message || 'Failed to submit mock interview answers.');
    } finally {
      setSubmitting(false);
    }
  };

  const resetInterview = () => {
    setEvaluation(null);
    setSessionActive(false);
    setQuestions([]);
    setAnswers({});
  };

  if (loading) {
    return (
      <div className="flex-1 flex flex-col justify-center items-center py-20 space-y-4">
        <div className="w-12 h-12 rounded-full border-4 border-dark-border border-t-brand-500 animate-spin"></div>
        <p className="text-dark-muted font-display text-sm tracking-wide">Syncing interview terminal...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 text-left animate-in fade-in duration-200">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-display font-extrabold text-white">Practice Interviews 🎙️</h2>
        <p className="text-gray-400 text-sm mt-1">
          Simulate a real coding or behavioral round with our Gemini-powered technical recruiter.
        </p>
      </div>

      {/* CASE 1: NOT ACTIVE & NO EVALUATION -> SETUP FORM */}
      {!sessionActive && !evaluation && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start max-w-5xl">
          
          {/* Setup Form Card */}
          <div className="lg:col-span-2 bg-dark-card border border-dark-border rounded-2xl p-6 md:p-8 space-y-6">
            <h3 className="text-lg font-display font-bold text-white">Configure Practice Session</h3>
            
            <form onSubmit={handleStart} className="space-y-6">
              {/* Target Toggle */}
              <div className="flex space-x-4 bg-dark-bg p-1.5 rounded-xl border border-dark-border max-w-xs">
                <button
                  type="button"
                  onClick={() => setTargetType('role')}
                  className={`flex-1 text-center py-2 rounded-lg text-xs font-bold transition-all ${
                    targetType === 'role' 
                      ? 'bg-brand-600 text-white shadow' 
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  General Job Role
                </button>
                <button
                  type="button"
                  onClick={() => setTargetType('job')}
                  className={`flex-1 text-center py-2 rounded-lg text-xs font-bold transition-all ${
                    targetType === 'job' 
                      ? 'bg-brand-600 text-white shadow' 
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  Applied Job
                </button>
              </div>

              {/* Conditional Inputs */}
              {targetType === 'role' ? (
                <div className="space-y-1.5">
                  <label className="text-xs text-gray-300 font-semibold uppercase tracking-wider">Target Job Role</label>
                  <input
                    type="text"
                    required
                    value={jobRoleInput}
                    onChange={(e) => setJobRoleInput(e.target.value)}
                    placeholder="e.g. Frontend React Engineer, Full-Stack Developer"
                    className="w-full bg-dark-bg/60 border border-dark-border focus:border-brand-500 rounded-xl py-3 px-4 text-sm text-white placeholder-gray-600 outline-none transition-all"
                  />
                  <p className="text-[10px] text-dark-muted">We customize questions based on your profile skills and this target role.</p>
                </div>
              ) : (
                <div className="space-y-1.5">
                  <label className="text-xs text-gray-300 font-semibold uppercase tracking-wider">Select Applied Position</label>
                  {applications.length === 0 ? (
                    <div className="text-xs text-yellow-400 bg-yellow-500/10 border border-yellow-500/20 p-3 rounded-xl">
                      You haven't applied to any jobs yet. Please search and apply, or practice with a General Job Role.
                    </div>
                  ) : (
                    <select
                      value={selectedAppId}
                      onChange={(e) => setSelectedAppId(e.target.value)}
                      required
                      className="w-full bg-dark-bg/60 border border-dark-border focus:border-brand-500 rounded-xl py-3 px-4 text-sm text-gray-400 outline-none transition-all appearance-none"
                    >
                      <option value="">-- Choose Application --</option>
                      {applications.map(app => (
                        <option key={app.id} value={app.job_id}>
                          {app.job?.title} at {app.job?.recruiter?.company_name}
                        </option>
                      ))}
                    </select>
                  )}
                </div>
              )}

              {/* Action Submit */}
              <button
                type="submit"
                disabled={targetType === 'job' && applications.length === 0}
                className="w-full bg-gradient-to-r from-brand-600 to-accent-purple hover:opacity-90 disabled:opacity-50 text-white rounded-xl py-3.5 font-bold shadow-lg shadow-brand-600/15 flex items-center justify-center space-x-2"
              >
                <Play size={16} />
                <span>Initialize AI Interviewer</span>
              </button>
            </form>
          </div>

          {/* History Panel */}
          <div className="bg-dark-card border border-dark-border rounded-2xl p-6 space-y-4">
            <h4 className="font-display font-bold text-white text-sm border-b border-dark-border pb-2.5">
              Practice History
            </h4>

            {history.length === 0 ? (
              <p className="text-xs text-dark-muted py-4 text-center">No completed practice sessions found.</p>
            ) : (
              <div className="space-y-4 max-h-[300px] overflow-y-auto pr-1">
                {history.map((session) => (
                  <div key={session.id} className="border-b border-dark-border/40 pb-3 last:border-0 last:pb-0 text-xs">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-semibold text-white truncate max-w-[140px]">
                          {session.job?.title || 'General Practice'}
                        </p>
                        <p className="text-[10px] text-dark-muted mt-0.5">
                          {new Date(session.created_at).toLocaleDateString()}
                        </p>
                      </div>
                      <span className="font-bold text-emerald-400">
                        {Math.round(session.overall_score)}/100
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>
      )}

      {/* CASE 2: INTERVIEW IN PROGRESS -> ACTIVE WIZARD */}
      {sessionActive && questions.length > 0 && (
        <div className="max-w-3xl bg-dark-card border border-dark-border rounded-2xl p-6 md:p-8 space-y-6 relative overflow-hidden">
          {/* Top Progress bar */}
          <div className="space-y-2">
            <div className="flex justify-between items-center text-xs">
              <span className="font-bold uppercase tracking-wider text-[10px] text-brand-400">
                Mock technical screen in progress
              </span>
              <span className="text-gray-400 font-medium">
                Question {currentIndex + 1} of {questions.length}
              </span>
            </div>
            <div className="w-full bg-dark-border h-1.5 rounded-full overflow-hidden">
              <div 
                className="bg-brand-500 h-full transition-all duration-300"
                style={{ width: `${((currentIndex + 1) / questions.length) * 100}%` }}
              ></div>
            </div>
          </div>

          {/* Question Box */}
          <div className="bg-dark-bg/60 border border-dark-border/60 p-5 rounded-2xl space-y-2 text-left relative">
            <span className="inline-block text-[9px] font-bold uppercase tracking-wider bg-brand-500/15 text-brand-400 px-2 py-0.5 rounded border border-brand-500/20">
              {questions[currentIndex].type}
            </span>
            <h4 className="text-sm font-bold text-white leading-relaxed pt-1">
              {questions[currentIndex].question}
            </h4>
            <p className="text-[10px] text-dark-muted italic">Focus: {questions[currentIndex].focus}</p>
          </div>

          {/* Textarea answer input */}
          <div className="space-y-1.5">
            <label className="text-xs text-gray-300 font-semibold uppercase tracking-wider">Your Answer</label>
            <textarea
              rows="6"
              value={answers[questions[currentIndex].id] || ''}
              onChange={handleAnswerChange}
              placeholder="Type your structured technical answer or behavioral description here..."
              className="w-full bg-dark-bg/60 border border-dark-border focus:border-brand-500 rounded-xl py-3 px-4 text-sm text-white placeholder-gray-600 outline-none transition-all resize-none"
            />
          </div>

          {/* Navigation Controls */}
          <div className="flex justify-between items-center pt-2">
            <button
              onClick={handlePrev}
              disabled={currentIndex === 0}
              className="flex items-center space-x-1 text-xs text-gray-400 hover:text-white disabled:opacity-30 disabled:hover:text-gray-400 py-2.5 px-4 rounded-xl border border-dark-border hover:bg-dark-border/40 transition-all font-semibold"
            >
              <ArrowLeft size={14} />
              <span>Back</span>
            </button>

            {currentIndex < questions.length - 1 ? (
              <button
                onClick={handleNext}
                className="flex items-center space-x-1 bg-brand-600 hover:bg-brand-700 text-white text-xs font-bold py-2.5 px-5 rounded-xl shadow-lg transition-all"
              >
                <span>Next Question</span>
                <ArrowRight size={14} />
              </button>
            ) : (
              <button
                onClick={handleSubmit}
                disabled={submitting}
                className="flex items-center space-x-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:opacity-90 disabled:opacity-50 text-white text-xs font-bold py-2.5 px-6 rounded-xl shadow-lg transition-all"
              >
                {submitting ? (
                  <span className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin"></span>
                ) : (
                  <>
                    <Send size={14} />
                    <span>Submit Interview</span>
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      )}

      {/* CASE 3: INTERVIEW COMPLETED -> SHOW RESULTS BREAKDOWN */}
      {evaluation && (
        <div className="max-w-4xl space-y-6 animate-in zoom-in-95 duration-200">
          
          {/* Main Score Header */}
          <div className="bg-dark-card border border-dark-border rounded-2xl p-6 md:p-8 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="flex items-center space-x-5 text-left">
              {/* circular score */}
              <div className="w-20 h-20 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center shrink-0">
                <span className="font-display font-extrabold text-2xl text-emerald-400">
                  {Math.round(evaluation.overallScore)}
                </span>
              </div>
              <div>
                <h3 className="font-display font-extrabold text-xl text-white">Interview Score Card</h3>
                <p className="text-xs text-dark-muted mt-0.5">Evaluated in real-time by engineering management engines</p>
              </div>
            </div>

            <button
              onClick={resetInterview}
              className="flex items-center space-x-2 bg-dark-border hover:bg-dark-border/80 border border-transparent text-gray-200 font-bold py-3 px-5 rounded-xl text-xs transition-all shrink-0"
            >
              <RotateCcw size={14} />
              <span>Practice Again</span>
            </button>
          </div>

          {/* Detailed Dimension Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Tech knowledge */}
            <div className="bg-dark-card border border-dark-border p-6 rounded-2xl text-left space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-xs text-dark-muted font-bold uppercase tracking-wider">Technical Knowledge</span>
                <span className="font-display font-bold text-emerald-400 text-sm">{evaluation.technicalKnowledge}%</span>
              </div>
              <div className="w-full bg-dark-border h-2 rounded-full overflow-hidden">
                <div className="bg-emerald-500 h-full rounded-full" style={{ width: `${evaluation.technicalKnowledge}%` }}></div>
              </div>
            </div>

            {/* Communication */}
            <div className="bg-dark-card border border-dark-border p-6 rounded-2xl text-left space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-xs text-dark-muted font-bold uppercase tracking-wider">Communication Quality</span>
                <span className="font-display font-bold text-brand-400 text-sm">{evaluation.communication}%</span>
              </div>
              <div className="w-full bg-dark-border h-2 rounded-full overflow-hidden">
                <div className="bg-brand-500 h-full rounded-full" style={{ width: `${evaluation.communication}%` }}></div>
              </div>
            </div>

            {/* Problem Solving */}
            <div className="bg-dark-card border border-dark-border p-6 rounded-2xl text-left space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-xs text-dark-muted font-bold uppercase tracking-wider">Problem Solving</span>
                <span className="font-display font-bold text-accent-purple text-sm">{evaluation.problemSolving}%</span>
              </div>
              <div className="w-full bg-dark-border h-2 rounded-full overflow-hidden">
                <div className="bg-accent-purple h-full rounded-full" style={{ width: `${evaluation.problemSolving}%` }}></div>
              </div>
            </div>
          </div>

          {/* Feedback summary */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-left text-xs">
            <div className="bg-dark-card border border-dark-border p-6 rounded-2xl space-y-2">
              <h4 className="font-display font-bold text-white text-sm flex items-center space-x-2">
                <Award size={14} className="text-emerald-400" />
                <span>Strengths</span>
              </h4>
              <p className="text-gray-300 leading-relaxed pt-1">{evaluation.feedback?.strengths}</p>
            </div>

            <div className="bg-dark-card border border-dark-border p-6 rounded-2xl space-y-2">
              <h4 className="font-display font-bold text-white text-sm flex items-center space-x-2">
                <MessageSquare size={14} className="text-yellow-400" />
                <span>Areas to Improve</span>
              </h4>
              <p className="text-gray-300 leading-relaxed pt-1">{evaluation.feedback?.areasOfImprovement}</p>
            </div>

            <div className="bg-dark-card border border-dark-border p-6 rounded-2xl space-y-2">
              <h4 className="font-display font-bold text-white text-sm flex items-center space-x-2">
                <BrainCircuit size={14} className="text-red-400" />
                <span>Technical Gaps Found</span>
              </h4>
              <p className="text-gray-300 leading-relaxed pt-1">{evaluation.feedback?.technicalGaps}</p>
            </div>
          </div>

          {/* Actionable suggestions list */}
          <div className="bg-dark-card border border-dark-border rounded-2xl p-6 text-left space-y-4">
            <h4 className="font-display font-bold text-white text-sm flex items-center space-x-2">
              <HelpCircle size={16} className="text-brand-400" />
              <span>Grading Officer Recommendations</span>
            </h4>
            
            <div className="space-y-2.5">
              {evaluation.suggestions?.map((sug, idx) => (
                <div key={idx} className="flex items-start space-x-2.5 bg-dark-bg/40 p-3 rounded-xl border border-dark-border/40 text-xs">
                  <span className="text-brand-450 font-bold shrink-0 mt-0.5">•</span>
                  <p className="text-gray-300 leading-relaxed">{sug}</p>
                </div>
              ))}
            </div>
          </div>

        </div>
      )}
    </div>
  );
};

export default MockInterview;
