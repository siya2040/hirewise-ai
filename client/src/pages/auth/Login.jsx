import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabaseClient';
import { AuthLayout } from '../../layouts/AuthLayout';
import { Lock, Mail, AlertCircle, Eye, EyeOff } from 'lucide-react';

export const Login = () => {
  const { signIn, userRole } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Find redirect destination after successful login
  const from = location.state?.from?.pathname;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    
    if (!email || !password) {
      setErrorMsg('Please input your credentials.');
      return;
    }

    setLoading(true);
    const { data, error } = await signIn({ email, password });

    if (error) {
      setErrorMsg(error.message || 'Invalid email or password.');
      setLoading(false);
    } else {
      // Fetch user profile from Supabase and redirect
      // AuthContext will update, triggering re-render, but we handle immediate navigation here:
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', data.user.id)
        .single();


      const resolvedRole = profile?.role;
      
      if (from) {
        navigate(from, { replace: true });
      } else if (resolvedRole === 'recruiter') {
        navigate('/recruiter/dashboard', { replace: true });
      } else {
        navigate('/portal/dashboard', { replace: true });
      }
    }
  };

  return (
    <AuthLayout>
      <div className="space-y-6">
        <div className="text-center">
          <h2 className="text-2xl font-display font-extrabold text-white">Welcome Back</h2>
          <p className="text-xs text-dark-muted mt-1">Sign in to manage your HireWise career path</p>
        </div>

        {errorMsg && (
          <div className="flex items-center space-x-2 bg-red-950/20 border border-red-800/40 p-3.5 rounded-xl text-red-400 text-xs">
            <AlertCircle size={16} className="shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Email Input */}
          <div className="space-y-1.5 text-left">
            <label className="text-xs text-gray-300 font-semibold uppercase tracking-wider">Email Address</label>
            <div className="relative">
              <Mail className="absolute left-3 top-3.5 text-gray-500" size={16} />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full bg-dark-bg/60 border border-dark-border focus:border-brand-500 rounded-xl py-3 pl-10 pr-4 text-sm text-white placeholder-gray-600 outline-none transition-all"
              />
            </div>
          </div>

          {/* Password Input */}
          <div className="space-y-1.5 text-left">
            <div className="flex items-center justify-between">
              <label className="text-xs text-gray-300 font-semibold uppercase tracking-wider">Password</label>
              <a href="#" className="text-[10px] text-brand-400 hover:underline">Forgot password?</a>
            </div>
            <div className="relative">
              <Lock className="absolute left-3 top-3.5 text-gray-500" size={16} />
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-dark-bg/60 border border-dark-border focus:border-brand-500 rounded-xl py-3 pl-10 pr-12 text-sm text-white placeholder-gray-600 outline-none transition-all"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-3.5 text-gray-500 hover:text-gray-300 transition-colors"
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
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
              <span>Sign In</span>
            )}
          </button>
        </form>

        <div className="text-center text-xs text-gray-400">
          Don't have an account?{' '}
          <Link to="/register" className="text-brand-400 font-semibold hover:underline">
            Sign Up
          </Link>
        </div>
      </div>
    </AuthLayout>
  );
};

export default Login;
