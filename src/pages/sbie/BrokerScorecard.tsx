import { useState, useMemo } from 'react';
import { useBrokerScorecard } from '../../hooks/useSBIE';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Trophy, ShieldAlert, Target, Info, ChevronRight, X, TrendingUp, TrendingDown, ChevronDown, ChevronUp } from 'lucide-react';
import { formatLakhCrore } from '../../lib/sbie-algorithms';

function FallbackBanner({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-neutral-yellow/10 border border-neutral-yellow/20 text-neutral-yellow text-xs font-bold mb-4">
      <div className="w-1.5 h-1.5 rounded-full bg-neutral-yellow animate-pulse" />
      Market not yet open — showing {label.toLowerCase()}'s data
    </div>
  );
}

function BrokerProfileModal({ broker, onClose }: { broker: any; onClose: () => void }) {
  if (!broker) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4 backdrop-blur-sm" onClick={onClose}>
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
          className="w-full max-w-4xl max-h-[90vh] bg-bg-base border border-bg-border rounded-2xl overflow-hidden flex flex-col shadow-2xl"
          onClick={e => e.stopPropagation()}
        >
          {/* Header */}
          <div className="p-6 border-b border-bg-border bg-bg-surface flex justify-between items-start">
            <div>
              <div className="text-[10px] text-text-muted uppercase tracking-widest font-bold mb-1">Full Scorecard</div>
              <h2 className="text-3xl font-syne font-bold flex items-center gap-3">
                {broker.brokerName} <span className="text-base font-jetbrains text-text-muted font-normal">#{broker.brokerId}</span>
              </h2>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-bg-elevated rounded-full transition-colors"><X size={20}/></button>
          </div>

          {/* Body */}
          <div className="p-6 overflow-y-auto flex-1 bg-bg-base custom-scrollbar">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              <div className="card p-6 flex flex-col items-center justify-center text-center bg-gradient-to-b from-bg-surface to-bg-base">
                <div className="text-xs text-text-muted uppercase font-bold mb-4">Reputation Score</div>
                <div className="relative w-32 h-32 flex items-center justify-center">
                  <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                    <circle cx="50" cy="50" r="45" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="8" />
                    <circle cx="50" cy="50" r="45" fill="none" stroke="currentColor" strokeWidth="8" 
                      strokeDasharray="282.7" strokeDashoffset={282.7 * (1 - broker.reputationScore / 100)}
                      className={`${broker.reputationScore >= 70 ? 'text-bull-green' : broker.reputationScore >= 40 ? 'text-brand-gold' : 'text-bear-red'} transition-all duration-1000`} strokeLinecap="round" />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center flex-col">
                    <span className="text-4xl font-syne font-bold">{Math.round(broker.reputationScore)}</span>
                    <span className="text-[10px] text-text-muted">/ 100</span>
                  </div>
                </div>
              </div>

              <div className="md:col-span-2 grid grid-cols-2 gap-4">
                <div className="card p-4 bg-bull-green/5 border-bull-green/20">
                  <div className="text-[10px] text-text-muted uppercase font-bold mb-1">Win Rate</div>
                  <div className="text-2xl font-jetbrains font-bold text-bull-green">{broker.winRate}%</div>
                  <div className="text-xs text-text-secondary mt-1">Estimated accumulation profitability</div>
                </div>
                <div className="card p-4 bg-brand-violet/5 border-brand-violet/20">
                  <div className="text-[10px] text-text-muted uppercase font-bold mb-1">Total Volume Traded</div>
                  <div className="text-2xl font-jetbrains font-bold text-brand-violet">{formatLakhCrore(broker.totalBought + broker.totalSold)}</div>
                  <div className="text-xs text-text-secondary mt-1">Across {broker.totalTrades} trades in session</div>
                </div>
                <div className="card p-4 bg-bear-red/5 border-bear-red/20">
                  <div className="text-[10px] text-text-muted uppercase font-bold mb-1">Dump Rate</div>
                  <div className="text-2xl font-jetbrains font-bold text-bear-red">{broker.dumpRate}%</div>
                  <div className="text-xs text-text-secondary mt-1">Selling right before price drops</div>
                </div>
                <div className="card p-4 bg-bg-surface">
                  <div className="text-[10px] text-text-muted uppercase font-bold mb-1">Retail Trap Risk</div>
                  <div className="text-2xl font-jetbrains font-bold text-text-primary">{broker.retailTrapScore}/100</div>
                  <div className="text-xs text-text-secondary mt-1">Overall danger to retail followers</div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div>
                <h3 className="font-syne font-bold mb-4 flex items-center gap-2"><Target size={18} className="text-brand-cyan"/> Current Focus Stocks</h3>
                <div className="space-y-2">
                  {broker.focusStocks.map((stock: string, i: number) => (
                    <div key={i} className="flex justify-between items-center p-3 rounded-lg bg-bg-surface border border-bg-border">
                      <span className="font-bold">{stock}</span>
                      <span className="text-[10px] text-text-muted uppercase tracking-widest font-bold">Active</span>
                    </div>
                  ))}
                  {broker.focusStocks.length === 0 && (
                    <div className="p-4 text-center text-text-muted text-sm bg-bg-surface rounded-lg">No focus stocks available</div>
                  )}
                </div>
              </div>

              <div>
                <h3 className="font-syne font-bold mb-4 flex items-center gap-2"><Trophy size={18} className="text-brand-gold"/> Classification</h3>
                <div className={`card p-6 border ${broker.classification === 'Smart Money' ? 'bg-brand-cyan/10 border-brand-cyan/30' : broker.classification === 'Retail Trap' ? 'bg-bear-red/10 border-bear-red/30' : 'bg-bg-surface border-bg-border'} flex flex-col items-center text-center justify-center min-h-[150px]`}>
                  <div className={`text-2xl font-syne font-bold mb-2 ${broker.classification === 'Smart Money' ? 'text-brand-cyan' : broker.classification === 'Retail Trap' ? 'text-bear-red' : 'text-text-primary'}`}>
                    {broker.classification}
                  </div>
                  <p className="text-xs text-text-secondary">
                    {broker.classification === 'Smart Money' 
                      ? "This broker consistently makes profitable trades and leads the market. High probability of success if followed." 
                      : broker.classification === 'Retail Trap' 
                      ? "High risk. This broker has a poor win rate and high dump rate. Trades here often precede localized crashes." 
                      : "Neutral performance. Doesn't strongly lead or lag the market."}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}


