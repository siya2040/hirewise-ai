import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabaseClient';
import { apiFetch } from '../../lib/api';
import { User, Mail, School, Award, Brain, AlignLeft, ShieldCheck, Upload } from 'lucide-react';

export const PortalProfile = () => {
  const { profile, refreshProfile } = useAuth();

  // Form State
  const [fullName, setFullName] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [college, setCollege] = useState('');
  const [degree, setDegree] = useState('');
  const [gradYear, setGradYear] = useState('');
  const [skills, setSkills] = useState('');
  const [experienceYears, setExperienceYears] = useState('0');
  const [bio, setBio] = useState('');
  const [projects, setProjects] = useState('');
  const [certifications, setCertifications] = useState('');

  // UI State
  const [loading, setLoading] = useState(false);
  const [imageUploading, setImageUploading] = useState(false);
  const [statusMsg, setStatusMsg] = useState({ type: '', text: '' });

  useEffect(() => {
    if (profile) {
      setFullName(profile.full_name || '');
      setAvatarUrl(profile.avatar_url || '');

      const details = profile.profileDetails || {};
      setBio(details.bio || '');
      setExperienceYears(details.experience_years ? String(details.experience_years) : '0');
      
      // Parse skills array to comma separated string
      if (details.skills && Array.isArray(details.skills)) {
        setSkills(details.skills.join(', '));
      } else {
        setSkills('');
      }

      // Parse education JSONB
      const eduArray = details.education || [];
      const primaryEdu = eduArray.find(e => e.school || e.college) || {};
      setCollege(primaryEdu.school || primaryEdu.college || '');
      setDegree(primaryEdu.degree || '');
      setGradYear(primaryEdu.grad_year || primaryEdu.end_year || '');

      // Parse projects/certs stored in JSONB
      const metadataBlock = eduArray.find(e => e.type === 'metadata') || {};
      setProjects(metadataBlock.projects || '');
      setCertifications(metadataBlock.certifications || '');
    }
  }, [profile]);

  // Handle profile photo upload directly to Supabase storage
  const handleAvatarUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate type
    if (!file.type.startsWith('image/')) {
      setStatusMsg({ type: 'error', text: 'Please select an image file.' });
      return;
    }

    setImageUploading(true);
    setStatusMsg({ type: '', text: '' });

    try {
      const userId = profile.id;
      const fileExt = file.name.split('.').pop();
      const filePath = `avatars/${userId}/profile.${fileExt}`;

      // Upload file to Supabase avatars bucket
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      setAvatarUrl(publicUrl);
      setStatusMsg({ type: 'success', text: 'Profile photo uploaded. Save profile to apply.' });
    } catch (error) {
      console.error('[Avatar Upload Error]:', error.message);
      setStatusMsg({ type: 'error', text: 'Failed to upload profile photo.' });
    } finally {
      setImageUploading(false);
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setLoading(true);
    setStatusMsg({ type: '', text: '' });

    try {
      // Format skills array
      const skillsArray = skills
        .split(',')
        .map(s => s.trim())
        .filter(s => s.length > 0);

      // Construct education jsonb block
      const educationBlock = [
        {
          school: college,
          degree: degree,
          grad_year: gradYear
        },
        {
          type: 'metadata',
          projects: projects,
          certifications: certifications
        }
      ];

      // Update API
      await apiFetch('/profile/student', {
        method: 'PUT',
        body: JSON.stringify({
          fullName,
          avatarUrl,
          skills: skillsArray,
          experienceYears: parseFloat(experienceYears) || 0,
          education: educationBlock,
          bio
        })
      });

      await refreshProfile();
      setStatusMsg({ type: 'success', text: 'Profile details saved successfully.' });
    } catch (error) {
      console.error('Save Profile Error:', error);
      setStatusMsg({ type: 'error', text: error.message || 'Failed to save profile changes.' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 text-left animate-in fade-in duration-200">
      <div>
        <h2 className="text-2xl font-display font-extrabold text-white">My Profile 👤</h2>
        <p className="text-gray-400 text-sm mt-1">Configure your personal detail records, educational credentials, and capabilities.</p>
      </div>

      {statusMsg.text && (
        <div className={`p-4 rounded-xl text-xs max-w-3xl border ${
          statusMsg.type === 'success' 
            ? 'bg-emerald-950/20 border-emerald-800/40 text-emerald-400' 
            : 'bg-red-950/20 border-red-800/40 text-red-400'
        }`}>
          {statusMsg.text}
        </div>
      )}

      <form onSubmit={handleSave} className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start max-w-5xl">
        {/* Left Column: Avatar Photo & Basic stats */}
        <div className="bg-dark-card border border-dark-border rounded-2xl p-6 text-center space-y-6">
          <div className="relative w-32 h-32 mx-auto">
            {avatarUrl ? (
              <img 
                src={avatarUrl} 
                alt="Profile Avatar" 
                className="w-32 h-32 rounded-full object-cover border-2 border-brand-500/30"
              />
            ) : (
              <div className="w-32 h-32 rounded-full bg-brand-950/40 border border-brand-500/20 flex items-center justify-center font-display font-extrabold text-brand-400 text-4xl">
                {profile?.full_name?.charAt(0).toUpperCase() || 'U'}
              </div>
            )}
            
            {/* Upload Overlay */}
            <label className="absolute bottom-0 right-0 w-9 h-9 rounded-full bg-brand-600 hover:bg-brand-700 border border-brand-500/30 flex items-center justify-center cursor-pointer shadow-lg transition-all">
              <Upload size={14} className="text-white" />
              <input 
                type="file" 
                accept="image/*" 
                onChange={handleAvatarUpload} 
                className="hidden" 
                disabled={imageUploading}
              />
            </label>
          </div>

          <div className="space-y-1">
            <h4 className="font-display font-bold text-white text-lg">{fullName || 'Professional'}</h4>
            <p className="text-xs text-dark-muted">{profile?.email}</p>
          </div>

          <div className="border-t border-dark-border/40 pt-4 flex justify-around text-xs">
            <div>
              <p className="text-dark-muted font-semibold">Experience</p>
              <p className="text-white font-bold mt-0.5">{experienceYears} Years</p>
            </div>
            <div className="w-px bg-dark-border/40 h-6"></div>
            <div>
              <p className="text-dark-muted font-semibold">Skills</p>
              <p className="text-white font-bold mt-0.5">
                {profile?.profileDetails?.skills?.length || 0} Listed
              </p>
            </div>
          </div>
        </div>

        {/* Right Column: Detailed Input Form */}
        <div className="lg:col-span-2 bg-dark-card border border-dark-border rounded-2xl p-6 md:p-8 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Full Name */}
            <div className="space-y-1.5">
              <label className="text-xs text-gray-300 font-semibold uppercase tracking-wider">Full Name</label>
              <div className="relative">
                <User className="absolute left-3 top-3 text-gray-500" size={16} />
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Jane Doe"
                  className="w-full bg-dark-bg/60 border border-dark-border focus:border-brand-500 rounded-xl py-2.5 pl-10 pr-4 text-sm text-white placeholder-gray-600 outline-none transition-all"
                />
              </div>
            </div>

            {/* Years of Experience */}
            <div className="space-y-1.5">
              <label className="text-xs text-gray-300 font-semibold uppercase tracking-wider">Years of Experience</label>
              <div className="relative">
                <Award className="absolute left-3 top-3 text-gray-500" size={16} />
                <input
                  type="number"
                  min="0"
                  step="0.5"
                  required
                  value={experienceYears}
                  onChange={(e) => setExperienceYears(e.target.value)}
                  placeholder="e.g. 2.5"
                  className="w-full bg-dark-bg/60 border border-dark-border focus:border-brand-500 rounded-xl py-2.5 pl-10 pr-4 text-sm text-white placeholder-gray-600 outline-none transition-all"
                />
              </div>
            </div>

            {/* College/School */}
            <div className="space-y-1.5">
              <label className="text-xs text-gray-300 font-semibold uppercase tracking-wider">University / College</label>
              <div className="relative">
                <School className="absolute left-3 top-3 text-gray-500" size={16} />
                <input
                  type="text"
                  required
                  value={college}
                  onChange={(e) => setCollege(e.target.value)}
                  placeholder="Stanford University"
                  className="w-full bg-dark-bg/60 border border-dark-border focus:border-brand-500 rounded-xl py-2.5 pl-10 pr-4 text-sm text-white placeholder-gray-600 outline-none transition-all"
                />
              </div>
            </div>

            {/* Degree & Graduation Year */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs text-gray-300 font-semibold uppercase tracking-wider">Degree</label>
                <input
                  type="text"
                  required
                  value={degree}
                  onChange={(e) => setDegree(e.target.value)}
                  placeholder="B.S. Computer Science"
                  className="w-full bg-dark-bg/60 border border-dark-border focus:border-brand-500 rounded-xl py-2.5 px-4 text-sm text-white placeholder-gray-600 outline-none transition-all"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs text-gray-300 font-semibold uppercase tracking-wider">Graduation Year</label>
                <input
                  type="number"
                  required
                  value={gradYear}
                  onChange={(e) => setGradYear(e.target.value)}
                  placeholder="2027"
                  className="w-full bg-dark-bg/60 border border-dark-border focus:border-brand-500 rounded-xl py-2.5 px-4 text-sm text-white placeholder-gray-600 outline-none transition-all"
                />
              </div>
            </div>
          </div>

          {/* Skills Tag input */}
          <div className="space-y-1.5">
            <label className="text-xs text-gray-300 font-semibold uppercase tracking-wider">Skills (Comma-separated)</label>
            <div className="relative">
              <Brain className="absolute left-3 top-3.5 text-gray-500" size={16} />
              <input
                type="text"
                value={skills}
                onChange={(e) => setSkills(e.target.value)}
                placeholder="React, Node.js, SQL, TypeScript, Python"
                className="w-full bg-dark-bg/60 border border-dark-border focus:border-brand-500 rounded-xl py-3 pl-10 pr-4 text-sm text-white placeholder-gray-600 outline-none transition-all"
              />
            </div>
            <p className="text-[10px] text-dark-muted">Separate skills with commas. These are scanned by our ATS engines.</p>
          </div>

          {/* Bio / About Me */}
          <div className="space-y-1.5">
            <label className="text-xs text-gray-300 font-semibold uppercase tracking-wider">About Me / Bio</label>
            <div className="relative">
              <AlignLeft className="absolute left-3 top-3 text-gray-500" size={16} />
              <textarea
                rows="4"
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder="Write a professional elevator pitch..."
                className="w-full bg-dark-bg/60 border border-dark-border focus:border-brand-500 rounded-xl py-2.5 pl-10 pr-4 text-sm text-white placeholder-gray-600 outline-none transition-all resize-none"
              />
            </div>
          </div>

          {/* Projects Block */}
          <div className="space-y-1.5">
            <label className="text-xs text-gray-300 font-semibold uppercase tracking-wider">Key Projects</label>
            <textarea
              rows="3"
              value={projects}
              onChange={(e) => setProjects(e.target.value)}
              placeholder="e.g. HireWise AI: Full-stack recruitment app using React/Express. Built Gemini resume parser."
              className="w-full bg-dark-bg/60 border border-dark-border focus:border-brand-500 rounded-xl py-2.5 px-4 text-sm text-white placeholder-gray-600 outline-none transition-all resize-none"
            />
          </div>

          {/* Certifications Block */}
          <div className="space-y-1.5">
            <label className="text-xs text-gray-300 font-semibold uppercase tracking-wider">Certifications</label>
            <input
              type="text"
              value={certifications}
              onChange={(e) => setCertifications(e.target.value)}
              placeholder="AWS Certified Solutions Architect, Google Cloud Associate Engineer"
              className="w-full bg-dark-bg/60 border border-dark-border focus:border-brand-500 rounded-xl py-2.5 px-4 text-sm text-white placeholder-gray-600 outline-none transition-all"
            />
          </div>

          {/* Save Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-brand-600 hover:bg-brand-700 text-white rounded-xl py-3.5 font-bold shadow-lg shadow-brand-600/10 hover:shadow-brand-600/20 transition-all duration-200 flex items-center justify-center space-x-2"
          >
            {loading ? (
              <span className="w-5 h-5 rounded-full border-2 border-white border-t-transparent animate-spin"></span>
            ) : (
              <span>Save Profile Records</span>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

export default PortalProfile;
