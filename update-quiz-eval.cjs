const fs = require('fs');

let code = fs.readFileSync('server.ts', 'utf8');

const startStr = '// Calculate score\n    let score = 0;\n    assess.questions.forEach((q, idx) => {\n      if (answers[idx] === q.correctAnswer) {\n        score++;\n      }\n    });';

const replacement = `// Calculate score using AI Evaluation
    let score = 0;
    try {
      const evalPrompt = \`You are an expert technical interviewer evaluating a candidate's multiple-choice quiz.
Evaluate the candidate's answers against the correct answers and provide a detailed assessment.

QUESTIONS AND ANSWERS:
\${JSON.stringify(assess.questions.map((q, i) => ({
  question: q.question,
  options: q.options,
  correctAnswerIndex: q.correctAnswer,
  candidateAnswerIndex: answers[i]
})))}\n\n

You MUST return ONLY valid JSON matching this exact structure, with no markdown formatting or extra text:
{
  "score": 8,
  "correctAnswers": 8,
  "feedback": "String summarizing performance.",
  "strengths": ["String"],
  "weaknesses": ["String"],
  "recommendations": "String"
}\`;

      let parsedEval = null;
      let attempts = 0;
      let lastErr = null;
      while (attempts < 2) {
        try {
          const evalResponseText = await askAI(evalPrompt);
          const evalJsonStr = evalResponseText.replace(/\\s*\`\`\`json\\n?|\\s*\`\`\`/g, '').trim();
          parsedEval = JSON.parse(evalJsonStr);
          break; // Success
        } catch (err) {
          lastErr = err;
          attempts++;
          console.warn(\`Quiz evaluation JSON parsing failed on attempt \${attempts}, retrying...\`);
        }
      }
      
      if (!parsedEval) throw lastErr;
      score = typeof parsedEval.score === 'number' ? parsedEval.score : parseInt(parsedEval.score) || 0;
      
      // Store the rich evaluation data in the assessment object (even if UI doesn't currently display it)
      db.candidateAssessments[assessIndex].quizEvaluation = {
        feedback: parsedEval.feedback,
        strengths: parsedEval.strengths,
        weaknesses: parsedEval.weaknesses,
        recommendations: parsedEval.recommendations
      };

    } catch (evalErr) {
      console.warn('Failed to evaluate quiz with AI, using manual fallback:', evalErr);
      score = 0;
      assess.questions.forEach((q, idx) => {
        if (answers[idx] === q.correctAnswer) {
          score++;
        }
      });
    }`;

if (!code.includes(startStr)) {
  console.error("Could not find start string.");
  process.exit(1);
}

code = code.replace(startStr, replacement);
fs.writeFileSync('server.ts', code);
console.log('Successfully updated quiz evaluation logic.');
