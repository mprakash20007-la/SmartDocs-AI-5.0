import React, { useState, useRef, useEffect } from 'react';
import { Send, Sparkles, Copy, Check, RefreshCw, MessageSquare, Plus, ArrowRight, Mic, MicOff, Volume2, VolumeX } from 'lucide-react';
import { motion } from 'motion/react';
import { DocumentItem, ChatSession, Message } from '../types';
import GlassCard from './GlassCard';

interface ChatInterfaceProps {
  activeDoc: DocumentItem;
}

// Simple and highly robust custom renderer for markdown-like text
const CustomMarkdownRenderer: React.FC<{ text: string }> = ({ text }) => {
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  const handleCopyCode = (code: string, index: number) => {
    navigator.clipboard.writeText(code);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  if (!text) return null;

  // Split content by code blocks ```
  const parts = text.split(/(```[\s\S]*?```)/g);

  return (
    <div className="space-y-3 text-sm leading-relaxed text-gray-200">
      {parts.map((part, index) => {
        // Check if it is a code block
        if (part.startsWith('```') && part.endsWith('```')) {
          const lines = part.slice(3, -3).trim().split('\n');
          let language = 'text';
          let code = lines.join('\n');

          // Match language identifier
          if (lines.length > 0 && lines[0].length < 15 && !lines[0].includes(' ') && lines[0] !== '') {
            language = lines[0];
            code = lines.slice(1).join('\n');
          }

          return (
            <div key={index} className="relative rounded-lg overflow-hidden border border-white/5 my-3 font-mono text-xs">
              <div className="flex items-center justify-between px-4 py-1.5 bg-white/5 border-b border-white/5 text-[10px] text-gray-400 font-bold uppercase tracking-wider">
                <span>{language}</span>
                <button
                  onClick={() => handleCopyCode(code, index)}
                  className="flex items-center space-x-1 hover:text-white transition-colors"
                >
                  {copiedIndex === index ? (
                    <>
                      <Check className="w-3 h-3 text-green-400" />
                      <span className="text-green-400 font-bold lowercase">copied</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3 h-3" />
                      <span className="font-bold lowercase">copy</span>
                    </>
                  )}
                </button>
              </div>
              <pre className="p-4 bg-brand-dark overflow-x-auto text-gray-300">
                <code>{code}</code>
              </pre>
            </div>
          );
        }

        // Parse list items, bold tags, paragraphs
        const lines = part.split('\n');
        return (
          <div key={index} className="space-y-2">
            {lines.map((line, lineIdx) => {
              let parsedLine = line.trim();
              if (!parsedLine) return <div key={lineIdx} className="h-2" />;

              // Headers
              if (parsedLine.startsWith('### ')) {
                return (
                  <h4 key={lineIdx} className="text-base font-bold text-white pt-2 pb-1 bg-gradient-to-r from-white to-brand-purple bg-clip-text">
                    {parsedLine.replace('### ', '')}
                  </h4>
                );
              }
              if (parsedLine.startsWith('## ')) {
                return (
                  <h3 key={lineIdx} className="text-lg font-bold text-white pt-3 pb-1">
                    {parsedLine.replace('## ', '')}
                  </h3>
                );
              }
              if (parsedLine.startsWith('# ')) {
                return (
                  <h2 key={lineIdx} className="text-xl font-bold text-white pt-4 pb-1">
                    {parsedLine.replace('# ', '')}
                  </h2>
                );
              }

              // Bullet list item
              if (parsedLine.startsWith('- ') || parsedLine.startsWith('* ')) {
                const bulletContent = parsedLine.substring(2);
                return (
                  <ul key={lineIdx} className="list-disc pl-5 space-y-1 my-1">
                    <li className="text-gray-300">
                      {renderBoldText(bulletContent)}
                    </li>
                  </ul>
                );
              }

              // Numbered list item
              if (/^\d+\.\s/.test(parsedLine)) {
                const numContent = parsedLine.replace(/^\d+\.\s/, '');
                const numMatch = parsedLine.match(/^(\d+)\.\s/);
                const num = numMatch ? numMatch[1] : '1';
                return (
                  <div key={lineIdx} className="flex space-x-2 pl-2 my-1">
                    <span className="text-brand-purple font-bold">{num}.</span>
                    <span className="text-gray-300 flex-1">{renderBoldText(numContent)}</span>
                  </div>
                );
              }

              // Normal Paragraph
              return (
                <p key={lineIdx} className="text-gray-300 text-sm leading-relaxed">
                  {renderBoldText(parsedLine)}
                </p>
              );
            })}
          </div>
        );
      })}
    </div>
  );
};

// Help render **bold** syntax inline
const renderBoldText = (text: string) => {
  const parts = text.split(/(\*\*.*?\*\*)/g);
  return parts.map((part, index) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return (
        <strong key={index} className="text-white font-semibold">
          {part.slice(2, -2)}
        </strong>
      );
    }
    return part;
  });
};

