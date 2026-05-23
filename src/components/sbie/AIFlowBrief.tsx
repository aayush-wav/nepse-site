import { useState, useEffect } from 'react';
import { useAIBriefContext } from '../../hooks/useSBIE';
import { Sparkles, RefreshCw, ChevronDown, ChevronUp } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { GoogleGenerativeAI } from '@google/generative-ai';

// Initialize Gemini SDK with the environment variable
const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
const genAI = new GoogleGenerativeAI(apiKey || '');

export default function AIFlowBrief() {
  const { data: contextData, isLoading: contextLoading } = useAIBriefContext();
  const [brief, setBrief] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchBrief = async (force = false) => {
    if (!contextData) return;
    
    try {
      setLoading(true);
      setError(null);
      
      const todayDate = new Date().toISOString().split('T')[0];
      // Include the floorsheet data label in the cache key so it regenerates when market opens
      const cacheKey = `sbie-ai-brief-${todayDate}-${contextData.dataLabel}`;
      
      if (!force) {
        const cached = localStorage.getItem(cacheKey);
        if (cached) {
          setBrief(cached);
          setLoading(false);
          return;
        }
      }

      if (!apiKey) {
        throw new Error("VITE_GEMINI_API_KEY is not defined in .env");
      }

      const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

      const prompt = `
        You are a quantitative trading analyst specializing in the NEPSE (Nepal Stock Exchange).
        I am going to provide you with the latest metrics from our Smart Broker Intelligence Engine.
        Generate a concise, 3-paragraph "Market Flow Brief" for institutional and smart retail investors.

        Context: This data is for ${contextData.dataLabel}. ${contextData.isFallback ? 'The market has not yet opened today.' : ''}

        DATA:
        - Top Smart Money Brokers Active: ${contextData.topSmartMoneyBrokers.map(b => b.name).join(', ') || 'None'}
        - Stocks with Stealth Accumulation: ${contextData.accumulatingStocks.join(', ') || 'None detected'}
        - High Manipulation Risk (MRS): ${contextData.highestMRSStocks.map(s => `${s.symbol} (${s.score})`).join(', ') || 'None detected'}
        - Active Coordinated Clusters: ${contextData.coordinatedClusters.map(c => c.stocks.join('+')).join(', ') || 'None'}
        
        RULES:
        - Paragraph 1: Overview of Smart Money activity and who is leading.
        - Paragraph 2: Specific stocks under accumulation and coordination clusters.
        - Paragraph 3: Risks (MRS) and final quantitative takeaway.
        - Keep the tone professional, strictly analytical, and objective.
        - Do not use markdown bolding/italics; return raw readable text.
        - Do not include greetings or sign-offs.
      `;

      const result = await model.generateContent(prompt);
      const responseText = result.response.text();
      
      if (responseText) {
        setBrief(responseText);
        localStorage.setItem(cacheKey, responseText);
      } else {
        throw new Error("Invalid response from Gemini AI");
      }
    } catch (err: any) {
      console.error("AI Generation Error:", err);
      setError(err.message || "Failed to generate AI brief. Ensure your GEMINI_API_KEY is configured.");
    } finally {
      setLoading(false);
    }
  };

  // Trigger fetch when context data becomes available
  useEffect(() => {
    if (contextData) {
      fetchBrief();
    }
  }, [contextData]);

  useEffect(() => {
    // Auto expand on desktop by default
    if (window.innerWidth >= 1024) {
      setExpanded(true);
    }
  }, []);

  // Hide the brief completely if there's an error and no cached brief
  if (error && !brief && !loading && !contextLoading) return null;

  return (
    <div className="card border-brand-cyan/30 overflow-hidden mb-6 bg-gradient-to-br from-bg-surface to-brand-cyan/5">
      <div 
        className="p-4 flex items-center justify-between cursor-pointer hover:bg-bg-elevated/30 transition-colors"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-brand-cyan/20 flex items-center justify-center text-brand-cyan">
            <Sparkles size={16} />
          </div>
          <div>
            <h2 className="font-syne font-bold text-text-primary flex items-center gap-2">
              Today's Market Flow Brief
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-brand-violet/20 text-brand-violet font-jetbrains uppercase tracking-widest">AI Generated</span>
            </h2>
            <div className="text-xs text-text-muted mt-0.5">Quantitative summary of smart money activity</div>
          </div>
        </div>
        <div className="flex items-center gap-4">
          {expanded && (
            <button 
              onClick={(e) => { e.stopPropagation(); fetchBrief(true); }}
              disabled={loading || contextLoading}
              className="text-text-muted hover:text-brand-cyan transition-colors disabled:opacity-50"
              title="Regenerate Brief"
            >
              <RefreshCw size={16} className={loading || contextLoading ? "animate-spin" : ""} />
            </button>
          )}
          <div className="text-text-muted">
            {expanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
          </div>
        </div>
      </div>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="p-4 pt-0 border-t border-brand-cyan/10">
              {loading || contextLoading ? (
                <div className="space-y-3 pt-4">
                  <div className="h-4 bg-bg-border rounded skeleton w-full" />
                  <div className="h-4 bg-bg-border rounded skeleton w-11/12" />
                  <div className="h-4 bg-bg-border rounded skeleton w-4/5" />
                  <div className="h-4 bg-bg-border rounded skeleton w-full mt-4" />
                  <div className="h-4 bg-bg-border rounded skeleton w-10/12" />
                </div>
              ) : error ? (
                <div className="text-sm text-bear-red pt-4">{error}</div>
              ) : (
                <div className="text-sm text-text-secondary leading-relaxed pt-4 space-y-4">
                  {brief?.split('\n').filter(p => p.trim()).map((paragraph, i) => (
                    <p key={i}>{paragraph}</p>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
