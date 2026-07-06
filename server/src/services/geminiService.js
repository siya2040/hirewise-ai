import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';

dotenv.config();

const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) {
  console.warn('[Gemini Service WARNING]: GEMINI_API_KEY is not defined in the environment variables.');
}

const genAI = new GoogleGenerativeAI(apiKey || '');

const parseSafeJSON = (text) => {
  try {
    let cleaned = text.trim();
    if (cleaned.startsWith('```')) {
      cleaned = cleaned.replace(/^```(?:json)?/i, '').replace(/```$/i, '');
    }
    return JSON.parse(cleaned.trim());
  } catch (err) {
    console.error('[Safe JSON Parse Error]: Failed to parse text:', text);
    throw err;
  }
};

// We use the fast and powerful gemini-2.5-flash model for analytical operations
const getModel = () => {
  return genAI.getGenerativeModel({ 
    model: 'gemini-2.5-flash',
    generationConfig: { responseMimeType: "application/json" }
  });
};

/**
 * Perform a standalone ATS resume analysis.
 * @param {string} resumeText - The parsed text from the candidate's resume.
 * @returns {Promise<object>} Stuctured JSON containing ATS score, strengths, and missing skills.
 */
export const analyzeResume = async (resumeText) => {
  try {
    const model = getModel();
    const prompt = `
      You are an expert ATS (Applicant Tracking System) scanner, career coach, and resume parser.
      Analyze the following resume text, identify the candidate's core details, calculate their ATS suitability, and provide a structured JSON response matching the schema.
      
      JSON Response Schema:
      {
        "ats_score": number (0 to 100),
        "skills_matched": array of strings (technical and soft skills identified in the resume),
        "skills_missing": array of strings (critical skills common in their domain that are missing),
        "strengths": array of strings (key strengths of their experience, education, or formatting),
        "weaknesses": array of strings (areas of concern or weak presentation),
        "improvement_suggestions": array of strings (actionable advice to improve their resume),
        "overall_recommendation": string (general career advice and formatting guidance),
        
        "parsed_profile": {
          "name": string (candidate name, empty if not found),
          "skills": array of strings (list of skills candidate actually has),
          "experience_years": number (estimated years of experience, e.g. 2.5),
          "education": [
            {
              "school": string (college or school name),
              "degree": string (degree received, e.g. BS Computer Science),
              "start_year": string (year started, or empty),
              "end_year": string (year graduated, or empty)
            }
          ],
          "projects": string (bulleted summary of projects found in resume, empty if none),
          "certifications": string (bulleted list of certifications found, empty if none)
        }
      }

      Resume Text:
      """
      ${resumeText}
      """
    `;

    const result = await model.generateContent(prompt);
    const text = result.response.text();
    return parseSafeJSON(text);
  } catch (error) {
    console.error('[Gemini analyzeResume Error]:', error);
    throw new Error('Gemini AI failed to analyze the resume.');
  }
};

/**
 * Perform a job-specific resume alignment match.
 * @param {string} resumeText - Parsed resume text.
 * @param {object} job - Job database row containing title, description, and requirements.
 * @returns {Promise<object>} Alignment score and missing requirements analysis.
 */
export const matchResumeToJob = async (resumeText, job) => {
  try {
    const model = getModel();
    const requirementsStr = Array.isArray(job.requirements) ? job.requirements.join(', ') : '';
    const prompt = `
      You are an expert recruitment matching engine.
      Analyze the candidate's resume text against the target job posting details and compute a fit analysis.
      
      Job Details:
      - Title: ${job.title}
      - Description: ${job.description}
      - Core Requirements: ${requirementsStr}
      
      Candidate Resume Text:
      """
      ${resumeText}
      """

      Provide a structured JSON response matching the following schema:
      {
        "ai_match_score": number (0 to 100 representing how well the candidate fits the role),
        "ai_match_explanation": string (brief summary explaining the fit or gaps),
        "ai_skills_matched": array of strings (job requirements matched by candidate skills),
        "ai_skills_missing": array of strings (job requirements missing from candidate's resume),
        "ai_recommendation": string (recommendation level: e.g. "Excellent Match", "Strong Match", "Potential Match", "Weak Match")
      }
    `;

    const result = await model.generateContent(prompt);
    const text = result.response.text();
    return parseSafeJSON(text);
  } catch (error) {
    console.error('[Gemini matchResumeToJob Error]:', error);
    throw new Error('Gemini AI failed to compute job match score: ' + error.message);
  }
};

