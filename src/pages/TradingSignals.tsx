import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { Activity, TrendingUp } from 'lucide-react';
import { useScreener } from '../hooks/useNepseData';
import { getPriceColorClass, formatNepaliNumber } from '../utils';

export default function TradingSignals() {
  // Fetch all stocks with pre-calculated indicators from the backend
  const { data: allStocks, isLoading } = useScreener({});

  const signals = useMemo(() => {
    if (!allStocks) return { momentum: [], volumeSpike: [], nearHigh: [], nearLow: [] };
    
    // Top 10 by momentum score
    const momentum = [...allStocks].sort((a, b) => (b.momentumScore || 0) - (a.momentumScore || 0)).slice(0, 10);
    
    // Stocks with volume spikes
    const volumeSpike = allStocks.filter(s => s.volumeSpike).sort((a, b) => (b.volume || 0) - (a.volume || 0)).slice(0, 10);
    
    // Near 52W High (Bullish break out)
    const nearHigh = allStocks.filter(s => s.near52High).sort((a, b) => (b.volume || 0) - (a.volume || 0)).slice(0, 10);
    
    // Near 52W Low (Oversold / Support)
    const nearLow = allStocks.filter(s => s.near52Low).sort((a, b) => (b.volume || 0) - (a.volume || 0)).slice(0, 10);

    return { momentum, volumeSpike, nearHigh, nearLow };
  }, [allStocks]);

  const renderCard = (title: string, icon: any, data: any[], emptyMsg: string, isBullish: boolean) => (
    <div className="card p-5 space-y-4">
      <div className="flex items-center gap-3 mb-2">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${isBullish ? 'bg-bull-green/20 text-bull-green' : 'bg-bear-red/20 text-bear-red'}`}>
          {icon}
        </div>
        <div>
          <h3 className="font-syne font-bold text-lg">{title}</h3>
          <p className="text-[10px] text-text-muted uppercase tracking-wider">{data.length} Signals detected</p>
        </div>
      </div>
      
      {data.length === 0 ? (
        <div className="py-8 text-center text-text-muted text-sm border border-dashed border-bg-border rounded-lg">
          {emptyMsg}
        </div>
      ) : (
        <div className="space-y-2">
          {data.map((stock, idx) => (
            <div key={stock.symbol} className="flex items-center justify-between p-3 rounded-lg bg-bg-surface border border-bg-border hover:border-brand-cyan/30 transition-colors">
              <div className="flex items-center gap-3">
                <span className="font-jetbrains text-text-muted text-xs">{(idx + 1).toString().padStart(2, '0')}</span>
                <div>
                  <div className="font-bold">{stock.symbol}</div>
                  <div className="text-[10px] text-text-secondary">{stock.sector}</div>
                </div>
              </div>
              <div className="text-right">
                <div className="font-jetbrains font-bold">{formatNepaliNumber(stock.ltp)}</div>
                <div className={`font-jetbrains text-xs ${getPriceColorClass(stock.changePercent)}`}>
                  {stock.changePercent > 0 ? '+' : ''}{stock.changePercent?.toFixed(2)}%
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 mb-2">
        <div className="w-10 h-10 rounded-xl bg-brand-violet/20 flex items-center justify-center text-brand-violet">
          <TrendingUp size={22} />
        </div>
        <div>
          <h1 className="font-syne text-2xl font-bold">Trading Signals</h1>
          <p className="text-xs text-text-secondary font-medium uppercase tracking-wider">Algorithmic Market Indicators</p>
        </div>
      </div>

      {isLoading ? (
        <div className="p-12 text-center animate-pulse text-text-muted">Analyzing market signals...</div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
            {renderCard(
              "High Momentum", 
              <Activity size={20} />, 
              signals.momentum, 
              "No high momentum stocks detected today.", 
              true
            )}
          </motion.div>
          
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
            {renderCard(
              "Volume Spikes (3x Avg)", 
              <Activity size={20} />, 
              signals.volumeSpike, 
              "No unusual volume spikes detected today.", 
              true
            )}
          </motion.div>
          
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
            {renderCard(
              "Near 52-Week High", 
              <TrendingUp size={20} />, 
              signals.nearHigh, 
              "No stocks trading near 52-week highs.", 
              true
            )}
          </motion.div>
          
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
            {renderCard(
              "Near 52-Week Low", 
              <Activity size={20} />, 
              signals.nearLow, 
              "No stocks trading near 52-week lows.", 
              false
            )}
          </motion.div>
        </div>
      )}
    </div>
  );
}
