import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useBrokerMap } from '../../hooks/useSBIE';
import { formatLakhCrore, resolveBrokerName } from '../../lib/sbie-algorithms';
import { Info, X, TrendingUp, TrendingDown, Target, Zap, Shield, Search, ChevronDown, ChevronUp, Users, Eye } from 'lucide-react';

function FallbackBanner({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-neutral-yellow/10 border border-neutral-yellow/20 text-neutral-yellow text-xs font-bold">
      <div className="w-1.5 h-1.5 rounded-full bg-neutral-yellow animate-pulse" />
      Market not yet open — showing {label.toLowerCase()}'s data
    </div>
  );
}

function ReputationRing({ score }: { score: number }) {
  const color = score >= 70 ? '#00C48C' : score >= 40 ? '#FAAD14' : '#FF4D4F';
  const circumference = 2 * Math.PI * 14;
  const offset = circumference * (1 - score / 100);
  return (
    <svg width="36" height="36" className="shrink-0">
      <circle cx="18" cy="18" r="14" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="3" />
      <circle cx="18" cy="18" r="14" fill="none" stroke={color} strokeWidth="3"
        strokeDasharray={circumference} strokeDashoffset={offset}
        strokeLinecap="round" transform="rotate(-90 18 18)" className="transition-all duration-700" />
      <text x="18" y="18" textAnchor="middle" dominantBaseline="central"
        fill={color} fontSize="9" fontWeight="bold" fontFamily="JetBrains Mono, monospace">
        {score}
      </text>
    </svg>
  );
}

