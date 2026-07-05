import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabaseClient';
import { apiFetch } from '../../lib/api';
import { 
  Sparkles, 
  UploadCloud, 
  FileText, 
  CheckCircle, 
  XCircle, 
  ShieldAlert, 
  Info, 
  RotateCw, 
  ExternalLink 
} from 'lucide-react';

export const ResumeInsights = () => {
  const { profile, refreshProfile } = useAuth();
  
  // Storage & PDF State
  const [resumeUrl, setResumeUrl] = useState('');
  const [pdfSignedUrl, setPdfSignedUrl] = useState('');
  const [uploadDate, setUploadDate] = useState('');
  
  // UI & AI State
  const [uploading, setUploading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [insights, setInsights] = useState(null);

  // AI Optimizer State
  const [optimizing, setOptimizing] = useState(false);
  const [optimizerSuggestions, setOptimizerSuggestions] = useState(null);

  const handleOptimizeResume = async () => {
    setOptimizing(true);
    setErrorMsg('');
    try {
      const response = await apiFetch('/profile/resume/optimize', {
        method: 'POST'
      });
      setOptimizerSuggestions(response.suggestions);
    } catch (err) {
      console.error('[Optimize Resume Error]:', err);
      setErrorMsg(err.message || 'Failed to generate resume optimization recommendations.');
    } finally {
      setOptimizing(false);
    }
  };

  useEffect(() => {
    if (profile) {
      const details = profile.profileDetails || {};
      setResumeUrl(details.resume_url || '');
      setUploadDate(details.updated_at ? new Date(details.updated_at).toLocaleDateString() : '');
      
      // Load current database insights if already scanned
      if (details.ats_score > 0) {
        setInsights({
          ats_score: details.ats_score,
          skills_matched: details.skills_matched || [],
          skills_missing: details.skills_missing || [],
          strengths: details.strengths || [],
          weaknesses: details.weaknesses || [],
          improvement_suggestions: details.improvement_suggestions || [],
          overall_recommendation: details.overall_recommendation || ''
        });
      }

      // Generate a signed URL for the PDF preview if a resume exists
      if (details.resume_url) {
        generateSignedPreviewUrl();
      }
    }
  }, [profile]);

  const generateSignedPreviewUrl = async () => {
    try {
      const userId = profile.id;
      const { data, error } = await supabase.storage
        .from('resumes')
        .createSignedUrl(`${userId}/resume.pdf`, 3600); // 1 hour expiry

      if (!error && data) {
        setPdfSignedUrl(data.signedUrl);
      }
    } catch (err) {
      console.error('Failed to generate preview URL:', err);
    }
  };

  const handleResumeUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Strict type check
    if (file.type !== 'application/pdf') {
      setErrorMsg('Invalid file format. Please upload a PDF resume.');
      return;
    }

    setUploading(true);
    setErrorMsg('');
    setInsights(null);

    try {
      const userId = profile.id;
      const filePath = `${userId}/resume.pdf`;

      // 1. Upload to Supabase Storage (upsert true to replace existing)
      const { error: storageError } = await supabase.storage
        .from('resumes')
        .upload(filePath, file, { upsert: true, contentType: 'application/pdf' });

      if (storageError) throw storageError;

      // 2. Call backend API to parse text, call Gemini, and update database
      const response = await apiFetch('/profile/resume', {
        method: 'POST',
        body: JSON.stringify({ storagePath: filePath })
      });

      // 3. Update local state
      setInsights(response.insights);
      setResumeUrl(response.resumeUrl);
      setUploadDate(new Date().toLocaleDateString());
      await refreshProfile();
      await generateSignedPreviewUrl();
    } catch (error) {
      console.error('[Resume Upload & Process Error]:', error);
      setErrorMsg(error.message || 'An error occurred during resume processing.');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-8 text-left animate-in fade-in duration-200">
      {/* Page Header */}
      <div>
        <h2 className="text-2xl font-display font-extrabold text-white">AI Resume Insights 🎓</h2>
        <p className="text-gray-400 text-sm mt-1">
          Scans your resume PDF against modern industry benchmarks to calculate ATS scores and find skill gaps.
        </p>
      </div>

      {errorMsg && (
        <div className="flex items-center space-x-2 bg-red-950/20 border border-red-800/40 p-4 rounded-xl text-red-400 text-xs max-w-4xl">
          <ShieldAlert size={16} className="shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Main Grid: Upload Panel & AI Analytics */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        
        {/* Left Column: Upload card & PDF preview */}
        <div className="space-y-6">
          <div className="bg-dark-card border border-dark-border rounded-2xl p-6 space-y-4">
            <h4 className="font-display font-bold text-white text-sm">Resume Document</h4>
            
            {uploading ? (
              <div className="py-12 flex flex-col items-center space-y-4 text-center">
                <div className="relative w-12 h-12">
                  <div className="absolute inset-0 rounded-full border-4 border-dark-border"></div>
                  <div className="absolute inset-0 rounded-full border-4 border-brand-500 border-t-transparent animate-spin"></div>
                </div>
                <div>
                  <p className="text-sm font-semibold text-white">Analyzing with Gemini AI...</p>
                  <p className="text-[10px] text-dark-muted mt-0.5">Extracting keywords & parsing layout</p>
                </div>
              </div>
            ) : resumeUrl ? (
              <div className="space-y-4">
                <div className="flex items-center space-x-3 bg-dark-bg/60 p-4 rounded-xl border border-dark-border">
                  <FileText className="text-brand-400 shrink-0" size={24} />
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-bold text-white truncate">resume.pdf</p>
                    <p className="text-[10px] text-dark-muted">Uploaded: {uploadDate}</p>
                  </div>
                  <CheckCircle size={16} className="text-emerald-400 shrink-0" />
                </div>
                
                {/* Replace Button */}
                <label className="w-full flex items-center justify-center space-x-2 bg-dark-border hover:bg-dark-border/80 border border-transparent hover:border-brand-500/20 text-gray-200 py-3 rounded-xl cursor-pointer text-xs font-bold transition-all">
                  <RotateCw size={14} />
                  <span>Replace Resume</span>
                  <input 
                    type="file" 
                    accept=".pdf,application/pdf" 
                    onChange={handleResumeUpload} 
                    className="hidden"
                  />
                </label>
              </div>
            ) : (
              <div className="border border-dashed border-dark-border hover:border-brand-500/50 rounded-2xl p-8 text-center cursor-pointer transition-all relative group">
                <label className="cursor-pointer block space-y-4">
                  <UploadCloud className="mx-auto text-gray-500 group-hover:text-brand-400 transition-colors" size={36} />
                  <div>
                    <h5 className="text-sm font-bold text-white">Upload Resume PDF</h5>
                    <p className="text-[10px] text-dark-muted mt-1 leading-relaxed">
                      Select or drag & drop. Only PDF files up to 5MB are processed by our scanners.
                    </p>
                  </div>
                  <input 
                    type="file" 
                    accept=".pdf,application/pdf" 
                    onChange={handleResumeUpload} 
                    className="hidden"
                  />
                </label>
              </div>
            )}
          </div>

          {/* PDF Live Preview Card */}
          {pdfSignedUrl && (
            <div className="bg-dark-card border border-dark-border rounded-2xl p-6 space-y-3">
              <div className="flex items-center justify-between border-b border-dark-border pb-2.5">
                <h4 className="font-display font-bold text-white text-xs">Resume Preview</h4>
                <a 
                  href={pdfSignedUrl} 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="text-[10px] text-brand-400 hover:underline flex items-center space-x-1"
                >
                  <span>Open PDF</span>
                  <ExternalLink size={10} />
                </a>
              </div>
              <div className="bg-dark-bg rounded-xl overflow-hidden border border-dark-border h-[320px]">
                <iframe 
                  src={`${pdfSignedUrl}#toolbar=0`} 
                  className="w-full h-full"
                  title="PDF Preview"
                />
              </div>
            </div>
          )}
        </div>

        {/* Right Column: AI Insights Breakdown */}
        <div className="lg:col-span-2 space-y-6">
          {!insights ? (
            <div className="bg-dark-card border border-dark-border rounded-2xl p-12 text-center text-dark-muted space-y-4">
              <Sparkles size={32} className="mx-auto text-gray-600" />
              <div>
                <h4 className="font-display font-bold text-white text-lg">No Analysis Available</h4>
                <p className="text-xs text-dark-muted mt-1 max-w-sm mx-auto">
                  Upload your professional PDF resume to activate Gemini AI parsing, scan for keyword matches, and calculate your domain fit score.
                </p>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-6">
              
              {/* ATS SCORE BOX */}
              <div className="bg-dark-card border border-dark-border rounded-2xl p-6 md:p-8 flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="flex items-center space-x-5">
                  {/* Circle Score Meter */}
                  <div className="relative w-20 h-20 flex items-center justify-center shrink-0">
                    <svg className="w-20 h-20 transform -rotate-90">
                      <circle cx="40" cy="40" r="34" className="stroke-dark-border fill-transparent" strokeWidth="6" />
                      <circle 
                        cx="40" 
                        cy="40" 
                        r="34" 
                        className={`fill-transparent transition-all duration-1000 ${
                          insights.ats_score >= 80 ? 'stroke-emerald-400' :
                          insights.ats_score >= 60 ? 'stroke-yellow-400' : 'stroke-red-400'
                        }`}
                        strokeWidth="6" 
                        strokeDasharray={213.6}
                        strokeDashoffset={213.6 - (213.6 * insights.ats_score) / 100}
                        strokeLinecap="round"
                      />
                    </svg>
                    <span className="absolute font-display font-extrabold text-xl text-white">
                      {Math.round(insights.ats_score)}
                    </span>
                  </div>
                  <div>
                    <h3 className="font-display font-extrabold text-xl text-white">ATS Scanned Rating</h3>
                    <p className="text-xs text-dark-muted mt-0.5">Scanned dynamically against domain roles</p>
                  </div>
                </div>

                <div className="max-w-md bg-dark-bg/60 border border-dark-border px-4 py-3 rounded-xl text-xs text-gray-300 leading-relaxed text-left">
                  <span className="font-bold text-brand-400">Gemini Recommendation:</span> {insights.overall_recommendation}
                </div>
              </div>

              {/* SKILLS MATCH MATRIX */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                {/* Matched Skills */}
                <div className="bg-dark-card border border-dark-border rounded-2xl p-6">
                  <h4 className="font-display font-bold text-white text-sm flex items-center space-x-2 mb-4">
                    <CheckCircle className="text-emerald-400" size={16} />
                    <span>Skills Matched ({insights.skills_matched?.length || 0})</span>
                  </h4>
                  {insights.skills_matched?.length === 0 ? (
                    <p className="text-xs text-dark-muted">No specific skills identified.</p>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {insights.skills_matched?.map((skill) => (
                        <span key={skill} className="text-[10px] font-bold bg-emerald-500/10 text-emerald-400 px-2.5 py-1 rounded-full border border-emerald-500/20">
                          {skill}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* Missing Skills */}
                <div className="bg-dark-card border border-dark-border rounded-2xl p-6">
                  <h4 className="font-display font-bold text-white text-sm flex items-center space-x-2 mb-4">
                    <XCircle className="text-yellow-400" size={16} />
                    <span>Target Missing Skills ({insights.skills_missing?.length || 0})</span>
                  </h4>
                  {insights.skills_missing?.length === 0 ? (
                    <p className="text-xs text-dark-muted">Excellent! No missing core skills identified.</p>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {insights.skills_missing?.map((skill) => (
                        <span key={skill} className="text-[10px] font-bold bg-yellow-500/10 text-yellow-400 px-2.5 py-1 rounded-full border border-yellow-500/20">
                          {skill}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

              </div>

              {/* STRENGTHS & WEAKNESSES */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                {/* Strengths */}
                <div className="bg-dark-card border border-dark-border rounded-2xl p-6 space-y-3">
                  <h4 className="font-display font-bold text-white text-sm">Resume Strengths</h4>
                  <ul className="space-y-2 text-xs text-gray-300">
                    {insights.strengths?.map((str, idx) => (
                      <li key={idx} className="flex items-start space-x-2">
                        <span className="text-emerald-400 mt-0.5">•</span>
                        <span>{str}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Weaknesses */}
                <div className="bg-dark-card border border-dark-border rounded-2xl p-6 space-y-3">
                  <h4 className="font-display font-bold text-white text-sm">Areas for Improvement</h4>
                  <ul className="space-y-2 text-xs text-gray-300">
                    {insights.weaknesses?.map((weak, idx) => (
                      <li key={idx} className="flex items-start space-x-2">
                        <span className="text-red-400 mt-0.5">•</span>
                        <span>{weak}</span>
                      </li>
                    ))}
                  </ul>
                </div>

              </div>

              {/* ACTIONABLE IMPROVEMENT SUGGESTIONS */}
              <div className="bg-dark-card border border-dark-border rounded-2xl p-6 space-y-4">
                <h4 className="font-display font-bold text-white text-sm flex items-center space-x-2">
                  <Info className="text-brand-400" size={16} />
                  <span>Resume Improvement Roadmap</span>
                </h4>
                
                <div className="space-y-3">
                  {insights.improvement_suggestions?.map((sug, idx) => (
                    <div key={idx} className="flex items-start space-x-3 bg-dark-bg/40 p-3.5 rounded-xl border border-dark-border/40">
                      <span className="w-5 h-5 rounded-full bg-brand-500/10 border border-brand-500/20 text-brand-400 flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5">
                        {idx + 1}
                      </span>
                      <p className="text-xs text-gray-300 leading-relaxed">{sug}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* RESUME OPTIMIZER MODULE */}
              <div className="bg-dark-card border border-dark-border rounded-2xl p-6 space-y-6">
                <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 border-b border-dark-border pb-4">
                  <div>
                    <h4 className="font-display font-bold text-white text-sm flex items-center space-x-2">
                      <Sparkles className="text-brand-400" size={16} />
                      <span>AI Resume Wording Optimizer</span>
                    </h4>
                    <p className="text-[10px] text-dark-muted mt-0.5">Generates STAR-based rewrites and wording adjustments for copy-pasting</p>
                  </div>
                  
                  {!optimizerSuggestions && (
                    <button
                      type="button"
                      onClick={handleOptimizeResume}
                      disabled={optimizing}
                      className="bg-brand-600 hover:bg-brand-700 text-white font-bold py-2 px-4 rounded-xl text-xs transition-all flex items-center space-x-1.5 shrink-0 self-start sm:self-auto disabled:opacity-50"
                    >
                      {optimizing ? (
                        <span className="w-3.5 h-3.5 rounded-full border border-white border-t-transparent animate-spin mr-1.5"></span>
                      ) : (
                        <Sparkles size={13} className="mr-1" />
                      )}
                      <span>{optimizing ? 'Optimizing Wording...' : 'Improve My Resume'}</span>
                    </button>
                  )}
                </div>

                {optimizing && (
                  <div className="py-8 flex flex-col items-center space-y-3 text-center">
                    <div className="w-8 h-8 rounded-full border-4 border-dark-border border-t-brand-500 animate-spin"></div>
                    <p className="text-dark-muted text-xs">Analyzing wording context & generating suggestions...</p>
                  </div>
                )}

                {optimizerSuggestions && (
                  <div className="space-y-6 animate-in fade-in duration-200">
                    
                    {/* Wording Improvements Table */}
                    {optimizerSuggestions.wording_improvements?.length > 0 && (
                      <div className="space-y-3 text-left">
                        <span className="font-bold text-xs uppercase tracking-wider text-brand-400">Verb Wording Adjustments</span>
                        <div className="space-y-3">
                          {optimizerSuggestions.wording_improvements.map((item, idx) => (
                            <div key={idx} className="bg-dark-bg/50 p-4 rounded-xl border border-dark-border/50 text-xs space-y-2">
                              <p className="text-red-400 line-through font-light">Original: "{item.original}"</p>
                              <p className="text-emerald-400 font-semibold">Improved: "{item.improved}"</p>
                              <p className="text-[10px] text-dark-muted italic font-light">Benefit: {item.benefit}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Project Descriptions STAR method */}
                    {optimizerSuggestions.project_descriptions?.length > 0 && (
                      <div className="space-y-3 text-left">
                        <span className="font-bold text-xs uppercase tracking-wider text-brand-400">STAR-Impact Project Rewrites</span>
                        <div className="space-y-3">
                          {optimizerSuggestions.project_descriptions.map((item, idx) => (
                            <div key={idx} className="bg-dark-bg/50 p-4 rounded-xl border border-dark-border/50 text-xs space-y-2">
                              <p className="font-bold text-white text-[11px]">{item.project}</p>
                              <p className="text-red-400 line-through font-light">Original: "{item.original}"</p>
                              <p className="text-emerald-400 font-semibold">Improved: "{item.improved}"</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Missing Keywords & Suggested Skills */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      
                      {/* Suggested Skills */}
                      <div className="space-y-2 text-left">
                        <span className="font-bold text-xs uppercase tracking-wider text-brand-400 block">Recommended Skills Layout</span>
                        <div className="flex flex-wrap gap-1.5 pt-1">
                          {optimizerSuggestions.skills_section?.add_skills?.map((skill, idx) => (
                            <span key={idx} className="text-[9px] font-bold bg-brand-500/10 text-brand-400 px-2 py-0.5 rounded border border-brand-500/20">
                              {skill}
                            </span>
                          ))}
                        </div>
                        <p className="text-[10px] text-dark-muted pt-1">Grouped as: {optimizerSuggestions.skills_section?.group_by}</p>
                      </div>

                      {/* Missing Keywords */}
                      <div className="space-y-2 text-left">
                        <span className="font-bold text-xs uppercase tracking-wider text-yellow-450 block">Target ATS Keywords to Add</span>
                        <div className="flex flex-wrap gap-1.5 pt-1">
                          {optimizerSuggestions.missing_keywords?.map((keyword, idx) => (
                            <span key={idx} className="text-[9px] font-bold bg-yellow-500/10 text-yellow-400 px-2 py-0.5 rounded border border-yellow-500/20">
                              {keyword}
                            </span>
                          ))}
                        </div>
                      </div>

                    </div>

                    <div className="flex items-center space-x-2 bg-brand-500/5 p-3.5 rounded-xl border border-brand-500/10 text-[10px] text-dark-muted">
                      <Info size={14} className="text-brand-400 shrink-0" />
                      <span>These are suggestions only. Your original resume file uploaded in Supabase is not changed.</span>
                    </div>

                  </div>
                )}
              </div>

            </div>
          )}
        </div>

      </div>
    </div>
  );
};

export default ResumeInsights;
