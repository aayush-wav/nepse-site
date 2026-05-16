import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Search, BookOpen, Filter, Download, ArrowUpRight, ArrowDownRight, Info, TrendingUp } from 'lucide-react';
import { formatNPR, formatPercent, getPriceColorClass, formatNepaliNumber } from '../utils';
import { useLiveTrading, useCompanyList } from '../hooks/useNepseData';
import { useMemo } from 'react';

export default function Fundamentals() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  
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
        eps: s.eps || 0, 
        peRatio: s.peRatio || 0, 
        bookValue: s.bookValue || 0,
        pbRatio: s.pbRatio || 0, 
        dividendYield: s.dividendYield || 0,
        marketCap: s.marketCap || 0,
      };
    });
  }, [rawData, companies]);

  const filtered = useMemo(() => {
    return stocks.filter(s => 
      s.symbol.toLowerCase().includes(search.toLowerCase()) || 
      s.companyName.toLowerCase().includes(search.toLowerCase())
    );
  }, [stocks, search]);

  const stats = useMemo(() => {
    if (stocks.length === 0) return { avgPE: '—', avgDiv: '—', avgPB: '—' };
    
    const peStocks = stocks.filter(s => s.peRatio > 0);
    const avgPE = peStocks.length > 0 ? (peStocks.reduce((acc, s) => acc + s.peRatio, 0) / peStocks.length).toFixed(2) : '—';
    
    const divStocks = stocks.filter(s => s.dividendYield > 0);
    const avgDiv = divStocks.length > 0 ? (divStocks.reduce((acc, s) => acc + s.dividendYield, 0) / divStocks.length).toFixed(2) : '—';
    
    const pbStocks = stocks.filter(s => s.pbRatio > 0);
    const avgPB = pbStocks.length > 0 ? (pbStocks.reduce((acc, s) => acc + s.pbRatio, 0) / pbStocks.length).toFixed(2) : '—';
    
    return { avgPE, avgDiv, avgPB };
  }, [stocks]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="font-syne text-2xl font-bold">Fundamental Analysis</h1>
          <p className="text-xs text-text-secondary">Deep-dive into company financials, ratios, and growth metrics</p>
        </div>
        <div className="flex gap-2">
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
            <input 
              type="text" placeholder="Search company..." value={search} onChange={e => setSearch(e.target.value)}
              className="input-field pl-9 py-1.5 text-sm w-full md:w-64" 
            />
          </div>
          <button className="btn-secondary py-1.5 px-3 flex items-center gap-2 text-xs">
            <Download size={14} /> Export Report
          </button>
        </div>
      </div>

      {/* Market Valuation Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="card p-6 bg-gradient-to-br from-bg-surface to-bg-base border-brand-cyan/20">
           <div className="flex items-center justify-between mb-4">
              <span className="text-[10px] text-text-muted uppercase font-bold tracking-widest">Average Market P/E</span>
              <div className="w-8 h-8 rounded bg-brand-cyan/10 flex items-center justify-center text-brand-cyan">
                 <Info size={14} />
              </div>
           </div>
           <div className="text-3xl font-syne font-black text-text-primary">{stats.avgPE}</div>
           <p className="text-xs text-text-secondary mt-2">Current average P/E ratio across the market based on live data.</p>
        </div>
        <div className="card p-6 bg-gradient-to-br from-bg-surface to-bg-base border-bull-green/20">
           <div className="flex items-center justify-between mb-4">
              <span className="text-[10px] text-text-muted uppercase font-bold tracking-widest">Dividend Yield (Avg)</span>
              <div className="w-8 h-8 rounded bg-bull-green/10 flex items-center justify-center text-bull-green">
                 <TrendingUp size={14} />
              </div>
           </div>
           <div className="text-3xl font-syne font-black text-text-primary">{stats.avgDiv}%</div>
           <p className="text-xs text-text-secondary mt-2">Average dividend yield for companies with active dividend distributions.</p>
        </div>
        <div className="card p-6 bg-gradient-to-br from-bg-surface to-bg-base border-brand-gold/20">
           <div className="flex items-center justify-between mb-4">
              <span className="text-[10px] text-text-muted uppercase font-bold tracking-widest">Market P/B Ratio</span>
              <div className="w-8 h-8 rounded bg-brand-gold/10 flex items-center justify-center text-brand-gold">
                 <Filter size={14} />
              </div>
           </div>
           <div className="text-3xl font-syne font-black text-text-primary">{stats.avgPB}</div>
           <p className="text-xs text-text-secondary mt-2">Average Price to Book ratio indicating asset-backed valuation levels.</p>
        </div>
      </div>

      {/* Fundamentals Table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-bg-base/30">
              <tr>
                <th className="table-header">Company</th>
                <th className="table-header text-right">EPS</th>
                <th className="table-header text-right">P/E Ratio</th>
                <th className="table-header text-right">Book Value</th>
                <th className="table-header text-right">P/B Ratio</th>
                <th className="table-header text-right">Div Yield</th>
                <th className="table-header text-right">ROE</th>
                <th className="table-header text-right">Market Cap</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((s) => (
                <tr key={s.symbol} onClick={() => navigate(`/stock/${s.symbol}`)} className="border-b border-bg-border/30 hover:bg-bg-elevated/50 cursor-pointer transition-colors table-row-zebra">
                  <td className="table-cell">
                    <div className="font-bold text-text-primary">{s.symbol}</div>
                    <div className="text-[10px] text-text-muted truncate max-w-[120px]">{s.sector}</div>
                  </td>
                  <td className="table-cell text-right font-jetbrains font-medium">{s.eps || '—'}</td>
                  <td className={`table-cell text-right font-jetbrains font-bold ${(s.peRatio || 0) < 20 ? 'text-bull-green' : (s.peRatio || 0) > 40 ? 'text-bear-red' : 'text-text-secondary'}`}>
                    {s.peRatio || '—'}
                  </td>
                  <td className="table-cell text-right font-jetbrains text-text-secondary">{s.bookValue || '—'}</td>
                  <td className="table-cell text-right font-jetbrains text-text-secondary">{s.pbRatio || '—'}</td>
                  <td className="table-cell text-right font-jetbrains text-text-secondary">{s.dividendYield ? `${s.dividendYield}%` : '—'}</td>
                  <td className="table-cell text-right font-jetbrains text-bull-green">—</td>
                  <td className="table-cell text-right font-jetbrains text-text-secondary">{formatNPR(s.marketCap || 0, true)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
