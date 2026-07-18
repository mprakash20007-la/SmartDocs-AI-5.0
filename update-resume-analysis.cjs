const fs = require('fs');

let code = fs.readFileSync('server.ts', 'utf8');

// We need to replace the entire Step 2b (Resume vs JD Analysis) in server.ts
// I'll search for "// Step 2b: Compare Resume vs JD Analysis" up to "// Step 3: Generate Dynamic Quiz"
const startTag = '// Step 2b: Compare Resume vs JD Analysis';
const endTag = '// Step 3: Generate Dynamic Quiz questions based on JD, Role, and Resume';

const startIndex = code.indexOf(startTag);
const endIndex = code.indexOf(endTag);

if (startIndex === -1 || endIndex === -1) {
  console.error('Tags not found');
  process.exit(1);
}

const replacement = `// Step 2b: Unified Resume Analysis & Profile Extraction via HuggingFace
    const jd = jobDescription || \`Position for \${role} requiring relevant technical background, problem solving, and professional development practices.\`;
    let analysis: ResumeAnalysis;
    
    try {
      const analysisPrompt = \`You are an expert HR recruiter and technical evaluator.
Analyze the candidate's full resume text against the Job Description (JD) for the role: "\${role}".

RESUME CONTENT:
\${doc.content}

JOB DESCRIPTION:
"\${jd}"

Extract the following information and evaluate the candidate strictly.
You MUST return ONLY valid JSON matching this exact structure, with no markdown formatting or extra text:
{
  "Candidate Name": "String",
  "Email": "String",
  "Phone": "String",
  "Skills": ["String"],
  "Programming Languages": ["String"],
  "Frameworks": ["String"],
  "Education": "String",
  "Experience": "String",
  "Projects": "String",
  "Strengths": ["String"],
  "Weaknesses": ["String"],
  "ATS Score": 85,
  "Technical Score": 90,
  "Overall Score": 88,
  "Recommendations": "String"
}\`;

      let parsedResponse: any = null;
      let attempts = 0;
      let lastErr = null;
      
      while (attempts < 2) {
        try {
          const responseText = await askAI(analysisPrompt);
          // Clean markdown wrappers if any
          const jsonStr = responseText.replace(/\\s*\`\`\`json\\n?|\\s*\`\`\`/g, '').trim();
          parsedResponse = JSON.parse(jsonStr);
          break; // Success
        } catch (err) {
          lastErr = err;
          attempts++;
          console.warn(\`JSON parsing failed on attempt \${attempts}, retrying...\`);
        }
      }
      
      if (!parsedResponse) throw lastErr;

      // Update the profile with the newly extracted rich data to keep UI consistent
      profile = {
        name: parsedResponse["Candidate Name"] || candidateName,
        email: parsedResponse["Email"] || candidateEmail,
        phone: parsedResponse["Phone"] || 'Not Provided',
        skills: [...(parsedResponse["Skills"] || []), ...(parsedResponse["Programming Languages"] || []), ...(parsedResponse["Frameworks"] || [])],
        experience: parsedResponse["Experience"] || profile.experience || 'Not listed',
        education: parsedResponse["Education"] || profile.education || 'Not listed',
        projects: parsedResponse["Projects"] || profile.projects || 'Not listed',
        certifications: profile.certifications || 'Not listed'
      };
      
      // Update the document to cache this better profile
      const docIndex = db.documents.findIndex(d => d.id === documentId);
      if (docIndex !== -1) {
        db.documents[docIndex].candidateProfile = profile;
        saveDb(db);
      }

      // Map to the existing ResumeAnalysis UI structure
      analysis = {
        matchPercentage: parsedResponse["ATS Score"] || 70,
        skillGap: parsedResponse["Weaknesses"] || ['None detected'],
        missingSkills: [], // Mapped to skillGap in UI
        strengths: parsedResponse["Strengths"] || ['Relevant background'],
        weaknesses: parsedResponse["Weaknesses"] || ['Underspecified details'],
        recommendation: parsedResponse["Recommendations"] || 'Evaluate further via screening assessment.',
        overallScore: Math.round((parsedResponse["Overall Score"] || 70) / 10)
      };

    } catch (errAnalysis) {
      console.warn('Failed to run resume vs JD analysis (all retries failed), using fallback:', errAnalysis);
      analysis = {
        matchPercentage: 70,
        skillGap: ['None detected'],
        missingSkills: [],
        strengths: ['Relevant background matching role requirements'],
        weaknesses: ['Underspecified details'],
        recommendation: 'Evaluate further via screening assessment.',
        overallScore: 7
      };
    }

    `;

code = code.slice(0, startIndex) + replacement + code.slice(endIndex);
fs.writeFileSync('server.ts', code);
console.log('Successfully updated Resume Analysis logic.');
