import express from 'express';
import { getGeminiClient, Type, runBackgroundAutomation, getClassificationAndEmbedding, cosineSimilarity, fetchBlobAsBase64, fetchBlobAsText } from '../../server-core.ts';
import { DocumentModel, ChatModel, QuizModel } from '../db/mongo.ts'; // Import Mongoose models

const router = express.Router();

router.post('/api/documents/:id/quiz', async (req, res) => {
  try {
    const { difficulty } = req.body;
    if (!difficulty) {
      return res.status(400).json({ error: 'Missing difficulty level' });
    }

    const doc = await DocumentModel.findOne({ id: req.params.id });
    if (!doc) {
      return res.status(404).json({ error: 'Document not found' });
    }

    const client = getGeminiClient();

    let contents: any;
    if (doc.type === 'pdf') {
      const base64Data = await fetchBlobAsBase64(doc.content);
      contents = [
        {
          inlineData: {
            mimeType: 'application/pdf',
            data: base64Data
          }
        },
        `Generate a ${difficulty} difficulty level multiple-choice quiz of 5 questions based on this PDF.`
      ];
    } else {
      const textData = await fetchBlobAsText(doc.content);
      contents = `Generate a ${difficulty} difficulty level multiple-choice quiz of 5 questions based on this document content.\n\nDocument Title: ${doc.title}\n\nContent:\n${textData}`;
    }

    const response = await client.models.generateContent({
      model: 'gemini-2.0-flash',
      contents: contents,
      config: {
        systemInstruction: `You are an expert educator and exam developer. Your goal is to design a multiple choice quiz of exactly 5 questions testing critical and minor aspects of the provided document at a ${difficulty} difficulty level.
For each question:
- question: a highly informative, unambiguous question testing comprehension of the document.
- options: an array of EXACTLY 4 highly plausible answers.
- correctAnswer: a 0-indexed number indicating the correct answer choice.
- explanation: a short but highly informative paragraph explaining why the answer is correct with references to the content.
Return your answer strictly in JSON format.`,
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              question: { type: Type.STRING },
              options: {
                type: Type.ARRAY,
                items: { type: Type.STRING }
              },
              correctAnswer: { type: Type.INTEGER, description: 'The 0-indexed number of the correct option' },
              explanation: { type: Type.STRING, description: 'Explanation of the answer' }
            },
            required: ['question', 'options', 'correctAnswer', 'explanation']
          }
        }
      }
    });

    const quizText = response.text;
    if (!quizText) {
      throw new Error('Gemini did not return any quiz data');
    }

    const rawQuestions = JSON.parse(quizText);
    const formattedQuestions = rawQuestions.map((q: any) => ({
      id: 'q_' + Math.random().toString(36).substring(2, 11),
      question: q.question,
      options: q.options,
      correctAnswer: q.correctAnswer,
      explanation: q.explanation
    }));

    const newQuizData = {
      id: 'quiz_' + Math.random().toString(36).substring(2, 11),
      documentId: doc.id,
      difficulty: difficulty, // Assuming Difficulty type is compatible with string
      questions: formattedQuestions
    };

    const createdQuiz = await QuizModel.create(newQuizData);

    res.status(201).json(createdQuiz);
  } catch (err: any) {
    console.error('Quiz creation error:', err);
    res.status(500).json({ error: err.message });
  }
});

router.post('/api/documents/:id/automate', async (req, res) => {
  try {
    let doc = await DocumentModel.findOne({ id: req.params.id });
    if (!doc) {
      return res.status(404).json({ error: 'Document not found' });
    }

    // If report already exists, return it directly
    if (doc.automationReport) {
      return res.json(doc.automationReport);
    }

    // If already running, return status
    if (doc.automationStatus?.status === 'running') {
      return res.status(202).json(doc.automationStatus);
    }

    // Mark as running
    const automationStatus = {
      status: 'running',
      currentStep: 1,
      progress: 10
    };
    await DocumentModel.updateOne({ id: req.params.id }, { $set: { automationStatus: automationStatus } });

    // Run background job asynchronously
    runBackgroundAutomation(doc.id).catch(err => {
      console.error(`Background automation failed to initiate or run for ${doc.id}:`, err);
    });

    res.status(202).json(automationStatus); // Return the status we just set
  } catch (err: any) {
    console.error('Automation trigger error:', err);
    res.status(500).json({ error: err.message });
  }
});

