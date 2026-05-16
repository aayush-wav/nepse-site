import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Search, BookOpen, Filter, Download, ArrowUpRight, ArrowDownRight, Info, TrendingUp } from 'lucide-react';
import { seedCompanies } from '../data/seed';
import { formatNPR, formatPercent, getPriceColorClass } from '../utils';

export default function Fundamentals() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  
  const filtered = seedCompanies.filter(s => 
    s.symbol.toLowerCase().includes(search.toLowerCase()) || 
    s.companyName.toLowerCase().includes(search.toLowerCase())
  );

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
           <div className="text-3xl font-syne font-black text-text-primary">24.52</div>
           <p className="text-xs text-text-secondary mt-2">Market is currently valued at a premium compared to 5-year average (18.2).</p>
        </div>
        <div className="card p-6 bg-gradient-to-br from-bg-surface to-bg-base border-bull-green/20">
           <div className="flex items-center justify-between mb-4">
              <span className="text-[10px] text-text-muted uppercase font-bold tracking-widest">Dividend Yield (Avg)</span>
              <div className="w-8 h-8 rounded bg-bull-green/10 flex items-center justify-center text-bull-green">
                 <TrendingUp size={14} />
              </div>
           </div>
           <div className="text-3xl font-syne font-black text-text-primary">3.15%</div>
           <p className="text-xs text-text-secondary mt-2">Historical dividend distributions are trending upwards this fiscal year.</p>
        </div>
        <div className="card p-6 bg-gradient-to-br from-bg-surface to-bg-base border-brand-gold/20">
           <div className="flex items-center justify-between mb-4">
              <span className="text-[10px] text-text-muted uppercase font-bold tracking-widest">Market P/B Ratio</span>
              <div className="w-8 h-8 rounded bg-brand-gold/10 flex items-center justify-center text-brand-gold">
                 <Filter size={14} />
              </div>
           </div>
           <div className="text-3xl font-syne font-black text-text-primary">2.84</div>
           <p className="text-xs text-text-secondary mt-2">Asset-backed valuation remains stable across most commercial banks.</p>
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
                  <td className="table-cell text-right font-jetbrains text-bull-green">18.4%</td>
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