/**
 * Generate 5 technical/behavioral mock interview questions.
 * @param {string[]} skills - Array of candidate skills.
 * @param {string} jobTitle - Target job title.
 * @param {string} jobDescription - Target job description (optional).
 * @returns {Promise<object>} Questions list.
 */
export const generateInterviewQuestions = async (skills, jobTitle, jobDescription = '') => {
  try {
    const model = getModel();
    const prompt = `
      You are an expert tech recruiter conducting a mock interview.
      Generate exactly 5 interview questions for a candidate with the following profile:
      - Target Position: ${jobTitle}
      ${jobDescription ? `- Job Details: ${jobDescription}` : ''}
      - Candidate Skills: ${skills.join(', ')}

      Ensure the questions include:
      - 2 core technical questions (based on skills and role complexity)
      - 2 situational/problem-solving questions
      - 1 behavioral question (conflict resolution, communication, or collaboration)

      Provide a structured JSON response matching the following schema:
      {
        "questions": [
          { "id": 1, "question": "string", "type": "technical" | "situational" | "behavioral", "focus": "string (e.g. React Hooks, Database Indexing, Team Conflict)" },
          ...
        ]
      }
    `;

    const result = await model.generateContent(prompt);
    const text = result.response.text();
    return parseSafeJSON(text);
  } catch (error) {
    console.error('[Gemini generateInterviewQuestions Error]:', error);
    throw new Error('Gemini AI failed to generate mock interview questions.');
  }
};

/**
 * Evaluate mock interview answers.
 * @param {object[]} qaList - Array of { question, answer } objects.
 * @returns {Promise<object>} Score breakdown and suggestions.
 */
export const evaluateInterviewAnswers = async (qaList) => {
  try {
    const model = getModel();
    const prompt = `
      You are a senior engineering manager grading a candidate's mock technical interview answers.
      Evaluate the following list of questions and candidate answers, and score each dimension out of 100.
      
      Questions and Answers:
      ${JSON.stringify(qaList, null, 2)}

      Evaluate:
      1. Technical Knowledge (accuracy, depth, correctness)
      2. Communication (articulation, structure, conciseness)
      3. Problem Solving (thought process, handling corner cases)
      
      Provide a structured JSON response matching the following schema:
      {
        "overall_score": number (average of the three dimensions),
        "technical_knowledge": number (0 to 100),
        "communication": number (0 to 100),
        "problem_solving": number (0 to 100),
        "ai_feedback": {
          "strengths": string (summary of what the candidate did well),
          "areasOfImprovement": string (summary of overall communication and logic gaps),
          "technicalGaps": string (specific concepts or tools they struggled to explain correctly)
        },
        "suggestions": array of strings (actionable advice to improve their answers)
      }
    `;

    const result = await model.generateContent(prompt);
    const text = result.response.text();
    return parseSafeJSON(text);
  } catch (error) {
    console.error('[Gemini evaluateInterviewAnswers Error]:', error);
    throw new Error('Gemini AI failed to evaluate interview answers.');
  }
};

/**
 * Generate a professional job description from key inputs.
 */
