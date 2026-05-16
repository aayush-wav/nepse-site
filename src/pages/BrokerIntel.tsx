import { useState } from 'react';
import { motion } from 'framer-motion';
import { Building2, Search, TrendingUp, TrendingDown, Info, BarChart2, Filter } from 'lucide-react';
import { formatNPR, formatVolume } from '../utils';

const brokerData = [
  { id: '58', name: 'Naasa Securities', buyAmount: 125430000, sellAmount: 98450000, buyQty: 450000, sellQty: 320000, topBuy: 'NABIL', topSell: 'NHPC' },
  { id: '45', name: 'Imperial Securities', buyAmount: 112000000, sellAmount: 105000000, buyQty: 410000, sellQty: 380000, topBuy: 'NICA', topSell: 'UPPER' },
  { id: '34', name: 'Vision Securities', buyAmount: 95000000, sellAmount: 118000000, buyQty: 350000, sellQty: 420000, topBuy: 'SHIVM', topSell: 'NABIL' },
  { id: '28', name: 'Shree Krishna Securities', buyAmount: 88000000, sellAmount: 72000000, buyQty: 310000, sellQty: 250000, topBuy: 'AHPC', topSell: 'PRVU' },
  { id: '17', name: 'ABC Securities', buyAmount: 76000000, sellAmount: 85000000, buyQty: 280000, sellQty: 310000, topBuy: 'NLIC', topSell: 'SBL' },
];

