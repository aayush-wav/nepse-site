import { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Star, Plus, Trash2, Search, ArrowUpDown, TrendingUp, TrendingDown, LayoutGrid, List } from 'lucide-react';
import { useWatchlistStore, useMarketStore } from '../store';
import { formatNepaliNumber, formatPercent, getPriceColorClass, formatVolume } from '../utils';

export default function Watchlist() {
  const navigate = useNavigate();
  const { watchlists, activeWatchlistId, setActiveWatchlist, removeFromWatchlist, addWatchlist } = useWatchlistStore();
  const { stocks } = useMarketStore();
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list');
  const [search, setSearch] = useState('');

  const activeWatchlist = watchlists.find(w => w.id === activeWatchlistId) || watchlists[0];

  const enrichedItems = useMemo(() => {
    if (!activeWatchlist) return [];
    return activeWatchlist.items.map(item => {
      const live = stocks.find(s => s.symbol === item.symbol);
      return {
        ...item,
        ltp: live?.ltp || item.priceWhenAdded,
        changePercent: live?.changePercent || 0,
        volume: live?.volume || 0,
        high: live?.high || 0,
        low: live?.low || 0,
      };
    });
  }, [activeWatchlist, stocks]);

  const filteredItems = enrichedItems.filter(i => 
    i.symbol.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-brand-gold/20 flex items-center justify-center text-brand-gold">
            <Star size={20} className="fill-brand-gold" />
          </div>
          <div>
            <h1 className="font-syne text-2xl font-bold">Watchlist</h1>
            <div className="flex items-center gap-2 mt-1">
              <select 
                value={activeWatchlistId || ''} 
                onChange={(e) => setActiveWatchlist(e.target.value)}
                className="bg-transparent border-none text-xs text-text-secondary font-bold focus:ring-0 cursor-pointer p-0 pr-6"
              >
                {watchlists.map(w => <option key={w.id} value={w.id} className="bg-bg-surface">{w.name}</option>)}
              </select>
              <button className="text-text-muted hover:text-brand-gold transition-colors">
                <Plus size={14} />
              </button>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
            <input 
              type="text" placeholder="Search watchlist..." value={search} onChange={e => setSearch(e.target.value)}
              className="input-field pl-9 py-1.5 text-sm w-48 md:w-64" 
            />
          </div>
          <div className="flex rounded-lg border border-bg-border overflow-hidden">
            <button onClick={() => setViewMode('list')} className={`p-1.5 transition-colors ${viewMode === 'list' ? 'bg-bg-elevated text-brand-cyan' : 'text-text-muted hover:bg-bg-elevated'}`}>
              <List size={18} />
            </button>
            <button onClick={() => setViewMode('grid')} className={`p-1.5 transition-colors ${viewMode === 'grid' ? 'bg-bg-elevated text-brand-cyan' : 'text-text-muted hover:bg-bg-elevated'}`}>
              <LayoutGrid size={18} />
            </button>
          </div>
        </div>
      </div>

      {viewMode === 'list' ? (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-bg-base/30">
                <tr>
                  <th className="table-header">Symbol</th>
                  <th className="table-header text-right">LTP</th>
                  <th className="table-header text-right">Change %</th>
                  <th className="table-header text-right">Day High</th>
                  <th className="table-header text-right">Day Low</th>
                  <th className="table-header text-right">Volume</th>
                  <th className="table-header text-center">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredItems.map((item) => (
                  <tr key={item.symbol} onClick={() => navigate(`/stock/${item.symbol}`)} className="border-b border-bg-border/30 hover:bg-bg-elevated/50 cursor-pointer transition-colors table-row-zebra">
                    <td className="table-cell">
                      <div className="font-bold text-text-primary">{item.symbol}</div>
                      <div className="text-[10px] text-text-muted">Added: {new Date(item.dateAdded).toLocaleDateString()}</div>
                    </td>
                    <td className="table-cell text-right font-jetbrains font-medium">{formatNepaliNumber(item.ltp)}</td>
                    <td className={`table-cell text-right font-jetbrains font-bold ${getPriceColorClass(item.changePercent)}`}>
                      {formatPercent(item.changePercent)}
                    </td>
                    <td className="table-cell text-right font-jetbrains text-text-secondary">{formatNepaliNumber(item.high)}</td>
                    <td className="table-cell text-right font-jetbrains text-text-secondary">{formatNepaliNumber(item.low)}</td>
                    <td className="table-cell text-right font-jetbrains text-text-secondary">{formatVolume(item.volume)}</td>
                    <td className="table-cell">
                      <div className="flex justify-center">
                        <button 
                          onClick={(e) => { e.stopPropagation(); removeFromWatchlist(activeWatchlist.id, item.symbol); }}
                          className="p-1.5 hover:bg-bg-elevated rounded-lg text-text-muted hover:text-bear-red transition-colors"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {filteredItems.length === 0 && (
                  <tr>
                    <td colSpan={7} className="p-20 text-center text-text-muted">
                      Your watchlist is empty. Search for a stock and click the star icon to add it.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredItems.map((item) => (
            <motion.div 
              key={item.symbol} 
              layout 
              onClick={() => navigate(`/stock/${item.symbol}`)}
              className="card p-4 hover:border-brand-gold/30 transition-all cursor-pointer group relative"
            >
              <button 
                onClick={(e) => { e.stopPropagation(); removeFromWatchlist(activeWatchlist.id, item.symbol); }}
                className="absolute top-2 right-2 p-1.5 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-bear-red/10 rounded-lg text-bear-red"
              >
                <Trash2 size={12} />
              </button>
              <div className="flex items-center justify-between mb-3">
                <div className="font-syne font-bold text-lg text-text-primary group-hover:text-brand-gold transition-colors">{item.symbol}</div>
                <div className={`font-jetbrains text-xs font-bold ${getPriceColorClass(item.changePercent)}`}>
                  {formatPercent(item.changePercent)}
                </div>
              </div>
              <div className="flex items-end justify-between">
                <div className="font-jetbrains text-2xl font-bold text-text-primary">{formatNepaliNumber(item.ltp)}</div>
                <div className="flex flex-col items-end">
                  <span className="text-[10px] text-text-muted">H: {formatNepaliNumber(item.high)}</span>
                  <span className="text-[10px] text-text-muted">L: {formatNepaliNumber(item.low)}</span>
                </div>
              </div>
              <div className="mt-4 h-1 w-full bg-bg-base rounded-full overflow-hidden">
                <div 
                  className={`h-full ${item.changePercent >= 0 ? 'bg-bull-green' : 'bg-bear-red'}`} 
                  style={{ width: '60%' }} 
                />
              </div>
            </motion.div>
          ))}
          <button className="card border-dashed p-8 flex flex-col items-center justify-center gap-2 text-text-muted hover:text-brand-gold hover:border-brand-gold/50 transition-all">
            <Plus size={24} />
            <span className="text-sm font-medium">Add to Watchlist</span>
          </button>
        </div>
      )}
    </div>
  );
}