export const generateJobDescriptionText = async (title, requirements, experience, location, jobType, salary) => {
  try {
    // We get the standard text model for raw text generation (not json)
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
    const prompt = `
      You are an expert tech recruiter and HR writer.
      Generate a professional, structured, and modern Job Description for:
      - Title: ${title}
      - Required Skills: ${requirements.join(', ')}
      - Experience Level: ${experience}
      - Location: ${location}
      - Employment Type: ${jobType}
      ${salary ? `- Salary Range: ${salary}` : ''}

      Format your output in clean Markdown. Include the following sections:
      1. Role Overview (an exciting introduction to the role)
      2. Key Responsibilities (bullet points of daily tasks)
      3. Qualifications & Technical Requirements (bullet points of skills and experience)
      4. What We Offer (typical startup/enterprise benefits)
      
      Do not include any placeholders or template instructions. Make it direct and ready to publish.
    `;

    const result = await model.generateContent(prompt);
    return result.response.text();
  } catch (error) {
    console.error('[Gemini generateJobDescriptionText Error]:', error);
    throw new Error('Gemini AI failed to generate job description.');
  }
};

/**
 * Generate interview questions for a recruiter to ask a candidate, based on their gaps.
 */
export const generateRecruiterQuestionsForCandidate = async (candidateName, candidateSkills, missingSkills, jobTitle) => {
  try {
    const model = genAI.getGenerativeModel({ 
      model: 'gemini-2.5-flash',
      generationConfig: { responseMimeType: "application/json" }
    });
    
    const prompt = `
      You are a tech lead preparing to interview a candidate named ${candidateName} for the position of ${jobTitle}.
      Review the candidate's skills and the specific gaps identified:
      - Candidate Skills: ${candidateSkills.join(', ')}
      - Missing Skills: ${missingSkills.join(', ')}

      Generate exactly 5 targeted interview questions designed to evaluate:
      1. Technical competence in their listed skills (2 questions)
      2. Probe their knowledge in the missing skills areas to see if they can pick them up quickly (2 questions)
      3. A behavioral scenario related to collaboration or learning new technologies (1 question)

      Provide a structured JSON response matching the following schema:
      {
        "questions": [
          { "id": number, "question": "string", "type": "technical" | "probe" | "behavioral", "focus": "string (e.g. React lifecycle, AWS concepts)" }
        ]
      }
    `;

    const result = await model.generateContent(prompt);
    const text = result.response.text();
    return parseSafeJSON(text);
  } catch (error) {
    console.error('[Gemini generateRecruiterQuestionsForCandidate Error]:', error);
    throw new Error('Gemini AI failed to generate recruiter interview questions.');
  }
};

/**
 * Optimize resume wording and structure suggestions (Module 7).
 */
export const optimizeResumeContent = async (resumeText) => {
  try {
    const model = getModel();
    const prompt = `
      You are an expert resume optimization coach.
      Review the following candidate resume text and provide structured suggestions to improve wording, project descriptions, skills layouts, and ATS keyword visibility.
      Do not generate a complete new resume; provide modular improvement suggestions.

      JSON Response Schema:
      {
        "wording_improvements": [
          { "original": "string (original sentence)", "improved": "string (improved strong action-verb version)", "benefit": "string (why it is better)" }
        ],
        "project_descriptions": [
          { "project": "string (project name or identifier)", "original": "string (original description)", "improved": "string (impact-driven bullet point using STAR method)" }
        ],
        "skills_section": {
          "add_skills": ["string (suggested skills to include based on their background)"],
          "group_by": "string (suggested organization groups, e.g. Core Languages, Cloud DevOps)"
        },
        "formatting_suggestions": ["string (guidelines on layout, fonts, margins, page length)"],
        "missing_keywords": ["string (typical ATS target keywords missing from their text)"]
      }

      Resume Text:
      """
      ${resumeText}
      """
    `;

    const result = await model.generateContent(prompt);
    const text = result.response.text();
    return parseSafeJSON(text);
  } catch (error) {
    console.error('[Gemini optimizeResumeContent Error]:', error);
    throw new Error('Gemini AI failed to generate resume optimization recommendations.');
  }
};

