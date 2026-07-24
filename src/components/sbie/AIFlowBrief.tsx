import { useState, useEffect, useCallback, useRef } from 'react';
import { useAIBriefContext } from '../../hooks/useSBIE';
import { Sparkles, RefreshCw, ChevronDown, ChevronUp, Clock } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { nepseApi } from '../../lib/api';
import {
  dateString,
  readBriefCache,
  writeBriefCache,
  resolveBestCachedBrief,
  formatSessionDateLabel,
  entryToDisplay,
  type AIBriefCacheEntry,
} from '../../lib/aiBriefCache';

type BriefDisplayState = ReturnType<typeof entryToDisplay>;

async function generateBriefText(
  contextData: NonNullable<ReturnType<typeof useAIBriefContext>['data']>,
  isFresh: boolean
): Promise<string> {
  const result = await nepseApi.generateAIBrief(contextData);
  if (result.status !== 'ok' || !result.text) {
    throw new Error(result.message || 'Failed to generate brief from backend');
  }
  return result.text.trim();
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
          try {
            const text = await generateBriefText(contextData, true);
            saveAndShow(text, today, true);
          } catch (e) {
            if (!loadFromCache()) {
              setError('Failed to fetch new brief. Showing last saved brief when available.');
            }
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

        if (contextData.isFallback && hasSignal) {
          try {
            const text = await generateBriefText(contextData, false);
            saveAndShow(text, contextData.sessionDate, false);
            return;
          } catch (e) {
            // Fall through to cache load
          }
        }

        if (!loadFromCache()) {
          setError("Brief will appear once today's trading data is available.");
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
