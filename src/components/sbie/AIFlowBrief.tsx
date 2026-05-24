import { useState, useEffect, useCallback, useRef } from 'react';
import { useAIBriefContext } from '../../hooks/useSBIE';
import { Sparkles, RefreshCw, ChevronDown, ChevronUp, Clock } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { GoogleGenerativeAI } from '@google/generative-ai';
import {
  dateString,
  readBriefCache,
  writeBriefCache,
  resolveBestCachedBrief,
  formatSessionDateLabel,
  entryToDisplay,
  type AIBriefCacheEntry,
} from '../../lib/aiBriefCache';

const apiKey = import.meta.env.VITE_GEMINI_API_KEY;

const genAI = apiKey ? new GoogleGenerativeAI(apiKey) : null;

type BriefDisplayState = ReturnType<typeof entryToDisplay>;

function buildPrompt(
  contextData: NonNullable<ReturnType<typeof useAIBriefContext>['data']>,
  isFresh: boolean
) {
  const sessionLabel = isFresh
    ? `today's trading session (${contextData.sessionDate})`
    : `the previous trading session (${contextData.sessionDate}) — NOT today's live session`;

  return `
    You are a quantitative trading analyst specializing in the NEPSE (Nepal Stock Exchange).
    Generate a concise, 3-paragraph "Market Flow Brief" for institutional and smart retail investors.

    IMPORTANT: This analysis uses data from ${sessionLabel}.
    ${isFresh ? 'The market data is current for today.' : "Explicitly note in paragraph 1 that this reflects the prior session because today's floorsheet is not yet available."}

    DATA (${contextData.dataLabel} · ${contextData.sessionDate}):
    - Top Smart Money Brokers Active: ${contextData.topSmartMoneyBrokers.map((b) => b.name).join(', ') || 'None'}
    - Stocks with Stealth Accumulation: ${contextData.accumulatingStocks.join(', ') || 'None detected'}
    - High Manipulation Risk (MRS): ${contextData.highestMRSStocks.map((s) => `${s.symbol} (${s.score})`).join(', ') || 'None detected'}
    - Active Coordinated Clusters: ${contextData.coordinatedClusters.map((c) => c.stocks.join('+')).join(', ') || 'None'}
    - Total Turnover (live board): Rs. ${(contextData.totalTurnover / 1e7).toFixed(2)} Cr

    RULES:
    - Paragraph 1: Overview of Smart Money activity and who is leading.
    - Paragraph 2: Specific stocks under accumulation and coordination clusters.
    - Paragraph 3: Risks (MRS) and final quantitative takeaway.
    - Keep the tone professional, strictly analytical, and objective.
    - Do not use markdown bolding/italics; return raw readable text.
    - Do not include greetings or sign-offs.
  `;
}

async function generateBriefText(
  contextData: NonNullable<ReturnType<typeof useAIBriefContext>['data']>,
  isFresh: boolean
): Promise<string> {
  if (!genAI) {
    throw new Error('VITE_GEMINI_API_KEY is not configured');
  }
  const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
  const result = await model.generateContent(buildPrompt(contextData, isFresh));
  const responseText = result.response.text();
  if (!responseText?.trim()) {
    throw new Error('Invalid response from Gemini AI');
  }
  return responseText.trim();
}

function applyCacheEntry(entry: AIBriefCacheEntry, today: string): BriefDisplayState {
  return entryToDisplay(entry, today);
}

