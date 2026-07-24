import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { Activity, TrendingUp, TrendingDown, Target, Zap } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useScreener } from '../hooks/useNepseData';
import { getPriceColorClass, formatNepaliNumber } from '../utils';

export default function TradingSignals() {
  const { data: allStocks, isLoading } = useScreener({});
  const navigate = useNavigate();

  const signals = useMemo(() => {
    if (!allStocks) return { momentum: [], volumeSpike: [], rsiOversold: [], rsiOverbought: [], macdBullish: [], macdBearish: [] };
    
    // Top 10 by momentum score
    const momentum = [...allStocks].sort((a, b) => (b.momentumScore || 0) - (a.momentumScore || 0)).slice(0, 8);
    
    // Stocks with volume spikes (requires a volumeSpike boolean or logic)
    const volumeSpike = allStocks.filter(s => s.volume > (s.avgVolume || s.volume) * 2).sort((a, b) => (b.volume || 0) - (a.volume || 0)).slice(0, 8);
    
    // RSI Signals
    const rsiOversold = allStocks.filter(s => s.rsi && s.rsi < 30).sort((a, b) => (a.rsi || 0) - (b.rsi || 0)).slice(0, 8);
    const rsiOverbought = allStocks.filter(s => s.rsi && s.rsi > 70).sort((a, b) => (b.rsi || 0) - (a.rsi || 0)).slice(0, 8);
    
    // MACD Signals (assuming macdSignal is 'bullish_crossover' or 'bearish_crossover')
    const macdBullish = allStocks.filter(s => s.macdSignal === 'bullish').sort((a, b) => (b.volume || 0) - (a.volume || 0)).slice(0, 8);
    const macdBearish = allStocks.filter(s => s.macdSignal === 'bearish').sort((a, b) => (b.volume || 0) - (a.volume || 0)).slice(0, 8);

    return { momentum, volumeSpike, rsiOversold, rsiOverbought, macdBullish, macdBearish };
  }, [allStocks]);

  const renderCard = (title: string, icon: any, data: any[], emptyMsg: string, isBullish: boolean, extraInfoFn?: (s: any) => string) => (
    <div className="card p-5 space-y-4 h-full flex flex-col">
      <div className="flex items-center gap-3 mb-2 shrink-0">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${isBullish ? 'bg-bull-green/20 text-bull-green' : 'bg-bear-red/20 text-bear-red'}`}>
          {icon}
        </div>
        <div>
          <h3 className="font-syne font-bold text-lg">{title}</h3>
          <p className="text-[10px] text-text-muted uppercase tracking-wider">{data.length} Signals detected</p>
        </div>
      </div>
      
      {data.length === 0 ? (
        <div className="flex-1 flex items-center justify-center py-8 text-center text-text-muted text-sm border border-dashed border-bg-border rounded-lg">
          {emptyMsg}
        </div>
      ) : (
        <div className="space-y-2 flex-1">
          {data.map((stock, idx) => (
            <div 
              key={stock.symbol} 
              onClick={() => navigate(`/stock/${stock.symbol}`)}
              className="flex items-center justify-between p-3 rounded-lg bg-bg-surface border border-bg-border hover:border-brand-cyan/30 hover:bg-bg-elevated/50 transition-all cursor-pointer group"
            >
              <div className="flex items-center gap-3">
                <span className="font-jetbrains text-text-muted text-xs group-hover:text-brand-cyan transition-colors">{(idx + 1).toString().padStart(2, '0')}</span>
                <div>
                  <div className="font-bold group-hover:text-brand-cyan transition-colors">{stock.symbol}</div>
                  <div className="text-[10px] text-text-secondary">{stock.sector}</div>
                </div>
              </div>
              <div className="text-right flex items-center gap-4">
                {extraInfoFn && (
                  <div className="text-xs font-jetbrains px-2 py-0.5 rounded bg-bg-base border border-bg-border text-text-secondary">
                    {extraInfoFn(stock)}
                  </div>
                )}
                <div>
                  <div className="font-jetbrains font-bold">{formatNepaliNumber(stock.ltp)}</div>
                  <div className={`font-jetbrains text-xs ${getPriceColorClass(stock.changePercent)}`}>
                    {stock.changePercent > 0 ? '+' : ''}{stock.changePercent?.toFixed(2)}%
                  </div>
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
          <Zap size={22} />
        </div>
        <div>
          <h1 className="font-syne text-2xl font-bold">Trading Signals</h1>
          <p className="text-xs text-text-secondary font-medium uppercase tracking-wider">Algorithmic Market Indicators</p>
        </div>
      </div>

      {isLoading ? (
        <div className="p-12 text-center animate-pulse text-text-muted flex flex-col items-center">
          <Activity size={40} className="mb-4 text-brand-cyan opacity-50" />
          Analyzing market signals...
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
            {renderCard(
              "High Momentum", 
              <TrendingUp size={20} />, 
              signals.momentum, 
              "No high momentum stocks detected today.", 
              true,
              (s) => `Score: ${Math.round(s.momentumScore || 0)}/100`
            )}
          </motion.div>
          
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
            {renderCard(
              "RSI Oversold (< 30)", 
              <Target size={20} />, 
              signals.rsiOversold, 
              "No oversold stocks detected.", 
              true,
              (s) => `RSI: ${s.rsi?.toFixed(1) || 'N/A'}`
            )}
          </motion.div>
          
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
            {renderCard(
              "RSI Overbought (> 70)", 
              <TrendingDown size={20} />, 
              signals.rsiOverbought, 
              "No overbought stocks detected.", 
              false,
              (s) => `RSI: ${s.rsi?.toFixed(1) || 'N/A'}`
            )}
          </motion.div>
          
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
            {renderCard(
              "Volume Spikes", 
              <Activity size={20} />, 
              signals.volumeSpike, 
              "No unusual volume spikes detected today.", 
              true,
              (s) => `Vol: ${formatNepaliNumber(s.volume)}`
            )}
          </motion.div>
        </div>
      )}
    </div>
  );
}
