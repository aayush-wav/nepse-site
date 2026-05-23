import { useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowRightLeft, Search, X } from 'lucide-react';
import { useScreener } from '../hooks/useNepseData';
import { getPriceColorClass, formatNepaliNumber } from '../utils';

export default function CompareStocks() {
  const { data: allStocks, isLoading } = useScreener({});
  const [selectedSymbols, setSelectedSymbols] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState('');

  const availableStocks = (allStocks || []).filter(s => 
    !selectedSymbols.includes(s.symbol) && 
    (s.symbol.toLowerCase().includes(searchTerm.toLowerCase()) || 
     (s.companyName || '').toLowerCase().includes(searchTerm.toLowerCase()))
  ).slice(0, 5);

  const selectedData = selectedSymbols.map(sym => 
    (allStocks || []).find(s => s.symbol === sym)
  ).filter(Boolean) as any[];

  const addSymbol = (sym: string) => {
    if (selectedSymbols.length < 4 && !selectedSymbols.includes(sym)) {
      setSelectedSymbols([...selectedSymbols, sym]);
      setSearchTerm('');
    }
  };

  const removeSymbol = (sym: string) => {
    setSelectedSymbols(selectedSymbols.filter(s => s !== sym));
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-brand-cyan/20 flex items-center justify-center text-brand-cyan">
            <ArrowRightLeft size={22} />
          </div>
          <div>
            <h1 className="font-syne text-2xl font-bold">Compare Stocks</h1>
            <p className="text-xs text-text-secondary font-medium uppercase tracking-wider">Side-by-side Financial Analysis</p>
          </div>
        </div>

        {/* Search Input */}
        <div className="relative w-full md:w-72">
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
            <input 
              type="text" 
              placeholder={selectedSymbols.length >= 4 ? "Max 4 stocks allowed" : "Search symbol to compare..."}
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              disabled={selectedSymbols.length >= 4}
              className="input-field w-full pl-9 py-2"
            />
          </div>
          
          {/* Dropdown Results */}
          {searchTerm && availableStocks.length > 0 && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-bg-surface border border-bg-border rounded-lg shadow-xl z-50 overflow-hidden">
              {availableStocks.map(s => (
                <button
                  key={s.symbol}
                  onClick={() => addSymbol(s.symbol)}
                  className="w-full text-left px-4 py-2 hover:bg-bg-elevated flex items-center justify-between transition-colors"
                >
                  <span className="font-bold">{s.symbol}</span>
                  <span className="text-xs text-text-muted truncate ml-2">{s.companyName}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {isLoading && <div className="p-12 text-center animate-pulse">Loading market data...</div>}

      {!isLoading && selectedSymbols.length === 0 && (
        <div className="card p-12 text-center flex flex-col items-center justify-center border-dashed">
          <ArrowRightLeft size={48} className="text-text-muted mb-4 opacity-50" />
          <h3 className="text-lg font-bold mb-2">No Stocks Selected</h3>
          <p className="text-sm text-text-secondary">Search and select up to 4 stocks to compare their fundamentals and technicals.</p>
        </div>
      )}

      {selectedData.length > 0 && (
        <div className="card overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-bg-base/50">
              <tr>
                <th className="p-4 text-left font-bold text-text-muted uppercase tracking-wider text-xs">Metric</th>
                {selectedData.map(s => (
                  <th key={s.symbol} className="p-4 min-w-[180px]">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-syne text-xl font-bold text-brand-cyan">{s.symbol}</div>
                        <div className="text-[10px] text-text-secondary font-normal uppercase">{s.sector}</div>
                      </div>
                      <button onClick={() => removeSymbol(s.symbol)} className="p-1.5 hover:bg-bg-elevated rounded-lg text-text-muted hover:text-bear-red transition-colors">
                        <X size={16} />
                      </button>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-bg-border/30">
              {/* Price & Performance */}
              <tr className="bg-bg-elevated/30">
                <td colSpan={5} className="p-2 px-4 text-xs font-bold uppercase tracking-wider text-text-primary">Price & Performance</td>
              </tr>
              <tr>
                <td className="p-4 text-text-secondary">Last Traded Price (LTP)</td>
                {selectedData.map(s => <td key={s.symbol} className="p-4 font-jetbrains font-bold">{formatNepaliNumber(s.ltp)}</td>)}
              </tr>
              <tr>
                <td className="p-4 text-text-secondary">% Change</td>
                {selectedData.map(s => (
                  <td key={s.symbol} className={`p-4 font-jetbrains font-bold ${getPriceColorClass(s.changePercent)}`}>
                    {s.changePercent > 0 ? '+' : ''}{s.changePercent?.toFixed(2)}%
                  </td>
                ))}
              </tr>
              <tr>
                <td className="p-4 text-text-secondary">52 Week High - Low</td>
                {selectedData.map(s => (
                  <td key={s.symbol} className="p-4 font-jetbrains text-xs">
                    <span className="text-bull-green">{formatNepaliNumber(s.week52High)}</span> - <span className="text-bear-red">{formatNepaliNumber(s.week52Low)}</span>
                  </td>
                ))}
              </tr>
              
              {/* Fundamentals */}
              <tr className="bg-bg-elevated/30">
                <td colSpan={5} className="p-2 px-4 text-xs font-bold uppercase tracking-wider text-text-primary">Fundamentals</td>
              </tr>
              <tr>
                <td className="p-4 text-text-secondary">P/E Ratio</td>
                {selectedData.map(s => <td key={s.symbol} className="p-4 font-jetbrains font-medium">{s.peRatio?.toFixed(2) || 'N/A'}</td>)}
              </tr>
              <tr>
                <td className="p-4 text-text-secondary">EPS</td>
                {selectedData.map(s => <td key={s.symbol} className="p-4 font-jetbrains font-medium">{s.eps?.toFixed(2) || 'N/A'}</td>)}
              </tr>
              <tr>
                <td className="p-4 text-text-secondary">P/B Ratio</td>
                {selectedData.map(s => <td key={s.symbol} className="p-4 font-jetbrains font-medium">{s.pbRatio?.toFixed(2) || 'N/A'}</td>)}
              </tr>
              <tr>
                <td className="p-4 text-text-secondary">Book Value</td>
                {selectedData.map(s => <td key={s.symbol} className="p-4 font-jetbrains font-medium">{s.bookValue?.toFixed(2) || 'N/A'}</td>)}
              </tr>
              <tr>
                <td className="p-4 text-text-secondary">Dividend Yield</td>
                {selectedData.map(s => (
                  <td key={s.symbol} className="p-4 font-jetbrains font-medium text-brand-gold">
                    {s.dividendYield ? `${s.dividendYield.toFixed(2)}%` : '-'}
                  </td>
                ))}
              </tr>

              {/* Volume & Market */}
              <tr className="bg-bg-elevated/30">
                <td colSpan={5} className="p-2 px-4 text-xs font-bold uppercase tracking-wider text-text-primary">Volume & Market</td>
              </tr>
              <tr>
                <td className="p-4 text-text-secondary">Volume Today</td>
                {selectedData.map(s => <td key={s.symbol} className="p-4 font-jetbrains font-medium">{formatNepaliNumber(s.volume)}</td>)}
              </tr>
              <tr>
                <td className="p-4 text-text-secondary">Turnover</td>
                {selectedData.map(s => <td key={s.symbol} className="p-4 font-jetbrains font-medium text-brand-cyan">{formatNepaliNumber(s.turnover)}</td>)}
              </tr>
              <tr>
                <td className="p-4 text-text-secondary">Momentum Score</td>
                {selectedData.map(s => (
                  <td key={s.symbol} className="p-4">
                    <div className="w-16 h-1.5 bg-bg-border rounded-full overflow-hidden">
                      <div className="h-full bg-brand-violet" style={{ width: `${Math.min(100, Math.max(0, s.momentumScore))}%` }} />
                    </div>
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
