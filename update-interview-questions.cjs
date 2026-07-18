const fs = require('fs');

let code = fs.readFileSync('server.ts', 'utf8');

// 1. Replace the GET interview questions route logic
const targetGetStart = `    // Generate questions via Gemini 2.5
    let questions: string[] = [];
    try {
      const prompt = \`You are an AI Technical Interviewer. Generate exactly 5 dynamic interview questions for candidate \${assess.candidateName} applying for the role of "\${assess.role}".
      
The questions should be based on:
- Candidate Profile Skills: \${assess.profile ? assess.profile.skills.join(', ') : 'standard technical competencies'}
- Candidate Resume/Profile Context
- Screening Quiz Score: \${assess.score || 0}/10

Make the questions highly context-specific, evaluating their depth of knowledge, problem-solving mindset, and engineering decisions. The questions should test their understanding of areas they might have struggled with in the screening quiz.

Return a JSON object with a single key "questions" containing a list of exactly 5 text strings:
{ "questions": ["...", "...", "...", "...", "..."] }\`;`;

const newGetLogic = `    // Generate rich structured questions via AI
    let questions: string[] = [];
    try {
      const prompt = \`You are an expert AI Technical Interviewer. Generate interview questions based on the following context:
      
Candidate Resume/Experience: \${assess.profile?.experience || 'Not provided'}
Job Role: \${assess.role}
Experience Level: \${assess.profile?.experience ? 'Derived from resume' : 'Mid-level'}
Skills: \${assess.profile?.skills?.join(', ') || 'General software engineering'}

Generate exactly 9 questions in total:
- 5 Technical Questions
- 2 Coding Questions
- 2 HR Questions

Return ONLY valid JSON in this exact structure with no markdown or formatting wrappers:
{
  "questions": [
    {
      "type": "Technical",
      "question": "The actual question text",
      "difficulty": "Medium",
      "expectedPoints": ["Point 1", "Point 2"]
    }
  ]
}\`;

      let parsed = null;
      let attempts = 0;
      while (attempts < 2) {
        try {
          const responseText = await askAI(prompt);
          const jsonStr = responseText.replace(/\\s*\`\`\`json\\n?|\\s*\`\`\`/g, '').trim();
          parsed = JSON.parse(jsonStr);
          break;
        } catch (err) {
          attempts++;
        }
      }

      if (parsed && Array.isArray(parsed.questions) && parsed.questions.length === 9) {
        questions = parsed.questions.map((q: any) => 
          \`[\${q.type} - \${q.difficulty}] \${q.question} (Look for: \${(q.expectedPoints || []).join(', ')})\`
        );
      }
    } catch (apiErr) {
      console.warn('AI interview question generator error, using default questions:', apiErr);
    }`;

code = code.replace(targetGetStart, newGetLogic);


// 2. Replace the length check in GET route
code = code.replace(
  `if (questions.length !== 5) {`,
  `if (questions.length !== 9) {`
);

// 3. Replace the fallback questions array to have 9 questions
code = code.replace(
  `        \`Why are you interested in this position, and how do your skills align with the requirements of this role?\`
      ];`,
  `        \`Why are you interested in this position, and how do your skills align with the requirements of this role?\`,
        \`[Technical - Hard] Explain how you would optimize a slow database query in production.\`,
        \`[Coding - Medium] How would you implement a rate limiter in Node.js?\`,
        \`[Coding - Hard] Write an algorithm to detect a cycle in a directed graph.\`,
        \`[HR - Medium] Describe a time you had a conflict with a teammate and how you resolved it.\`
      ];`
);

// 4. Update the POST interview-submit length check
code = code.replace(
  `if (!answers || !Array.isArray(answers) || answers.length !== 5) {
      return res.status(400).json({ error: 'Exactly 5 interview answers are required.' });`,
  `if (!answers || !Array.isArray(answers) || answers.length === 0) {
      return res.status(400).json({ error: 'Interview answers are required.' });`
);

// 5. Update the grading prompt in POST
code = code.replace(
  `Grade this candidate's response to 5 technical interview questions for the position of "\${assess.role}".`,
  `Grade this candidate's response to \${answers.length} interview questions for the position of "\${assess.role}".`
);

fs.writeFileSync('server.ts', code);
console.log('Successfully updated interview generation logic.');
