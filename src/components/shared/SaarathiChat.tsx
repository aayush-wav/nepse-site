import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageSquare, X, Send, Loader2, Sparkles, Bot } from 'lucide-react';
import { useLocation } from 'react-router-dom';
import { chatWithSaarathi } from '../../lib/saarathi';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
}

export default function SaarathiChat() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      role: 'assistant',
      content: "नमस्ते! I'm Saarathi, your NEPSE guide. How can I help you analyze the market today?"
    }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const location = useLocation();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isOpen]);

  const handleSend = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    setInput('');
    
    const newMessages = [
      ...messages,
      { id: Date.now().toString(), role: 'user' as const, content: userMessage }
    ];
    setMessages(newMessages);
    setIsLoading(true);

    try {
      // Map to Anthropic format
      const apiMessages = newMessages.map(m => ({
        role: m.role,
        content: m.content
      }));

      const response = await chatWithSaarathi(apiMessages, window.location.href);
      
      setMessages(prev => [
        ...prev,
        { id: (Date.now() + 1).toString(), role: 'assistant', content: response }
      ]);
    } catch (error) {
      setMessages(prev => [
        ...prev,
        { id: (Date.now() + 1).toString(), role: 'assistant', content: "Sorry, I ran into an issue processing that. Please try again." }
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      {/* Floating Action Button */}
      <motion.button
        className={`fixed bottom-6 right-6 z-50 p-4 rounded-full shadow-2xl transition-all duration-300 ${
          isOpen ? 'scale-0 opacity-0' : 'scale-100 opacity-100'
        } bg-gradient-to-br from-brand-cyan to-brand-violet text-white hover:shadow-brand-cyan/20 hover:scale-105`}
        onClick={() => setIsOpen(true)}
        initial={{ y: 50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
      >
        <Sparkles size={24} className="animate-pulse" />
      </motion.button>

      {/* Chat Window */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="fixed bottom-6 right-6 z-50 w-[380px] h-[600px] max-h-[80vh] flex flex-col bg-bg-surface border border-bg-border shadow-2xl rounded-2xl overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-bg-border bg-bg-elevated/50 backdrop-blur-md">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-brand-cyan to-brand-violet flex items-center justify-center shadow-inner">
                  <Bot size={18} className="text-white" />
                </div>
                <div>
                  <h3 className="font-syne font-bold text-sm text-text-primary">Saarathi AI</h3>
                  <p className="text-[10px] text-brand-cyan font-medium flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-brand-cyan animate-pulse"></span>
                    Online & Ready
                  </p>
                </div>
              </div>
              <button 
                onClick={() => setIsOpen(false)}
                className="p-2 text-text-muted hover:text-text-primary hover:bg-bg-elevated rounded-lg transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-bg-base/50">
              {messages.map((msg) => (
                <div 
                  key={msg.id} 
                  className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div 
                    className={`max-w-[85%] p-3 rounded-2xl text-sm leading-relaxed ${
                      msg.role === 'user' 
                        ? 'bg-brand-cyan text-bg-base rounded-tr-sm' 
                        : 'bg-bg-elevated border border-bg-border text-text-primary rounded-tl-sm'
                    }`}
                  >
                    {msg.content}
                  </div>
                </div>
              ))}
              {isLoading && (
                <div className="flex justify-start">
                  <div className="bg-bg-elevated border border-bg-border p-3 rounded-2xl rounded-tl-sm flex items-center gap-2 text-text-muted text-sm">
                    <Loader2 size={14} className="animate-spin" />
                    Thinking...
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <div className="p-4 bg-bg-surface border-t border-bg-border">
              <form 
                onSubmit={handleSend}
                className="flex items-end gap-2 bg-bg-elevated border border-bg-border rounded-xl p-2 focus-within:border-brand-cyan/50 transition-colors"
              >
                <textarea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSend();
                    }
                  }}
                  placeholder="Ask Saarathi..."
                  className="flex-1 max-h-32 min-h-[40px] bg-transparent border-none focus:ring-0 resize-none text-sm p-2 scrollbar-thin"
                  rows={1}
                />
                <button
                  type="submit"
                  disabled={!input.trim() || isLoading}
                  className="p-2.5 bg-brand-cyan text-bg-base rounded-lg hover:bg-brand-cyan/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all shrink-0"
                >
                  <Send size={16} />
                </button>
              </form>
              <div className="text-center mt-2">
                <p className="text-[9px] text-text-muted">Saarathi provides educational guidance, not financial advice.</p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
