import React, { useState, useEffect, useRef } from 'react';
import { 
  MessageSquare, FileText, Send, Sparkles, Mic, MicOff, 
  Volume2, VolumeX, CheckSquare, Square, RefreshCw, ChevronRight, BookOpen
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { DocumentItem, ChatSession, Message } from '../types';
import GlassCard from './GlassCard';

interface MultiDocChatProps {
  documents: DocumentItem[];
}

export const MultiDocChat: React.FC<MultiDocChatProps> = ({ documents }) => {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [activeChat, setActiveChat] = useState<ChatSession | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [isLoadingChats, setIsLoadingChats] = useState(false);
  const [chatSessions, setChatSessions] = useState<ChatSession[]>([]);

  // Voice AI States
  const [isListening, setIsListening] = useState(false);
  const [isTtsEnabled, setIsTtsEnabled] = useState(false);
  const recognitionRef = useRef<any>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Sync scroll on chat thread
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isSending]);

  // Load existing multi-doc chat sessions
  useEffect(() => {
    fetchChats();
  }, []);

  const fetchChats = async () => {
    setIsLoadingChats(true);
    try {
      const res = await fetch('/api/chats');
      if (res.ok) {
        const allChats = await res.json();
        // Filter chats that are multi-document
        const multiChats = allChats.filter((c: any) => c.isMultiDoc);
        setChatSessions(multiChats);
      }
    } catch (err) {
      console.error('Failed to load chat sessions:', err);
    } finally {
      setIsLoadingChats(false);
    }
  };

  // Toggle selection
  const handleToggleSelect = (id: string) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  // Start Multi Document Chat session
  const handleStartChat = async () => {
    if (selectedIds.length === 0) return;
    
    setIsSending(true);
    try {
      const res = await fetch('/api/chats', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          isMultiDoc: true,
          selectedDocIds: selectedIds,
          documentId: selectedIds[0] // fallback primary
        })
      });

      if (res.ok) {
        const session = await res.json();
        setActiveChat(session);
        setMessages(session.messages || []);
        fetchChats();
      }
    } catch (err) {
      console.error('Failed to create multi-doc session:', err);
    } finally {
      setIsSending(false);
    }
  };

  // Select existing session
  const handleSelectSession = (session: ChatSession) => {
    setActiveChat(session);
    setMessages(session.messages || []);
    // Prefill checkboxes for selected documents
    if (session.selectedDocIds) {
      setSelectedIds(session.selectedDocIds);
    }
  };

  // Send message
  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inputText.trim() || !activeChat || isSending) return;

    const userText = inputText;
    setInputText('');
    setIsSending(true);

    // Append user message optimism
    const temporaryUserMsg: Message = {
      id: 'temp_user',
      sender: 'user',
      text: userText,
      timestamp: new Date().toISOString()
    };
    setMessages(prev => [...prev, temporaryUserMsg]);

    try {
      const res = await fetch(`/api/chats/${activeChat.id}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ text: userText })
      });

      if (res.ok) {
        const data = await res.json();
        // Replace temp messages with actual data from backend
        setMessages(prev => prev.filter(m => m.id !== 'temp_user').concat(data.userMessage, data.assistantMessage));
        
        // Trigger voice synthesis if enabled
        if (isTtsEnabled && data.assistantMessage?.text) {
          speakText(data.assistantMessage.text);
        }
      } else {
        setMessages(prev => prev.filter(m => m.id !== 'temp_user'));
      }
    } catch (err) {
      console.error('Message failed:', err);
      setMessages(prev => prev.filter(m => m.id !== 'temp_user'));
    } finally {
      setIsSending(false);
    }
  };

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
    // Strip markdown formatting for cleaner speech synthesis
    const cleanText = text.replace(/[*#`_\-]/g, '').substring(0, 300); // limit length
    
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel(); // stop active speech
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

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-8" id="multi-doc-chat-view">
      {/* Sessions & Selection Sidebar (Left Col - 1/4) */}
      <div className="space-y-6">
        {/* Document Context Selector */}
        {!activeChat && (
          <GlassCard className="space-y-4">
            <h4 className="text-sm font-bold text-white uppercase tracking-wider flex items-center space-x-1.5">
              <BookOpen className="w-4 h-4 text-brand-purple" />
              <span>Select Context Files</span>
            </h4>
            <p className="text-[10px] text-gray-400">Select files to merge their context for comparative analysis.</p>

            <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
              {documents.map((doc) => {
                const isSelected = selectedIds.includes(doc.id);
                return (
                  <div
                    key={doc.id}
                    onClick={() => handleToggleSelect(doc.id)}
                    className={`p-2.5 rounded-lg border transition-all cursor-pointer flex items-center justify-between text-xs ${
                      isSelected
                        ? 'bg-brand-purple/15 border-brand-purple/35 text-white'
                        : 'bg-white/5 border-white/5 hover:border-brand-purple/20 text-gray-300'
                    }`}
                  >
                    <div className="min-w-0 flex-1 pr-2">
                      <span className="font-semibold block truncate">{doc.title}</span>
                      <span className="text-[9px] opacity-60 uppercase">{doc.type}</span>
                    </div>
                    {isSelected ? (
                      <CheckSquare className="w-4.5 h-4.5 text-brand-purple shrink-0" />
                    ) : (
                      <Square className="w-4.5 h-4.5 text-gray-500 shrink-0" />
                    )}
                  </div>
                );
              })}

              {documents.length === 0 && (
                <p className="text-xs text-gray-500 text-center py-6">No documents in library.</p>
              )}
            </div>

            <button
              onClick={handleStartChat}
              disabled={selectedIds.length === 0}
              className="w-full py-2.5 rounded-xl bg-brand-purple hover:bg-brand-purple/90 disabled:opacity-40 disabled:cursor-not-allowed text-xs font-bold text-white shadow-lg flex items-center justify-center space-x-2 transition-all"
            >
              <Sparkles className="w-4 h-4 text-brand-cyan shrink-0" />
              <span>LAUNCH MULTI-DOC AI</span>
            </button>
          </GlassCard>
        )}

        {/* Existing Comparative Chat Sessions */}
        <GlassCard className="space-y-4">
          <h4 className="text-sm font-bold text-white uppercase tracking-wider flex items-center space-x-1.5">
            <MessageSquare className="w-4 h-4 text-brand-cyan" />
            <span>Comparative Chats</span>
          </h4>

          <div className="space-y-2.5 max-h-[300px] overflow-y-auto pr-1">
            {isLoadingChats ? (
              <p className="text-xs text-gray-500 text-center py-6">Loading sessions...</p>
            ) : chatSessions.length === 0 ? (
              <p className="text-xs text-gray-500 text-center py-6">No comparative sessions.</p>
            ) : (
              chatSessions.map((session) => {
                const isActive = activeChat?.id === session.id;
                return (
                  <div
                    key={session.id}
                    onClick={() => handleSelectSession(session)}
                    className={`p-3 rounded-lg border transition-all cursor-pointer text-xs flex items-center justify-between ${
                      isActive
                        ? 'bg-brand-cyan/15 border-brand-cyan/35 text-white'
                        : 'bg-white/5 border-white/5 hover:border-brand-cyan/20 text-gray-300'
                    }`}
                  >
                    <div className="min-w-0 flex-1 pr-2">
                      <span className="font-semibold block truncate">{session.title}</span>
                      <span className="text-[9px] opacity-60">{new Date(session.createdAt).toLocaleDateString()}</span>
                    </div>
                    <ChevronRight className="w-3.5 h-3.5 text-gray-500 shrink-0" />
                  </div>
                );
              })
            )}
          </div>
        </GlassCard>

        {activeChat && (
          <button
            onClick={() => {
              setActiveChat(null);
              setMessages([]);
              setSelectedIds([]);
            }}
            className="w-full py-2.5 bg-white/5 hover:bg-white/10 border border-white/5 text-xs text-white font-bold rounded-xl transition-all"
          >
            New Multi-Doc Chat
          </button>
        )}
      </div>

      {/* Conversation Workspace (Right Col - 3/4) */}
      <div className="lg:col-span-3">
        <GlassCard className="h-[600px] flex flex-col p-4">
          {activeChat ? (
            <>
              {/* Context Pill Row Header */}
              <div className="pb-3 border-b border-white/5 flex items-center justify-between">
                <div className="flex items-center space-x-2 overflow-x-auto pr-2">
                  <span className="text-[10px] uppercase font-extrabold text-brand-purple tracking-widest shrink-0">Context Files:</span>
                  {selectedIds.map(docId => {
                    const doc = documents.find(d => d.id === docId);
                    return (
                      <span 
                        key={docId}
                        className="px-2.5 py-1 rounded bg-brand-purple/10 border border-brand-purple/15 text-[10px] text-white font-semibold flex items-center space-x-1 shrink-0"
                      >
                        <FileText className="w-3 h-3 text-brand-cyan" />
                        <span className="truncate max-w-[100px]">{doc ? doc.title : 'Selected File'}</span>
                      </span>
                    );
                  })}
                </div>

                {/* Voice Output control */}
                <button
                  onClick={() => {
                    if (isTtsEnabled) {
                      stopSpeaking();
                      setIsTtsEnabled(false);
                    } else {
                      setIsTtsEnabled(true);
                    }
                  }}
                  className={`p-2 rounded-lg border transition-all shrink-0 ${
                    isTtsEnabled 
                      ? 'bg-brand-cyan/20 border-brand-cyan text-brand-cyan' 
                      : 'bg-white/5 border-white/5 text-gray-500 hover:text-white'
                  }`}
                  title={isTtsEnabled ? "Disable Text-To-Speech" : "Enable Text-To-Speech"}
                >
                  {isTtsEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
                </button>
              </div>

              {/* Message Thread */}
              <div className="flex-1 overflow-y-auto py-4 space-y-4 pr-1">
                {messages.map((msg, idx) => {
                  const isUser = msg.sender === 'user';
                  return (
                    <div
                      key={msg.id || idx}
                      className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}
                    >
                      <div className={`max-w-[75%] rounded-2xl p-3.5 text-xs leading-relaxed ${
                        isUser
                          ? 'bg-brand-purple text-white shadow-md shadow-brand-purple/10'
                          : 'bg-white/5 border border-white/5 text-gray-200'
                      }`}>
                        {msg.text}
                      </div>
                    </div>
                  );
                })}

                {isSending && (
                  <div className="flex justify-start">
                    <div className="bg-white/5 border border-white/5 rounded-2xl p-4 flex items-center space-x-2">
                      <div className="typing-dot w-2 h-2 rounded-full bg-brand-cyan" />
                      <div className="typing-dot w-2 h-2 rounded-full bg-brand-purple" />
                      <div className="typing-dot w-2 h-2 rounded-full bg-brand-cyan" />
                    </div>
                  </div>
                )}
                <div ref={chatEndRef} />
              </div>

              {/* Chat Input Bar */}
              <form onSubmit={handleSendMessage} className="pt-3 border-t border-white/5 flex items-center space-x-2">
                {/* Voice STT */}
                <button
                  type="button"
                  onClick={handleVoiceInput}
                  className={`p-3 rounded-xl border transition-all shrink-0 ${
                    isListening
                      ? 'bg-red-500/20 border-red-500 text-red-400 animate-pulse'
                      : 'bg-white/5 border-white/5 text-gray-400 hover:text-white'
                  }`}
                  title={isListening ? "Listening..." : "Speak Question"}
                >
                  {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                </button>

                <input
                  type="text"
                  placeholder={isListening ? "Listening for speech..." : "Ask Gemini comparative questions..."}
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  className="flex-1 bg-white/5 border border-white/5 focus:border-brand-purple/30 focus:outline-none rounded-xl px-4 py-3 text-xs text-white placeholder-gray-500"
                />

                <button
                  type="submit"
                  disabled={!inputText.trim() || isSending}
                  className="p-3 rounded-xl bg-brand-purple hover:bg-brand-purple/90 disabled:opacity-40 disabled:cursor-not-allowed text-white transition-all shrink-0"
                >
                  <Send className="w-4 h-4 fill-white" />
                </button>
              </form>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-6 space-y-4">
              <div className="w-14 h-14 rounded-2xl bg-white/5 border border-white/5 flex items-center justify-center text-gray-500">
                <MessageSquare className="w-7 h-7 text-brand-purple" />
              </div>
              <div className="max-w-xs space-y-1.5">
                <h4 className="text-sm font-bold text-white">Comparative RAG Chat</h4>
                <p className="text-xs text-gray-500 leading-relaxed">
                  Select documents in the left context selector and click Launch to chat with multiple files simultaneously.
                </p>
              </div>
            </div>
          )}
        </GlassCard>
      </div>
    </div>
  );
};
export default MultiDocChat;
