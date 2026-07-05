import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabaseClient';
import { apiFetch } from '../../lib/api';
import { useNavigate } from 'react-router-dom';
import { KeyRound, Mail, AlertTriangle, ShieldAlert, CheckCircle2 } from 'lucide-react';

export const PortalSettings = () => {
  const { profile, signOut } = useAuth();
  const navigate = useNavigate();

  // Password fields
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  // Email fields
  const [newEmail, setNewEmail] = useState('');

  // Delete confirm field
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  // Status message flags
  const [statusMsg, setStatusMsg] = useState({ type: '', text: '' });
  const [loading, setLoading] = useState(false);

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    setStatusMsg({ type: '', text: '' });

    if (password !== confirmPassword) {
      setStatusMsg({ type: 'error', text: 'Passwords do not match.' });
      return;
    }

    if (password.length < 6) {
      setStatusMsg({ type: 'error', text: 'Password must be at least 6 characters.' });
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      
      setStatusMsg({ type: 'success', text: 'Password successfully updated.' });
      setPassword('');
      setConfirmPassword('');
    } catch (error) {
      console.error('Password Update Error:', error);
      setStatusMsg({ type: 'error', text: error.message || 'Failed to update password.' });
    } finally {
      setLoading(false);
    }
  };

  const handleEmailChange = async (e) => {
    e.preventDefault();
    setStatusMsg({ type: '', text: '' });

    if (!newEmail) {
      setStatusMsg({ type: 'error', text: 'Please specify a new email address.' });
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ email: newEmail });
      if (error) throw error;

      setStatusMsg({ 
        type: 'success', 
        text: 'A confirmation link has been sent to your new email. Please verify it to complete the update.' 
      });
      setNewEmail('');
    } catch (error) {
      console.error('Email Update Error:', error);
      setStatusMsg({ type: 'error', text: error.message || 'Failed to update email.' });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAccount = async (e) => {
    e.preventDefault();
    setStatusMsg({ type: '', text: '' });

    if (deleteConfirmText !== 'DELETE') {
      setStatusMsg({ type: 'error', text: 'Please type the word DELETE to confirm.' });
      return;
    }

    setLoading(true);
    try {
      // Call backend route that utilizes Admin SDK to wipe profiles and credentials
      await apiFetch('/profile', {
        method: 'DELETE'
      });

      // Clear session local state and redirect to landing
      await signOut();
      navigate('/');
    } catch (error) {
      console.error('Delete Account Error:', error);
      setStatusMsg({ type: 'error', text: error.message || 'Failed to delete account. Service role key might be missing.' });
      setLoading(false);
      setShowDeleteModal(false);
    }
  };

  return (
    <div className="space-y-6 text-left animate-in fade-in duration-200 max-w-4xl">
      {/* Page Header */}
      <div>
        <h2 className="text-2xl font-display font-extrabold text-white">Settings ⚙️</h2>
        <p className="text-gray-400 text-sm mt-1">Configure credentials, authentication limits, and privacy settings.</p>
      </div>

      {statusMsg.text && (
        <div className={`p-4 rounded-xl text-xs border ${
          statusMsg.type === 'success' 
            ? 'bg-emerald-950/20 border-emerald-800/40 text-emerald-400' 
            : 'bg-red-950/20 border-red-800/40 text-red-400'
        }`}>
          {statusMsg.text}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
        
        {/* Card 1: Change Password */}
        <div className="bg-dark-card border border-dark-border rounded-2xl p-6 space-y-4">
          <h3 className="text-sm font-display font-bold text-white flex items-center space-x-2">
            <KeyRound size={16} className="text-brand-400" />
            <span>Change Account Password</span>
          </h3>

          <form onSubmit={handlePasswordChange} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-[10px] text-gray-300 font-semibold uppercase tracking-wider">New Password</label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Min 6 characters"
                className="w-full bg-dark-bg/60 border border-dark-border focus:border-brand-500 rounded-xl py-2.5 px-4 text-xs text-white placeholder-gray-600 outline-none transition-all"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] text-gray-300 font-semibold uppercase tracking-wider">Confirm New Password</label>
              <input
                type="password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm password"
                className="w-full bg-dark-bg/60 border border-dark-border focus:border-brand-500 rounded-xl py-2.5 px-4 text-xs text-white placeholder-gray-600 outline-none transition-all"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="bg-brand-600 hover:bg-brand-700 text-white font-bold px-5 py-2.5 rounded-xl text-xs transition-all shadow-md"
            >
              Update Password
            </button>
          </form>
        </div>

        {/* Card 2: Change Email */}
        <div className="bg-dark-card border border-dark-border rounded-2xl p-6 space-y-4">
          <h3 className="text-sm font-display font-bold text-white flex items-center space-x-2">
            <Mail size={16} className="text-accent-purple" />
            <span>Update Email Address</span>
          </h3>

          <form onSubmit={handleEmailChange} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-[10px] text-gray-300 font-semibold uppercase tracking-wider">Current Email</label>
              <p className="text-xs text-white font-semibold bg-dark-bg/40 border border-dark-border/40 p-3 rounded-xl">
                {profile?.email}
              </p>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] text-gray-300 font-semibold uppercase tracking-wider">New Email Address</label>
              <input
                type="email"
                required
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                placeholder="new@domain.com"
                className="w-full bg-dark-bg/60 border border-dark-border focus:border-brand-500 rounded-xl py-2.5 px-4 text-xs text-white placeholder-gray-600 outline-none transition-all"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="bg-brand-600 hover:bg-brand-700 text-white font-bold px-5 py-2.5 rounded-xl text-xs transition-all shadow-md"
            >
              Request Email Update
            </button>
          </form>
        </div>

        {/* Card 3: Danger Zone */}
        <div className="md:col-span-2 bg-red-950/5 border border-red-900/20 rounded-2xl p-6 space-y-4">
          <h3 className="text-sm font-display font-bold text-red-400 flex items-center space-x-2">
            <AlertTriangle size={16} className="text-red-400 animate-pulse" />
            <span>Danger Zone</span>
          </h3>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h4 className="text-xs font-bold text-white">Delete Account Permenantly</h4>
              <p className="text-[11px] text-dark-muted mt-1 leading-relaxed max-w-xl">
                Deleting your account will erase all active job applications, ATS scores, resume documents, and profile attributes. This operation is irreversible.
              </p>
            </div>

            <button
              onClick={() => setShowDeleteModal(true)}
              className="bg-red-900/25 hover:bg-red-900/40 text-red-400 border border-red-900/35 hover:border-red-900/50 font-bold py-2.5 px-5 rounded-xl text-xs transition-all shrink-0"
            >
              Delete Account
            </button>
          </div>
        </div>

      </div>

      {/* DELETE CONFIRMATION MODAL */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-dark-card border border-red-950 max-w-md w-full rounded-2xl p-6 md:p-8 space-y-6 animate-in zoom-in-95 duration-150">
            <div className="text-center space-y-3">
              <div className="w-12 h-12 rounded-full bg-red-950/40 border border-red-900/30 flex items-center justify-center text-red-400 mx-auto">
                <ShieldAlert size={24} />
              </div>
              <h3 className="font-display font-extrabold text-lg text-white">Are you absolutely sure?</h3>
              <p className="text-xs text-dark-muted leading-relaxed">
                This will delete your credentials and drop all public profiles. Type the word <span className="text-white font-extrabold">DELETE</span> below to confirm.
              </p>
            </div>

            <form onSubmit={handleDeleteAccount} className="space-y-4">
              <input
                type="text"
                required
                value={deleteConfirmText}
                onChange={(e) => setDeleteConfirmText(e.target.value)}
                placeholder="DELETE"
                className="w-full text-center bg-dark-bg/60 border border-dark-border focus:border-red-500 rounded-xl py-3 px-4 text-xs text-white placeholder-gray-700 outline-none transition-all font-bold tracking-widest uppercase"
              />

              <div className="flex space-x-3">
                <button
                  type="button"
                  onClick={() => { setShowDeleteModal(false); setDeleteConfirmText(''); }}
                  className="flex-1 bg-dark-border hover:bg-dark-border/80 text-white font-bold py-2.5 rounded-xl text-xs transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 bg-red-600 hover:bg-red-700 text-white font-bold py-2.5 rounded-xl text-xs transition-all flex items-center justify-center"
                >
                  {loading ? (
                    <span className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin"></span>
                  ) : (
                    <span>Confirm Delete</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default PortalSettings;