router.get('/api/documents/:id/automation-status', async (req, res) => {
  try {
    let doc = await DocumentModel.findOne({ id: req.params.id });
    if (!doc) {
      return res.status(404).json({ error: 'Document not found' });
    }
    
    // If it has a report but no status, status is completed
    if (doc.automationReport && (!doc.automationStatus || doc.automationStatus.status !== 'completed')) {
      const completedStatus = { status: 'completed', currentStep: 10, progress: 100 };
      await DocumentModel.updateOne({ id: req.params.id }, { $set: { automationStatus: completedStatus } });
      doc.automationStatus = completedStatus; // Update local doc object for immediate response
    }
    
    res.json(doc.automationStatus || { status: 'idle', currentStep: 0, progress: 0 });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/api/documents/:id/summarize', async (req, res) => {
  try {
    let doc = await DocumentModel.findOne({ id: req.params.id });
    if (!doc) {
      return res.status(404).json({ error: 'Document not found' });
    }

    // If summary already exists, return it directly
    if (doc.summary) {
      return res.json(doc.summary);
    }

    const client = getGeminiClient();

    let contents: any;
    if (doc.type === 'pdf') {
      const base64Data = await fetchBlobAsBase64(doc.content);
      contents = [
        {
          inlineData: {
            mimeType: 'application/pdf',
            data: base64Data
          }
        },
        'Provide a highly detailed executive summary, key bullet points, insights, and action items for this PDF document.'
      ];
    } else {
      const textData = await fetchBlobAsText(doc.content);
      contents = `Provide a highly detailed executive summary, key bullet points, insights, and action items for this document.\n\nTitle: ${doc.title}\n\nContent:\n${textData}`;
    }

    const response = await client.models.generateContent({
      model: 'gemini-2.0-flash',
      contents: contents,
      config: {
        systemInstruction: `You are an expert document analysis agent. Provide a rigorous, premium quality summary of the document.
Return your response ONLY in JSON format with exactly the following keys:
- executiveSummary: a highly polished paragraph summarizing the core intent, value, and context of the document.
- bulletPoints: an array of 4-6 concise key bullet points summarizing core information.
- keyInsights: an array of 3-4 profound takeaways or discoveries.
- actionItems: an array of 3-5 concrete action items or next steps.`,
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            executiveSummary: { type: Type.STRING },
            bulletPoints: {
              type: Type.ARRAY,
              items: { type: Type.STRING }
            },
            keyInsights: {
              type: Type.ARRAY,
              items: { type: Type.STRING }
            },
            actionItems: {
              type: Type.ARRAY,
              items: { type: Type.STRING }
            }
          },
          required: ['executiveSummary', 'bulletPoints', 'keyInsights', 'actionItems']
        }
      }
    });

    const summaryText = response.text;
    if (!summaryText) {
      throw new Error('Gemini did not return any summary response');
    }

    const summaryData = JSON.parse(summaryText);
    await DocumentModel.updateOne({ id: req.params.id }, { $set: { summary: summaryData } });

    res.json(summaryData);
  } catch (err: any) {
    console.error('Summarize error:', err);
    res.status(500).json({ error: err.message });
  }
});

