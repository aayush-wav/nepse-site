import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { PieChart, TrendingUp, TrendingDown, Activity, DollarSign, ListFilter, ArrowRight } from 'lucide-react';
import { seedSectors, seedCompanies } from '../data/seed';
import { formatNPR, formatPercent, getPriceColorClass, formatVolume } from '../utils';

export default function SectorAnalysis() {
  const navigate = useNavigate();
  const [selectedSector, setSelectedSector] = useState<string | null>(null);

  const enrichedSectors = useMemo(() => {
    return seedSectors.map(sector => {
      const sectorStocks = seedCompanies.filter(s => s.sector === sector.name);
      const avgChange = sectorStocks.reduce((acc, s) => acc + s.changePercent, 0) / (sectorStocks.length || 1);
      return {
        ...sector,
        avgChange,
        stockCount: sectorStocks.length,
        topGainer: [...sectorStocks].sort((a, b) => b.changePercent - a.changePercent)[0],
      };
    }).sort((a, b) => b.changePercent - a.changePercent);
  }, []);

  const totalMarketCap = enrichedSectors.reduce((acc, s) => acc + (s.totalMarketCap || 0), 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-syne text-2xl font-bold">Sector Analysis</h1>
          <p className="text-xs text-text-secondary">Comprehensive breakdown of market performance by industry</p>
        </div>
        <button className="btn-secondary py-1.5 px-4 flex items-center gap-2 text-xs">
          <ListFilter size={14} /> Compare Sectors
        </button>
      </div>

      {/* Market Composition Card */}
      <div className="card p-6 flex flex-col md:flex-row items-center gap-8 bg-gradient-to-br from-bg-surface to-bg-base">
        <div className="relative w-48 h-48 flex items-center justify-center">
          <div className="absolute inset-0 border-[16px] border-bg-border rounded-full opacity-20" />
          <div className="absolute inset-0 border-[16px] border-brand-cyan rounded-full border-t-transparent border-l-transparent rotate-[30deg]" />
          <div className="flex flex-col items-center">
            <span className="text-[10px] text-text-muted uppercase">Market Cap</span>
            <span className="text-xl font-syne font-bold text-text-primary">100%</span>
          </div>
        </div>
        <div className="flex-1 grid grid-cols-2 lg:grid-cols-3 gap-6 w-full">
           {enrichedSectors.slice(0, 6).map((s, i) => {
             const weight = ((s.totalMarketCap || 0) / totalMarketCap) * 100;
             return (
               <div key={i} className="space-y-1.5">
                 <div className="flex justify-between text-xs">
                   <span className="text-text-secondary font-medium">{s.name}</span>
                   <span className="text-text-muted font-jetbrains">{weight.toFixed(1)}%</span>
                 </div>
                 <div className="h-1.5 w-full bg-bg-border rounded-full overflow-hidden">
                   <div className="h-full bg-brand-cyan" style={{ width: `${weight}%` }} />
                 </div>
               </div>
             );
           })}
        </div>
      </div>

      {/* Sectors Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {enrichedSectors.map((sector) => (
          <motion.div 
            key={sector.id} 
            whileHover={{ y: -4 }}
            className="card p-5 border-l-4 transition-all group cursor-pointer"
            style={{ borderLeftColor: sector.changePercent >= 0 ? '#00C48C' : '#FF4D4F' }}
            onClick={() => navigate(`/live-market?sector=${sector.name}`)}
          >
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="font-syne font-bold text-text-primary group-hover:text-brand-cyan transition-colors">{sector.name}</h3>
                <span className="text-[10px] text-text-muted font-noto-devanagari">{sector.nameNepali}</span>
              </div>
              <div className={`font-jetbrains text-lg font-bold ${getPriceColorClass(sector.changePercent)}`}>
                {sector.changePercent > 0 ? '+' : ''}{formatPercent(sector.changePercent)}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-4">
              <div className="space-y-1">
                <span className="text-[10px] text-text-muted uppercase">Turnover</span>
                <div className="font-jetbrains text-sm text-text-primary">{formatNPR(sector.turnover, true)}</div>
              </div>
              <div className="space-y-1">
                <span className="text-[10px] text-text-muted uppercase">Stocks</span>
                <div className="flex items-center gap-1.5 text-xs font-bold">
                  <span className="text-bull-green">{sector.stocksUp}↑</span>
                  <span className="text-text-muted">/</span>
                  <span className="text-bear-red">{sector.stocksDown}↓</span>
                </div>
              </div>
            </div>

            {sector.topGainer && (
              <div className="p-3 rounded-lg bg-bg-base/50 border border-bg-border/30 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded bg-bull-green/10 flex items-center justify-center text-bull-green">
                    <TrendingUp size={14} />
                  </div>
                  <div>
                    <div className="text-[10px] text-text-muted leading-tight">Top Gainer</div>
                    <div className="text-xs font-bold text-text-primary">{sector.topGainer.symbol}</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-xs font-jetbrains font-bold text-bull-green">+{formatPercent(sector.topGainer.changePercent)}</div>
                  <div className="text-[10px] text-text-muted">LTP: {sector.topGainer.ltp}</div>
                </div>
              </div>
            )}

            <button className="w-full mt-4 py-2 text-[11px] font-bold uppercase tracking-wider text-text-muted hover:text-brand-cyan flex items-center justify-center gap-1.5 transition-colors">
              View All {sector.stockCount} Stocks <ArrowRight size={12} />
            </button>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
