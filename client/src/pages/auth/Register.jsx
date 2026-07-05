import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { AuthLayout } from '../../layouts/AuthLayout';
import { Lock, Mail, User, AlertCircle, ArrowLeft, Building2 } from 'lucide-react';

export const Register = () => {
  const { signUp } = useAuth();
  const navigate = useNavigate();

  // Navigation steps: 1 = Role selection, 2 = Form input
  const [step, setStep] = useState(1);
  const [role, setRole] = useState(null); // 'student' or 'recruiter'

  // Form Fields
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [companyName, setCompanyName] = useState('');
  
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const selectRole = (chosenRole) => {
    setRole(chosenRole);
    setStep(2);
  };

  const handleBack = () => {
    setStep(1);
    setRole(null);
    setErrorMsg('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (!fullName || !email || !password || !confirmPassword) {
      setErrorMsg('Please populate all required fields.');
      return;
    }

    if (password !== confirmPassword) {
      setErrorMsg('Passwords do not match.');
      return;
    }

    if (password.length < 6) {
      setErrorMsg('Password should be at least 6 characters.');
      return;
    }

    if (role === 'recruiter' && !companyName) {
      setErrorMsg('Please specify your company name.');
      return;
    }

    setLoading(true);
    const { data, error } = await signUp({
      email,
      password,
      fullName,
      role,
      companyName
    });

    if (error) {
      setErrorMsg(error.message || 'An error occurred during registration.');
      setLoading(false);
    } else {
      setSuccessMsg('Account created successfully! Please check your email inbox to verify your account.');
      setLoading(false);
      
      // Auto redirect to login after a few seconds
      setTimeout(() => {
        navigate('/login');
      }, 5000);
    }
  };

  return (
    <AuthLayout>
      {/* STEP 1: PREMIUM ROLE SELECTION SCREEN */}
      {step === 1 && (
        <div className="space-y-6">
          <div className="text-center">
            <h2 className="text-2xl font-display font-extrabold text-white">Get Started</h2>
            <p className="text-xs text-dark-muted mt-1">Select your account type to proceed</p>
          </div>

          <div className="space-y-4">
            {/* Card 1: Student (Looking for job) */}
            <button
              onClick={() => selectRole('student')}
              className="w-full text-left bg-dark-bg/40 hover:bg-brand-950/10 border border-dark-border hover:border-brand-500/50 rounded-2xl p-5 transition-all duration-300 transform hover:-translate-y-0.5 group focus:outline-none"
            >
              <div className="flex items-start space-x-4">
                <div className="w-12 h-12 rounded-xl bg-brand-500/10 flex items-center justify-center text-brand-400 group-hover:bg-brand-500/20 transition-colors">
                  <span className="font-display font-bold text-2xl">🎓</span>
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="text-sm font-bold text-white group-hover:text-brand-400 transition-colors">
                    I'm Looking for a Job
                  </h4>
                  <p className="text-xs text-dark-muted mt-1 leading-relaxed">
                    Create your student account, upload your resume, improve your ATS score, practice AI mock interviews, and apply for opportunities.
                  </p>
                </div>
              </div>
            </button>

            {/* Card 2: Recruiter (Hiring) */}
            <button
              onClick={() => selectRole('recruiter')}
              className="w-full text-left bg-dark-bg/40 hover:bg-brand-950/10 border border-dark-border hover:border-brand-500/50 rounded-2xl p-5 transition-all duration-300 transform hover:-translate-y-0.5 group focus:outline-none"
            >
              <div className="flex items-start space-x-4">
                <div className="w-12 h-12 rounded-xl bg-accent-purple/10 flex items-center justify-center text-accent-purple group-hover:bg-accent-purple/20 transition-colors">
                  <span className="font-display font-bold text-2xl">🏢</span>
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="text-sm font-bold text-white group-hover:text-accent-purple transition-colors">
                    I'm Hiring
                  </h4>
                  <p className="text-xs text-dark-muted mt-1 leading-relaxed">
                    Create your recruiter account, post jobs, generate AI-assisted job descriptions, review AI-ranked candidates, and manage recruitment.
                  </p>
                </div>
              </div>
            </button>
          </div>

          <div className="text-center text-xs text-gray-400 border-t border-dark-border/40 pt-4">
            Already have an account?{' '}
            <Link to="/login" className="text-brand-400 font-semibold hover:underline">
              Sign In
            </Link>
          </div>
        </div>
      )}

      {/* STEP 2: REGISTRATION FORM */}
      {step === 2 && (
        <div className="space-y-6">
          <div className="flex items-center space-x-3">
            <button
              onClick={handleBack}
              className="text-gray-400 hover:text-white p-1.5 rounded-lg hover:bg-dark-border transition-colors"
            >
              <ArrowLeft size={16} />
            </button>
            <div className="text-left">
              <h2 className="text-xl font-display font-bold text-white">
                {role === 'recruiter' ? '🏢 Recruiter Signup' : '🎓 Candidate Signup'}
              </h2>
              <p className="text-[10px] text-brand-400 uppercase tracking-widest font-bold">
                {role === 'recruiter' ? 'Recruitment Console' : 'Career Portal Portal'}
              </p>
            </div>
          </div>

          {errorMsg && (
            <div className="flex items-center space-x-2 bg-red-950/20 border border-red-800/40 p-3.5 rounded-xl text-red-400 text-xs">
              <AlertCircle size={16} className="shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="flex items-start space-x-2 bg-emerald-950/20 border border-emerald-800/40 p-3.5 rounded-xl text-emerald-400 text-xs text-left">
              <AlertCircle size={16} className="shrink-0 mt-0.5" />
              <span>{successMsg}</span>
            </div>
          )}

          {!successMsg && (
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Full Name */}
              <div className="space-y-1.5 text-left">
                <label className="text-xs text-gray-300 font-semibold uppercase tracking-wider">Full Name</label>
                <div className="relative">
                  <User className="absolute left-3 top-3.5 text-gray-500" size={16} />
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Jane Doe"
                    className="w-full bg-dark-bg/60 border border-dark-border focus:border-brand-500 rounded-xl py-3 pl-10 pr-4 text-sm text-white placeholder-gray-600 outline-none transition-all"
                  />
                </div>
              </div>

              {/* Email Address */}
              <div className="space-y-1.5 text-left">
                <label className="text-xs text-gray-300 font-semibold uppercase tracking-wider">Email Address</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3.5 text-gray-500" size={16} />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="jane@company.com"
                    className="w-full bg-dark-bg/60 border border-dark-border focus:border-brand-500 rounded-xl py-3 pl-10 pr-4 text-sm text-white placeholder-gray-600 outline-none transition-all"
                  />
                </div>
              </div>

              {/* Recruiter-Specific Field: Company Name */}
              {role === 'recruiter' && (
                <div className="space-y-1.5 text-left">
                  <label className="text-xs text-gray-300 font-semibold uppercase tracking-wider">Company Name</label>
                  <div className="relative">
                    <Building2 className="absolute left-3 top-3.5 text-gray-500" size={16} />
                    <input
                      type="text"
                      required
                      value={companyName}
                      onChange={(e) => setCompanyName(e.target.value)}
                      placeholder="Acme Corporation"
                      className="w-full bg-dark-bg/60 border border-dark-border focus:border-brand-500 rounded-xl py-3 pl-10 pr-4 text-sm text-white placeholder-gray-600 outline-none transition-all"
                    />
                  </div>
                </div>
              )}

              {/* Password */}
              <div className="space-y-1.5 text-left">
                <label className="text-xs text-gray-300 font-semibold uppercase tracking-wider">Password</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3.5 text-gray-500" size={16} />
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full bg-dark-bg/60 border border-dark-border focus:border-brand-500 rounded-xl py-3 pl-10 pr-4 text-sm text-white placeholder-gray-600 outline-none transition-all"
                  />
                </div>
              </div>

              {/* Confirm Password */}
              <div className="space-y-1.5 text-left">
                <label className="text-xs text-gray-300 font-semibold uppercase tracking-wider">Confirm Password</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3.5 text-gray-500" size={16} />
                  <input
                    type="password"
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full bg-dark-bg/60 border border-dark-border focus:border-brand-500 rounded-xl py-3 pl-10 pr-4 text-sm text-white placeholder-gray-600 outline-none transition-all"
                  />
                </div>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-brand-600 hover:bg-brand-700 text-white rounded-xl py-3.5 font-bold shadow-lg shadow-brand-600/20 hover:shadow-brand-600/30 transition-all duration-200 flex items-center justify-center space-x-2"
              >
                {loading ? (
                  <span className="w-5 h-5 rounded-full border-2 border-white border-t-transparent animate-spin"></span>
                ) : (
                  <span>Register</span>
                )}
              </button>
            </form>
          )}
        </div>
      )}
    </AuthLayout>
  );
};

export default Register;
