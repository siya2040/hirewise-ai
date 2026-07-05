-- HIREWISE AI DATABASE SCHEMA SETUP
-- Run this script in the Supabase SQL Editor.

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. DROP EXISTING TABLES/TYPES IF RE-RUNNING
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();
DROP TABLE IF EXISTS public.mock_interviews CASCADE;
DROP TABLE IF EXISTS public.applications CASCADE;
DROP TABLE IF EXISTS public.jobs CASCADE;
DROP TABLE IF EXISTS public.recruiter_profiles CASCADE;
DROP TABLE IF EXISTS public.student_profiles CASCADE;
DROP TABLE IF EXISTS public.profiles CASCADE;
DROP TYPE IF EXISTS public.user_role CASCADE;
DROP TYPE IF EXISTS public.job_status CASCADE;
DROP TYPE IF EXISTS public.application_status CASCADE;

-- 2. CREATE CUSTOM ENUMS
CREATE TYPE public.user_role AS ENUM ('student', 'recruiter');
CREATE TYPE public.job_status AS ENUM ('open', 'closed');
CREATE TYPE public.application_status AS ENUM ('applied', 'screening', 'shortlisted', 'interviewing', 'offered', 'rejected');

-- 3. CREATE TABLES

-- Base Profiles (linked 1:1 to Supabase Auth auth.users)
CREATE TABLE public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email VARCHAR(255) UNIQUE NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    role public.user_role NOT NULL DEFAULT 'student'::public.user_role,
    avatar_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Student Profiles (linked 1:1 to Profiles)
