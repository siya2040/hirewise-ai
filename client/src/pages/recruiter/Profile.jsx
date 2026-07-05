import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabaseClient';
import { apiFetch } from '../../lib/api';
import { 
  Building2, 
  Globe, 
  Briefcase, 
  User, 
  Upload, 
  CheckCircle2, 
  AlertCircle 
} from 'lucide-react';

export const RecruiterProfile = () => {
  const { profile, refreshProfile } = useAuth();
  
  // Base details
  const [fullName, setFullName] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  
  // Recruiter specific details
  const [companyName, setCompanyName] = useState('');
  const [companyWebsite, setCompanyWebsite] = useState('');
  const [designation, setDesignation] = useState('');
  
  // Status flags
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (profile) {
      setFullName(profile.full_name || '');
      setAvatarUrl(profile.avatar_url || '');

      const rec = profile.profileDetails || {};
      setCompanyName(rec.company_name || '');
      setCompanyWebsite(rec.company_website || '');
      setDesignation(rec.designation || '');
    }
  }, [profile]);

  const handleAvatarUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${profile.id}/avatar.${fileExt}`;
      const filePath = fileName;

      // 1. Upload to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      // 2. Fetch public URL
      const { data } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      const publicUrl = data?.publicUrl || '';
      setAvatarUrl(publicUrl);

      // 3. Update profiles table
      const { error: profileError } = await supabase
        .from('profiles')
        .update({ avatar_url: publicUrl })
        .eq('id', profile.id);

      if (profileError) throw profileError;
      
      setSuccessMsg('Logo updated successfully!');
      await refreshProfile();
    } catch (err) {
      console.error('[Logo Upload Error]:', err);
      setErrorMsg(err.message || 'Failed to upload logo.');
    } finally {
      setUploading(false);
    }
  };

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      await apiFetch('/profile/recruiter', {
        method: 'PUT',
        body: JSON.stringify({
          fullName,
          avatarUrl,
          companyName,
          companyWebsite,
          designation
        })
      });

      setSuccessMsg('Company profile synchronized successfully.');
      await refreshProfile();
    } catch (error) {
      console.error('[Save Recruiter Profile Error]:', error);
      setErrorMsg(error.message || 'Failed to update company profile details.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 text-left animate-in fade-in duration-200 max-w-4xl">
      {/* Page Header */}
      <div>
        <h2 className="text-2xl font-display font-extrabold text-white">Company Profile 🏢</h2>
        <p className="text-gray-400 text-sm mt-1">Configure company credentials and recruitment officer details.</p>
      </div>

      {successMsg && (
        <div className="flex items-center space-x-2 bg-emerald-950/20 border border-emerald-800/40 p-4 rounded-xl text-emerald-400 text-xs">
          <CheckCircle2 size={16} />
          <span>{successMsg}</span>
        </div>
      )}

      {errorMsg && (
        <div className="flex items-center space-x-2 bg-red-950/20 border border-red-800/40 p-4 rounded-xl text-red-400 text-xs">
          <AlertCircle size={16} />
          <span>{errorMsg}</span>
        </div>
      )}

      <form onSubmit={handleSaveProfile} className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        
        {/* Left Card: Company Logo */}
        <div className="bg-dark-card border border-dark-border rounded-2xl p-6 text-center space-y-4">
          <h4 className="font-display font-bold text-white text-xs text-left border-b border-dark-border pb-2.5">
            Corporate Branding
          </h4>

          <div className="relative w-24 h-24 mx-auto bg-dark-bg border border-dark-border rounded-2xl flex items-center justify-center overflow-hidden group">
            {avatarUrl ? (
              <img src={avatarUrl} alt="Logo" className="w-full h-full object-cover" />
            ) : (
              <Building2 className="text-gray-600" size={32} />
            )}
            
            {uploading && (
              <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                <div className="w-6 h-6 rounded-full border-2 border-white border-t-transparent animate-spin"></div>
              </div>
            )}
          </div>

          <div>
            <label className="inline-block bg-dark-border hover:bg-dark-border/80 text-white text-xs font-bold py-2 px-4 rounded-lg cursor-pointer transition-all">
              <Upload size={12} className="inline mr-1.5" />
              Upload Logo
              <input 
                type="file" 
                accept="image/*" 
                onChange={handleAvatarUpload} 
                className="hidden" 
              />
            </label>
            <p className="text-[10px] text-dark-muted mt-2">JPEG or PNG. Max size 2MB.</p>
          </div>
        </div>

        {/* Right Cards: General Form */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-dark-card border border-dark-border rounded-2xl p-6 md:p-8 space-y-6">
            
            {/* Recruiter Section */}
            <div className="space-y-4">
              <h3 className="text-sm font-display font-bold text-white border-b border-dark-border pb-2 flex items-center space-x-2">
                <User size={16} className="text-brand-400" />
                <span>Recruiter Details</span>
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] text-gray-300 font-semibold uppercase tracking-wider">Full Name</label>
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="w-full bg-dark-bg/60 border border-dark-border focus:border-brand-500 rounded-xl py-2.5 px-4 text-xs text-white outline-none transition-all"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] text-gray-300 font-semibold uppercase tracking-wider">Designation / Title</label>
                  <input
                    type="text"
                    required
                    value={designation}
                    onChange={(e) => setDesignation(e.target.value)}
                    placeholder="e.g. Technical Talent Acquisition Specialist"
                    className="w-full bg-dark-bg/60 border border-dark-border focus:border-brand-500 rounded-xl py-2.5 px-4 text-xs text-white outline-none transition-all"
                  />
                </div>
              </div>
            </div>

            {/* Corporate Section */}
            <div className="space-y-4 font-normal">
              <h3 className="text-sm font-display font-bold text-white border-b border-dark-border pb-2 flex items-center space-x-2">
                <Building2 size={16} className="text-accent-purple" />
                <span>Company Details</span>
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] text-gray-300 font-semibold uppercase tracking-wider">Company Name</label>
                  <input
                    type="text"
                    required
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    className="w-full bg-dark-bg/60 border border-dark-border focus:border-brand-500 rounded-xl py-2.5 px-4 text-xs text-white outline-none transition-all"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] text-gray-300 font-semibold uppercase tracking-wider">Company Website</label>
                  <input
                    type="url"
                    value={companyWebsite}
                    onChange={(e) => setCompanyWebsite(e.target.value)}
                    placeholder="https://company.com"
                    className="w-full bg-dark-bg/60 border border-dark-border focus:border-brand-500 rounded-xl py-2.5 px-4 text-xs text-white outline-none transition-all"
                  />
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="bg-brand-600 hover:bg-brand-700 text-white font-bold px-6 py-2.5 rounded-xl text-xs transition-all shadow-md"
            >
              {loading ? (
                <span className="inline-block w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin"></span>
              ) : (
                'Save Changes'
              )}
            </button>

          </div>
        </div>

      </form>
    </div>
  );
};

export default RecruiterProfile;