router.delete('/api/documents/:id', async (req, res) => {
  try {
    const doc = await DocumentModel.findOne({ id: req.params.id });
    if (!doc) {
      return res.status(404).json({ error: 'Document not found' });
    }

    // Remove document
    await DocumentModel.deleteOne({ id: req.params.id });
    
    // Clean up associated chats and quizzes
    await ChatModel.deleteMany({ documentId: req.params.id });
    await QuizModel.deleteMany({ documentId: req.params.id });

    res.json({ message: 'Document and associated data deleted successfully' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/api/upload-token', (req, res) => {
  res.json({ token: process.env.BLOB_READ_WRITE_TOKEN });
});

router.post('/api/documents', async (req, res) => {
  try {
    const { title, type, fileUrl, size } = req.body;
    if (!title || !type || !fileUrl) {
      return res.status(400).json({ error: 'Missing document fields (title, type, fileUrl)' });
    }

    // We no longer pass base64 content to getClassificationAndEmbedding because it's a URL now.
    // Instead we can pass the title for classification, or fetch the first few KB if needed.
    // For now, let's just use the title for classification to keep it simple and fast.
    const { category, embedding } = await getClassificationAndEmbedding(title, 'Document content located at: ' + fileUrl, type);

    const newDocData = {
      id: 'doc_' + Math.random().toString(36).substring(2, 11),
      title,
      type,
      size: size || 'Unknown size',
      uploadedAt: new Date().toISOString(),
      content: fileUrl, // Now storing the URL instead of base64
      category,
      folder: category,
      embedding
    };

    const createdDoc = await DocumentModel.create(newDocData);

    res.status(201).json({
      id: createdDoc.id,
      title: createdDoc.title,
      type: createdDoc.type,
      size: createdDoc.size,
      uploadedAt: createdDoc.uploadedAt,
      hasSummary: !!createdDoc.summary, // Check if summary exists on the created doc
      category: createdDoc.category,
      folder: createdDoc.folder
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/api/documents/semantic-search', async (req, res) => {
  try {
    const { query } = req.body;
    if (!query || !query.trim()) {
      return res.json({ results: [] });
    }

    const documentCount = await DocumentModel.countDocuments();
    if (documentCount === 0) {
      return res.json({ results: [] });
    }

    const client = getGeminiClient();
    let queryEmbedding: number[] | null = null;

    try {
      if (client && process.env.GEMINI_API_KEY) {
        const embedResponse = await client.models.embedContent({
          model: 'text-embedding-004',
          contents: query
        });
        if (embedResponse.embeddings && embedResponse.embeddings.length > 0 && embedResponse.embeddings[0].values) {
          queryEmbedding = embedResponse.embeddings[0].values;
        }
      }
    } catch (err) {
      console.error('Failed to embed search query, falling back to simple keyword matching:', err);
    }

    let results = [];
    const allDocs = await DocumentModel.find({}); // Fetch all documents for processing

    if (queryEmbedding) {
      results = allDocs.map(d => {
        let score = 0;
        let reason = '';

        if (d.embedding && d.embedding.some(v => v !== 0)) {
          const sim = cosineSimilarity(queryEmbedding!, d.embedding);
          score = Math.round(((sim + 1) / 2) * 100);
          if (score >= 80) reason = `High semantic match on concept "${query}".`;
          else if (score >= 50) reason = `Moderate relevance relating to search query.`;
          else reason = `Low semantic similarity detected.`;
        } else {
          const matches = d.title.toLowerCase().includes(query.toLowerCase()) ||
                          d.content.toLowerCase().includes(query.toLowerCase());
          score = matches ? 75 : 0;
          reason = matches ? `Keyword match found in title or content.` : `No match found.`;
        }

        return { id: d.id, score, reason };
      });
    } else {
      results = allDocs.map(d => {
        const inTitle = d.title.toLowerCase().includes(query.toLowerCase());
        const inContent = d.content.toLowerCase().includes(query.toLowerCase());
        let score = 0;
        let reason = '';
        if (inTitle) {
          score = 90;
          reason = `Query matched title exactly.`;
        } else if (inContent) {
          score = 65;
          reason = `Query found inside document content.`;
        } else {
          score = 0;
          reason = `No keyword occurrences.`;
        }
        return { id: d.id, score, reason };
      });
    }

    res.json({ results });
  } catch (err: any) {
    console.error('Semantic search error:', err);
    res.status(500).json({ error: err.message });
  }
});

router.get('/api/documents/:id/pages', async (req, res) => {
  try {
    let doc = await DocumentModel.findOne({ id: req.params.id });
    if (!doc) {
      return res.status(404).json({ error: 'Document not found' });
    }

    // Check if pages are already cached
    if (doc.pages && doc.pages.length > 0) {
      return res.json(doc.pages);
    }

    if (doc.type === 'pdf') {
      const client = getGeminiClient();
      const contents = [
        {
          inlineData: {
            mimeType: 'application/pdf',
            data: await fetchBlobAsBase64(doc.content) // base64 string
          }
        },
        'Extract the full readable text content of this PDF, page by page. Break it down into discrete pages of logical length so the user can read and annotate it easily.'
      ];

      const response = await client.models.generateContent({
        model: 'gemini-2.0-flash',
        contents: contents,
        config: {
          systemInstruction: `You are an expert document reading agent. Your task is to extract all readable text from the provided PDF, organizing it page-by-page.
Return your response ONLY in JSON format with a "pages" array containing objects with:
- pageNumber: an integer starting from 1
- title: a short descriptive section or page heading
- content: the readable text content of that page, complete and formatted cleanly. Do not summarize or omit paragraphs, represent the actual PDF text content.`,
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              pages: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    pageNumber: { type: Type.INTEGER },
                    title: { type: Type.STRING },
                    content: { type: Type.STRING }
                  },
                  required: ['pageNumber', 'title', 'content']
                }
              }
            },
            required: ['pages']
          }
        }
      });

      const text = response.text;
      if (!text) {
        throw new Error('Gemini did not return page-extraction data');
      }

      const pagesData = JSON.parse(text);
      await DocumentModel.updateOne({ id: req.params.id }, { $set: { pages: pagesData.pages } });
      res.json(pagesData.pages);
    } else {
      // Decode content if it was encoded, or use directly
      let plainText = doc.content;
      // If it looks like base64, try to decode it (just in case for docx/doc)
      if (doc.type === 'docx' && !plainText.includes(' ') && plainText.length > 100) {
        try {
          const buffer = Buffer.from(plainText, 'base64');
          plainText = buffer.toString('utf-8');
          // Filter printable text if it looks like binary
          if (plainText.includes('PK')) {
            plainText = "This is a DOCX document file. Let's study and annotate its pages. [Binary file parsed]";
          }
        } catch (e) {
          // ignore
        }
      }

      // Segment content into paginated parts
      const segmentSize = 1500;
      const pages = [];
      let charIdx = 0;
      let pageNum = 1;

      while (charIdx < plainText.length) {
        let chunk = plainText.substring(charIdx, charIdx + segmentSize);
        if (charIdx + segmentSize < plainText.length) {
          const lastSpace = chunk.lastIndexOf(' ');
          if (lastSpace > segmentSize - 200) {
            chunk = chunk.substring(0, lastSpace);
          }
        }

        pages.push({
          pageNumber: pageNum,
          title: `Section ${pageNum}`,
          content: chunk.trim()
        });

        charIdx += chunk.length;
        pageNum++;
      }

      if (pages.length === 0) {
        pages.push({
          pageNumber: 1,
          title: 'Empty Document',
          content: 'No readable content found in the document.'
        });
      }

      await DocumentModel.updateOne({ id: req.params.id }, { $set: { pages: pages } });
      res.json(pages);
    }
  } catch (err: any) {
    console.error('Pages parsing error:', err);
    res.status(500).json({ error: err.message });
  }
});

router.post('/api/documents/:id/synthesize-highlights', async (req, res) => {
  try {
    const { highlights } = req.body;
    if (!Array.isArray(highlights) || highlights.length === 0) {
      return res.status(400).json({ error: 'Please highlight some passages first.' });
    }

    const client = getGeminiClient();
    const highlightTexts = highlights.map((h: any) => `- [Page ${h.page}]: "${h.text}"`).join('\n');

    const prompt = `You are a professional research mentor and smart study companion.
The user has highlighted several passages from a document.
Please synthesize these highlights into a beautiful, cohesive, high-density study guide, categorized by key themes, core definitions, and action items.

Here are the user's raw highlights:
${highlightTexts}

Format your response in clean Markdown with professional headers, bullet points, and highlight takeaways. Avoid dry filler text, make it immediately useful and highly polished.`;

    const response = await client.models.generateContent({
      model: 'gemini-2.0-flash',
      contents: prompt
    });

    res.json({ synthesis: response.text || 'Failed to synthesize highlights.' });
  } catch (err: any) {
    console.error('Synthesis error:', err);
    res.status(500).json({ error: err.message });
  }
});

router.post('/api/documents/:id/annotations', async (req, res) => {
  try {
    const { annotations } = req.body;
    if (!Array.isArray(annotations)) {
      return res.status(400).json({ error: 'Annotations must be an array' });
    }

    const doc = await DocumentModel.findOne({ id: req.params.id });
    if (!doc) {
      return res.status(404).json({ error: 'Document not found' });
    }

    await DocumentModel.updateOne({ id: req.params.id }, { $set: { annotations: annotations } });
    res.json({ message: 'Annotations saved successfully', annotations });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/api/documents/:id/annotations', async (req, res) => {
  try {
    const doc = await DocumentModel.findOne({ id: req.params.id });
    if (!doc) {
      return res.status(404).json({ error: 'Document not found' });
    }
    res.json(doc.annotations || []);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/api/documents/:id', async (req, res) => {
  try {
    const doc = await DocumentModel.findOne({ id: req.params.id });
    if (!doc) {
      return res.status(404).json({ error: 'Document not found' });
    }
    res.json(doc);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/api/documents', async (req, res) => {
  try {
    // Return documents (excluding giant raw content to keep payload lighter)
    const list = await DocumentModel.find({}, {
      id: 1,
      title: 1,
      type: 1,
      size: 1,
      uploadedAt: 1,
      summary: 1, // Include summary to check for existence
      category: 1,
      folder: 1,
      _id: 0 // Exclude Mongoose's default _id
    });

    const formattedList = list.map(d => ({
      id: d.id,
      title: d.title,
      type: d.type,
      size: d.size,
      uploadedAt: d.uploadedAt,
      hasSummary: !!d.summary,
      category: d.category,
      folder: d.folder
    }));
    res.json(formattedList);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;