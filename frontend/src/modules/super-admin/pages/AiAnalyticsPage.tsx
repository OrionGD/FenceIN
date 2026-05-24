import { useState } from 'react';
import { useAuthStore } from '@/store/useAuthStore';
import { BrainCircuit, Send, Loader2, Sparkles } from 'lucide-react';
import { motion } from 'framer-motion';

export default function AiAnalyticsView() {
  const { token } = useAuthStore();
  const [query, setQuery] = useState('');
  const [responses, setResponses] = useState<{ role: string, content: string }[]>([
    { role: 'assistant', content: "Hello! I am the FenceIn Intelligence Core. How can I help you analyze today's workforce data?" }
  ]);
  const [loading, setLoading] = useState(false);

  const handleAsk = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;

    const userMessage = query;
    setQuery('');
    setResponses(prev => [...prev, { role: 'user', content: userMessage }]);
    setLoading(true);

    try {
      const res = await fetch('http://localhost:3456/api/v1/ai/query', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ query: userMessage })
      });
      
      const data = await res.json();
      
      setResponses(prev => [...prev, { role: 'assistant', content: data.answer }]);
    } catch (err) {
      setResponses(prev => [...prev, { role: 'assistant', content: 'An error occurred while connecting to the Groq intelligence layer.' }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="h-[calc(100vh-8rem)] flex flex-col space-y-4">
      <div>
        <h1 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-500 flex items-center space-x-3">
          <BrainCircuit className="w-8 h-8 text-blue-400" />
          <span>AI Intelligence Layer</span>
        </h1>
        <p className="text-slate-400 mt-1">Groq-powered natural language insights & predictive workforce analytics.</p>
      </div>

      <div className="flex-1 bg-slate-900 border border-slate-800 rounded-2xl shadow-xl flex flex-col overflow-hidden relative">
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {responses.map((msg, idx) => (
            <motion.div 
              key={idx}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div className={`max-w-2xl px-5 py-3 rounded-2xl ${
                msg.role === 'user' 
                  ? 'bg-blue-600 text-white rounded-br-none shadow-[0_4px_20px_rgba(37,99,235,0.2)]'
                  : 'bg-slate-800 text-slate-200 rounded-bl-none border border-slate-700 shadow-lg'
              }`}>
                {msg.role === 'assistant' && (
                  <div className="flex items-center space-x-2 mb-2 text-blue-400">
                    <Sparkles className="w-4 h-4" />
                    <span className="text-xs font-bold uppercase tracking-wider">FenceIn AI</span>
                  </div>
                )}
                <div className="whitespace-pre-wrap leading-relaxed">{msg.content}</div>
              </div>
            </motion.div>
          ))}
          {loading && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex justify-start">
              <div className="bg-slate-800 text-slate-200 px-5 py-3 rounded-2xl rounded-bl-none border border-slate-700">
                <Loader2 className="w-5 h-5 animate-spin text-blue-400" />
              </div>
            </motion.div>
          )}
        </div>

        <form onSubmit={handleAsk} className="p-4 bg-slate-900 border-t border-slate-800">
          <div className="relative">
            <input 
              type="text" 
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              disabled={loading}
              placeholder="Ask about attendance trends, predict shortages, or generate operational summaries..." 
              className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-4 pr-12 py-4 text-slate-200 focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all"
            />
            <button 
              type="submit"
              disabled={loading || !query.trim()}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition-colors disabled:opacity-50"
            >
              <Send className="w-5 h-5" />
            </button>
          </div>
        </form>
      </div>
    </motion.div>
  );
}