export const ChatInterface: React.FC<ChatInterfaceProps> = ({ activeDoc }) => {
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [activeSession, setActiveSession] = useState<ChatSession | null>(null);
  const [inputText, setInputText] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [isCreatingSession, setIsCreatingSession] = useState(false);
  const [copiedMsgId, setCopiedMsgId] = useState<string | null>(null);

  // Voice AI States
  const [isListening, setIsListening] = useState(false);
  const [isTtsEnabled, setIsTtsEnabled] = useState(false);
  const recognitionRef = useRef<any>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Voice Speech to Text Recognition
  const handleVoiceInput = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("Speech recognition is not supported in this browser. Please use Google Chrome.");
      return;
    }

    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
      return;
    }

    const rec = new SpeechRecognition();
    rec.continuous = false;
    rec.interimResults = false;
    rec.lang = 'en-US';

    rec.onstart = () => {
      setIsListening(true);
    };

    rec.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      setInputText(transcript);
    };

    rec.onerror = (event: any) => {
      console.error("Speech recognition error:", event.error);
      setIsListening(false);
    };

    rec.onend = () => {
      setIsListening(false);
    };

    recognitionRef.current = rec;
    rec.start();
  };

  // Voice Text to Speech Synthesis
  const speakText = (text: string) => {
    const cleanText = text.replace(/[*#`_\-]/g, '').substring(0, 300);
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(cleanText);
      utterance.rate = 1.0;
      utterance.pitch = 1.0;
      window.speechSynthesis.speak(utterance);
    }
  };

  const stopSpeaking = () => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
  };

  // Suggested prompt templates
  const suggestionPrompts = [
    'What is the core problem addressed in this document?',
    'Summarize the primary takeaways in three bullet points.',
    'Are there any specific metrics, deadlines, or names mentioned?',
    'Identify potential risks or challenges outlined in the text.'
  ];

  // Fetch or create chat sessions
  useEffect(() => {
    fetchSessions();
  }, [activeDoc.id]);

  useEffect(() => {
    scrollToBottom();
  }, [activeSession?.messages, isSending]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const fetchSessions = async () => {
    try {
      const response = await fetch(`/api/chats?documentId=${activeDoc.id}`);
      if (response.ok) {
        const data = await response.json();
        setSessions(data);
        if (data.length > 0) {
          setActiveSession(data[0]);
        } else {
          // Auto create a first session
          handleCreateSession();
        }
      }
    } catch (err) {
      console.error('Failed to fetch chats:', err);
    }
  };

  const handleCreateSession = async () => {
    setIsCreatingSession(true);
    try {
      const response = await fetch('/api/chats', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          documentId: activeDoc.id,
          title: `Research Thread - ${new Date().toLocaleDateString()}`
        })
      });
      if (response.ok) {
        const newSession = await response.json();
        setSessions(prev => [newSession, ...prev]);
        setActiveSession(newSession);
      }
    } catch (err) {
      console.error('Failed to create session:', err);
    } finally {
      setIsCreatingSession(false);
    }
  };

  const handleSendMessage = async (textToSend?: string) => {
    const msgText = textToSend || inputText;
    if (!msgText.trim() || isSending || !activeSession) return;

    if (!textToSend) setInputText('');
    setIsSending(true);

    // Optimistically add user message on frontend
    const localUserMsg: Message = {
      id: 'local_user_' + Math.random(),
      sender: 'user',
      text: msgText,
      timestamp: new Date().toISOString()
    };
    
    const updatedSession = {
      ...activeSession,
      messages: [...activeSession.messages, localUserMsg]
    };
    setActiveSession(updatedSession);

    try {
      const response = await fetch(`/api/chats/${activeSession.id}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: msgText })
      });

      if (!response.ok) {
        throw new Error('Failed to send message');
      }

      const data = await response.json();
      
      // Simulate real-time word-by-word response streaming
      const fullReplyText = data.assistantMessage?.text || '';
      const words = fullReplyText.split(' ');
      let wordIndex = 0;

      const placeholderAssistantMsg: Message = {
        ...data.assistantMessage,
        text: ''
      };

      // Add the user message and an empty assistant message
      setActiveSession(prev => {
        if (!prev) return null;
        return {
          ...prev,
          messages: [...prev.messages.filter(m => m.id !== localUserMsg.id), data.userMessage, placeholderAssistantMsg]
        };
      });

      // Stop thinking spinner once streaming begins
      setIsSending(false);

      const streamTimer = setInterval(() => {
        wordIndex++;
        const currentStreamedText = words.slice(0, wordIndex).join(' ');

        setActiveSession(prev => {
          if (!prev) return null;
          return {
            ...prev,
            messages: prev.messages.map(m => m.id === data.assistantMessage.id ? { ...m, text: currentStreamedText } : m)
          };
        });

        if (wordIndex >= words.length) {
          clearInterval(streamTimer);

          // Final sync of history log lists
          setSessions(prev => prev.map(s => s.id === activeSession.id ? {
            ...s,
            messages: [...s.messages.filter(m => m.id !== localUserMsg.id && m.id !== data.assistantMessage.id), data.userMessage, data.assistantMessage]
          } : s));
        }
      }, 35);

      // Trigger TTS if enabled
      if (isTtsEnabled && fullReplyText) {
        speakText(fullReplyText);
      }

    } catch (err) {
      console.error(err);
      setIsSending(false);
      // Add a system warning message
      const systemErrorMsg: Message = {
        id: 'local_err_' + Math.random(),
        sender: 'assistant',
        text: '⚠️ **System Error**: I encountered a network issue communicating with Gemini. Please check your network connection and verify your GEMINI_API_KEY is configured correctly.',
        timestamp: new Date().toISOString()
      };
      setActiveSession(prev => prev ? {
        ...prev,
        messages: [...prev.messages, systemErrorMsg]
      } : null);
    }
  };

  const handleCopyMessage = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedMsgId(id);
    setTimeout(() => setCopiedMsgId(null), 2000);
  };

  const handleRegenerateLast = () => {
    if (!activeSession || activeSession.messages.length < 2) return;
    const lastUserMsg = [...activeSession.messages].reverse().find(m => m.sender === 'user');
    if (lastUserMsg) {
      const index = activeSession.messages.findIndex(m => m.id === lastUserMsg.id);
      const filteredMessages = activeSession.messages.slice(0, index);
      
      setActiveSession({
        ...activeSession,
        messages: filteredMessages
      });

      handleSendMessage(lastUserMsg.text);
    }
  };

  const handleExportChat = (format: 'json' | 'md') => {
    if (!activeSession) return;
    let content = '';
    let filename = `${activeSession.title.toLowerCase().replace(/\s+/g, '_')}_chat_thread`;

    if (format === 'md') {
      filename += '.md';
      content = `# Chat Session: ${activeSession.title}\n\n`;
      activeSession.messages.forEach(m => {
        content += `### ${m.sender === 'user' ? 'User' : 'SmartDocs AI'}\n${m.text}\n\n`;
      });
    } else {
      filename += '.json';
      content = JSON.stringify(activeSession.messages, null, 2);
    }
    
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 h-[calc(100vh-140px)]" id="chat-workspace">
      {/* Session Threads Sidebar */}
      <div className="lg:col-span-1 flex flex-col space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-gray-500">Threads</h3>
          <button
            onClick={handleCreateSession}
            disabled={isCreatingSession}
            className="p-1.5 rounded-lg bg-white/5 hover:bg-brand-purple/20 text-brand-purple hover:text-white transition-all border border-white/5 active:scale-95 shrink-0"
            id="btn-new-thread"
            title="Create New Chat Thread"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto space-y-2 pr-1">
          {sessions.map((s) => (
            <button
              key={s.id}
              onClick={() => setActiveSession(s)}
              className={`w-full text-left p-3 rounded-xl border text-xs font-medium transition-all flex items-center space-x-2.5 ${
                activeSession?.id === s.id
                  ? 'bg-brand-purple/15 border-brand-purple/30 text-white shadow-lg shadow-brand-purple/5'
                  : 'bg-white/5 border-white/5 text-gray-400 hover:bg-white/10 hover:text-white'
              }`}
              id={`thread-item-${s.id}`}
            >
              <MessageSquare className="w-4 h-4 shrink-0 text-brand-purple" />
              <span className="truncate flex-1">{s.title}</span>
            </button>
          ))}
          {sessions.length === 0 && (
            <div className="text-center py-8 text-gray-600 text-xs font-medium">
              No threads active.
            </div>
          )}
        </div>
      </div>

      {/* Main Conversational Stage */}
      <div className="lg:col-span-3 flex flex-col glass-panel rounded-2xl border border-white/5 overflow-hidden">
        {/* Header Status */}
        <div className="px-6 py-4 bg-white/5 border-b border-white/5 flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-2">
            <div className="w-2.5 h-2.5 rounded-full bg-green-500 animate-pulse" />
            <span className="text-xs font-semibold text-white truncate">Connected to Gemini</span>
          </div>

          <div className="flex items-center space-x-2.5 shrink-0">
            <button
              onClick={() => {
                if (isTtsEnabled) {
                  stopSpeaking();
                  setIsTtsEnabled(false);
                } else {
                  setIsTtsEnabled(true);
                }
              }}
              className={`p-1.5 rounded-lg border transition-all ${
                isTtsEnabled 
                  ? 'bg-brand-cyan/20 border-brand-cyan text-brand-cyan shadow-sm shadow-brand-cyan/10' 
                  : 'bg-white/5 border-white/5 text-gray-500 hover:text-white'
              }`}
              title={isTtsEnabled ? "Disable Voice Output" : "Enable Voice Output"}
            >
              {isTtsEnabled ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
            </button>
            
            <button
              type="button"
              onClick={() => handleExportChat('md')}
              className="px-2 py-1 bg-white/5 hover:bg-white/10 border border-white/5 rounded text-[9px] font-bold text-gray-400 hover:text-white transition-all uppercase tracking-wider"
              title="Export chat as Markdown"
            >
              Export MD
            </button>

            <button
              type="button"
              onClick={() => handleExportChat('json')}
              className="px-2 py-1 bg-white/5 hover:bg-white/10 border border-white/5 rounded text-[9px] font-bold text-gray-400 hover:text-white transition-all uppercase tracking-wider"
              title="Export chat as JSON"
            >
              JSON
            </button>

            <span className="text-[10px] text-gray-500 font-mono hidden md:inline">
              Context Size: ~{activeDoc.size}
            </span>
          </div>
        </div>

        {/* Message Thread Scroll Container */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {activeSession?.messages.map((msg) => {
            const isUser = msg.sender === 'user';
            return (
              <div
                key={msg.id}
                className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}
                id={`chat-msg-${msg.id}`}
              >
                <div className={`max-w-[85%] rounded-2xl px-5 py-3.5 relative group ${
                  isUser
                    ? 'bg-gradient-to-r from-brand-purple to-brand-purple/80 text-white rounded-br-none shadow-md shadow-brand-purple/5'
                    : 'bg-white/5 border border-white/5 text-gray-200 rounded-bl-none shadow-sm'
                }`}>
                  <CustomMarkdownRenderer text={msg.text} />

                  {/* Actions overlay */}
                  <div className={`absolute bottom-full mb-1 flex space-x-1.5 opacity-0 group-hover:opacity-100 transition-opacity ${
                    isUser ? 'right-0' : 'left-0'
                  }`}>
                    <button
                      onClick={() => handleCopyMessage(msg.text, msg.id)}
                      className="p-1 rounded bg-brand-dark/90 border border-white/10 text-gray-400 hover:text-white transition-all text-[10px] flex items-center space-x-1 font-bold"
                    >
                      {copiedMsgId === msg.id ? <Check className="w-3 h-3 text-green-400" /> : <Copy className="w-3 h-3" />}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}

          {isSending && (
            <div className="flex justify-start">
              <div className="bg-white/5 border border-white/5 rounded-2xl px-5 py-4 rounded-bl-none flex items-center space-x-2">
                <div className="flex space-x-1">
                  <div className="w-2 h-2 rounded-full bg-brand-purple typing-dot" />
                  <div className="w-2 h-2 rounded-full bg-brand-cyan typing-dot" />
                  <div className="w-2 h-2 rounded-full bg-brand-purple typing-dot" />
                </div>
                <span className="text-xs text-gray-400 font-medium">Gemini is synthesizing doc facts...</span>
              </div>
            </div>
          )}

          {activeSession?.messages.length === 0 && !isSending && (
            <div className="h-full flex flex-col items-center justify-center text-center p-8 space-y-6">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-brand-purple/10 to-brand-cyan/10 flex items-center justify-center border border-brand-purple/15 animate-float">
                <Sparkles className="w-8 h-8 text-brand-purple" />
              </div>
              <div className="max-w-md space-y-2">
                <h4 className="text-base font-bold text-white">Ask anything about your document</h4>
                <p className="text-xs text-gray-400">
                  SmartDocs AI understands the entire content context. Click one of the floating suggest cues below or write custom research prompts.
                </p>
              </div>

              {/* Suggestions */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 w-full max-w-lg pt-4">
                {suggestionPrompts.map((p, idx) => (
                  <button
                    key={idx}
                    onClick={() => {
                      setInputText(p);
                      handleSendMessage(p);
                    }}
                    className="p-3 text-left rounded-xl border border-white/5 bg-white/5 hover:border-brand-purple/30 hover:bg-brand-purple/5 transition-all text-xs text-gray-300 flex items-center justify-between group"
                  >
                    <span className="truncate pr-2">{p}</span>
                    <ArrowRight className="w-3.5 h-3.5 text-gray-500 group-hover:text-brand-purple group-hover:translate-x-0.5 transition-all shrink-0" />
                  </button>
                ))}
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input Form Footer */}
        <div className="p-4 bg-brand-dark border-t border-white/5 shrink-0 space-y-3">
          {activeSession && activeSession.messages.length > 0 && !isSending && (
            <div className="flex flex-wrap gap-2 pb-1.5 max-h-[80px] overflow-y-auto">
              {suggestionPrompts.map((p, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => {
                    setInputText(p);
                    handleSendMessage(p);
                  }}
                  className="px-3 py-1 rounded-full border border-white/5 bg-white/5 hover:border-brand-purple/30 hover:bg-brand-purple/10 text-gray-300 hover:text-white transition-all text-[10px] font-bold uppercase tracking-wider cursor-pointer"
                >
                  {p}
                </button>
              ))}
            </div>
          )}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage();
            }}
            className="flex items-center space-x-2 relative"
            id="chat-input-form"
          >
            {/* Voice Input Button */}
            <button
              type="button"
              onClick={handleVoiceInput}
              disabled={isSending}
              className={`p-3 rounded-xl border transition-all shrink-0 ${
                isListening
                  ? 'bg-red-500/20 border-red-500 text-red-400 animate-pulse'
                  : 'bg-white/5 border-white/5 text-gray-400 hover:text-white'
              }`}
              title={isListening ? "Listening... Click to stop." : "Speak Question"}
            >
              {isListening ? <MicOff className="w-4.5 h-4.5" /> : <Mic className="w-4.5 h-4.5" />}
            </button>

            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder={isListening ? "Listening to voice input..." : `Query "${activeDoc.title}"...`}
              disabled={isSending}
              className="flex-1 bg-white/5 border border-white/5 focus:border-brand-purple/50 rounded-xl px-4 py-3 text-sm text-white placeholder-gray-500 focus:outline-none transition-all disabled:opacity-50"
              id="chat-input-field"
            />
            {activeSession && activeSession.messages.length > 0 && !isSending && (
              <button
                type="button"
                onClick={handleRegenerateLast}
                className="absolute right-16 p-2 rounded-lg text-gray-400 hover:text-white transition-colors"
                id="btn-regenerate"
                title="Regenerate last response"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            )}
            <button
              type="submit"
              disabled={!inputText.trim() || isSending}
              className="p-3 rounded-xl bg-gradient-to-r from-brand-purple to-brand-purple/80 hover:from-brand-purple hover:to-brand-purple text-white shadow-lg shadow-brand-purple/20 flex items-center justify-center shrink-0 disabled:opacity-40 disabled:cursor-not-allowed disabled:shadow-none active:scale-95 transition-all"
              id="btn-send-message"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
export default ChatInterface;
