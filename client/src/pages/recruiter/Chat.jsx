import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import { apiFetch } from '../../lib/api';
import { MessageSquare, Send, RefreshCw, Briefcase, User, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';

export const RecruiterChat = () => {
  const { profile } = useAuth();
  
  // Conversations list & Active session
  const [conversations, setConversations] = useState([]);
  const [activeSession, setActiveSession] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessageText, setNewMessageText] = useState('');
  
  // UI states
  const [loading, setLoading] = useState(true);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [sending, setSending] = useState(false);
  
  // Ref to handle auto-scrolling message list to bottom
  const messageEndRef = useRef(null);

  // Parse query string for session ID (to handle redirects from applicants list)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const targetSessionId = params.get('sessionId');
    
    const initializeInbox = async () => {
      await fetchConversations(false, targetSessionId);
    };
    
    initializeInbox();
  }, []);

  // 1. Fetch conversation sessions on mount
  const fetchConversations = async (silent = false, autoSelectId = null) => {
    if (!silent) setLoading(true);
    try {
      const data = await apiFetch('/chat/sessions');
      setConversations(data);
      
      // Handle auto selection redirect
      if (autoSelectId) {
        const target = data.find(c => c.id === autoSelectId);
        if (target) setActiveSession(target);
      } else if (activeSession) {
        // Keep active session in sync
        const updatedActive = data.find(c => c.id === activeSession.id);
        if (updatedActive) setActiveSession(updatedActive);
      }
    } catch (err) {
      console.error('Failed to load conversations:', err);
    } finally {
      if (!silent) setLoading(false);
    }
  };

  // 2. Fetch messages for the active conversation
  const fetchMessages = async (sessionId, silent = false) => {
    if (!silent) setMessagesLoading(true);
    try {
      const data = await apiFetch(`/chat/sessions/${sessionId}/messages`);
      setMessages(data);
    } catch (err) {
      console.error('Failed to load messages:', err);
    } finally {
      if (!silent) setMessagesLoading(false);
    }
  };

  // Poll for new messages every 6 seconds when a session is active
  useEffect(() => {
    if (!activeSession) return;
    
    // Fetch immediately on session select
    fetchMessages(activeSession.id);
    
    const interval = setInterval(() => {
      fetchMessages(activeSession.id, true);
      fetchConversations(true); // Silent sync for unread counts
    }, 6000);

    return () => clearInterval(interval);
  }, [activeSession?.id]);

  // Scroll chat feed to bottom on new messages
  useEffect(() => {
    messageEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // 3. Handle sending a message
  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!activeSession || !newMessageText.trim() || sending) return;

    setSending(true);
    const content = newMessageText.trim();
    setNewMessageText(''); // Optimistic clear

    try {
      const sentMsg = await apiFetch(`/chat/sessions/${activeSession.id}/messages`, {
        method: 'POST',
        body: JSON.stringify({ content })
      });
      
      // Update local state instantly
      setMessages(prev => [...prev, sentMsg]);
      fetchConversations(true); // Sync latest message snippet
    } catch (err) {
      console.error('Failed to send message:', err);
      setNewMessageText(content); // Restore input on error
    } finally {
      setSending(false);
    }
  };

  if (loading) {
    return (
      <div className="flex-1 flex flex-col justify-center items-center py-20 space-y-4">
        <div className="w-12 h-12 rounded-full border-4 border-dark-border border-t-brand-500 animate-spin"></div>
        <p className="text-dark-muted font-display text-sm tracking-wide">Syncing chat logs...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 text-left animate-in fade-in duration-300 relative h-[calc(100vh-140px)] flex flex-col">
      {/* Decorative glows */}
      <div className="absolute -top-40 -right-40 w-96 h-96 rounded-full bg-brand-500/10 blur-[100px] pointer-events-none -z-10 animate-pulse duration-[8s]"></div>
      
      {/* Header */}
      <div className="flex justify-between items-center shrink-0">
        <div>
          <h2 className="text-2xl font-display font-extrabold text-white">Candidates Chat Inbox 💬</h2>
          <p className="text-gray-400 text-sm mt-1">Message applicants directly to schedule evaluations or share critical updates.</p>
        </div>
        <button 
          onClick={() => { fetchConversations(); if (activeSession) fetchMessages(activeSession.id); }}
          className="p-2.5 rounded-xl bg-dark-card border border-dark-border hover:border-brand-500/30 text-gray-455 hover:text-white transition-all flex items-center justify-center"
        >
          <RefreshCw size={15} />
        </button>
      </div>

      {/* Main Split Interface */}
      <div className="flex-1 min-h-0 flex flex-col md:flex-row gap-6 items-stretch">
        
        {/* Left conversations list */}
        <div className="w-full md:w-80 shrink-0 flex flex-col glass border border-dark-border/60 rounded-2xl overflow-hidden">
          <div className="p-4 border-b border-dark-border/60 bg-dark-bg/40 font-display font-bold text-white text-xs tracking-wide shrink-0">
            Conversations
          </div>
          
          <div className="flex-1 overflow-y-auto divide-y divide-dark-border/40 p-2 space-y-1">
            {conversations.length === 0 ? (
              <div className="py-12 text-center text-dark-muted text-xs flex flex-col items-center justify-center space-y-3 px-4">
                <MessageSquare size={24} className="text-dark-muted/60" />
                <p>No active conversations yet.</p>
                <p className="text-[10px] leading-relaxed text-dark-muted/80">
                  Select an applicant in the candidates panel and click "Message Candidate" to start a chat.
                </p>
                <Link
                  to="/recruiter/applicants"
                  className="mt-2 bg-brand-600 hover:bg-brand-700 text-white font-bold py-2 px-3 rounded-lg text-[10px] transition-all flex items-center justify-center space-x-1"
                >
                  <span>Go to Candidates</span>
                  <ArrowRight size={10} />
                </Link>
              </div>
            ) : (
              conversations.map((c) => {
                const isActive = activeSession?.id === c.id;
                const isUnread = c.unreadCount > 0;
                
                return (
                  <button
                    key={c.id}
                    onClick={() => setActiveSession(c)}
                    className={`w-full text-left p-3 rounded-xl transition-all flex items-center space-x-3 outline-none ${
                      isActive 
                        ? 'bg-brand-500/10 border border-brand-500/20' 
                        : 'border border-transparent hover:bg-dark-card/50'
                    }`}
                  >
                    <div className="w-9 h-9 rounded-xl bg-brand-500/10 border border-brand-500/20 flex items-center justify-center text-brand-400 font-bold shrink-0">
                      {c.otherParticipant.avatarUrl ? (
                        <img src={c.otherParticipant.avatarUrl} alt="Student Avatar" className="w-full h-full rounded-xl object-cover" />
                      ) : (
                        <User size={15} />
                      )}
                    </div>
                    <div className="flex-1 min-w-0 space-y-0.5">
                      <div className="flex justify-between items-center">
                        <p className={`text-xs font-bold truncate ${isActive ? 'text-brand-400' : 'text-white'}`}>
                          {c.otherParticipant.fullName}
                        </p>
                        {isUnread && (
                          <span className="w-4 h-4 rounded-full bg-brand-500 text-white font-bold text-[8px] flex items-center justify-center shrink-0 animate-pulse">
                            {c.unreadCount}
                          </span>
                        )}
                      </div>
                      <p className="text-[10px] text-dark-muted truncate">
                        {c.otherParticipant.college || 'Candidate'}
                      </p>
                      {c.latestMessage ? (
                        <p className={`text-[10px] truncate ${isUnread ? 'text-gray-200 font-semibold' : 'text-dark-muted'}`}>
                          {c.latestMessage.content}
                        </p>
                      ) : (
                        <p className="text-[10px] text-dark-muted italic">Click to chat</p>
                      )}
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Right Chat History Pane */}
        <div className="flex-1 min-w-0 glass border border-dark-border/60 rounded-2xl flex flex-col overflow-hidden">
          {activeSession ? (
            <>
              {/* Active Conversation Header */}
              <div className="p-4 border-b border-dark-border/60 bg-dark-bg/40 flex justify-between items-center shrink-0">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 rounded-lg bg-brand-500/10 border border-brand-500/20 flex items-center justify-center text-brand-400 font-bold shadow-sm">
                    {activeSession.otherParticipant.avatarUrl ? (
                      <img src={activeSession.otherParticipant.avatarUrl} alt="Avatar" className="w-full h-full rounded-lg object-cover" />
                    ) : (
                      <User size={14} />
                    )}
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-white">{activeSession.otherParticipant.fullName}</h4>
                    <p className="text-[9px] text-dark-muted mt-0.5">
                      {activeSession.otherParticipant.college || 'Candidate Scholar'}
                    </p>
                  </div>
                </div>
                {activeSession.jobTitle && (
                  <div className="hidden sm:flex items-center space-x-1.5 bg-dark-card border border-dark-border/80 px-2.5 py-1 rounded-lg text-[9px] text-gray-300">
                    <Briefcase size={10} className="text-brand-400" />
                    <span>Applied for: <strong className="text-white">{activeSession.jobTitle}</strong></span>
                  </div>
                )}
              </div>

              {/* Message Feed */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-dark-deep/10">
                {messagesLoading && messages.length === 0 ? (
                  <div className="h-full flex items-center justify-center">
                    <div className="w-6 h-6 border-2 border-dark-border border-t-brand-500 rounded-full animate-spin"></div>
                  </div>
                ) : messages.length === 0 ? (
                  <div className="h-full flex flex-col justify-center items-center text-center text-dark-muted text-xs space-y-2">
                    <MessageSquare size={20} className="text-dark-muted/40" />
                    <p>Start conversation with {activeSession.otherParticipant.fullName}.</p>
                    <p className="text-[10px]">Type a greeting below to coordinate scheduling details.</p>
                  </div>
                ) : (
                  messages.map((m) => {
                    const isMine = m.sender_id === profile.id;
                    return (
                      <div 
                        key={m.id} 
                        className={`flex ${isMine ? 'justify-end' : 'justify-start'} animate-in fade-in duration-150`}
                      >
                        <div className={`max-w-[70%] space-y-1`}>
                          <div className={`p-3 rounded-2xl text-xs break-words leading-relaxed shadow-sm ${
                            isMine 
                              ? 'bg-brand-500 text-white rounded-tr-none' 
                              : 'bg-dark-card border border-dark-border text-gray-250 rounded-tl-none'
                          }`}>
                            {m.content}
                          </div>
                          <div className={`text-[8px] text-dark-muted mt-0.5 ${isMine ? 'text-right' : 'text-left'}`}>
                            {new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={messageEndRef} />
              </div>

              {/* Message Input Panel */}
              <form onSubmit={handleSendMessage} className="p-3 border-t border-dark-border/60 bg-dark-bg/20 flex space-x-3 items-center shrink-0">
                <input
                  type="text"
                  required
                  value={newMessageText}
                  onChange={(e) => setNewMessageText(e.target.value)}
                  placeholder={`Send message to {activeSession.otherParticipant.fullName}...`}
                  className="flex-1 bg-dark-bg/50 border border-dark-border/80 focus:border-brand-500 rounded-xl py-2 px-4 text-xs text-white placeholder-gray-600 outline-none transition-all focus:shadow-md focus:shadow-brand-950/20"
                />
                <button
                  type="submit"
                  disabled={!newMessageText.trim() || sending}
                  className="bg-brand-600 hover:bg-brand-700 disabled:opacity-55 text-white p-2.5 rounded-xl transition-all shadow-md shadow-brand-650/15 flex items-center justify-center shrink-0"
                >
                  <Send size={14} />
                </button>
              </form>
            </>
          ) : (
            <div className="flex-1 flex flex-col justify-center items-center text-center text-dark-muted text-xs p-6 space-y-3">
              <MessageSquare size={32} className="text-dark-muted/30" />
              <p className="font-bold text-white">No Conversation Selected</p>
              <p className="max-w-xs leading-relaxed text-[11px]">
                Choose an active candidate thread on the left, or navigate to your applicants sheet to start a new chat with an applicant.
              </p>
            </div>
          )}
        </div>

      </div>
    </div>
  );
};

export default RecruiterChat;