export default function BrokerScorecard() {
  const { data, isLoading } = useBrokerScorecard();
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('All');
  const [sortConfig, setSortConfig] = useState({ key: 'reputationScore', dir: 'desc' });
  const [selectedBroker, setSelectedBroker] = useState<any>(null);

  const processedData = useMemo(() => {
    if (!data?.data) return [];
    
    let filtered = data.data.filter((b: any) => 
      (b.brokerName.toLowerCase().includes(search.toLowerCase()) || b.brokerId.includes(search)) &&
      (filter === 'All' || b.classification === filter)
    );

    filtered.sort((a: any, b: any) => {
      if (sortConfig.dir === 'asc') return a[sortConfig.key] > b[sortConfig.key] ? 1 : -1;
      return a[sortConfig.key] < b[sortConfig.key] ? 1 : -1;
    });

    return filtered;
  }, [data, search, filter, sortConfig]);

  const handleSort = (key: string) => {
    if (sortConfig.key === key) {
      setSortConfig({ key, dir: sortConfig.dir === 'desc' ? 'asc' : 'desc' });
    } else {
      setSortConfig({ key, dir: 'desc' });
    }
  };

  const getClassificationBadge = (cls: string) => {
    switch (cls) {
      case 'Smart Money': return <span className="px-2 py-0.5 rounded bg-brand-cyan/20 text-brand-cyan text-[10px] font-bold border border-brand-cyan/30">Smart Money</span>;
      case 'Retail Trap': return <span className="px-2 py-0.5 rounded bg-bear-red/20 text-bear-red text-[10px] font-bold border border-bear-red/30">Retail Trap</span>;
      default: return <span className="px-2 py-0.5 rounded bg-bg-elevated text-text-muted text-[10px] font-bold border border-bg-border">Neutral</span>;
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[500px] space-y-4">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-brand-gold"></div>
        <p className="text-text-secondary animate-pulse text-sm font-syne uppercase tracking-widest">Aggregating Scorecards...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="font-syne text-2xl font-bold flex items-center gap-3">
            Broker Scorecards
          </h1>
          <p className="text-xs text-text-secondary mt-1">Directory of all NEPSE brokers with estimated rolling performance metrics based on today's session activity.</p>
        </div>
      </div>
      
      {data?.isFallback && <FallbackBanner label={data.dataLabel} />}

      <div className="flex flex-col md:flex-row gap-4 justify-between bg-bg-surface p-4 rounded-xl border border-bg-border">
        <div className="relative flex-1 max-w-sm">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
          <input 
            type="text" placeholder="Search broker name or #..." value={search} onChange={e => setSearch(e.target.value)}
            className="input-field pl-9 py-2 text-sm w-full" 
          />
        </div>
        <div className="flex flex-wrap gap-2">
          {['All', 'Smart Money', 'Neutral', 'Retail Trap'].map(f => (
            <button
              key={f} onClick={() => setFilter(f)}
              className={`px-4 py-2 text-xs font-bold rounded-lg border transition-colors ${
                filter === f ? 'bg-bg-elevated border-text-primary text-text-primary' : 'bg-transparent border-bg-border text-text-muted hover:text-text-primary hover:bg-bg-base'
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      <div className="card overflow-x-auto">
        <table className="w-full text-sm text-left">
          <thead>
            <tr className="bg-bg-base/50 border-b border-bg-border">
              <th className="p-4 font-semibold text-text-muted">Broker</th>
              <th className="p-4 font-semibold text-text-muted">Classification</th>
              <th className="p-4 font-semibold text-text-muted cursor-pointer hover:text-brand-cyan" onClick={() => handleSort('reputationScore')}>
                <div className="flex items-center gap-1">Reputation {sortConfig.key === 'reputationScore' && (sortConfig.dir === 'desc' ? <ChevronDown size={14}/> : <ChevronUp size={14}/>)}</div>
              </th>
              <th className="p-4 font-semibold text-text-muted cursor-pointer hover:text-brand-cyan" onClick={() => handleSort('winRate')}>
                <div className="flex items-center gap-1">Win Rate {sortConfig.key === 'winRate' && (sortConfig.dir === 'desc' ? <ChevronDown size={14}/> : <ChevronUp size={14}/>)}</div>
              </th>
              <th className="p-4 font-semibold text-text-muted cursor-pointer hover:text-brand-cyan" onClick={() => handleSort('dumpRate')}>
                <div className="flex items-center gap-1">Dump Rate {sortConfig.key === 'dumpRate' && (sortConfig.dir === 'desc' ? <ChevronDown size={14}/> : <ChevronUp size={14}/>)}</div>
              </th>
              <th className="p-4 font-semibold text-text-muted">Preferred Sectors</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-bg-border/30">
            {processedData.map((row: any) => (
              <tr key={row.brokerId} onClick={() => setSelectedBroker(row)} className="hover:bg-bg-elevated/30 cursor-pointer transition-colors group">
                <td className="p-4">
                  <div className="font-bold group-hover:text-brand-cyan transition-colors">{row.brokerName}</div>
                  <div className="text-[10px] text-text-muted font-jetbrains mt-0.5">Broker #{row.brokerId}</div>
                </td>
                <td className="p-4">{getClassificationBadge(row.classification)}</td>
                <td className="p-4 font-jetbrains font-bold text-text-primary">{row.reputationScore}</td>
                <td className="p-4 font-jetbrains font-bold text-bull-green">{row.winRate}%</td>
                <td className="p-4 font-jetbrains font-bold text-bear-red">{row.dumpRate}%</td>
                <td className="p-4">
                  <div className="flex gap-1 flex-wrap">
                    {row.preferredSectors.map((s: string, idx: number) => (
                      <span key={idx} className="text-[10px] px-1.5 py-0.5 border border-bg-border rounded bg-bg-base text-text-secondary">{s}</span>
                    ))}
                    {row.preferredSectors.length === 0 && <span className="text-text-muted text-xs">—</span>}
                  </div>
                </td>
              </tr>
            ))}
            {processedData.length === 0 && (
              <tr><td colSpan={6} className="p-12 text-center text-text-muted">No brokers match your filters.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {selectedBroker && <BrokerProfileModal broker={selectedBroker} onClose={() => setSelectedBroker(null)} />}
    </div>
  );
}