function BrokerDrawer({ broker, onClose }: { broker: any; onClose: () => void }) {
  if (!broker) return null;

  const netBuys = Object.entries(broker.netPositions as Record<string, number>)
    .filter(([, v]) => v > 0)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5);

  const netSells = Object.entries(broker.netPositions as Record<string, number>)
    .filter(([, v]) => v < 0)
    .sort(([, a], [, b]) => a - b)
    .slice(0, 5);

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/60 z-50 flex justify-end" onClick={onClose}
      >
        <motion.div
          initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
          transition={{ type: 'spring', damping: 25, stiffness: 200 }}
          className="w-full max-w-md h-full bg-bg-surface border-l border-bg-border p-6 overflow-y-auto"
          onClick={e => e.stopPropagation()}
        >
          <div className="flex justify-between items-start mb-6">
            <div>
              <div className="text-[10px] text-text-muted uppercase tracking-widest font-bold mb-1">Broker Profile</div>
              <h2 className="text-2xl font-syne font-bold">{broker.brokerName}</h2>
            </div>
            <button onClick={onClose} className="p-2 bg-bg-base rounded-full hover:bg-bg-elevated transition-colors">
              <X size={18} />
            </button>
          </div>

          {/* Badge */}
          {broker.smartMoneyFlag ? (
            <div className="card p-4 bg-brand-cyan/10 border-brand-cyan/30 flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-full bg-brand-cyan/20 flex items-center justify-center text-brand-cyan"><Target size={20} /></div>
              <div>
                <div className="font-bold text-brand-cyan">Smart Money</div>
                <div className="text-xs text-text-secondary">Win rate ≥ 60% — historically profitable accumulations.</div>
              </div>
            </div>
          ) : broker.retailTrapFlag ? (
            <div className="card p-4 bg-bear-red/10 border-bear-red/30 flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-full bg-bear-red/20 flex items-center justify-center text-bear-red"><TrendingDown size={20} /></div>
              <div>
                <div className="font-bold text-bear-red">Retail Trap Warning</div>
                <div className="text-xs text-text-secondary">Low win rate. Often dumps after accumulating.</div>
              </div>
            </div>
          ) : (
            <div className="card p-4 bg-bg-base/50 border-bg-border flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-full bg-bg-elevated flex items-center justify-center text-text-muted"><Users size={20} /></div>
              <div>
                <div className="font-bold text-text-primary">Neutral</div>
                <div className="text-xs text-text-secondary">No strong directional signal from historical data.</div>
              </div>
            </div>
          )}

          {/* Stats */}
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="card p-4 bg-bg-base/50">
              <div className="text-[10px] text-text-muted uppercase font-bold mb-1">Win Rate</div>
              <div className="text-2xl font-jetbrains font-bold text-bull-green">{broker.winRate}%</div>
            </div>
            <div className="card p-4 bg-bg-base/50">
              <div className="text-[10px] text-text-muted uppercase font-bold mb-1">Reputation</div>
              <div className="text-2xl font-jetbrains font-bold text-brand-gold">{broker.reputationScore}</div>
            </div>
            <div className="card p-4 bg-bg-base/50">
              <div className="text-[10px] text-text-muted uppercase font-bold mb-1">Coordination Index</div>
              <div className="text-2xl font-jetbrains font-bold text-brand-violet">{broker.coordinationIndex}</div>
            </div>
            <div className="card p-4 bg-bg-base/50">
              <div className="text-[10px] text-text-muted uppercase font-bold mb-1">Net Position</div>
              <div className={`text-2xl font-jetbrains font-bold ${broker.netPosition >= 0 ? 'text-bull-green' : 'text-bear-red'}`}>
                {broker.netPosition >= 0 ? '+' : ''}{broker.netPosition.toLocaleString()}
              </div>
            </div>
          </div>

          {/* Focus Stocks */}
          <div className="mb-6">
            <h3 className="font-syne font-bold mb-3 flex items-center gap-2"><Shield size={16} className="text-brand-violet" /> Focus Stocks</h3>
            <div className="flex flex-wrap gap-2">
              {broker.focusStocks.map((s: string) => (
                <span key={s} className="px-3 py-1 bg-bg-base border border-bg-border rounded-full text-xs font-bold">{s}</span>
              ))}
            </div>
          </div>

          {/* Recent Accumulations */}
          {netBuys.length > 0 && (
            <div className="mb-6">
              <h3 className="font-syne font-bold mb-3 flex items-center gap-2"><Zap size={16} className="text-brand-cyan" /> Net Buying</h3>
              <div className="space-y-2">
                {netBuys.map(([sym, qty]) => (
                  <div key={sym} className="flex justify-between items-center p-3 rounded-lg bg-bg-base border border-bg-border/50">
                    <div className="font-bold">{sym}</div>
                    <span className="font-jetbrains text-sm text-bull-green">+{(qty as number).toLocaleString()} qty</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {netSells.length > 0 && (
            <div>
              <h3 className="font-syne font-bold mb-3 flex items-center gap-2"><TrendingDown size={16} className="text-bear-red" /> Net Selling</h3>
              <div className="space-y-2">
                {netSells.map(([sym, qty]) => (
                  <div key={sym} className="flex justify-between items-center p-3 rounded-lg bg-bg-base border border-bg-border/50">
                    <div className="font-bold">{sym}</div>
                    <span className="font-jetbrains text-sm text-bear-red">{(qty as number).toLocaleString()} qty</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

export default function BrokerIntelligenceMap() {
  const { data, isLoading } = useBrokerMap();
  const [sortConfig, setSortConfig] = useState({ key: 'accumulationScore', dir: 'desc' });
  const [search, setSearch] = useState('');
  const [selectedBroker, setSelectedBroker] = useState<any>(null);

  const sortedData = useMemo(() => {
    if (!data?.data) return [];
    let filtered = data.data.filter((d) =>
      d.brokerName.toLowerCase().includes(search.toLowerCase()) ||
      d.brokerId.includes(search)
    );

    filtered.sort((a: any, b: any) => {
      const valA = a[sortConfig.key];
      const valB = b[sortConfig.key];
      if (sortConfig.dir === 'asc') return valA > valB ? 1 : -1;
      return valA < valB ? 1 : -1;
    });

    return filtered;
  }, [data, sortConfig, search]);

  const handleSort = (key: string) => {
    if (sortConfig.key === key) {
      setSortConfig({ key, dir: sortConfig.dir === 'desc' ? 'asc' : 'desc' });
    } else {
      setSortConfig({ key, dir: 'desc' });
    }
  };

  const getHeatmapColor = (netQty: number) => {
    if (netQty === 0) return 'transparent';
    const maxRef = 5000;
    const intensity = Math.min(Math.abs(netQty) / maxRef, 1);
    if (netQty > 0) return `rgba(0, 196, 140, ${0.1 + intensity * 0.5})`;
    return `rgba(255, 77, 79, ${0.1 + intensity * 0.5})`;
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[500px] space-y-4">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-brand-cyan" />
        <p className="text-text-secondary animate-pulse text-sm font-syne uppercase tracking-widest">Compiling Intelligence Map...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="font-syne text-2xl font-bold flex items-center gap-3">
            <Eye className="text-brand-cyan" /> Broker Intelligence Map
          </h1>
          <p className="text-xs text-text-secondary mt-1">Real-time heat grid of broker net positions across top traded stocks.</p>
        </div>
        <div className="flex items-center gap-3">
          {data?.isFallback && <FallbackBanner label={data.dataLabel} />}
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
            <input
              type="text" placeholder="Search broker..." value={search} onChange={e => setSearch(e.target.value)}
              className="input-field pl-9 py-2 text-sm w-full md:w-64"
            />
          </div>
        </div>
      </div>

      <div className="card overflow-x-auto">
        <table className="w-full text-sm text-left">
          <thead>
            <tr className="bg-bg-base/50 border-b border-bg-border">
              <th className="p-3 font-semibold text-text-muted whitespace-nowrap sticky left-0 bg-bg-base z-10 w-56">Broker</th>
              <th className="p-3 font-semibold text-text-muted cursor-pointer hover:text-brand-cyan whitespace-nowrap" onClick={() => handleSort('accumulationScore')}>
                <div className="flex items-center gap-1">Accumulation {sortConfig.key === 'accumulationScore' && (sortConfig.dir === 'desc' ? <ChevronDown size={14} /> : <ChevronUp size={14} />)}</div>
              </th>
              <th className="p-3 font-semibold text-text-muted cursor-pointer hover:text-brand-cyan whitespace-nowrap" onClick={() => handleSort('coordinationIndex')}>
                <div className="flex items-center gap-1">Coord. {sortConfig.key === 'coordinationIndex' && (sortConfig.dir === 'desc' ? <ChevronDown size={14} /> : <ChevronUp size={14} />)}</div>
              </th>
              {data?.columns?.map(col => (
                <th key={col} className="p-3 font-semibold text-text-muted text-center whitespace-nowrap text-xs">{col}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-bg-border/30">
            {sortedData.map((row) => (
              <tr key={row.brokerId} onClick={() => setSelectedBroker(row)} className="hover:bg-bg-elevated/30 cursor-pointer transition-colors group">
                <td className="p-3 sticky left-0 bg-bg-surface group-hover:bg-bg-elevated/80 transition-colors">
                  <div className="flex items-center gap-2">
                    <ReputationRing score={row.reputationScore} />
                    <div>
                      <div className="font-bold flex items-center gap-2">
                        <span className="truncate max-w-[140px]">{row.brokerName}</span>
                        {row.smartMoneyFlag && <span className="text-[8px] px-1.5 py-0.5 rounded bg-brand-cyan/20 text-brand-cyan font-bold border border-brand-cyan/30">SMART</span>}
                        {row.retailTrapFlag && <span className="text-[8px] px-1.5 py-0.5 rounded bg-bear-red/20 text-bear-red font-bold border border-bear-red/30">TRAP</span>}
                      </div>
                      <div className="text-[10px] text-text-muted font-jetbrains">Net: {row.netPosition >= 0 ? '+' : ''}{row.netPosition.toLocaleString()}</div>
                    </div>
                  </div>
                </td>
                <td className="p-3">
                  <div className="w-24 h-2 bg-bg-base rounded-full overflow-hidden">
                    <div className="h-full bg-brand-cyan transition-all" style={{ width: `${row.accumulationScore}%` }} />
                  </div>
                  <div className="text-[10px] text-text-muted mt-1 font-jetbrains">{row.accumulationScore}%</div>
                </td>
                <td className="p-3 font-jetbrains text-xs text-brand-violet">{row.coordinationIndex}</td>
                {data?.columns?.map(col => {
                  const net = row.netPositions[col] || 0;
                  return (
                    <td key={col} className="p-1">
                      <div
                        className="w-full h-8 flex items-center justify-center text-[10px] font-jetbrains rounded transition-colors"
                        style={{ backgroundColor: getHeatmapColor(net), color: net !== 0 ? 'white' : 'rgba(255,255,255,0.2)' }}
                      >
                        {net !== 0 ? (net > 0 ? `+${net}` : net) : '—'}
                      </div>
                    </td>
                  );
                })}
              </tr>
            ))}
            {sortedData.length === 0 && (
              <tr><td colSpan={13} className="p-8 text-center text-text-muted">No broker data available. Market may not have opened yet.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {selectedBroker && <BrokerDrawer broker={selectedBroker} onClose={() => setSelectedBroker(null)} />}
    </div>
  );
}
