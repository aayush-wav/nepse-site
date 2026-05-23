import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Search, SlidersHorizontal, ChevronDown, Check, X, Play, RotateCcw, Save, Zap, TrendingUp, TrendingDown } from 'lucide-react';
import { useScreener, useCompanyList } from '../hooks/useNepseData';
import { formatNPR, formatPercent, getPriceColorClass, formatNepaliNumber } from '../utils';

interface FilterState {
  sector: string[];
  minPrice: string;
  maxPrice: string;
  minChange: string;
  maxChange: string;
  minPE: string;
  maxPE: string;
  minEPS: string;
  minDividend: string;
  near52High: boolean;
  near52Low: boolean;
  volumeSpike: boolean;
}

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
  near52High: false,
  near52Low: false,
  volumeSpike: false,
};

export default function Screener() {
  const navigate = useNavigate();
  const [filters, setFilters] = useState<FilterState>(initialFilters);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  const { data: companies, isLoading: loadingCompanies } = useCompanyList();
  const { data: screenerData, isLoading: loadingScreener } = useScreener(filters);

  const sectors = useMemo(() => {
    if (!companies) return [];
    const s = new Set(companies.map((c: any) => c.sectorName || 'Others'));
    return Array.from(s).sort() as string[];
  }, [companies]);

  const filteredResults = screenerData || [];

  const resetFilters = () => {
    setFilters(initialFilters);
  };

  const handleExport = () => {
    const params = new URLSearchParams();
    if (filters.sector.length > 0) filters.sector.forEach(s => params.append('sector', s));
    if (filters.minPrice) params.append('minPrice', filters.minPrice);
    if (filters.maxPrice) params.append('maxPrice', filters.maxPrice);
    if (filters.minChange) params.append('minChange', filters.minChange);
    if (filters.maxChange) params.append('maxChange', filters.maxChange);
    if (filters.minPE) params.append('minPE', filters.minPE);
    if (filters.maxPE) params.append('maxPE', filters.maxPE);
    if (filters.minEPS) params.append('minEPS', filters.minEPS);
    if (filters.minDividend) params.append('minDividend', filters.minDividend);
    if (filters.near52High) params.append('near52High', 'true');
    if (filters.near52Low) params.append('near52Low', 'true');
    if (filters.volumeSpike) params.append('volumeSpike', 'true');
    
    window.open(`http://127.0.0.1:8000/api/stocks/screener/export?${params.toString()}`, '_blank');
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

          {/* Advanced Server-Side Indicators */}
          <div className="space-y-3 pt-4 border-t border-bg-border/50">
            <label className="text-xs font-bold text-brand-cyan uppercase tracking-wider flex items-center gap-1.5">
              <Zap size={12} /> Smart Filters
            </label>
            <button
              onClick={() => setFilters(f => ({ ...f, near52High: !f.near52High }))}
              className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg border text-xs font-bold transition-all ${
                filters.near52High 
                  ? 'bg-bull-green/10 border-bull-green/40 text-bull-green' 
                  : 'border-bg-border text-text-muted hover:border-text-muted'
              }`}
            >
              <TrendingUp size={14} />
              Near 52-Week High
              {filters.near52High && <span className="ml-auto text-[9px] bg-bull-green/20 px-1.5 py-0.5 rounded">ON</span>}
            </button>
            <button
              onClick={() => setFilters(f => ({ ...f, near52Low: !f.near52Low }))}
              className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg border text-xs font-bold transition-all ${
                filters.near52Low 
                  ? 'bg-bear-red/10 border-bear-red/40 text-bear-red' 
                  : 'border-bg-border text-text-muted hover:border-text-muted'
              }`}
            >
              <TrendingDown size={14} />
              Near 52-Week Low
              {filters.near52Low && <span className="ml-auto text-[9px] bg-bear-red/20 px-1.5 py-0.5 rounded">ON</span>}
            </button>
            <button
              onClick={() => setFilters(f => ({ ...f, volumeSpike: !f.volumeSpike }))}
              className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg border text-xs font-bold transition-all ${
                filters.volumeSpike 
                  ? 'bg-brand-gold/10 border-brand-gold/40 text-brand-gold' 
                  : 'border-bg-border text-text-muted hover:border-text-muted'
              }`}
            >
              <Zap size={14} />
              Volume Spike (3x Avg)
              {filters.volumeSpike && <span className="ml-auto text-[9px] bg-brand-gold/20 px-1.5 py-0.5 rounded">ON</span>}
            </button>
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
            <button 
              onClick={handleExport}
              className="btn-secondary py-1.5 px-3 flex items-center gap-2 text-xs"
            >
              <Save size={14} /> Export CSV
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
          {loadingScreener || loadingCompanies ? (
            <div className="flex-1 flex flex-col items-center justify-center gap-4 text-text-muted">
              <div className="w-12 h-12 rounded-full border-4 border-bg-border border-t-brand-cyan animate-spin" />
              <p className="font-medium animate-pulse">Filtering market data...</p>
            </div>
          ) : (
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
                    <th className="table-header">Momentum</th>
                    <th className="table-header">Dividend</th>
                    <th className="table-header text-right">Market Cap</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredResults.map((s: any, i: number) => (
                    <tr 
                      key={s.symbol}
                      onClick={() => navigate(`/stock/${s.symbol}`)}
                      className="border-b border-bg-border/30 hover:bg-bg-elevated/50 cursor-pointer transition-colors table-row-zebra"
                    >
                      <td className="table-cell text-text-muted font-jetbrains text-xs">{i + 1}</td>
                      <td className="table-cell">
                        <div className="flex items-center gap-2">
                          <div>
                            <div className="font-bold text-text-primary">{s.symbol}</div>
                            <div className="text-[10px] text-text-muted truncate max-w-[150px]">{s.sector}</div>
                          </div>
                          <div className="flex gap-1">
                            {s.near52High && <span className="text-[8px] px-1 py-0.5 rounded bg-bull-green/10 text-bull-green font-bold" title="Near 52W High">52H</span>}
                            {s.near52Low && <span className="text-[8px] px-1 py-0.5 rounded bg-bear-red/10 text-bear-red font-bold" title="Near 52W Low">52L</span>}
                            {s.volumeSpike && <span className="text-[8px] px-1 py-0.5 rounded bg-brand-gold/10 text-brand-gold font-bold" title="Volume Spike">⚡</span>}
                          </div>
                        </div>
                      </td>
                      <td className="table-cell font-jetbrains">{formatNepaliNumber(s.ltp)}</td>
                      <td className={`table-cell font-jetbrains font-bold ${getPriceColorClass(s.changePercent)}`}>
                        {formatPercent(s.changePercent)}
                      </td>
                      <td className="table-cell font-jetbrains text-text-secondary">{s.peRatio || '—'}</td>
                      <td className="table-cell font-jetbrains text-text-secondary">{s.eps || '—'}</td>
                      <td className="table-cell font-jetbrains">
                        <span className={`text-xs font-bold px-1.5 py-0.5 rounded ${
                          (s.momentumScore || 0) > 60 ? 'bg-bull-green/10 text-bull-green' :
                          (s.momentumScore || 0) < 30 ? 'bg-bear-red/10 text-bear-red' :
                          'bg-brand-gold/10 text-brand-gold'
                        }`}>
                          {s.momentumScore ?? '—'}
                        </span>
                      </td>
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
          )}
        </div>
      </main>
    </div>
  );
}
