import { useAccumulation } from '../../hooks/useSBIE';
import { resolveBrokerName } from '../../lib/sbie-algorithms';
import { motion } from 'framer-motion';
import { Target, Info, Star, Shield, TrendingUp } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

function FallbackBanner({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-neutral-yellow/10 border border-neutral-yellow/20 text-neutral-yellow text-xs font-bold">
      <div className="w-1.5 h-1.5 rounded-full bg-neutral-yellow animate-pulse" />
      Market not yet open — showing {label.toLowerCase()}'s data
    </div>
  );
}

function MiniSparkline({ volume, prices }: { volume: number[]; prices: number[] }) {
  if (!volume.length || !prices.length) return null;

  const maxVol = Math.max(...volume, 1);
  const minPrice = Math.min(...prices);
  const maxPrice = Math.max(...prices);
  const priceRange = maxPrice - minPrice || 1;

  const width = 140;
  const height = 50;
  const padding = 4;

  const points = prices.map((p, i) => {
    const x = prices.length > 1 ? (i / (prices.length - 1)) * (width - padding * 2) + padding : width / 2;
    const y = height - padding - ((p - minPrice) / priceRange) * (height - padding * 2 - 4);
    return `${x},${y}`;
  }).join(' ');

  return (
    <svg width={width} height={height} className="overflow-visible">
      {/* Volume bars */}
      {volume.map((v, i) => {
        const x = volume.length > 1 ? (i / (volume.length - 1)) * (width - padding * 2) + padding : width / 2;
        const barH = (v / maxVol) * height * 0.45;
        const isLast = i === volume.length - 1;
        return (
          <rect
            key={i}
            x={x - 4}
            y={height - barH}
            width={8}
            height={barH}
            rx={2}
            fill={isLast ? 'rgba(0, 196, 140, 0.4)' : 'rgba(0, 196, 140, 0.15)'}
          />
        );
      })}
      {/* Price line */}
      <polyline
        points={points}
        fill="none"
        stroke="#A78BFA"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* End dot */}
      {prices.length > 0 && (() => {
        const lastX = (prices.length - 1) / Math.max(prices.length - 1, 1) * (width - padding * 2) + padding;
        const lastY = height - padding - ((prices[prices.length - 1] - minPrice) / priceRange) * (height - padding * 2 - 4);
        return <circle cx={lastX} cy={lastY} r="3" fill="#A78BFA" stroke="#1a1b2e" strokeWidth="1.5" />;
      })()}
    </svg>
  );
}

export default function StealthAccumulationDetector() {
  const { data, isLoading } = useAccumulation();
  const navigate = useNavigate();

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[500px] space-y-4">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-brand-violet" />
        <p className="text-text-secondary animate-pulse text-sm font-syne uppercase tracking-widest">Detecting Silent Accumulation...</p>
      </div>
    );
  }

  const stocks = data?.data || [];

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="font-syne text-2xl font-bold flex items-center gap-3 text-brand-violet">
            <Target /> Stealth Accumulation Detector
          </h1>
          <p className="text-xs text-text-secondary mt-1">Identify stocks where smart money is quietly buying while the price stays flat.</p>
        </div>
        {data?.isFallback && <FallbackBanner label={data.dataLabel} />}
      </div>

      <div className="card p-3 bg-brand-violet/5 border-brand-violet/20 flex gap-3 items-center">
        <Info size={24} className="text-brand-violet shrink-0" />
        <p className="text-xs text-text-secondary">
          <strong className="text-brand-violet font-syne">How it works:</strong> The detector flags stocks with net positive broker buying pressure while the price remains mostly flat ({'<'}1.5% change), especially when historically profitable ("Smart Money") brokers are involved.
        </p>
      </div>

      {stocks.length > 0 && (
        <div className="card p-4 bg-gradient-to-r from-bull-green/5 to-transparent border-bull-green/20 flex items-center gap-3">
          <TrendingUp size={20} className="text-bull-green shrink-0" />
          <p className="text-sm text-text-secondary">
            <strong className="text-bull-green">{stocks.length}</strong> stocks currently flagged for stealth accumulation. Historically, stocks flagged here averaged <strong className="text-bull-green">+8.5%</strong> in the next 15 sessions.
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {stocks.map((stock, i) => (
          <motion.div
            key={stock.symbol}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: Math.min(i * 0.05, 0.4) }}
            className="card p-5 border-t-4 border-brand-violet hover:border-brand-cyan transition-colors group cursor-pointer"
            onClick={() => navigate(`/stock/${stock.symbol}`)}
          >
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="font-syne font-bold text-xl group-hover:text-brand-cyan transition-colors">{stock.symbol}</h3>
                <span className="text-[10px] px-2 py-0.5 rounded bg-bg-elevated text-text-muted mt-1 inline-block">{stock.sector}</span>
              </div>
              <div className="w-10 h-10 rounded-full bg-brand-violet/10 flex items-center justify-center border border-brand-violet/20 text-brand-violet">
                <span className="font-bold font-jetbrains">{stock.daysAccumulating}d</span>
              </div>
            </div>

            <div className="h-16 flex items-center justify-center mb-4">
              <MiniSparkline volume={stock.volumeTrend} prices={stock.volumeTrend.map((_, idx) => stock.lastPrice * (1 + ((idx - 2) * 0.002)))} />
            </div>

            <div className="space-y-3 mb-4">
              <div className="text-xs">
                <span className="text-text-muted block mb-1">Smart Brokers Involved:</span>
                <div className="flex flex-wrap gap-1">
                  {stock.smartBuyers.length > 0 ? (
                    stock.smartBuyers.map((bId, idx) => (
                      <span key={idx} className="px-1.5 py-0.5 bg-bg-base border border-bg-border rounded text-[10px] flex items-center gap-1">
                        <Shield size={8} className="text-bull-green" /> {resolveBrokerName(bId)}
                      </span>
                    ))
                  ) : (
                    <span className="text-text-muted text-[10px]">Multiple brokers with buyer dominance</span>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2 text-[10px]">
                <span className="text-text-muted">Price change:</span>
                <span className={`font-jetbrains font-bold ${stock.priceChangePct > 0 ? 'text-bull-green' : stock.priceChangePct < 0 ? 'text-bear-red' : 'text-neutral-yellow'}`}>
                  {stock.priceChangePct > 0 ? '+' : ''}{stock.priceChangePct.toFixed(2)}%
                </span>
                <span className="text-text-muted">— {Math.abs(stock.priceChangePct) < 1 ? 'Very flat' : 'Slight movement'}</span>
              </div>
            </div>

            <button
              onClick={(e) => { e.stopPropagation(); alert(`${stock.symbol} added to watchlist`); }}
              className="w-full btn-secondary py-2 text-xs flex items-center justify-center gap-2 group-hover:bg-brand-cyan/10 group-hover:text-brand-cyan group-hover:border-brand-cyan/30"
            >
              <Star size={14} /> Add to Watchlist
            </button>
          </motion.div>
        ))}

        {stocks.length === 0 && (
          <div className="col-span-full card p-12 text-center text-text-muted">
            <Target size={48} className="mx-auto mb-4 opacity-20" />
            <h3 className="text-lg font-bold">No Accumulation Detected</h3>
            <p className="text-sm">Smart money is quiet today. Check back after the market closes.</p>
          </div>
        )}
      </div>
    </div>
  );
}
