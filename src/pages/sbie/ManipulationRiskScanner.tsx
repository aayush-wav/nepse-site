import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRiskScanner } from '../../hooks/useSBIE';
import { getPriceColorClass, formatPercent, formatVolume } from '../../utils';
import { AlertTriangle, ChevronDown, ChevronUp, ExternalLink, ShieldAlert, AlertCircle, Info, ArrowUpDown, BarChart3 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

function FallbackBanner({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-neutral-yellow/10 border border-neutral-yellow/20 text-neutral-yellow text-xs font-bold">
      <div className="w-1.5 h-1.5 rounded-full bg-neutral-yellow animate-pulse" />
      Market not yet open — showing {label.toLowerCase()}'s data
    </div>
  );
}

function RiskBadge({ score }: { score: number }) {
  if (score > 80) return <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-bear-red/20 text-bear-red font-bold text-[10px] uppercase border border-bear-red/30 animate-pulse"><ShieldAlert size={12} /> Manipulation Suspected</span>;
  if (score > 60) return <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-bear-red/10 text-bear-red font-bold text-[10px] uppercase"><AlertTriangle size={12} /> High Risk</span>;
  if (score > 30) return <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-neutral-yellow/10 text-neutral-yellow font-bold text-[10px] uppercase"><AlertCircle size={12} /> Caution</span>;
  return <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-bull-green/10 text-bull-green font-bold text-[10px] uppercase">Clean</span>;
}

function MRSBar({ score }: { score: number }) {
  const color = score > 80 ? 'bg-bear-red' : score > 60 ? 'bg-bear-red/80' : score > 30 ? 'bg-neutral-yellow' : 'bg-bull-green';
  return (
    <div className="flex items-center gap-3 min-w-[200px]">
      <div className="flex-1 h-2 bg-bg-base rounded-full overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${score}%` }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
          className={`h-full rounded-full ${color}`}
        />
      </div>
      <span className="font-jetbrains text-xs font-bold w-8 text-right">{score}</span>
    </div>
  );
}

type SortKey = 'score' | 'totalVolume' | 'symbol';

export default function ManipulationRiskScanner() {
  const { data, isLoading } = useRiskScanner();
  const navigate = useNavigate();
  const [expanded, setExpanded] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<SortKey>('score');

  const stocks = useMemo(() => {
    if (!data?.data) return [];
    const list = [...data.data];
    switch (sortBy) {
      case 'totalVolume': list.sort((a, b) => b.totalVolume - a.totalVolume); break;
      case 'symbol': list.sort((a, b) => a.symbol.localeCompare(b.symbol)); break;
      default: list.sort((a, b) => b.score - a.score);
    }
    return list;
  }, [data, sortBy]);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[500px] space-y-4">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-bear-red" />
        <p className="text-text-secondary animate-pulse text-sm font-syne uppercase tracking-widest">Scanning Floorsheet Anomalies...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="font-syne text-2xl font-bold flex items-center gap-3 text-bear-red">
            <AlertTriangle /> Manipulation Risk Scanner
          </h1>
          <p className="text-xs text-text-secondary mt-1">Real-time detection of wash trading, high broker concentration, and price-volume divergence.</p>
        </div>
        <div className="flex items-center gap-3">
          {data?.isFallback && <FallbackBanner label={data.dataLabel} />}
          <div className="flex gap-1 bg-bg-surface border border-bg-border rounded-lg p-1">
            {([['score', 'MRS Score'], ['totalVolume', 'Turnover'], ['symbol', 'Symbol']] as const).map(([key, label]) => (
              <button
                key={key}
                onClick={() => setSortBy(key)}
                className={`px-3 py-1.5 text-[10px] font-bold rounded-md transition-colors ${sortBy === key ? 'bg-bg-elevated text-text-primary' : 'text-text-muted hover:text-text-primary'}`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="card p-3 bg-bear-red/5 border-bear-red/20 flex gap-3 items-center">
        <Info size={24} className="text-bear-red shrink-0" />
        <p className="text-xs text-text-secondary">
          <strong className="text-bear-red font-syne">Disclaimer:</strong> The Manipulation Risk Score (MRS) is an algorithmic flag based on trading patterns. It does not constitute definitive proof of illegal activity. Use this for heightened due diligence.
        </p>
      </div>

      <div className="space-y-3">
        {stocks.map((stock, i) => {
          const isExpanded = expanded === stock.symbol;
          return (
            <motion.div
              key={stock.symbol}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: Math.min(i * 0.03, 0.5) }}
              className="card overflow-hidden"
            >
              <div
                className={`p-4 flex items-center justify-between cursor-pointer transition-colors ${isExpanded ? 'bg-bg-elevated' : 'hover:bg-bg-elevated/50'}`}
                onClick={() => setExpanded(isExpanded ? null : stock.symbol)}
              >
                <div className="flex items-center gap-6">
                  <div
                    className="w-12 h-12 rounded-full border-4 flex items-center justify-center font-jetbrains font-bold text-lg bg-bg-surface shrink-0"
                    style={{ borderColor: stock.score > 60 ? 'rgba(255, 77, 79, 0.4)' : stock.score > 30 ? 'rgba(250, 173, 20, 0.3)' : 'rgba(0, 196, 140, 0.2)' }}
                  >
                    {stock.score}
                  </div>
                  <div>
                    <div className="text-lg font-bold font-syne text-text-primary">{stock.symbol}</div>
                    <div className="flex gap-4 text-xs mt-1">
                      <span className="text-text-muted">MRS Score</span>
                      <span className={`font-jetbrains font-bold ${getPriceColorClass(stock.priceChange)}`}>
                        {formatPercent(stock.priceChange)} today
                      </span>
                      <span className="text-text-muted">Vol: {formatVolume(stock.totalVolume)}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-6">
                  <div className="hidden md:block"><MRSBar score={stock.score} /></div>
                  <div className="hidden md:block"><RiskBadge score={stock.score} /></div>
                  <div className="text-text-muted">
                    {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                  </div>
                </div>
              </div>

              <AnimatePresence>
                {isExpanded && (
                  <motion.div
                    initial={{ height: 0 }}
                    animate={{ height: 'auto' }}
                    exit={{ height: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="p-4 border-t border-bg-border bg-bg-base/30">
                      {/* Signal details */}
                      <div className="grid grid-cols-3 gap-4 mb-4">
                        <div className="card p-3 bg-bg-surface">
                          <div className="text-[10px] text-text-muted uppercase font-bold mb-1">BCR</div>
                          <div className="text-xl font-jetbrains font-bold">{(stock.bcr * 100).toFixed(1)}%</div>
                          <div className="text-[10px] text-text-secondary mt-1">Top 2 broker concentration</div>
                        </div>
                        <div className="card p-3 bg-bg-surface">
                          <div className="text-[10px] text-text-muted uppercase font-bold mb-1">Self-Trades</div>
                          <div className={`text-xl font-jetbrains font-bold ${stock.selfTradeCount >= 3 ? 'text-bear-red' : 'text-text-primary'}`}>{stock.selfTradeCount}</div>
                          <div className="text-[10px] text-text-secondary mt-1">Same broker both sides</div>
                        </div>
                        <div className="card p-3 bg-bg-surface">
                          <div className="text-[10px] text-text-muted uppercase font-bold mb-1">Risk Level</div>
                          <div className="mt-1"><RiskBadge score={stock.score} /></div>
                        </div>
                      </div>

                      {/* Signal cards */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
                        {stock.signals.map((signal, idx) => (
                          <div key={idx} className="p-3 rounded-lg border border-bear-red/20 bg-bear-red/5 flex gap-3 items-start">
                            <ShieldAlert size={16} className="text-bear-red shrink-0 mt-0.5" />
                            <span className="text-sm text-text-primary">{signal}</span>
                          </div>
                        ))}
                      </div>

                      <div className="flex gap-4">
                        <button
                          onClick={(e) => { e.stopPropagation(); navigate(`/floorsheet?symbol=${stock.symbol}`); }}
                          className="btn-secondary py-2 px-4 text-xs flex items-center gap-2"
                        >
                          <ExternalLink size={14} /> View Floorsheet Logs
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); navigate(`/stock/${stock.symbol}`); }}
                          className="btn-secondary py-2 px-4 text-xs flex items-center gap-2"
                        >
                          <BarChart3 size={14} /> View Chart
                        </button>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          );
        })}
        {stocks.length === 0 && (
          <div className="card p-12 text-center text-text-muted">
            <ShieldAlert size={48} className="mx-auto mb-4 opacity-20" />
            <h3 className="text-lg font-bold">No Manipulation Signals Detected</h3>
            <p className="text-sm">The scanner did not find any anomalies in the active floorsheet.</p>
          </div>
        )}
      </div>
    </div>
  );
}
