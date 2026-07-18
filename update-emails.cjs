const fs = require('fs');

const serverFile = 'server.ts';
let code = fs.readFileSync(serverFile, 'utf8');

// 1. Inject Helper Functions right below the imports
const helpers = `
// --- AI Email Helpers ---
function cleanJsonString(raw: string): string {
  if (!raw) return '{}';
  return raw.replace(/^\\s*\`\`\`(?:json)?\\n?/i, '').replace(/\\n?\`\`\`\\s*$/, '').trim();
}

async function generateEmailWithRetry(
  promptStr: string,
  fallbackSubject: string,
  fallbackHtml: string,
  fallbackPreview: string = ''
): Promise<{ subject: string; htmlBody: string; plainPreview: string }> {
  let attempts = 0;
  let lastErr = null;
  while (attempts < 2) {
    try {
      const rawText = await askAI(promptStr);
      console.log(\`[AI Email API Response Attempt \${attempts + 1}]:\`, rawText);
      
      const cleanJson = cleanJsonString(rawText);
      const parsed = JSON.parse(cleanJson);
      
      return {
        subject: parsed.subject || fallbackSubject,
        htmlBody: parsed.htmlBody || fallbackHtml,
        plainPreview: parsed.plainPreview || fallbackPreview
      };
    } catch (err) {
      lastErr = err;
      attempts++;
      console.warn(\`AI Email JSON parse failed on attempt \${attempts}, retrying...\`);
    }
  }
  
  console.warn('AI Email fallback used after retries. Last Error:', lastErr);
  return {
    subject: fallbackSubject,
    htmlBody: fallbackHtml,
    plainPreview: fallbackPreview
  };
}
// ------------------------
`;

if (!code.includes('function cleanJsonString')) {
  // Find the exact line
  const lines = code.split('\\n');
  let insertIdx = -1;
  for(let i=0; i<lines.length; i++){
    if(lines[i].includes('import { askAI }')) {
      insertIdx = i;
      break;
    }
  }
  if (insertIdx !== -1) {
    lines.splice(insertIdx + 1, 0, helpers);
    code = lines.join('\\n');
  }
}

// 2. Update Generate Draft
const draftBlockRegex = /const emailResponseText = await askAI[^;]+;\s*const emailResponse = { text: emailResponseText };\s*const emailResult = JSON\.parse\(emailResponse\.text \|\| '\{\}'\);/s;
const draftReplacement = `
    let promptStr = typeof emailContents === 'string' ? emailContents : JSON.stringify(emailContents);
    const fallbackSubj = \`Re: \${doc.title}\`;
    const fallbackHtml = \`<p>Dear \${recipient},</p><p>Thank you for sharing the document titled "\${doc.title}". I have reviewed its contents and will follow up shortly.</p><p>Best regards,</p>\`;
    
    const emailResult = await generateEmailWithRetry(promptStr, fallbackSubj, fallbackHtml, 'AI-generated response placeholder.');
`;
code = code.replace(draftBlockRegex, draftReplacement);
code = code.replace("htmlBody: emailResult.htmlBody || '<p>Failed to generate email content.</p>'", "htmlBody: emailResult.htmlBody");

// 3. Update Regenerate Draft
const regenBlockRegex = /const responseText = await askAI[^;]+;\s*const response = { text: responseText };\s*const result = JSON\.parse\(response\.text \|\| '\{\}'\);/s;
const regenReplacement = `
    let promptStr = typeof regenContents === 'string' ? regenContents : JSON.stringify(regenContents);
    const emailResult = await generateEmailWithRetry(promptStr, 'Re: Update', '<p>Failed to regenerate document properly. Please review.</p>', '');
    const result = emailResult;
`;
// Only apply this inside the regenerate-draft route (around line 2520)
let startIdx = code.indexOf("app.post('/api/smart-email/regenerate-draft'");
if (startIdx !== -1) {
    let endIdx = code.indexOf("app.delete('/api/smart-email/drafts/:id'", startIdx);
    let slice = code.substring(startIdx, endIdx);
    slice = slice.replace(regenBlockRegex, regenReplacement);
    slice = slice.replace("htmlBody: result.htmlBody || '<p>Failed to regenerate email content.</p>'", "htmlBody: result.htmlBody");
    code = code.substring(0, startIdx) + slice + code.substring(endIdx);
}

// 4. Update Resume Analysis 
const analysisRegex = /const responseText = await askAI\(analysisPrompt\);\s*const response = \{ text: responseText \};\s*const parsedAnalysis = JSON\.parse\(response\.text \|\| '\{\}'\);/s;
const analysisReplacement = `
        const rawText = await askAI(analysisPrompt);
        console.log('[AI Resume Analysis Response]:', rawText);
        const cleanJson = cleanJsonString(rawText);
        let parsedAnalysis;
        try {
          parsedAnalysis = JSON.parse(cleanJson);
        } catch(e) {
          console.warn('Fallback analysis due to parse error:', e);
          parsedAnalysis = { matchPercentage: 50, strengths: [], weaknesses: [], recommendation: 'Manual review required.' };
        }
`;
code = code.replace(analysisRegex, analysisReplacement);

