import express from 'express';
import { getGeminiClient, runBackgroundAutomation, fetchBlobAsText } from '../../server-core.ts';
import { DocumentModel, ChatModel } from '../db/mongo.ts';
import OpenAI from 'openai';
import { HfInference } from '@huggingface/inference';

const router = express.Router();

// Assuming Message type is defined elsewhere or will be inferred from Mongoose subdocument schema
interface Message {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  timestamp: string;
}

// This interface represents the data structure for creating a new chat,
// Mongoose will add _id and other properties automatically.
interface ChatSessionData {
  documentId?: string; // Refers to DocumentModel's _id
  title: string;
  messages: Message[];
  createdAt: string;
  isMultiDoc: boolean;
  selectedDocIds?: string[]; // Refers to DocumentModel's _id[]
}

router.post('/api/chats/:id/messages', async (req, res) => {
  try {
    const { text } = req.body;
    if (!text) {
      return res.status(400).json({ error: 'Missing message text' });
    }

    // Find chat session by its Mongoose _id
    const chat = await ChatModel.findById(req.params.id);
    if (!chat) {
      return res.status(404).json({ error: 'Chat session not found' });
    }

    let promptPrefix = '';

    if (chat.isMultiDoc && chat.selectedDocIds && chat.selectedDocIds.length > 0) {
      // Find documents by their Mongoose _ids
      const docs = await DocumentModel.find({ _id: { $in: chat.selectedDocIds } });
      if (docs.length === 0) {
        return res.status(404).json({ error: 'Selected documents not found' });
      }

      promptPrefix = `You are SmartDocs AI, a premium enterprise virtual research and multi-document synthesis assistant.
The user wants to analyze and synthesize information across MULTIPLE documents.
Below are the titles and text contents of the selected documents:

`;
      for (let idx = 0; idx < docs.length; idx++) {
        const doc = docs[idx];
        let docContent = doc.content;
        if (doc.type === 'pdf' && doc.pages && doc.pages.length > 0) {
          docContent = doc.pages.map((p: any) => p.content).join('\n');
        } else {
          docContent = await fetchBlobAsText(doc.content);
        }
        if (docContent.length > 6000) {
          docContent = docContent.substring(0, 6000) + '\n... [truncated for context limit]';
        }
        promptPrefix += `--- DOCUMENT ${idx + 1}: ${doc.title} ---\n${docContent}\n\n`;
      }

      promptPrefix += `Answer queries comparing and referencing these files. Be precise and clear.`;
    } else {
      // Find single document by its Mongoose _id
      const doc = await DocumentModel.findById(chat.documentId);
      if (!doc) {
        return res.status(404).json({ error: 'Associated document not found' });
      }

      if (doc.type === 'pdf') {
        let pdfText = doc.pages && doc.pages.length > 0 ? doc.pages.map((p: any) => p.content).join('\n').substring(0, 8000) : 'PDF content is being processed. Please wait.';
        promptPrefix = `You are SmartDocs AI, a premium virtual research and document analysis assistant. 
The user has uploaded this PDF document titled "${doc.title}". Keep all answers completely truthful, clear, and based directly on the provided document context. If the answers cannot be derived from the document, let the user know while using your broader intelligence to offer helpful hints.

--- START OF DOCUMENT CONTENT ---
${pdfText}
--- END OF DOCUMENT CONTENT ---`;
      } else {
        const docText = await fetchBlobAsText(doc.content);
        promptPrefix = `You are SmartDocs AI, a premium virtual research and document analysis assistant.
The user has uploaded a document titled "${doc.title}" with the following content:

--- START OF DOCUMENT CONTENT ---
${docText.substring(0, 8000)}
--- END OF DOCUMENT CONTENT ---

Keep all answers completely truthful, clear, and based directly on the provided document context. If the answers cannot be derived from the document, let the user know while using your broader intelligence to offer helpful hints.`;
      }
    }

    // Add user message
    const userMsg: Message = {
      id: 'msg_' + Math.random().toString(36).substring(2, 11),
      sender: 'user',
      text,
      timestamp: new Date().toISOString()
    };
    chat.messages.push(userMsg);

    let replyText = "I'm sorry, I couldn't generate a response based on this document context.";

    if (process.env.AI_PROVIDER === 'openai' && process.env.OPENAI_API_KEY) {
      const openai = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY,
        baseURL: process.env.OPENAI_API_URL || undefined,
      });

      const openaiMessages: any[] = [{
        role: 'system',
        content: promptPrefix + '\n\nAnswer queries with beautiful, readable, clear markdown formatting. Do not assume or hallucinate information not supported by the document(s), but explain your reasoning beautifully.'
      }];

      chat.messages.forEach(msg => {
        openaiMessages.push({
          role: msg.sender === 'user' ? 'user' : 'assistant',
          content: msg.text
        });
      });

      const response = await openai.chat.completions.create({
        model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
        messages: openaiMessages,
      });

      replyText = response.choices[0]?.message?.content || replyText;
    } else if (process.env.AI_PROVIDER === 'huggingface' && process.env.HF_TOKEN) {
      const hf = new HfInference(process.env.HF_TOKEN);
      
      const hfMessages: any[] = [{
        role: 'system',
        content: promptPrefix + '\n\nAnswer queries with beautiful, readable, clear markdown formatting. Do not assume or hallucinate information not supported by the document(s), but explain your reasoning beautifully.'
      }];

      chat.messages.forEach(msg => {
        hfMessages.push({
          role: msg.sender === 'user' ? 'user' : 'assistant',
          content: msg.text
        });
      });

      const response = await hf.chatCompletion({
        model: 'Qwen/Qwen2.5-72B-Instruct',
        messages: hfMessages,
        max_tokens: 1500
      });

      replyText = response.choices[0]?.message?.content || replyText;
    } else {
      const client = getGeminiClient();
      const contents: any[] = [];

      // Setup combined prompt prefix
      contents.push({
        role: 'user',
        parts: [{ text: promptPrefix }]
      });

      // Add conversation history (excluding the first prompt prefix)
      chat.messages.forEach(msg => {
        contents.push({
          role: msg.sender === 'user' ? 'user' : 'model',
          parts: [{ text: msg.text }]
        });
      });

      const response = await client.models.generateContent({
        model: 'gemini-2.0-flash',
        contents: contents,
        config: {
          systemInstruction: 'Answer queries with beautiful, readable, clear markdown formatting. Do not assume or hallucinate information not supported by the document(s), but explain your reasoning beautifully.'
        }
      });

      replyText = response.text || replyText;
    }

    // Add assistant message
    const assistantMsg: Message = {
      id: 'msg_' + Math.random().toString(36).substring(2, 11),
      sender: 'assistant',
      text: replyText,
      timestamp: new Date().toISOString()
    };
    chat.messages.push(assistantMsg);

    // Save the updated chat session to the database
    await chat.save();

    res.json({
      userMessage: userMsg,
      assistantMessage: assistantMsg
    });
  } catch (err: any) {
    console.error('Chat error:', err);
    res.status(500).json({ error: err.message });
  }
});