export default function BrokerIntel() {
  const [search, setSearch] = useState('');
  
  const filtered = brokerData.filter(b => 
    b.name.toLowerCase().includes(search.toLowerCase()) || b.id.includes(search)
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="font-syne text-2xl font-bold">Broker Intelligence</h1>
          <p className="text-xs text-text-secondary">Tracking market makers and top player activity</p>
        </div>
        <div className="flex gap-2">
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
            <input 
              type="text" placeholder="Search broker name or #..." value={search} onChange={e => setSearch(e.target.value)}
              className="input-field pl-9 py-1.5 text-sm w-full md:w-64" 
            />
          </div>
          <button className="btn-secondary py-1.5 px-3 flex items-center gap-2 text-xs">
            <Filter size={14} /> Filter
          </button>
        </div>
      </div>

      {/* Top 3 Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="card p-6 border-b-4 border-bull-green">
          <div className="flex items-center justify-between mb-4">
            <div className="text-[10px] text-text-muted uppercase tracking-wider font-bold">Top Buying Broker</div>
            <TrendingUp size={16} className="text-bull-green" />
          </div>
          <div className="text-xl font-syne font-bold text-text-primary">Naasa Securities (#58)</div>
          <div className="font-jetbrains text-lg text-bull-green mt-1">{formatNPR(125430000, true)}</div>
        </div>
        <div className="card p-6 border-b-4 border-bear-red">
          <div className="flex items-center justify-between mb-4">
            <div className="text-[10px] text-text-muted uppercase tracking-wider font-bold">Top Selling Broker</div>
            <TrendingDown size={16} className="text-bear-red" />
          </div>
          <div className="text-xl font-syne font-bold text-text-primary">Vision Securities (#34)</div>
          <div className="font-jetbrains text-lg text-bear-red mt-1">{formatNPR(118000000, true)}</div>
        </div>
        <div className="card p-6 border-b-4 border-brand-cyan">
          <div className="flex items-center justify-between mb-4">
            <div className="text-[10px] text-text-muted uppercase tracking-wider font-bold">Highest Volume Broker</div>
            <BarChart2 size={16} className="text-brand-cyan" />
          </div>
          <div className="text-xl font-syne font-bold text-text-primary">Naasa Securities (#58)</div>
          <div className="font-jetbrains text-lg text-brand-cyan mt-1">{formatVolume(770000)} shares</div>
        </div>
      </div>

      {/* Main Table */}
      <div className="card overflow-hidden">
        <div className="p-4 border-b border-bg-border bg-bg-base/30 flex items-center justify-between">
          <h2 className="font-syne font-bold text-sm">Broker Performance Rankings</h2>
          <div className="text-[10px] text-text-muted flex items-center gap-1">
            <Info size={12} /> Click on a broker to see their specific stock-wise breakdown
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-bg-base/20">
                <th className="table-header">#</th>
                <th className="table-header">Broker Name</th>
                <th className="table-header text-right">Buy Amount</th>
                <th className="table-header text-right">Sell Amount</th>
                <th className="table-header text-right">Net Flow</th>
                <th className="table-header">Top Buy</th>
                <th className="table-header">Top Sell</th>
                <th className="table-header text-right">Total Vol</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((b) => {
                const netFlow = b.buyAmount - b.sellAmount;
                return (
                  <tr key={b.id} className="border-b border-bg-border/30 hover:bg-bg-elevated/50 cursor-pointer transition-colors table-row-zebra">
                    <td className="table-cell font-jetbrains text-xs text-text-muted">{b.id}</td>
                    <td className="table-cell font-bold text-text-primary">{b.name}</td>
                    <td className="table-cell text-right font-jetbrains text-bull-green">{formatNPR(b.buyAmount, true)}</td>
                    <td className="table-cell text-right font-jetbrains text-bear-red">{formatNPR(b.sellAmount, true)}</td>
                    <td className={`table-cell text-right font-jetbrains font-bold ${netFlow >= 0 ? 'text-bull-green' : 'text-bear-red'}`}>
                      {netFlow >= 0 ? '+' : ''}{formatNPR(netFlow, true)}
                    </td>
                    <td className="table-cell">
                      <span className="badge-cyan text-[10px]">{b.topBuy}</span>
                    </td>
                    <td className="table-cell">
                      <span className="badge-red text-[10px]">{b.topSell}</span>
                    </td>
                    <td className="table-cell text-right font-jetbrains text-text-secondary">{formatVolume(b.buyQty + b.sellQty)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Insight Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card p-5">
          <h3 className="font-syne font-bold mb-4 flex items-center gap-2">
            <TrendingUp size={18} className="text-bull-green" /> Institutional Accumulation
          </h3>
          <p className="text-xs text-text-secondary mb-4">Brokers with consistent net buying over the last 5 days.</p>
          <div className="space-y-3">
             {[
               { name: 'Naasa Securities', flow: '+Rs. 45.2 Cr', trend: 'increasing' },
               { name: 'Imperial Securities', flow: '+Rs. 32.1 Cr', trend: 'stable' },
               { name: 'Shree Krishna Securities', flow: '+Rs. 18.5 Cr', trend: 'increasing' },
             ].map((item, i) => (
               <div key={i} className="flex items-center justify-between p-3 rounded-lg bg-bg-base/50 border border-bg-border/30">
                 <span className="text-sm font-medium text-text-primary">{item.name}</span>
                 <span className="font-jetbrains text-sm font-bold text-bull-green">{item.flow}</span>
               </div>
             ))}
          </div>
        </div>
        <div className="card p-5">
          <h3 className="font-syne font-bold mb-4 flex items-center gap-2">
            <TrendingDown size={18} className="text-bear-red" /> Panic Selling / Distribution
          </h3>
          <p className="text-xs text-text-secondary mb-4">Brokers with massive net selling in the current session.</p>
          <div className="space-y-3">
             {[
               { name: 'Vision Securities', flow: '-Rs. 28.4 Cr', status: 'high' },
               { name: 'ABC Securities', flow: '-Rs. 12.5 Cr', status: 'medium' },
               { name: 'Online Securities', flow: '-Rs. 8.2 Cr', status: 'low' },
             ].map((item, i) => (
               <div key={i} className="flex items-center justify-between p-3 rounded-lg bg-bg-base/50 border border-bg-border/30">
                 <span className="text-sm font-medium text-text-primary">{item.name}</span>
                 <span className="font-jetbrains text-sm font-bold text-bear-red">{item.flow}</span>
               </div>
             ))}
          </div>
        </div>
      </div>
    </div>
  );
}