// 5. Quiz Submit (Interview Invitation / Rejection)
const quizSubmitStart = code.indexOf("app.post('/api/smart-email/assessments/:id/quiz-submit'");
if (quizSubmitStart !== -1) {
    let slice = code.substring(quizSubmitStart, code.indexOf("app.post('/api/smart-email/assessments/:id/interview-submit'"));
    
    // Replace invite email AI call
    const inviteBlock = /const responseText = await askAI[^;]+invitePrompt[^;]+;\s*const response = \{ text: responseText \};\s*const result = JSON\.parse\(response\.text \|\| '\{\}'\);\s*subject = result\.subject[^;]+;\s*htmlBody = result\.htmlBody[^;]+;/s;
    const inviteReplace = `
        const promptStr = typeof invitePrompt === 'string' ? invitePrompt : JSON.stringify(invitePrompt);
        const fallbackHtml = \`<p>Dear \${assess.candidateName},</p><p>Congratulations! You scored <strong>\${score}/10</strong> on the suitability screening quiz, meeting our passing threshold.</p><p>We are pleased to invite you to the next stage of our recruitment process: the <strong>AI Voice/Text Interview</strong>.</p><p>Please log back into the candidate portal to launch your automated interview.</p>\`;
        const emailResult = await generateEmailWithRetry(promptStr, \`Action Required: AI Interview Invitation - \${assess.role}\`, fallbackHtml);
        subject = emailResult.subject;
        htmlBody = emailResult.htmlBody;
    `;
    slice = slice.replace(inviteBlock, inviteReplace);

    // Replace reject email AI call
    const rejectBlock = /const responseText = await askAI[^;]+rejectPrompt[^;]+;\s*const response = \{ text: responseText \};\s*const result = JSON\.parse\(response\.text \|\| '\{\}'\);\s*subject = result\.subject[^;]+;\s*htmlBody = result\.htmlBody[^;]+;/s;
    const rejectReplace = `
        const promptStr = typeof rejectPrompt === 'string' ? rejectPrompt : JSON.stringify(rejectPrompt);
        const fallbackHtml = \`<p>Dear \${assess.candidateName},</p><p>Thank you for taking the time to complete our screening assessment.</p><p>You scored <strong>\${score}/10</strong>. Unfortunately, this does not meet our required score of 8/10 to proceed to the next stage.</p><p>We encourage you to review standard engineering frameworks and resources to continue improving your skills. We wish you the best in your search.</p>\`;
        const emailResult = await generateEmailWithRetry(promptStr, \`Application Update: \${assess.role} - SmartDocs AI\`, fallbackHtml);
        subject = emailResult.subject;
        htmlBody = emailResult.htmlBody;
    `;
    slice = slice.replace(rejectBlock, rejectReplace);

    code = code.substring(0, quizSubmitStart) + slice + code.substring(code.indexOf("app.post('/api/smart-email/assessments/:id/interview-submit'"));
}

// 6. Interview Submit (Offer Letter / Rejection)
const intSubmitStart = code.indexOf("app.post('/api/smart-email/assessments/:id/interview-submit'");
if (intSubmitStart !== -1) {
    let slice = code.substring(intSubmitStart);
    
    // Replace email AI call
    const emailBlock = /const responseText = await askAI[^;]+emailPrompt[^;]+;\s*const response = \{ text: responseText \};\s*const result = JSON\.parse\(response\.text \|\| '\{\}'\);\s*subject = result\.subject[^;]+;\s*htmlBody = result\.htmlBody[^;]+;/s;
    const emailReplace = `
      const promptStr = typeof emailPrompt === 'string' ? emailPrompt : JSON.stringify(emailPrompt);
      const fallbackHtmlPass = \`<p>Dear \${assess.candidateName},</p><p>Congratulations! We were extremely impressed with your interview and would like to extend an offer for the \${assess.role} position.</p><p>Our HR team will follow up shortly with the official documentation.</p>\`;
      const fallbackHtmlFail = \`<p>Dear \${assess.candidateName},</p><p>Thank you for completing the interview process. While we were impressed with certain aspects of your background, we have decided to move forward with other candidates at this time.</p><p>We wish you the best in your future endeavors.</p>\`;
      
      const emailResult = await generateEmailWithRetry(
        promptStr, 
        isHired ? \`Offer Letter: \${assess.role} at SmartDocs AI\` : \`Update on your application for \${assess.role}\`, 
        isHired ? fallbackHtmlPass : fallbackHtmlFail
      );
      
      subject = emailResult.subject;
      htmlBody = emailResult.htmlBody;
    `;
    slice = slice.replace(emailBlock, emailReplace);
    code = code.substring(0, intSubmitStart) + slice;
}

fs.writeFileSync(serverFile, code);
console.log('Update script completed successfully.');
