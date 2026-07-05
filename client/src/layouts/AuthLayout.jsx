import React from 'react';
import { Link } from 'react-router-dom';

export const AuthLayout = ({ children }) => {
  return (
    <div className="min-h-screen bg-dark-deep relative flex flex-col justify-center items-center px-4 overflow-hidden">
      {/* Decorative Blur Spheres */}
      <div className="absolute top-[-10%] left-[-10%] w-[40vw] h-[40vw] bg-brand-500/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40vw] h-[40vw] bg-accent-purple/10 rounded-full blur-[120px] pointer-events-none" />
      
      {/* Logo / Brand Header */}
      <div className="mb-8 z-10 text-center">
        <Link to="/" className="inline-flex items-center space-x-2">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-brand-600 to-accent-purple flex items-center justify-center shadow-lg shadow-brand-500/20">
            <span className="font-display font-extrabold text-white text-xl">H</span>
          </div>
          <span className="font-display font-bold text-2xl text-white tracking-tight">
            HireWise <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-400 to-accent-purple">AI</span>
          </span>
        </Link>
        <p className="text-dark-muted text-xs mt-1 tracking-wide uppercase font-semibold">
          AI-Powered Intelligent Recruitment
        </p>
      </div>

      {/* Main Container Card */}
      <div className="w-full max-w-md glass-premium rounded-2xl p-8 shadow-2xl relative z-10 border border-white/10 transition-all duration-300 hover:border-brand-500/20">
        {children}
      </div>

      {/* Simple Footer */}
      <div className="mt-8 text-center text-xs text-dark-muted relative z-10">
        &copy; {new Date().getFullYear()} HireWise AI. Secure multi-tenant architecture.
      </div>
    </div>
  );
};

export default AuthLayout;
