import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';

const AuthContext = createContext({});

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [userRole, setUserRole] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 1. Check active session on mount
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchProfile(session.user.id);
      } else {
        setLoading(false);
      }
    });

    // 2. Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      
      if (session?.user) {
        await fetchProfile(session.user.id);
      } else {
        setProfile(null);
        setUserRole(null);
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // Fetch the public profiles row containing the user's platform role
  const fetchProfile = async (userId) => {
    try {
      const { data: baseProfile, error: baseError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (baseError) throw baseError;

      let details = null;
      if (baseProfile.role === 'student') {
        const { data, error } = await supabase
          .from('student_profiles')
          .select('*')
          .eq('id', userId)
          .single();
        if (!error) details = data;
      } else if (baseProfile.role === 'recruiter') {
        const { data, error } = await supabase
          .from('recruiter_profiles')
          .select('*')
          .eq('id', userId)
          .single();
        if (!error) details = data;
      }

      setProfile({
        ...baseProfile,
        profileDetails: details
      });
      setUserRole(baseProfile.role || null);
    } catch (err) {
      console.error('[AuthContext Profile Exception]:', err.message);
      setProfile(null);
      setUserRole(null);
    } finally {
      setLoading(false);
    }
  };

  // Sign up a new user and pass role + full name in metadata for trigger
  const signUp = async ({ email, password, fullName, role, companyName }) => {
    setLoading(true);
    try {
      const metadata = {
        full_name: fullName,
        role: role,
      };

      if (role === 'recruiter' && companyName) {
        metadata.company_name = companyName;
      }

      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: metadata
        }
      });

      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      setLoading(false);
      return { data: null, error };
    }
  };

  // Sign in an existing user
  const signIn = async ({ email, password }) => {
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      });
      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      setLoading(false);
      return { data: null, error };
    }
  };

  // Sign out user
  const signOut = async () => {
    setLoading(true);
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      setSession(null);
      setUser(null);
      setProfile(null);
      setUserRole(null);
    } catch (error) {
      console.error('[AuthContext Logout Error]:', error.message);
    } finally {
      setLoading(false);
    }
  };

  const value = {
    user,
    session,
    profile,
    userRole,
    loading,
    signUp,
    signIn,
    signOut,
    refreshProfile: () => fetchProfile(user?.id)
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  return useContext(AuthContext);
};
