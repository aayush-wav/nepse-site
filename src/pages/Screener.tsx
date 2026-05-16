import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Search, SlidersHorizontal, ChevronDown, Check, X, Play, RotateCcw, Save } from 'lucide-react';
import { useLiveTrading, useCompanyList } from '../hooks/useNepseData';

const initialFilters: FilterState = {
  sector: [],
  minPrice: '',
  maxPrice: '',
  minChange: '',
  maxChange: '',
  minPE: '',
  maxPE: '',
  minEPS: '',
  minDividend: '',
};

export default function Screener() {
  const navigate = useNavigate();
  const { data: rawData, isLoading: loadingLive } = useLiveTrading();
  const { data: companies, isLoading: loadingCompanies } = useCompanyList();
  
  const stocks = useMemo(() => {
    if (!rawData) return [];
    
    const companyData = companies || [];
    const sectorMap = new Map();
    companyData.forEach((c: any) => sectorMap.set(c.symbol, c.sectorName));

    return rawData.map((s: any) => {
      const scripSector = sectorMap.get(s.symbol) || s.sectorName || s.sector || 'Others';
      
      return {
        symbol: s.symbol, 
        companyName: s.securityName || s.companyName || s.symbol,
        sector: scripSector,
        ltp: s.lastTradedPrice || s.ltp || 0, 
        previousClose: s.previousClose || 0,
        changePercent: s.percentageChange || 0,
        volume: s.totalTradeQuantity || s.volume || 0,
        turnover: s.totalTradeValue || s.totalTurnover || s.turnover || 0,
        marketCap: s.marketCap || 0,
        eps: s.eps || 0, 
        peRatio: s.peRatio || 0, 
        bookValue: s.bookValue || 0,
        pbRatio: s.pbRatio || 0, 
        dividendYield: s.dividendYield || 0,
      };
    });
  }, [rawData, companies]);

  const sectors = useMemo(() => {
    const s = new Set(stocks.map(st => st.sector).filter(Boolean));
    return Array.from(s).sort();
  }, [stocks]);

  const [filters, setFilters] = useState<FilterState>(initialFilters);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  const filteredResults = useMemo(() => {
    let result = [...stocks];

    if (filters.sector.length > 0) {
      result = result.filter(s => filters.sector.includes(s.sector));
    }
    if (filters.minPrice) {
      result = result.filter(s => s.ltp >= parseFloat(filters.minPrice));
    }
    if (filters.maxPrice) {
      result = result.filter(s => s.ltp <= parseFloat(filters.maxPrice));
    }
    if (filters.minChange) {
      result = result.filter(s => s.changePercent >= parseFloat(filters.minChange));
    }
    if (filters.maxChange) {
      result = result.filter(s => s.changePercent <= parseFloat(filters.maxChange));
    }
    if (filters.minPE) {
      result = result.filter(s => (s.peRatio || 0) >= parseFloat(filters.minPE));
    }
    if (filters.maxPE) {
      result = result.filter(s => (s.peRatio || 0) <= parseFloat(filters.maxPE));
    }
    if (filters.minEPS) {
      result = result.filter(s => (s.eps || 0) >= parseFloat(filters.minEPS));
    }
    if (filters.minDividend) {
      result = result.filter(s => (s.dividendYield || 0) >= parseFloat(filters.minDividend));
    }

    return result;
  }, [stocks, filters]);

  const resetFilters = () => {
    setFilters(initialFilters);
  };

  const toggleSector = (sector: string) => {
    setFilters(f => ({
      ...f,
      sector: f.sector.includes(sector) 
        ? f.sector.filter(s => s !== sector)
        : [...f.sector, sector]
    }));
  };

  return (
    <div className="flex h-[calc(100vh-140px)] gap-6 overflow-hidden">
      {/* Filters Sidebar */}
      <aside className={`card flex flex-col transition-all duration-300 ${isSidebarOpen ? 'w-80' : 'w-0 opacity-0 pointer-events-none'}`}>
        <div className="p-4 border-b border-bg-border flex items-center justify-between bg-bg-base/30">
          <h2 className="font-syne font-bold flex items-center gap-2">
            <SlidersHorizontal size={16} className="text-brand-cyan" /> Filters
          </h2>
          <button onClick={resetFilters} className="text-[10px] text-text-muted hover:text-brand-cyan flex items-center gap-1 uppercase tracking-wider font-bold">
            <RotateCcw size={12} /> Reset
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-6 scrollbar-thin">
          {/* Sector Multi-select */}
          <div className="space-y-3">
            <label className="text-xs font-bold text-text-secondary uppercase tracking-wider">Sectors</label>
            <div className="flex flex-wrap gap-2">
              {sectors.map(s => (
                <button
                  key={s}
                  onClick={() => toggleSector(s)}
                  className={`px-2 py-1 text-[10px] rounded border transition-all ${filters.sector.includes(s) ? 'bg-brand-cyan border-brand-cyan text-bg-base font-bold' : 'border-bg-border text-text-muted hover:border-text-muted'}`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          {/* Price Range */}
          <div className="space-y-3">
            <label className="text-xs font-bold text-text-secondary uppercase tracking-wider">Price Range (NPR)</label>
            <div className="grid grid-cols-2 gap-2">
              <input 
                type="number" placeholder="Min" value={filters.minPrice}
                onChange={e => setFilters({...filters, minPrice: e.target.value})}
                className="input-field text-xs py-1.5"
              />
              <input 
                type="number" placeholder="Max" value={filters.maxPrice}
                onChange={e => setFilters({...filters, maxPrice: e.target.value})}
                className="input-field text-xs py-1.5"
              />
            </div>
          </div>

          {/* Change Range */}
          <div className="space-y-3">
            <label className="text-xs font-bold text-text-secondary uppercase tracking-wider">Change % Range</label>
            <div className="grid grid-cols-2 gap-2">
              <input 
                type="number" placeholder="Min" value={filters.minChange}
                onChange={e => setFilters({...filters, minChange: e.target.value})}
                className="input-field text-xs py-1.5"
              />
              <input 
                type="number" placeholder="Max" value={filters.maxChange}
                onChange={e => setFilters({...filters, maxChange: e.target.value})}
                className="input-field text-xs py-1.5"
              />
            </div>
          </div>

          {/* Valuation */}
          <div className="space-y-3">
            <label className="text-xs font-bold text-text-secondary uppercase tracking-wider">Valuation (P/E)</label>
            <div className="grid grid-cols-2 gap-2">
              <input 
                type="number" placeholder="Min P/E" value={filters.minPE}
                onChange={e => setFilters({...filters, minPE: e.target.value})}
                className="input-field text-xs py-1.5"
              />
              <input 
                type="number" placeholder="Max P/E" value={filters.maxPE}
                onChange={e => setFilters({...filters, maxPE: e.target.value})}
                className="input-field text-xs py-1.5"
              />
            </div>
          </div>

          {/* Performance */}
          <div className="space-y-3">
            <label className="text-xs font-bold text-text-secondary uppercase tracking-wider">Performance (EPS)</label>
            <input 
              type="number" placeholder="Min EPS" value={filters.minEPS}
              onChange={e => setFilters({...filters, minEPS: e.target.value})}
              className="input-field text-xs py-1.5 w-full"
            />
          </div>

          {/* Dividend */}
          <div className="space-y-3">
            <label className="text-xs font-bold text-text-secondary uppercase tracking-wider">Min Dividend Yield (%)</label>
            <input 
              type="number" placeholder="e.g. 5" value={filters.minDividend}
              onChange={e => setFilters({...filters, minDividend: e.target.value})}
              className="input-field text-xs py-1.5 w-full"
            />
          </div>
        </div>

        <div className="p-4 border-t border-bg-border bg-bg-base/30">
          <button 
            onClick={resetFilters}
            className="btn-secondary w-full py-2 flex items-center justify-center gap-2"
          >
            <RotateCcw size={16} /> Reset All Filters
          </button>
        </div>
      </aside>

      {/* Results Main Area */}
      <main className="flex-1 flex flex-col gap-4 overflow-hidden">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="p-2 hover:bg-bg-elevated rounded-lg border border-bg-border text-text-secondary transition-colors"
            >
              <SlidersHorizontal size={18} />
            </button>
            <div>
              <h1 className="font-syne text-xl font-bold">Stock Screener</h1>
              <p className="text-xs text-text-secondary">{filteredResults.length} companies matched your criteria</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button className="btn-secondary py-1.5 px-3 flex items-center gap-2 text-xs">
              <Save size={14} /> Save Filter
            </button>
            <div className="h-8 w-px bg-bg-border mx-1" />
            <select className="input-field text-xs py-1.5">
              <option>Sort by: Market Cap</option>
              <option>Sort by: LTP</option>
              <option>Sort by: Change %</option>
              <option>Sort by: P/E Ratio</option>
              <option>Sort by: EPS</option>
            </select>
          </div>
        </div>

        <div className="card flex-1 overflow-hidden flex flex-col">
          <div className="flex-1 overflow-auto scrollbar-thin">
            <table className="w-full text-sm border-collapse">
              <thead className="sticky top-0 z-10 bg-bg-surface">
                <tr>
                  <th className="table-header w-12">#</th>
                  <th className="table-header">Symbol</th>
                  <th className="table-header">LTP</th>
                  <th className="table-header">Change %</th>
                  <th className="table-header">P/E</th>
                  <th className="table-header">EPS</th>
                  <th className="table-header">P/B</th>
                  <th className="table-header">Dividend</th>
                  <th className="table-header text-right">Market Cap</th>
                </tr>
              </thead>
              <tbody>
                {filteredResults.map((s, i) => (
                  <tr 
                    key={s.symbol}
                    onClick={() => navigate(`/stock/${s.symbol}`)}
                    className="border-b border-bg-border/30 hover:bg-bg-elevated/50 cursor-pointer transition-colors table-row-zebra"
                  >
                    <td className="table-cell text-text-muted font-jetbrains text-xs">{i + 1}</td>
                    <td className="table-cell">
                      <div className="font-bold text-text-primary">{s.symbol}</div>
                      <div className="text-[10px] text-text-muted truncate max-w-[150px]">{s.sector}</div>
                    </td>
                    <td className="table-cell font-jetbrains">{formatNepaliNumber(s.ltp)}</td>
                    <td className={`table-cell font-jetbrains font-bold ${getPriceColorClass(s.changePercent)}`}>
                      {formatPercent(s.changePercent)}
                    </td>
                    <td className="table-cell font-jetbrains text-text-secondary">{s.peRatio || '—'}</td>
                    <td className="table-cell font-jetbrains text-text-secondary">{s.eps || '—'}</td>
                    <td className="table-cell font-jetbrains text-text-secondary">{s.pbRatio || '—'}</td>
                    <td className="table-cell font-jetbrains text-text-secondary">{s.dividendYield ? `${s.dividendYield}%` : '—'}</td>
                    <td className="table-cell text-right font-jetbrains text-text-secondary">{formatNPR(s.marketCap || 0, true)}</td>
                  </tr>
                ))}
                {filteredResults.length === 0 && (
                  <tr>
                    <td colSpan={9} className="p-20 text-center text-text-muted">
                      <div className="flex flex-col items-center gap-2">
                        <Search size={40} className="opacity-20" />
                        <p>No companies match your filters</p>
                        <button onClick={resetFilters} className="text-brand-cyan hover:underline text-xs mt-2">Clear all filters</button>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
}
