import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ProtectedRoute } from './components/common/ProtectedRoute';
import { DashboardLayout } from './layouts/DashboardLayout';

// Public Pages
import { LandingPage } from './pages/LandingPage';
import { Login } from './pages/auth/Login';
import { Register } from './pages/auth/Register';
import { JobsList } from './pages/JobsList';

// Student Portal Pages
import { PortalDashboard } from './pages/portal/Dashboard';
import { ResumeInsights } from './pages/portal/ResumeInsights';
import { Applications } from './pages/portal/Applications';
import { MockInterview } from './pages/portal/MockInterview';
import { PortalProfile } from './pages/portal/Profile';
import { PortalSettings } from './pages/portal/Settings';

// Recruiter Dashboard Pages
import { RecruiterDashboard } from './pages/recruiter/Dashboard';
import { JobPost } from './pages/recruiter/JobPost';
import { Applicants } from './pages/recruiter/Applicants';
import { RecruiterProfile } from './pages/recruiter/Profile';

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          {/* Public Routes */}
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/jobs" element={<JobsList />} />

          {/* Student Career Portal Routes (Protected) */}
          <Route 
            path="/portal/dashboard" 
            element={
              <ProtectedRoute allowedRoles={['student']}>
                <DashboardLayout>
                  <PortalDashboard />
                </DashboardLayout>
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/portal/resume-insights" 
            element={
              <ProtectedRoute allowedRoles={['student']}>
                <DashboardLayout>
                  <ResumeInsights />
                </DashboardLayout>
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/portal/applications" 
            element={
              <ProtectedRoute allowedRoles={['student']}>
                <DashboardLayout>
                  <Applications />
                </DashboardLayout>
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/portal/mock-interview" 
            element={
              <ProtectedRoute allowedRoles={['student']}>
                <DashboardLayout>
                  <MockInterview />
                </DashboardLayout>
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/portal/profile" 
            element={
              <ProtectedRoute allowedRoles={['student']}>
                <DashboardLayout>
                  <PortalProfile />
                </DashboardLayout>
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/portal/settings" 
            element={
              <ProtectedRoute allowedRoles={['student', 'recruiter']}>
                <DashboardLayout>
                  <PortalSettings />
                </DashboardLayout>
              </ProtectedRoute>
            } 
          />

          {/* Recruiter Dashboard Routes (Protected) */}
          <Route 
            path="/recruiter/dashboard" 
            element={
              <ProtectedRoute allowedRoles={['recruiter']}>
                <DashboardLayout>
                  <RecruiterDashboard />
                </DashboardLayout>
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/recruiter/jobs/new" 
            element={
              <ProtectedRoute allowedRoles={['recruiter']}>
                <DashboardLayout>
                  <JobPost />
                </DashboardLayout>
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/recruiter/applicants" 
            element={
              <ProtectedRoute allowedRoles={['recruiter']}>
                <DashboardLayout>
                  <Applicants />
                </DashboardLayout>
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/recruiter/profile" 
            element={
              <ProtectedRoute allowedRoles={['recruiter']}>
                <DashboardLayout>
                  <RecruiterProfile />
                </DashboardLayout>
              </ProtectedRoute>
            } 
          />

          {/* Fallback Catch All */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