CREATE TABLE public.student_profiles (
    id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
    resume_url TEXT,
    skills TEXT[] DEFAULT '{}'::TEXT[] NOT NULL,
    experience_years NUMERIC(3,1) DEFAULT 0.0 NOT NULL,
    education JSONB DEFAULT '[]'::JSONB NOT NULL, -- Array of {school, degree, start_year, end_year}
    bio TEXT,
    
    -- Standalone AI Resume Analysis Columns
    ats_score NUMERIC(5,2) DEFAULT 0.0,
    skills_matched TEXT[] DEFAULT '{}'::TEXT[],
    skills_missing TEXT[] DEFAULT '{}'::TEXT[],
    strengths TEXT[] DEFAULT '{}'::TEXT[],
    weaknesses TEXT[] DEFAULT '{}'::TEXT[],
    improvement_suggestions TEXT[] DEFAULT '{}'::TEXT[],
    overall_recommendation TEXT,
    
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Recruiter Profiles (linked 1:1 to Profiles)
CREATE TABLE public.recruiter_profiles (
    id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
    company_name VARCHAR(255) NOT NULL,
    company_website VARCHAR(255),
    designation VARCHAR(255),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Jobs (Created by recruiters)
CREATE TABLE public.jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    recruiter_id UUID NOT NULL REFERENCES public.recruiter_profiles(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    requirements TEXT[] DEFAULT '{}'::TEXT[] NOT NULL, -- Core skills/keywords required
    salary_range VARCHAR(100),
    location VARCHAR(255) NOT NULL,
    job_type VARCHAR(50) NOT NULL, -- Full-time, Part-time, Remote, Internship
    status public.job_status DEFAULT 'open'::public.job_status NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Applications (Submitted by students to jobs)
CREATE TABLE public.applications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_id UUID NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES public.student_profiles(id) ON DELETE CASCADE,
    resume_snapshot_url TEXT NOT NULL, -- Link to resume copy at application time
    status public.application_status DEFAULT 'applied'::public.application_status NOT NULL,
    
    -- Job-Specific AI Match Analysis
    ai_match_score NUMERIC(5,2),
    ai_match_explanation TEXT,
    ai_skills_matched TEXT[] DEFAULT '{}'::TEXT[],
    ai_skills_missing TEXT[] DEFAULT '{}'::TEXT[],
    ai_recommendation VARCHAR(100),
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE (job_id, student_id)
);

-- AI Mock Interviews (Practice sessions for students)
CREATE TABLE public.mock_interviews (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL REFERENCES public.student_profiles(id) ON DELETE CASCADE,
    job_id UUID REFERENCES public.jobs(id) ON DELETE SET NULL,
    questions_and_answers JSONB DEFAULT '[]'::JSONB NOT NULL, -- Array of {question, answer}
    ai_feedback JSONB,
    overall_score NUMERIC(5,2) DEFAULT 0.0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 4. CREATE INDEXES FOR PERFORMANCE
CREATE INDEX idx_profiles_role ON public.profiles(role);
CREATE INDEX idx_jobs_recruiter ON public.jobs(recruiter_id);
CREATE INDEX idx_applications_job ON public.applications(job_id);
CREATE INDEX idx_applications_student ON public.applications(student_id);
CREATE INDEX idx_mock_interviews_student ON public.mock_interviews(student_id);

-- 5. TRIGGER FOR AUTOMATIC PROFILE INITIALIZATION ON AUTH SIGNUP
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
DECLARE
    chosen_role public.user_role;
    full_name_val text;
BEGIN
    -- Extract meta from user metadata
    chosen_role := COALESCE((new.raw_user_meta_data->>'role')::public.user_role, 'student'::public.user_role);
    full_name_val := COALESCE(new.raw_user_meta_data->>'full_name', 'New Professional');

    -- Insert standard base profile
    INSERT INTO public.profiles (id, email, full_name, role, avatar_url)
    VALUES (
        new.id,
        new.email,
        full_name_val,
        chosen_role,
        new.raw_user_meta_data->>'avatar_url'
    );

    -- Insert role-specific profile details
    IF chosen_role = 'student' THEN
        INSERT INTO public.student_profiles (id, resume_url, skills, experience_years, education, bio)
        VALUES (new.id, NULL, '{}', 0.0, '[]'::jsonb, '');
    ELSIF chosen_role = 'recruiter' THEN
        INSERT INTO public.recruiter_profiles (id, company_name, company_website, designation)
        VALUES (
            new.id,
            COALESCE(new.raw_user_meta_data->>'company_name', 'Independent hiring manager'),
            NULL,
            NULL
        );
    END IF;

    RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 6. ENABLE ROW LEVEL SECURITY (RLS)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recruiter_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mock_interviews ENABLE ROW LEVEL SECURITY;

-- 7. DEFINE RLS POLICIES

-- profiles: Users can read all profiles; only own profile can be modified.
CREATE POLICY "Allow public read for profiles" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Allow own profile update" ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- student_profiles: Users can read student profiles (recruiters look at applied students); only owners update.
CREATE POLICY "Allow authenticated read for student profiles" ON public.student_profiles FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Allow own student profile update" ON public.student_profiles FOR UPDATE USING (auth.uid() = id);

-- recruiter_profiles: Users can read recruiter details (students viewing company); only owners update.
CREATE POLICY "Allow public read for recruiter profiles" ON public.recruiter_profiles FOR SELECT USING (true);
CREATE POLICY "Allow own recruiter profile update" ON public.recruiter_profiles FOR UPDATE USING (auth.uid() = id);

-- jobs: Anyone can browse open jobs; only recruiter owners can insert/update/delete.
CREATE POLICY "Allow public read for jobs" ON public.jobs FOR SELECT USING (true);
CREATE POLICY "Allow recruiters to post jobs" ON public.jobs FOR INSERT WITH CHECK (
  auth.role() = 'authenticated' AND 
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'recruiter')
);
CREATE POLICY "Allow recruiters to update own jobs" ON public.jobs FOR UPDATE USING (
  auth.uid() = recruiter_id
);
CREATE POLICY "Allow recruiters to delete own jobs" ON public.jobs FOR DELETE USING (
  auth.uid() = recruiter_id
);

-- applications: Students view own applications; recruiters view applications for their posted jobs.
CREATE POLICY "Students can view own applications" ON public.applications FOR SELECT USING (
  auth.uid() = student_id
);
CREATE POLICY "Recruiters can view applications for their jobs" ON public.applications FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.jobs 
    WHERE jobs.id = applications.job_id AND jobs.recruiter_id = auth.uid()
  )
);
CREATE POLICY "Students can submit applications" ON public.applications FOR INSERT WITH CHECK (
  auth.uid() = student_id AND
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'student')
);
CREATE POLICY "Recruiters can update application status" ON public.applications FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM public.jobs 
    WHERE jobs.id = applications.job_id AND jobs.recruiter_id = auth.uid()
  )
);

-- mock_interviews: Only student owner can view/create.
CREATE POLICY "Students can view own mock interviews" ON public.mock_interviews FOR SELECT USING (
  auth.uid() = student_id
);
CREATE POLICY "Students can create mock interviews" ON public.mock_interviews FOR INSERT WITH CHECK (
  auth.uid() = student_id
);

-- 8. NOTIFICATIONS
CREATE TABLE public.notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    is_read BOOLEAN DEFAULT false NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own notifications" ON public.notifications FOR SELECT USING (
  auth.uid() = user_id
);
CREATE POLICY "Users can update own notifications" ON public.notifications FOR UPDATE USING (
  auth.uid() = user_id
);
CREATE POLICY "System can insert notifications" ON public.notifications FOR INSERT WITH CHECK (
  true
);
