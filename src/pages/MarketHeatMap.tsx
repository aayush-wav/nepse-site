import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { PieChart, Info } from 'lucide-react';
import { useLiveTrading } from '../hooks/useNepseData';
import { getPriceColorClass } from '../utils';

export default function MarketHeatMap() {
  const { data, isLoading, isError } = useLiveTrading();
  const [sizeBy, setSizeBy] = useState<'turnover' | 'volume'>('turnover');

  // Process data for heat map
  const heatMapData = useMemo(() => {
    if (!data || !Array.isArray(data)) return [];
    
    // Group by sector
    const sectors = new Map<string, typeof data>();
    data.forEach(item => {
      const sector = item.sectorName || 'Others';
      if (!sectors.has(sector)) sectors.set(sector, []);
      sectors.get(sector)!.push(item);
    });

    return Array.from(sectors.entries()).map(([name, stocks]) => {
      const totalSize = stocks.reduce((sum, s) => sum + (sizeBy === 'turnover' ? Number(s.totalTradeValue || s.turnover || 0) : Number(s.totalTradeQuantity || s.volume || 0)), 0);
      const avgChange = stocks.reduce((sum, s) => sum + Number(s.percentageChange || 0), 0) / (stocks.length || 1);
      
      return {
        name,
        totalSize,
        avgChange,
        stocks: stocks.sort((a, b) => 
          (sizeBy === 'turnover' ? Number(b.totalTradeValue || b.turnover || 0) : Number(b.totalTradeQuantity || b.volume || 0)) -
          (sizeBy === 'turnover' ? Number(a.totalTradeValue || a.turnover || 0) : Number(a.totalTradeQuantity || a.volume || 0))
        )
      };
    }).sort((a, b) => b.totalSize - a.totalSize);
  }, [data, sizeBy]);

  const getHeatColor = (change: number) => {
    if (change >= 6) return 'bg-[#00e676] text-black'; // Strong Gain
    if (change >= 2) return 'bg-[#00c853] text-white'; // Good Gain
    if (change > 0) return 'bg-[#4caf50] text-white';  // Slight Gain
    if (change === 0) return 'bg-bg-elevated text-text-muted'; // Neutral
    if (change > -2) return 'bg-[#ef5350] text-white'; // Slight Loss
    if (change > -6) return 'bg-[#d32f2f] text-white'; // Good Loss
    return 'bg-[#c62828] text-white'; // Strong Loss
  };

  if (isLoading) return <div className="p-12 text-center animate-pulse">Loading Heat Map...</div>;
  if (isError) return <div className="p-12 text-center text-bear-red">Failed to load market data.</div>;

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-brand-cyan/20 flex items-center justify-center text-brand-cyan">
            <PieChart size={22} />
          </div>
          <div>
            <h1 className="font-syne text-2xl font-bold">Market Heat Map</h1>
            <p className="text-xs text-text-secondary font-medium uppercase tracking-wider">Visual Sector & Stock Performance</p>
          </div>
        </div>

        <div className="flex items-center gap-4 p-2 bg-bg-surface border border-bg-border rounded-xl">
          <div className="flex gap-1">
            <button
              onClick={() => setSizeBy('turnover')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${sizeBy === 'turnover' ? 'bg-bg-elevated text-brand-cyan' : 'text-text-muted hover:text-text-primary'}`}
            >
              Size by Turnover
            </button>
            <button
              onClick={() => setSizeBy('volume')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${sizeBy === 'volume' ? 'bg-bg-elevated text-brand-cyan' : 'text-text-muted hover:text-text-primary'}`}
            >
              Size by Volume
            </button>
          </div>
        </div>
      </div>

      <div className="card p-3 flex items-center justify-between overflow-x-auto text-xs font-medium">
        <span className="text-text-muted shrink-0 mr-4">Legend (% Change):</span>
        <div className="flex gap-2 shrink-0">
          <div className="px-3 py-1 rounded bg-[#c62828] text-white">&lt; -6%</div>
          <div className="px-3 py-1 rounded bg-[#d32f2f] text-white">-6% to -2%</div>
          <div className="px-3 py-1 rounded bg-[#ef5350] text-white">-2% to 0%</div>
          <div className="px-3 py-1 rounded bg-bg-elevated text-text-muted">0%</div>
          <div className="px-3 py-1 rounded bg-[#4caf50] text-white">0% to 2%</div>
          <div className="px-3 py-1 rounded bg-[#00c853] text-white">2% to 6%</div>
          <div className="px-3 py-1 rounded bg-[#00e676] text-black">&gt; 6%</div>
        </div>
      </div>

      <div className="space-y-6">
        {heatMapData.map(sector => (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            key={sector.name} 
            className="card p-4 space-y-3 bg-bg-surface/50"
          >
            <div className="flex justify-between items-center border-b border-bg-border/50 pb-2">
              <h3 className="font-syne font-bold text-lg">{sector.name}</h3>
              <div className={`font-jetbrains text-sm font-bold px-2 py-1 rounded ${getHeatColor(sector.avgChange)}`}>
                Avg: {sector.avgChange > 0 ? '+' : ''}{sector.avgChange.toFixed(2)}%
              </div>
            </div>
            
            <div className="flex flex-wrap gap-2">
              {sector.stocks.map(stock => {
                const change = Number(stock.percentageChange) || 0;
                const sizeVal = sizeBy === 'turnover' ? Number(stock.totalTradeValue || stock.turnover || 0) : Number(stock.totalTradeQuantity || stock.volume || 0);
                
                // Determine block sizing based on relative weight in sector
                const weight = sector.totalSize > 0 ? sizeVal / sector.totalSize : 0;
                let scaleClass = "text-xs p-2 min-w-[60px]";
                if (weight > 0.15) scaleClass = "text-lg p-4 min-w-[120px] font-bold";
                else if (weight > 0.05) scaleClass = "text-sm p-3 min-w-[90px]";

                return (
                  <div 
                    key={stock.symbol}
                    title={`${stock.symbol}: ${change.toFixed(2)}% | LTP: ${stock.lastTradedPrice}`}
                    className={`flex flex-col justify-between rounded-lg shadow-sm cursor-pointer hover:brightness-110 transition-all ${getHeatColor(change)} ${scaleClass}`}
                    style={{ flexGrow: weight * 100 }}
                  >
                    <div className="font-jetbrains">{stock.symbol}</div>
                    <div className="opacity-90">{change > 0 ? '+' : ''}{change.toFixed(2)}%</div>
                  </div>
                );
              })}
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