export default function AIFlowBrief() {
  const today = dateString();
  const { data: contextData, isLoading: contextLoading } = useAIBriefContext();

  const [display, setDisplay] = useState<BriefDisplayState | null>(() => {
    const cached = resolveBestCachedBrief(today);
    return cached ? applyCacheEntry(cached, today) : null;
  });
  const [loading, setLoading] = useState(() => !resolveBestCachedBrief(today));
  const [expanded, setExpanded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchGenRef = useRef(0);
  const lastContextKeyRef = useRef<string>('');

  const isLiveContext =
    !!contextData &&
    !contextData.isFallback &&
    contextData.dataLabel === 'Today' &&
    contextData.sessionDate === today;

  const loadFromCache = useCallback((): boolean => {
    const entry = resolveBestCachedBrief(today);
    if (!entry?.text) return false;
    setDisplay(applyCacheEntry(entry, today));
    setError(null);
    return true;
  }, [today]);

  const fetchBrief = useCallback(
    async (force = false) => {
      if (!contextData) return;

      const contextKey = `${contextData.sessionDate}-${contextData.isFallback}-${contextData.dataLabel}`;
      if (!force && contextKey === lastContextKeyRef.current && display) {
        return;
      }
      lastContextKeyRef.current = contextKey;

      const genId = ++fetchGenRef.current;

      if (!force && loadFromCache()) {
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);

      const saveAndShow = (text: string, sessionDate: string, isFresh: boolean) => {
        const entry: AIBriefCacheEntry = {
          text,
          sessionDate,
          generatedAt: new Date().toISOString(),
          isFresh,
        };
        writeBriefCache(entry);
        if (genId === fetchGenRef.current) {
          setDisplay(applyCacheEntry(entry, today));
          setError(null);
        }
      };

      try {
        if (isLiveContext) {
          if (!force) {
            const todayEntry = readBriefCache(today);
            if (todayEntry?.text) {
              setDisplay(applyCacheEntry(todayEntry, today));
              setLoading(false);
              return;
            }
          }
          if (genAI) {
            const text = await generateBriefText(contextData, true);
            saveAndShow(text, today, true);
          } else if (!loadFromCache()) {
            setError('Add VITE_GEMINI_API_KEY to generate a new brief. Showing last saved brief when available.');
          }
          return;
        }

        // Stale / pre-market: never clear an existing brief
        if (!force && loadFromCache()) {
          setLoading(false);
          return;
        }

        const hasSignal =
          contextData.accumulatingStocks.length > 0 ||
          contextData.topSmartMoneyBrokers.length > 0 ||
          contextData.highestMRSStocks.length > 0 ||
          contextData.coordinatedClusters.length > 0 ||
          contextData.totalTurnover > 0;

        if (genAI && contextData.isFallback && hasSignal) {
          const text = await generateBriefText(contextData, false);
          saveAndShow(text, contextData.sessionDate, false);
          return;
        }

        if (!loadFromCache()) {
          setError(
            genAI
              ? "Brief will appear once today's trading data is available."
              : 'Configure VITE_GEMINI_API_KEY to generate briefs. Cached briefs will show automatically.'
          );
        }
      } catch (err: unknown) {
        console.error('AI Generation Error:', err);
        if (genId !== fetchGenRef.current) return;

        if (!loadFromCache()) {
          const message = err instanceof Error ? err.message : 'Failed to generate AI brief.';
          setError(message);
        }
      } finally {
        if (genId === fetchGenRef.current) {
          setLoading(false);
        }
      }
    },
    [contextData, isLiveContext, today, loadFromCache, display]
  );

  useEffect(() => {
    if (!contextData) return;
    fetchBrief();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- refetch only when session identity changes
  }, [contextData?.sessionDate, contextData?.isFallback, contextData?.dataLabel]);

  useEffect(() => {
    if (window.innerWidth >= 1024) {
      setExpanded(true);
    }
  }, []);

  const isStale = display?.freshness === 'stale';
  const title = isStale ? 'Market Flow Brief' : "Today's Market Flow Brief";
  const statusBadge = isStale ? (
    <span className="text-[10px] px-1.5 py-0.5 rounded bg-brand-gold/20 text-brand-gold font-jetbrains uppercase tracking-widest">
      Stale · {display ? formatSessionDateLabel(display.sessionDate) : 'Previous day'}
    </span>
  ) : display ? (
    <span className="text-[10px] px-1.5 py-0.5 rounded bg-bull-green/20 text-bull-green font-jetbrains uppercase tracking-widest">
      Live · Today&apos;s session
    </span>
  ) : (
    <span className="text-[10px] px-1.5 py-0.5 rounded bg-bg-elevated text-text-muted font-jetbrains uppercase tracking-widest">
      Awaiting data
    </span>
  );

  return (
    <div
      className={`card overflow-hidden mb-6 bg-gradient-to-br from-bg-surface ${
        isStale ? 'border-brand-gold/30 to-brand-gold/5' : 'border-brand-cyan/30 to-brand-cyan/5'
      }`}
    >
      <div
        className="p-4 flex items-center justify-between cursor-pointer hover:bg-bg-elevated/30 transition-colors"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center gap-3">
          <div
            className={`w-8 h-8 rounded-full flex items-center justify-center ${
              isStale ? 'bg-brand-gold/20 text-brand-gold' : 'bg-brand-cyan/20 text-brand-cyan'
            }`}
          >
            <Sparkles size={16} />
          </div>
          <div>
            <h2 className="font-syne font-bold text-text-primary flex items-center gap-2 flex-wrap">
              {title}
              {statusBadge}
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-brand-violet/20 text-brand-violet font-jetbrains uppercase tracking-widest">
                AI Generated
              </span>
            </h2>
            <div className="text-xs text-text-muted mt-0.5 flex items-center gap-2 flex-wrap">
              {isStale ? (
                <>
                  <Clock size={12} className="text-brand-gold shrink-0" />
                  <span>
                    Previous session data — not today&apos;s live flow. Updates when today&apos;s floorsheet
                    is available.
                  </span>
                </>
              ) : display ? (
                <span>Quantitative summary of smart money activity · today&apos;s live floorsheet</span>
              ) : (
                <span>Loading market intelligence…</span>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-4">
          {expanded && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                lastContextKeyRef.current = '';
                fetchBrief(true);
              }}
              disabled={loading || contextLoading}
              className="text-text-muted hover:text-brand-cyan transition-colors disabled:opacity-50"
              title="Regenerate Brief"
            >
              <RefreshCw size={16} className={loading || contextLoading ? 'animate-spin' : ''} />
            </button>
          )}
          <div className="text-text-muted">{expanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}</div>
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
              {isStale && display && (
                <div className="mt-3 mb-1 px-3 py-2 rounded-lg bg-brand-gold/10 border border-brand-gold/25 text-xs text-brand-gold">
                  Data session: {formatSessionDateLabel(display.sessionDate)} · Generated{' '}
                  {new Date(display.generatedAt).toLocaleString()} · This is not today&apos;s live market
                  flow.
                </div>
              )}
              {!isStale && display && (
                <div className="mt-3 mb-1 px-3 py-2 rounded-lg bg-bull-green/10 border border-bull-green/25 text-xs text-bull-green">
                  Today&apos;s session ({formatSessionDateLabel(display.sessionDate)}) · Updated{' '}
                  {new Date(display.generatedAt).toLocaleString()}
                </div>
              )}
              {(loading || contextLoading) && !display ? (
                <div className="space-y-3 pt-4">
                  <div className="h-4 bg-bg-border rounded skeleton w-full" />
                  <div className="h-4 bg-bg-border rounded skeleton w-11/12" />
                  <div className="h-4 bg-bg-border rounded skeleton w-4/5" />
                  <div className="h-4 bg-bg-border rounded skeleton w-full mt-4" />
                  <div className="h-4 bg-bg-border rounded skeleton w-10/12" />
                </div>
              ) : error && !display ? (
                <div className="text-sm text-bear-red pt-4">{error}</div>
              ) : display ? (
                <div className="text-sm text-text-secondary leading-relaxed pt-4 space-y-4">
                  {display.text
                    .split('\n')
                    .filter((p) => p.trim())
                    .map((paragraph, i) => (
                      <p key={i}>{paragraph}</p>
                    ))}
                </div>
              ) : (
                <div className="text-sm text-text-muted pt-4">
                  {error || 'Waiting for market data…'}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
