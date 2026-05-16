import { useState } from 'react';
import { motion } from 'framer-motion';
import { Search, TrendingUp, TrendingDown, BarChart2 } from 'lucide-react';
import { formatNPR, formatPercent, getPriceColorClass } from '../utils';

import { useLiveTrading, useCompanyList } from '../hooks/useNepseData';
import { useMemo } from 'react';

export default function MutualFunds() {
  const [search, setSearch] = useState('');
  const { data: rawData, isLoading: loadingLive } = useLiveTrading();
  const { data: companies } = useCompanyList();
  
  const mutualFunds = useMemo(() => {
    if (!rawData) return [];
    
    const companyData = companies || [];
    const sectorMap = new Map();
    companyData.forEach((c: any) => sectorMap.set(c.symbol, c.sectorName));

    return rawData
      .filter((s: any) => {
        const scripSector = sectorMap.get(s.symbol) || s.sectorName || s.sector || '';
        return scripSector.toLowerCase().includes('mutual fund');
      })
      .map((s: any) => ({
        symbol: s.symbol,
        name: s.securityName || s.companyName || s.symbol,
        manager: s.issuerName || '—',
        nav: s.lastTradedPrice || s.ltp || 0,
        navChange: s.percentageChange || s.changePercent || 0,
        totalAUM: s.marketCap || 0,
        type: 'Listed',
        maturity: '—'
      }));
  }, [rawData, companies]);

  const filtered = useMemo(() => {
    return mutualFunds.filter(f => 
      f.name.toLowerCase().includes(search.toLowerCase()) || f.symbol.toLowerCase().includes(search.toLowerCase())
    );
  }, [mutualFunds, search]);

  const stats = useMemo(() => {
    if (mutualFunds.length === 0) return { totalAUM: 0, aboveFace: 0, avgNAV: '0.00' };
    const totalAUM = mutualFunds.reduce((a, f) => a + f.totalAUM, 0);
    const aboveFace = mutualFunds.filter(f => f.nav > 10).length;
    const avgNAV = (mutualFunds.reduce((a, f) => a + f.nav, 0) / mutualFunds.length).toFixed(2);
    return { totalAUM, aboveFace, avgNAV };
  }, [mutualFunds]);

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
          <div className="font-jetbrains text-2xl font-bold">{formatNPR(stats.totalAUM, true)}</div>
        </div>
        <div className="card p-5 border-l-4 border-bull-green">
          <div className="text-[10px] text-text-muted uppercase tracking-wider mb-1">Funds Above Face Value</div>
          <div className="font-jetbrains text-2xl font-bold text-bull-green">{stats.aboveFace}</div>
        </div>
        <div className="card p-5 border-l-4 border-brand-gold">
          <div className="text-[10px] text-text-muted uppercase tracking-wider mb-1">Average NAV</div>
          <div className="font-jetbrains text-2xl font-bold">{stats.avgNAV}</div>
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
