import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Briefcase, Plus, TrendingUp, PieChart, History, Trash2, X, Banknote, Wallet, Loader2, Search } from 'lucide-react';
import { usePortfolioStore } from '../store';
import { useCompanyList, useLiveTrading } from '../hooks/useNepseData';
import { formatNPR, formatPercent, getPriceColorClass, formatNepaliNumber } from '../utils';
import toast from 'react-hot-toast';

function AddTransactionModal({ portfolioId, onClose }: { portfolioId: string; onClose: () => void }) {
  const { addTransaction } = usePortfolioStore();
  const { data: companies } = useCompanyList();
  const [type, setType] = useState<'BUY' | 'SELL' | 'BONUS' | 'DIVIDEND'>('BUY');
  const [symbolQuery, setSymbolQuery] = useState('');
  const [symbol, setSymbol] = useState('');
  const [qty, setQty] = useState('');
  const [rate, setRate] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [showDropdown, setShowDropdown] = useState(false);

  const filtered = useMemo(() => {
    if (!symbolQuery || !companies) return [];
    return (companies as any[]).filter((c: any) =>
      c.symbol?.toLowerCase().includes(symbolQuery.toLowerCase()) ||
      (c.securityName || c.companyName || '').toLowerCase().includes(symbolQuery.toLowerCase())
    ).slice(0, 8);
  }, [symbolQuery, companies]);

  const grossAmount = Number(qty) * Number(rate);
  const brokerFee = grossAmount > 0 ? Math.max(10, grossAmount * 0.004) : 0;
  const sebonFee = grossAmount * 0.00015;
  const dpFee = 25;
  const totalFees = type === 'BUY' ? brokerFee + sebonFee + dpFee : brokerFee + sebonFee + dpFee;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!symbol) { toast.error('Select a stock symbol'); return; }
    if (!qty || Number(qty) <= 0) { toast.error('Enter a valid quantity'); return; }
    if ((type === 'BUY' || type === 'SELL') && (!rate || Number(rate) <= 0)) { toast.error('Enter a valid rate'); return; }
    addTransaction(portfolioId, {
      date, symbol: symbol.toUpperCase(), type,
      qty: Number(qty), rate: Number(rate),
      fees: type === 'BONUS' || type === 'DIVIDEND' ? 0 : Math.round(totalFees * 100) / 100,
    });
    toast.success(`${type} transaction added for ${symbol}`);
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70">
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
        className="card w-full max-w-md border border-bg-border">
        <div className="flex items-center justify-between p-5 border-b border-bg-border/50">
          <h3 className="font-syne font-bold text-lg">Add Transaction</h3>
          <button onClick={onClose} className="p-1.5 hover:bg-bg-elevated rounded-lg text-text-muted transition-colors"><X size={18} /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div className="grid grid-cols-4 gap-1 p-1 bg-bg-base rounded-xl">
            {(['BUY', 'SELL', 'BONUS', 'DIVIDEND'] as const).map(t => (
              <button key={t} type="button" onClick={() => setType(t)}
                className={`py-1.5 rounded-lg text-xs font-bold transition-all ${type === t
                  ? t === 'BUY' ? 'bg-bull-green text-bg-base' : t === 'SELL' ? 'bg-bear-red text-white' : 'bg-brand-cyan text-bg-base'
                  : 'text-text-muted hover:text-text-primary'}`}>{t}</button>
            ))}
          </div>
          <div className="relative">
            <label className="text-[10px] uppercase text-text-muted tracking-wider mb-1 block">Symbol</label>
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
              <input value={symbol || symbolQuery} onChange={e => { setSymbolQuery(e.target.value); setSymbol(''); setShowDropdown(true); }}
                onFocus={() => setShowDropdown(true)}
                placeholder="Search stock..." className="input-field w-full pl-8 text-sm" />
            </div>
            {showDropdown && filtered.length > 0 && (
              <div className="absolute z-10 w-full top-full mt-1 card border-bg-border shadow-xl max-h-48 overflow-y-auto">
                {filtered.map((c: any) => (
                  <button key={c.symbol} type="button" onClick={() => { setSymbol(c.symbol); setSymbolQuery(c.symbol); setShowDropdown(false); }}
                    className="w-full flex items-center justify-between px-3 py-2 hover:bg-bg-elevated text-left transition-colors">
                    <span className="font-bold text-sm">{c.symbol}</span>
                    <span className="text-xs text-text-muted truncate max-w-[180px]">{c.securityName || c.companyName}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] uppercase text-text-muted tracking-wider mb-1 block">Quantity</label>
              <input type="number" min="1" value={qty} onChange={e => setQty(e.target.value)} placeholder="0" className="input-field w-full text-sm" />
            </div>
            {(type === 'BUY' || type === 'SELL') && (
              <div>
                <label className="text-[10px] uppercase text-text-muted tracking-wider mb-1 block">Rate (Rs.)</label>
                <input type="number" min="0" step="0.01" value={rate} onChange={e => setRate(e.target.value)} placeholder="0.00" className="input-field w-full text-sm" />
              </div>
            )}
          </div>
          <div>
            <label className="text-[10px] uppercase text-text-muted tracking-wider mb-1 block">Date</label>
            <input type="date" value={date} onChange={e => setDate(e.target.value)} className="input-field w-full text-sm" />
          </div>
          {grossAmount > 0 && (type === 'BUY' || type === 'SELL') && (
            <div className="bg-bg-base rounded-xl p-3 space-y-1 text-xs font-jetbrains">
              <div className="flex justify-between text-text-muted"><span>Gross Amount</span><span>Rs. {formatNepaliNumber(grossAmount)}</span></div>
              <div className="flex justify-between text-text-muted"><span>Broker Fee</span><span>Rs. {formatNepaliNumber(brokerFee)}</span></div>
              <div className="flex justify-between text-text-muted"><span>SEBON + DP</span><span>Rs. {formatNepaliNumber(sebonFee + dpFee)}</span></div>
              <div className="flex justify-between font-bold text-text-primary border-t border-bg-border/50 pt-1 mt-1">
                <span>Total {type === 'BUY' ? 'Cost' : 'Receivable'}</span>
                <span className={type === 'BUY' ? 'text-bear-red' : 'text-bull-green'}>
                  Rs. {formatNepaliNumber(type === 'BUY' ? grossAmount + totalFees : grossAmount - totalFees)}
                </span>
              </div>
            </div>
          )}
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary flex-1 py-2 text-sm">Cancel</button>
            <button type="submit" className="btn-primary flex-1 py-2 text-sm">Add Transaction</button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}

export default function Portfolio() {
  const { portfolios, activePortfolioId, addPortfolio, removePortfolio, setActivePortfolio, removeHolding, removeTransaction } = usePortfolioStore();
  const { data: liveData } = useLiveTrading();
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isAddPortfolioOpen, setIsAddPortfolioOpen] = useState(false);
  const [newPortfolioName, setNewPortfolioName] = useState('');
  const [activeView, setActiveView] = useState<'holdings' | 'history' | 'analysis'>('holdings');

  const activePortfolio = portfolios.find(p => p.id === activePortfolioId) || portfolios[0];

  const livePriceMap = useMemo(() => {
    const map: Record<string, number> = {};
    if (liveData) {
      (liveData as any[]).forEach((s: any) => {
        const sym = s.symbol || s.stockSymbol;
        const price = s.lastTradedPrice || s.ltp || 0;
        if (sym) map[sym] = price;
      });
    }
    return map;
  }, [liveData]);

  const stats = useMemo(() => {
    let totalInvested = 0, totalValue = 0;
    activePortfolio.holdings.forEach(h => {
      const ltp = livePriceMap[h.symbol] || h.avgPurchasePrice;
      totalInvested += h.investedAmount || h.quantity * h.avgPurchasePrice;
      totalValue += h.quantity * ltp;
    });
    const totalProfit = totalValue - totalInvested;
    const profitPct = totalInvested > 0 ? (totalProfit / totalInvested) * 100 : 0;
    return { totalInvested, totalValue, totalProfit, profitPct };
  }, [activePortfolio, livePriceMap]);

  function handleAddPortfolio() {
    if (!newPortfolioName.trim()) return;
    addPortfolio(newPortfolioName.trim());
    setNewPortfolioName('');
    setIsAddPortfolioOpen(false);
    toast.success('Portfolio created');
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-brand-cyan/20 flex items-center justify-center text-brand-cyan"><Briefcase size={20} /></div>
          <div>
            <h1 className="font-syne text-2xl font-bold">My Portfolio</h1>
            <div className="flex items-center gap-2 mt-1">
              <select value={activePortfolioId || ''} onChange={e => setActivePortfolio(e.target.value)}
                className="bg-transparent border-none text-xs text-text-secondary font-bold focus:ring-0 cursor-pointer p-0 pr-6">
                {portfolios.map(p => <option key={p.id} value={p.id} className="bg-bg-surface">{p.name}</option>)}
              </select>
              <button onClick={() => setIsAddPortfolioOpen(v => !v)} className="text-text-muted hover:text-brand-cyan transition-colors"><Plus size={14} /></button>
              {portfolios.length > 1 && (
                <button onClick={() => { removePortfolio(activePortfolio.id); toast.success('Portfolio removed'); }}
                  className="text-text-muted hover:text-bear-red transition-colors"><Trash2 size={12} /></button>
              )}
            </div>
            {isAddPortfolioOpen && (
              <div className="flex items-center gap-2 mt-2">
                <input value={newPortfolioName} onChange={e => setNewPortfolioName(e.target.value)}
                  placeholder="Portfolio name..." className="input-field text-xs py-1 px-2" onKeyDown={e => e.key === 'Enter' && handleAddPortfolio()} />
                <button onClick={handleAddPortfolio} className="btn-primary text-xs py-1 px-3">Add</button>
              </div>
            )}
          </div>
        </div>
        <button onClick={() => setIsAddModalOpen(true)} className="btn-primary py-2 px-4 flex items-center gap-2 text-sm w-fit">
          <Plus size={16} /> Add Transaction
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="card p-5 border-l-4 border-brand-cyan">
          <div className="text-[10px] text-text-muted uppercase tracking-wider mb-1 flex items-center gap-1"><Wallet size={12} /> Total Value</div>
          <div className="font-jetbrains text-2xl font-bold text-text-primary">{formatNPR(stats.totalValue)}</div>
          <div className="text-[10px] text-text-secondary mt-1">Invested: {formatNPR(stats.totalInvested)}</div>
        </div>
        <div className="card p-5 border-l-4 border-bull-green">
          <div className="text-[10px] text-text-muted uppercase tracking-wider mb-1 flex items-center gap-1"><TrendingUp size={12} className="text-bull-green" /> Total P/L</div>
          <div className={`font-jetbrains text-2xl font-bold ${getPriceColorClass(stats.totalProfit)}`}>{stats.totalProfit >= 0 ? '+' : ''}{formatNPR(stats.totalProfit)}</div>
          <div className={`font-jetbrains text-xs font-bold ${getPriceColorClass(stats.profitPct)} mt-1`}>{stats.profitPct >= 0 ? '↑' : '↓'} {formatPercent(stats.profitPct)}</div>
        </div>
        <div className="card p-5 border-l-4 border-brand-gold">
          <div className="text-[10px] text-text-muted uppercase tracking-wider mb-1 flex items-center gap-1"><Banknote size={12} className="text-brand-gold" /> Holdings</div>
          <div className="font-jetbrains text-2xl font-bold text-text-primary">{activePortfolio.holdings.length}</div>
          <div className="text-[10px] text-text-secondary mt-1">Unique stocks</div>
        </div>
        <div className="card p-5 border-l-4 border-brand-violet">
          <div className="text-[10px] text-text-muted uppercase tracking-wider mb-1 flex items-center gap-1"><PieChart size={12} className="text-brand-violet" /> Transactions</div>
          <div className="font-jetbrains text-2xl font-bold text-text-primary">{activePortfolio.transactions.length}</div>
          <div className="text-[10px] text-text-secondary mt-1">Total trades</div>
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex items-center gap-6 border-b border-bg-border/50 px-2">
          {([{ id: 'holdings', label: 'Holdings', icon: Briefcase }, { id: 'history', label: 'History', icon: History }, { id: 'analysis', label: 'Analysis', icon: PieChart }] as const).map(tab => (
            <button key={tab.id} onClick={() => setActiveView(tab.id)}
              className={`flex items-center gap-2 py-3 text-sm font-medium relative transition-colors ${activeView === tab.id ? 'text-brand-cyan' : 'text-text-secondary hover:text-text-primary'}`}>
              <tab.icon size={16} /> {tab.label}
              {activeView === tab.id && <motion.div layoutId="portTab" className="absolute bottom-0 left-0 right-0 h-0.5 bg-brand-cyan shadow-glow-cyan" />}
            </button>
          ))}
        </div>

        <AnimatePresence mode="wait">
          <motion.div key={activeView} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.2 }} className="card overflow-hidden">
            {activeView === 'holdings' && (
              activePortfolio.holdings.length === 0 ? (
                <div className="p-20 text-center text-text-muted flex flex-col items-center gap-3">
                  <Briefcase size={40} className="opacity-20" />
                  <p>No holdings yet. Add your first transaction to get started.</p>
                  <button onClick={() => setIsAddModalOpen(true)} className="btn-primary py-2 px-6 text-xs">Add Transaction</button>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-bg-base/30">
                      <tr>
                        <th className="table-header">Symbol</th>
                        <th className="table-header text-right">Qty</th>
                        <th className="table-header text-right">Avg Buy</th>
                        <th className="table-header text-right">LTP</th>
                        <th className="table-header text-right">Invested</th>
                        <th className="table-header text-right">Value</th>
                        <th className="table-header text-right">P/L</th>
                        <th className="table-header text-right">P/L %</th>
                        <th className="table-header text-center">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {activePortfolio.holdings.map(h => {
                        const ltp = livePriceMap[h.symbol] || h.avgPurchasePrice;
                        const invested = h.investedAmount || h.quantity * h.avgPurchasePrice;
                        const value = h.quantity * ltp;
                        const pl = value - invested;
                        const plPct = invested > 0 ? (pl / invested) * 100 : 0;
                        const isLive = !!livePriceMap[h.symbol];
                        return (
                          <tr key={h.symbol} className="border-b border-bg-border/30 hover:bg-bg-elevated/50 transition-colors">
                            <td className="table-cell">
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-text-primary">{h.symbol}</span>
                                {isLive && <span className="w-1.5 h-1.5 rounded-full bg-bull-green animate-pulse" title="Live price" />}
                              </div>
                            </td>
                            <td className="table-cell text-right font-jetbrains">{h.quantity.toLocaleString()}</td>
                            <td className="table-cell text-right font-jetbrains text-text-secondary">{formatNepaliNumber(h.avgPurchasePrice)}</td>
                            <td className="table-cell text-right font-jetbrains font-medium">{formatNepaliNumber(ltp)}</td>
                            <td className="table-cell text-right font-jetbrains text-text-secondary">{formatNepaliNumber(invested)}</td>
                            <td className="table-cell text-right font-jetbrains text-text-primary">{formatNepaliNumber(value)}</td>
                            <td className={`table-cell text-right font-jetbrains font-bold ${getPriceColorClass(pl)}`}>{pl >= 0 ? '+' : ''}{formatNepaliNumber(pl)}</td>
                            <td className={`table-cell text-right font-jetbrains font-bold ${getPriceColorClass(plPct)}`}>{plPct >= 0 ? '↑' : '↓'} {formatPercent(plPct)}</td>
                            <td className="table-cell">
                              <div className="flex items-center justify-center gap-2">
                                <button onClick={() => setIsAddModalOpen(true)} className="p-1.5 hover:bg-bg-elevated rounded-lg text-text-muted hover:text-brand-cyan transition-colors" title="Add more transactions">
                                  <Plus size={14} />
                                </button>
                                <button onClick={() => { removeHolding(activePortfolio.id, h.symbol); toast.success(`Removed ${h.symbol}`); }}
                                  className="p-1.5 hover:bg-bg-elevated rounded-lg text-text-muted hover:text-bear-red transition-colors" title="Remove holding">
                                  <Trash2 size={14} />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )
            )}

            {activeView === 'history' && (
              activePortfolio.transactions.length === 0 ? (
                <div className="p-20 text-center text-text-muted">No transaction history found.</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-bg-base/30">
                      <tr>
                        <th className="table-header">Date</th>
                        <th className="table-header">Type</th>
                        <th className="table-header">Symbol</th>
                        <th className="table-header text-right">Qty</th>
                        <th className="table-header text-right">Rate</th>
                        <th className="table-header text-right">Amount</th>
                        <th className="table-header text-right">Fees</th>
                        <th className="table-header text-center">Del</th>
                      </tr>
                    </thead>
                    <tbody>
                      {[...activePortfolio.transactions].reverse().map((t) => (
                        <tr key={t.id} className="border-b border-bg-border/30 hover:bg-bg-elevated/50 transition-colors">
                          <td className="table-cell font-jetbrains text-xs">{t.date}</td>
                          <td className="table-cell">
                            <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded ${t.type === 'BUY' ? 'bg-bull-green/10 text-bull-green' : t.type === 'SELL' ? 'bg-bear-red/10 text-bear-red' : 'bg-brand-gold/10 text-brand-gold'}`}>{t.type}</span>
                          </td>
                          <td className="table-cell font-bold">{t.symbol}</td>
                          <td className="table-cell text-right font-jetbrains">{t.qty.toLocaleString()}</td>
                          <td className="table-cell text-right font-jetbrains">{t.rate > 0 ? formatNepaliNumber(t.rate) : '—'}</td>
                          <td className="table-cell text-right font-jetbrains text-text-primary">{t.rate > 0 ? formatNepaliNumber(t.qty * t.rate) : '—'}</td>
                          <td className="table-cell text-right font-jetbrains text-bear-red">{t.fees > 0 ? formatNepaliNumber(t.fees) : '—'}</td>
                          <td className="table-cell text-center">
                            <button onClick={() => { removeTransaction(activePortfolio.id, t.id); toast.success('Transaction removed'); }}
                              className="p-1 hover:bg-bg-elevated rounded text-text-muted hover:text-bear-red transition-colors">
                              <Trash2 size={12} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )
            )}

            {activeView === 'analysis' && (
              <div className="p-6 space-y-6">
                {activePortfolio.holdings.length === 0 ? (
                  <div className="py-16 text-center text-text-muted italic text-sm">Add holdings to see analysis.</div>
                ) : (
                  <>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {(() => {
                        const ranked = activePortfolio.holdings.map(h => {
                          const ltp = livePriceMap[h.symbol] || h.avgPurchasePrice;
                          const invested = h.investedAmount || h.quantity * h.avgPurchasePrice;
                          const plPct = invested > 0 ? ((h.quantity * ltp - invested) / invested) * 100 : 0;
                          return { ...h, plPct };
                        }).sort((a, b) => b.plPct - a.plPct);
                        const best = ranked[0];
                        const worst = ranked[ranked.length - 1];
                        const biggest = [...activePortfolio.holdings].sort((a, b) => {
                          const va = (livePriceMap[a.symbol] || a.avgPurchasePrice) * a.quantity;
                          const vb = (livePriceMap[b.symbol] || b.avgPurchasePrice) * b.quantity;
                          return vb - va;
                        })[0];
                        return [
                          { label: 'Best Performer', symbol: best?.symbol || '—', gain: best ? formatPercent(best.plPct) : '—', color: 'text-bull-green' },
                          { label: 'Worst Performer', symbol: worst?.symbol || '—', gain: worst ? formatPercent(worst.plPct) : '—', color: 'text-bear-red' },
                          { label: 'Largest Position', symbol: biggest?.symbol || '—', gain: biggest ? formatNPR((livePriceMap[biggest.symbol] || biggest.avgPurchasePrice) * biggest.quantity) : '—', color: 'text-brand-cyan' },
                        ];
                      })().map((item, i) => (
                        <div key={i} className="card p-5 text-center">
                          <div className="text-[10px] text-text-muted uppercase tracking-wider mb-2">{item.label}</div>
                          <div className="font-syne text-2xl font-black text-text-primary">{item.symbol}</div>
                          <div className={`font-jetbrains font-bold mt-1 ${item.color}`}>{item.gain}</div>
                        </div>
                      ))}
                    </div>
                    <div className="card p-5">
                      <h4 className="font-syne font-bold mb-4 text-sm">Portfolio Allocation</h4>
                      <div className="space-y-3">
                        {activePortfolio.holdings.map(h => {
                          const ltp = livePriceMap[h.symbol] || h.avgPurchasePrice;
                          const value = h.quantity * ltp;
                          const pct = stats.totalValue > 0 ? (value / stats.totalValue) * 100 : 0;
                          return (
                            <div key={h.symbol} className="flex items-center gap-3">
                              <span className="font-bold text-sm w-16 shrink-0">{h.symbol}</span>
                              <div className="flex-1 bg-bg-base rounded-full h-2">
                                <div className="h-2 rounded-full bg-brand-cyan transition-all duration-500" style={{ width: `${pct}%` }} />
                              </div>
                              <span className="font-jetbrains text-xs text-text-muted w-12 text-right">{pct.toFixed(1)}%</span>
                              <span className="font-jetbrains text-xs text-text-secondary w-24 text-right">{formatNPR(value)}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </>
                )}
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      <AnimatePresence>
        {isAddModalOpen && <AddTransactionModal portfolioId={activePortfolio.id} onClose={() => setIsAddModalOpen(false)} />}
      </AnimatePresence>
    </div>
  );
}
