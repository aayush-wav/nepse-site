import { useState } from 'react';
import { motion } from 'framer-motion';
import { Search, TrendingUp, TrendingDown, BarChart2 } from 'lucide-react';
import { formatNPR, formatPercent, getPriceColorClass } from '../utils';

const mutualFunds = [
  { symbol: 'NBF3', name: 'Nabil Balanced Fund-3', manager: 'Nabil Investment', nav: 12.45, navChange: 0.18, totalAUM: 2000000000, type: 'Closed', maturity: '2085-06-30' },
  { symbol: 'NICGF', name: 'NIC Asia Growth Fund', manager: 'NIC Asia Capital', nav: 15.82, navChange: -0.12, totalAUM: 1500000000, type: 'Closed', maturity: '2084-12-31' },
  { symbol: 'SEF', name: 'Siddhartha Equity Fund', manager: 'Siddhartha Capital', nav: 11.20, navChange: 0.25, totalAUM: 1000000000, type: 'Open', maturity: 'Open-ended' },
  { symbol: 'PRSF', name: 'Prabhu Select Fund', manager: 'Prabhu Capital', nav: 13.40, navChange: 0.05, totalAUM: 800000000, type: 'Closed', maturity: '2086-03-15' },
  { symbol: 'GIMES1', name: 'Global IME Samunat Equity Fund 1', manager: 'Global IME Capital', nav: 10.95, navChange: -0.08, totalAUM: 600000000, type: 'Closed', maturity: '2084-09-30' },
  { symbol: 'LBBLMF1', name: 'Laxmi Banking and Finance MF-1', manager: 'Laxmi Capital', nav: 14.20, navChange: 0.32, totalAUM: 750000000, type: 'Closed', maturity: '2085-01-15' },
];

export default function MutualFunds() {
  const [search, setSearch] = useState('');
  const filtered = mutualFunds.filter(f => 
    f.name.toLowerCase().includes(search.toLowerCase()) || f.symbol.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-syne text-2xl font-bold">Mutual Funds</h1>
          <p className="text-xs text-text-secondary">Track all NEPSE-listed fund NAVs, schemes, and returns</p>
        </div>
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
          <input
            type="text" placeholder="Search funds..." value={search} onChange={e => setSearch(e.target.value)}
            className="input-field pl-9 py-1.5 text-sm w-64"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="card p-5 border-l-4 border-brand-cyan">
          <div className="text-[10px] text-text-muted uppercase tracking-wider mb-1">Total AUM</div>
          <div className="font-jetbrains text-2xl font-bold">{formatNPR(mutualFunds.reduce((a, f) => a + f.totalAUM, 0), true)}</div>
        </div>
        <div className="card p-5 border-l-4 border-bull-green">
          <div className="text-[10px] text-text-muted uppercase tracking-wider mb-1">Funds Above Face Value</div>
          <div className="font-jetbrains text-2xl font-bold text-bull-green">{mutualFunds.filter(f => f.nav > 10).length}</div>
        </div>
        <div className="card p-5 border-l-4 border-brand-gold">
          <div className="text-[10px] text-text-muted uppercase tracking-wider mb-1">Average NAV</div>
          <div className="font-jetbrains text-2xl font-bold">{(mutualFunds.reduce((a, f) => a + f.nav, 0) / mutualFunds.length).toFixed(2)}</div>
        </div>
      </div>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-bg-base/30">
              <tr>
                <th className="table-header">Fund</th>
                <th className="table-header">Manager</th>
                <th className="table-header">Type</th>
                <th className="table-header text-right">NAV</th>
                <th className="table-header text-right">Change</th>
                <th className="table-header text-right">Total AUM</th>
                <th className="table-header text-right">Maturity</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(f => (
                <tr key={f.symbol} className="border-b border-bg-border/30 hover:bg-bg-elevated/50 cursor-pointer transition-colors table-row-zebra">
                  <td className="table-cell">
                    <div className="font-bold text-text-primary">{f.symbol}</div>
                    <div className="text-[10px] text-text-muted truncate max-w-[180px]">{f.name}</div>
                  </td>
                  <td className="table-cell text-text-secondary text-xs">{f.manager}</td>
                  <td className="table-cell">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${f.type === 'Open' ? 'bg-brand-cyan/10 text-brand-cyan' : 'bg-bg-elevated text-text-secondary'}`}>
                      {f.type}
                    </span>
                  </td>
                  <td className="table-cell text-right font-jetbrains font-bold">{f.nav.toFixed(2)}</td>
                  <td className={`table-cell text-right font-jetbrains font-bold ${getPriceColorClass(f.navChange)}`}>
                    {f.navChange >= 0 ? '+' : ''}{f.navChange.toFixed(2)}
                  </td>
                  <td className="table-cell text-right font-jetbrains text-text-secondary">{formatNPR(f.totalAUM, true)}</td>
                  <td className="table-cell text-right font-jetbrains text-xs text-text-secondary">{f.maturity}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
