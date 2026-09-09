'use client';

import { useEffect, useRef, useState } from 'react';
import { ai as aiApi } from '@/lib/api';
import type { AIConversation, AIMessage } from '@/types';
import { Send, Plus, Bot, User, Loader2 } from 'lucide-react';

const QUICK_QUESTIONS = [
  'Why did my expenses increase this month?',
  'How much am I saving per month?',
  'What is my estimated credit health score?',
  'Which financial goal is at risk?',
  'How much do I need for retirement?',
  'Can I afford a ₹15 lakh car?',
];

function MessageBubble({ msg }: { msg: AIMessage }) {
  const isUser = msg.role === 'USER';
  return (
    <div className={`flex gap-3 ${isUser ? 'flex-row-reverse' : ''}`}>
      <div className={`shrink-0 w-8 h-8 rounded-xl flex items-center justify-center text-sm ${isUser ? 'bg-indigo-600' : 'bg-slate-700'}`}>
        {isUser ? <User size={16} /> : <Bot size={16} />}
      </div>
      <div className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap ${isUser ? 'bg-indigo-600 text-white rounded-tr-sm' : 'bg-slate-800 text-slate-200 rounded-tl-sm'}`}>
        {msg.content}
      </div>
    </div>
  );
}

export default function AiAdvisorPage() {
  const [conversations, setConversations] = useState<AIConversation[]>([]);
  const [activeConv, setActiveConv] = useState<AIConversation | null>(null);
  const [messages, setMessages] = useState<AIMessage[]>([]);
  const [input, setInput] = useState('');
  const [streaming, setStreaming] = useState(false);
  const [streamingText, setStreamingText] = useState('');
  const [loadingConvs, setLoadingConvs] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadConversations();
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, streamingText]);

  const loadConversations = async () => {
    setLoadingConvs(true);
    try {
      const convs: any = await aiApi.conversations();
      setConversations(convs);
      if (convs.length > 0 && !activeConv) {
        selectConversation(convs[0]);
      }
    } finally {
      setLoadingConvs(false);
    }
  };

  const selectConversation = async (conv: AIConversation) => {
    setActiveConv(conv);
    try {
      const msgs: any = await aiApi.messages(conv._id);
      setMessages(msgs);
    } catch {}
  };

  const newConversation = async () => {
    try {
      const conv: any = await aiApi.createConversation();
      setConversations(prev => [conv, ...prev]);
      setActiveConv(conv);
      setMessages([]);
    } catch {}
  };

  const sendMessage = async (content: string) => {
    if (!content.trim() || streaming) return;
    if (!activeConv) {
      await newConversation();
    }

    const convId = activeConv?._id;
    if (!convId) return;

    const userMsg: AIMessage = {
      _id: 'temp-user',
      role: 'USER',
      content,
      created_at: new Date().toISOString(),
    };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setStreaming(true);
    setStreamingText('');

    try {
      await aiApi.sendMessage(convId, content, (chunk) => {
        setStreamingText(prev => prev + chunk);
      });

      // Reload messages to get persisted versions
      const msgs: any = await aiApi.messages(convId);
      setMessages(msgs);
      setStreamingText('');

      // Update conversation title in list
      await loadConversations();
    } catch (err: any) {
      setMessages(prev => [...prev, {
        _id: 'error', role: 'ASSISTANT' as any,
        content: 'Sorry, I encountered an error. Please try again.',
        created_at: new Date().toISOString(),
      }]);
      setStreamingText('');
    } finally {
      setStreaming(false);
    }
  };

  const handleQuickQ = (q: string) => sendMessage(q);

  return (
    <div className="flex h-[calc(100vh-0px)] overflow-hidden">
      {/* Conversation Sidebar */}
      <div className="hidden md:flex flex-col w-64 bg-slate-900 border-r border-slate-800">
        <div className="p-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Bot size={18} className="text-indigo-400" />
            <span className="text-white font-semibold text-sm">AI Advisor</span>
          </div>
          <button onClick={newConversation} className="btn-ghost p-1.5" title="New conversation">
            <Plus size={16} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {loadingConvs ? (
            Array(3).fill(0).map((_, i) => <div key={i} className="skeleton h-10 rounded-lg" />)
          ) : conversations.length === 0 ? (
            <p className="text-slate-500 text-xs text-center py-4">No conversations yet</p>
          ) : (
            conversations.map(conv => (
              <button
                key={conv._id}
                onClick={() => selectConversation(conv)}
                className={`w-full text-left px-3 py-2 rounded-xl text-sm transition-colors ${activeConv?._id === conv._id ? 'bg-indigo-600/20 text-indigo-300 border border-indigo-500/20' : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'}`}
              >
                <p className="truncate text-sm">{conv.title}</p>
                <p className="text-[10px] text-slate-600 mt-0.5">
                  {new Date(conv.updated_at).toLocaleDateString('en-IN')}
                </p>
              </button>
            ))
          )}
        </div>
      </div>

      {/* Chat Area */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-slate-800 bg-slate-900/50 backdrop-blur">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center">
              <Bot size={18} className="text-white" />
            </div>
            <div>
              <p className="text-white font-semibold text-sm">AI Financial Advisor</p>
              <p className="text-slate-500 text-xs">Powered by Gemini — uses your real financial data</p>
            </div>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {messages.length === 0 && !streaming && (
            <div className="flex flex-col items-center justify-center h-full text-center py-8">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-3xl mb-4 glow-indigo">
                🤖
              </div>
              <h2 className="text-xl font-bold text-white mb-2">Ask me anything about your finances</h2>
              <p className="text-slate-400 text-sm mb-8 max-w-md">
                I analyze your actual income, expenses, investments, and goals — no guessing.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 w-full max-w-lg">
                {QUICK_QUESTIONS.map(q => (
                  <button
                    key={q}
                    onClick={() => handleQuickQ(q)}
                    className="text-left px-4 py-3 rounded-xl bg-slate-800 border border-slate-700 text-slate-300 text-sm hover:border-indigo-500/50 hover:bg-slate-800/80 transition-all"
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map(msg => (
            <MessageBubble key={msg._id} msg={msg} />
          ))}

          {streaming && (
            <div className="flex gap-3">
              <div className="shrink-0 w-8 h-8 rounded-xl bg-slate-700 flex items-center justify-center">
                <Bot size={16} />
              </div>
              <div className="max-w-[80%] rounded-2xl rounded-tl-sm px-4 py-3 bg-slate-800 text-slate-200 text-sm leading-relaxed whitespace-pre-wrap">
                {streamingText || <Loader2 size={16} className="animate-spin text-indigo-400" />}
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="p-4 border-t border-slate-800 bg-slate-900/50">
          <div className="flex gap-3 items-end max-w-3xl mx-auto">
            <textarea
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(input); } }}
              placeholder="Ask about your finances... (Enter to send, Shift+Enter for new line)"
              rows={1}
              className="input flex-1 resize-none min-h-[44px] max-h-32 py-3"
              style={{ height: 'auto' }}
            />
            <button
              onClick={() => sendMessage(input)}
              disabled={!input.trim() || streaming}
              className="btn-primary shrink-0 h-[44px] w-[44px] p-0 justify-center"
            >
              {streaming ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
            </button>
          </div>
          <p className="text-center text-xs text-slate-600 mt-2">
            AI uses your real financial data. Results are informational, not financial advice.
          </p>
        </div>
      </div>
    </div>
  );
}
