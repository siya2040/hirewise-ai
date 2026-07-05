import React from 'react';
import { Link } from 'react-router-dom';
import { 
  Sparkles, 
  Briefcase, 
  Bot, 
  ArrowRight, 
  Award, 
  ShieldCheck, 
  Users 
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export const LandingPage = () => {
  const { user, userRole } = useAuth();

  const getStartedPath = user 
    ? (userRole === 'recruiter' ? '/recruiter/dashboard' : '/portal/dashboard') 
    : '/register';

  return (
    <div className="min-h-screen bg-dark-deep relative overflow-hidden flex flex-col justify-between">
      {/* Decorative Glow Elements */}
      <div className="absolute top-[10%] left-[-15%] w-[60vw] h-[60vw] bg-brand-500/10 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute bottom-[20%] right-[-15%] w-[60vw] h-[60vw] bg-accent-purple/10 rounded-full blur-[140px] pointer-events-none" />

      {/* 1. TOP NAVIGATION BAR */}
      <header className="w-full max-w-7xl mx-auto px-6 h-20 flex items-center justify-between z-10 relative">
        <Link to="/" className="flex items-center space-x-2.5">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-brand-600 to-accent-purple flex items-center justify-center shadow-lg shadow-brand-600/20">
            <span className="font-display font-extrabold text-white text-xl">H</span>
          </div>
          <span className="font-display font-bold text-2xl text-white tracking-tight">
            HireWise <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-400 to-accent-purple font-extrabold">AI</span>
          </span>
        </Link>
        
        <div className="flex items-center space-x-4">
          <Link to="/jobs" className="text-gray-400 hover:text-white transition-colors text-sm font-medium">
            Browse Jobs
          </Link>
          
          <div className="h-4 w-px bg-dark-border"></div>

          {user ? (
            <Link 
              to={getStartedPath}
              className="bg-brand-600 hover:bg-brand-700 text-white px-5 py-2 rounded-xl text-sm font-bold shadow-lg shadow-brand-600/15 transition-all duration-200"
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
                className="bg-brand-600 hover:bg-brand-700 text-white px-5 py-2.5 rounded-xl text-sm font-bold shadow-lg shadow-brand-600/20 hover:shadow-brand-600/30 transition-all duration-200"
              >
                Get Started
              </Link>
            </>
          )}
        </div>
      </header>

      {/* 2. HERO CONTENT SECTION */}
      <main className="max-w-7xl mx-auto px-6 py-12 md:py-24 grid grid-cols-1 lg:grid-cols-2 gap-16 items-center flex-1 relative z-10">
        <div className="space-y-8 text-left max-w-2xl">
          <div className="inline-flex items-center space-x-2 bg-brand-500/10 border border-brand-500/20 px-3.5 py-1.5 rounded-full">
            <Sparkles size={14} className="text-brand-400" />
            <span className="text-xs font-bold text-brand-400 uppercase tracking-widest">
              AI recruitment redefined
            </span>
          </div>

          <h1 className="font-display font-extrabold text-5xl md:text-6xl text-white leading-tight">
            Match smarter.<br />
            Hire faster. <br />
            Get <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-400 via-brand-500 to-accent-purple">HireWise</span>.
          </h1>

          <p className="text-gray-400 text-lg md:text-xl font-light leading-relaxed">
            HireWise AI bridges the gap between candidates and recruiters using generative artificial intelligence. Optimize your resume, practice coding technical screens, and recruit verified talent.
          </p>

          <div className="flex flex-col sm:flex-row space-y-4 sm:space-y-0 sm:space-x-4 pt-4">
            <Link 
              to={getStartedPath}
              className="bg-gradient-to-r from-brand-600 to-brand-700 hover:from-brand-500 hover:to-brand-600 text-white px-8 py-4 rounded-2xl font-bold shadow-xl shadow-brand-600/25 hover:shadow-brand-500/30 flex items-center justify-center space-x-2.5 transition-all duration-300 transform hover:-translate-y-0.5 group"
            >
              <span>{user ? 'Go to Portal' : 'Create Free Account'}</span>
              <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
            </Link>
            
            <Link 
              to="/jobs" 
              className="bg-dark-card border border-dark-border hover:bg-dark-border/60 text-gray-200 hover:text-white px-8 py-4 rounded-2xl font-bold flex items-center justify-center space-x-2 transition-all duration-200"
            >
              <Briefcase size={18} />
              <span>Explore Opportunities</span>
            </Link>
          </div>

          {/* Simple statistics badges */}
          <div className="grid grid-cols-3 gap-6 pt-10 border-t border-dark-border/40">
            <div>
              <p className="font-display font-extrabold text-3xl text-white">98%</p>
              <p className="text-xs text-dark-muted font-semibold mt-1">ATS Accuracy</p>
            </div>
            <div>
              <p className="font-display font-extrabold text-3xl text-white">10x</p>
              <p className="text-xs text-dark-muted font-semibold mt-1">Faster Screening</p>
            </div>
            <div>
              <p className="font-display font-extrabold text-3xl text-white">15k+</p>
              <p className="text-xs text-dark-muted font-semibold mt-1">Matches Made</p>
            </div>
          </div>
        </div>

        {/* Hero Visual Mockup Grid */}
        <div className="relative">
          {/* Main Visual Layout Card */}
          <div className="glass-premium rounded-3xl p-6 md:p-8 border border-white/10 shadow-2xl relative z-10">
            <div className="flex items-center justify-between pb-6 border-b border-dark-border">
              <div className="flex space-x-2">
                <span className="w-3.5 h-3.5 rounded-full bg-red-500/80"></span>
                <span className="w-3.5 h-3.5 rounded-full bg-yellow-500/80"></span>
                <span className="w-3.5 h-3.5 rounded-full bg-green-500/80"></span>
              </div>
              <span className="text-[10px] text-brand-400 font-bold tracking-widest uppercase bg-brand-500/10 px-3 py-1 rounded-full border border-brand-500/20">
                Mockup System Active
              </span>
            </div>

            <div className="mt-6 space-y-6">
              {/* Profile Card Mockup */}
              <div className="flex items-center space-x-4 bg-dark-bg/60 p-4 rounded-2xl border border-dark-border">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-brand-600 to-accent-purple flex items-center justify-center font-display font-bold text-white text-lg">
                  AI
                </div>
                <div className="flex-1 text-left">
                  <h4 className="text-sm font-semibold text-white">Resume Feedback Engine</h4>
                  <p className="text-xs text-dark-muted">Matching skills against market benchmarks...</p>
                </div>
                <div className="bg-brand-500/20 text-brand-400 border border-brand-500/30 px-3 py-1 rounded-xl text-xs font-bold">
                  92 ATS
                </div>
              </div>

              {/* Recruitment Leaderboard Mockup */}
              <div className="space-y-3 bg-dark-bg/60 p-5 rounded-2xl border border-dark-border text-left">
                <h4 className="text-xs font-extrabold text-white uppercase tracking-wider mb-2">
                  Top Candidates Match Leaderboard
                </h4>
                
                {/* Row 1 */}
                <div className="flex items-center justify-between py-1.5 border-b border-dark-border/40 text-xs">
                  <span className="text-gray-300 font-medium">Alex Rivera (Software Engineer)</span>
                  <span className="text-emerald-400 font-bold bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                    96% match
                  </span>
                </div>
                
                {/* Row 2 */}
                <div className="flex items-center justify-between py-1.5 border-b border-dark-border/40 text-xs">
                  <span className="text-gray-300 font-medium">Chloe Zhang (Frontend Lead)</span>
                  <span className="text-emerald-400 font-bold bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                    91% match
                  </span>
                </div>

                {/* Row 3 */}
                <div className="flex items-center justify-between py-1.5 text-xs">
                  <span className="text-gray-300 font-medium">Marcus Vance (Full-Stack Engineer)</span>
                  <span className="text-yellow-400 font-bold bg-yellow-500/10 px-2 py-0.5 rounded border border-yellow-500/20">
                    84% match
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* 3. CORE PLATFORM FEATURES SECTION */}
      <section className="bg-dark-bg border-t border-dark-border py-20 relative z-10">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center max-w-3xl mx-auto space-y-4 mb-16">
            <h2 className="font-display font-extrabold text-3xl md:text-4xl text-white">
              SaaS Engine Engineered for Modern Hiring
            </h2>
            <p className="text-gray-400">
              Skip manually sorting resumes and sending basic form rejection emails. Our automated AI parser delivers insights for both student growth and recruiter vetting.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Card 1: Resume Insights */}
            <div className="glass bg-dark-card p-8 rounded-2xl border border-dark-border/50 hover:border-brand-500/30 transition-all duration-300 group hover:-translate-y-1">
              <div className="w-12 h-12 rounded-xl bg-brand-500/10 flex items-center justify-center mb-6 group-hover:bg-brand-500/20 transition-colors">
                <Bot className="text-brand-400" size={24} />
              </div>
              <h3 className="font-display font-semibold text-xl text-white mb-3 text-left">
                AI Resume Insights
              </h3>
              <p className="text-gray-400 text-sm leading-relaxed text-left">
                Get an instant, actionable breakdown of your resume score, missing industry skills, vocabulary recommendations, and weaknesses, keeping insights private to you.
              </p>
            </div>

            {/* Card 2: AI Job Description Generator */}
            <div className="glass bg-dark-card p-8 rounded-2xl border border-dark-border/50 hover:border-brand-500/30 transition-all duration-300 group hover:-translate-y-1">
              <div className="w-12 h-12 rounded-xl bg-accent-purple/10 flex items-center justify-center mb-6 group-hover:bg-accent-purple/20 transition-colors">
                <Award className="text-accent-purple" size={24} />
              </div>
              <h3 className="font-display font-semibold text-xl text-white mb-3 text-left">
                AI Job description Generator
              </h3>
              <p className="text-gray-400 text-sm leading-relaxed text-left">
                Input basic requirements like title and key skills, and let our Gemini integration build a professional description. Refine, customize, and publish in clicks.
              </p>
            </div>

            {/* Card 3: Ranking Leaderboards */}
            <div className="glass bg-dark-card p-8 rounded-2xl border border-dark-border/50 hover:border-brand-500/30 transition-all duration-300 group hover:-translate-y-1">
              <div className="w-12 h-12 rounded-xl bg-teal-500/10 flex items-center justify-center mb-6 group-hover:bg-teal-500/20 transition-colors">
                <Users className="text-teal-400" size={24} />
              </div>
              <h3 className="font-display font-semibold text-xl text-white mb-3 text-left">
                Automated Match Scoring
              </h3>
              <p className="text-gray-400 text-sm leading-relaxed text-left">
                When a candidate applies, recruiters instantly see a job-specific fit percentage. Speed up candidate shortlisting and eliminate manual resume skimming.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 4. PLATFORM FOOTER */}
      <footer className="w-full border-t border-dark-border bg-dark-deep py-8 z-10">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between text-xs text-dark-muted">
          <div>
            &copy; {new Date().getFullYear()} HireWise AI. All rights reserved.
          </div>
          <div className="flex space-x-6 mt-4 md:mt-0">
            <a href="#" className="hover:text-white transition-colors">Privacy Policy</a>
            <a href="#" className="hover:text-white transition-colors">Terms of Service</a>
            <a href="#" className="hover:text-white transition-colors">Security Architecture</a>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