router.post('/api/chats', async (req, res) => {
  try {
    const { documentId, title, selectedDocIds, isMultiDoc } = req.body;
    if (!documentId && (!selectedDocIds || selectedDocIds.length === 0)) {
      return res.status(400).json({ error: 'Missing documentId or selectedDocIds' });
    }

    let chatTitle = title;

    if (isMultiDoc) {
      // Find documents by their Mongoose _ids
      const docs = await DocumentModel.find({ _id: { $in: selectedDocIds } });
      chatTitle = title || `Comparative Chat on ${docs.length} files`;
    } else {
      // Find single document by its Mongoose _id
      const doc = await DocumentModel.findById(documentId);
      if (!doc) {
        return res.status(404).json({ error: 'Document not found' });
      }
      chatTitle = title || `Chat regarding ${doc.title}`;
    }

    const newChatData: ChatSessionData = {
      // Mongoose will automatically generate _id for the new document
      documentId: documentId || (selectedDocIds ? selectedDocIds[0] : ''), // documentId should be a string (Mongoose ObjectId)
      title: chatTitle,
      messages: [],
      createdAt: new Date().toISOString(),
      isMultiDoc: !!isMultiDoc,
      selectedDocIds: selectedDocIds || [] // selectedDocIds should be an array of strings (Mongoose ObjectId[])
    };

    const createdChat = await ChatModel.create(newChatData); // Create new chat document

    res.status(201).json(createdChat); // Return the created Mongoose document
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/api/chats', async (req, res) => {
  try {
    const { documentId } = req.query;
    let chats;

    if (documentId) {
      // Query chats where documentId matches OR it's a multi-doc chat and selectedDocIds includes the documentId
      chats = await ChatModel.find({
        $or: [
          { documentId: documentId as string },
          { isMultiDoc: true, selectedDocIds: documentId as string }
        ]
      });
    } else {
      // Get all chats
      chats = await ChatModel.find();
    }
    res.json(chats);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;