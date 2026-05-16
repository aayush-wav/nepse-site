import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { TrendingUp, TrendingDown, BarChart3, ArrowUpRight, ArrowDownRight, Volume2, DollarSign, Calendar, Zap, Activity } from 'lucide-react';
import { useMarketStore } from '../store';
import { seedCompanies, seedSectors, seedEvents } from '../data/seed';
import { formatNPR, formatPercent, formatVolume, getPriceColorClass, formatNepaliNumber } from '../utils';
import { fetchTodayPrices, fetchTopGainers, fetchTopLosers, fetchTopVolume, fetchTopTurnover, fetchSectors } from '../services/api';

const fadeUp = { hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0 } };

export default function Dashboard() {
  const navigate = useNavigate();
  const { nepseIndex, sensitiveIndex, floatIndex, totalTurnover, advancing, declining, totalTransactions, totalTradedShares } = useMarketStore();
  const [stocks, setStocks] = useState(seedCompanies);
  const [sectors, setSectors] = useState(seedSectors);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        const priceData = await fetchTodayPrices();
        if (priceData?.content) {
          setStocks(priceData.content.map((s: any) => ({
            symbol: s.symbol, companyName: s.securityName, sector: s.sectorName || '',
            ltp: s.lastTradedPrice, previousClose: s.previousClose, change: s.lastTradedPrice - s.previousClose,
            changePercent: ((s.lastTradedPrice - s.previousClose) / s.previousClose) * 100,
            open: s.openPrice, high: s.highPrice, low: s.lowPrice, volume: s.totalTradeQuantity,
            turnover: s.totalTurnover, week52High: s.fiftyTwoWeekHigh, week52Low: s.fiftyTwoWeekLow,
          })));
        }
        const sectorData = await fetchSectors();
        if (sectorData && Array.isArray(sectorData)) setSectors(sectorData);
      } catch { /* use seed data */ }
      setLoading(false);
    }
    loadData();
  }, []);

  const sortedByGain = [...stocks].sort((a, b) => b.changePercent - a.changePercent);
  const topGainer = sortedByGain[0];
  const topLoser = sortedByGain[sortedByGain.length - 1];
  const topByVolume = [...stocks].sort((a, b) => b.volume - a.volume)[0];
  const topByTurnover = [...stocks].sort((a, b) => b.turnover - a.turnover)[0];
  const week52Highs = stocks.filter(s => s.ltp >= (s.week52High || Infinity));
  const week52Lows = stocks.filter(s => s.ltp <= (s.week52Low || 0));

  const eventTypeColors: Record<string, string> = {
    ipo: 'border-brand-cyan bg-brand-cyan/10 text-brand-cyan',
    agm: 'border-brand-violet bg-brand-violet/10 text-brand-violet',
    dividend: 'border-bull-green bg-bull-green/10 text-bull-green',
    bonus: 'border-brand-gold bg-brand-gold/10 text-brand-gold',
    book_closure: 'border-neutral-yellow bg-neutral-yellow/10 text-neutral-yellow',
    rights: 'border-brand-cyan bg-brand-cyan/10 text-brand-cyan',
    fund_unlock: 'border-brand-violet bg-brand-violet/10 text-brand-violet',
    promoter_unlock: 'border-bear-red bg-bear-red/10 text-bear-red',
  };

  return (
    <div className="space-y-6">
      {/* Market Highlights Grid */}
      <motion.div initial="hidden" animate="visible" variants={{ visible: { transition: { staggerChildren: 0.08 } } }}
        className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
        {[
          { label: 'Top Gainer', icon: TrendingUp, color: 'bull-green', symbol: topGainer?.symbol, value: topGainer?.ltp, pct: topGainer?.changePercent },
          { label: 'Top Loser', icon: TrendingDown, color: 'bear-red', symbol: topLoser?.symbol, value: topLoser?.ltp, pct: topLoser?.changePercent },
          { label: 'Most Active (Vol)', icon: Volume2, color: 'brand-cyan', symbol: topByVolume?.symbol, value: topByVolume?.volume, pct: topByVolume?.changePercent, isVol: true },
          { label: 'Most Active (TO)', icon: DollarSign, color: 'brand-gold', symbol: topByTurnover?.symbol, value: topByTurnover?.turnover, pct: topByTurnover?.changePercent, isTO: true },
          { label: '52W High Breakouts', icon: ArrowUpRight, color: 'bull-green', count: week52Highs.length, symbol: week52Highs[0]?.symbol },
          { label: '52W Low Hits', icon: ArrowDownRight, color: 'bear-red', count: week52Lows.length, symbol: week52Lows[0]?.symbol },
        ].map((card, i) => (
          <motion.div key={i} variants={fadeUp} className="card p-4 hover:border-bg-border/80 transition-all cursor-pointer group"
            onClick={() => card.symbol && navigate(`/stock/${card.symbol}`)}>
            <div className="flex items-center gap-2 mb-2">
              <card.icon size={14} className={`text-${card.color}`} />
              <span className="text-[11px] text-text-secondary uppercase tracking-wider">{card.label}</span>
            </div>
            {card.symbol && (
              <div className="font-jetbrains text-lg font-bold text-text-primary group-hover:text-brand-cyan transition-colors">
                {card.symbol}
              </div>
            )}
            {card.value !== undefined && !card.isVol && !card.isTO && (
              <div className="font-jetbrains text-sm text-text-secondary">Rs. {formatNepaliNumber(card.value)}</div>
            )}
            {card.isVol && <div className="font-jetbrains text-sm text-text-secondary">{formatVolume(card.value || 0)} shares</div>}
            {card.isTO && <div className="font-jetbrains text-sm text-text-secondary">{formatNPR(card.value || 0, true)}</div>}
            {card.pct !== undefined && (
              <span className={`font-jetbrains text-xs font-semibold ${getPriceColorClass(card.pct)}`}>{formatPercent(card.pct)}</span>
            )}
            {card.count !== undefined && (
              <div className="font-jetbrains text-2xl font-bold text-text-primary">{card.count}</div>
            )}
          </motion.div>
        ))}
      </motion.div>

      {/* Sector Heatmap */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }} className="card p-5">
        <h2 className="font-syne text-lg font-bold mb-4 flex items-center gap-2">
          <Zap size={18} className="text-brand-cyan" /> Sector Heatmap
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2">
          {sectors.map((sector) => {
            const intensity = Math.min(Math.abs(sector.changePercent) / 3, 1);
            const bgColor = sector.changePercent >= 0
              ? `rgba(0,196,140,${0.08 + intensity * 0.35})`
              : `rgba(255,77,79,${0.08 + intensity * 0.35})`;
            return (
              <div key={sector.id} onClick={() => navigate(`/sector/${sector.id}`)}
                className="rounded-lg p-3 border border-bg-border/50 cursor-pointer hover:scale-[1.02] transition-all"
                style={{ background: bgColor }}>
                <div className="text-xs font-medium text-text-primary truncate">{sector.name}</div>
                <div className="text-[10px] text-text-muted font-noto-devanagari">{sector.nameNepali}</div>
                <div className={`font-jetbrains text-sm font-bold mt-1 ${getPriceColorClass(sector.changePercent)}`}>
                  {formatPercent(sector.changePercent)}
                </div>
                <div className="flex items-center gap-1 mt-1 text-[10px]">
                  <span className="text-bull-green">{sector.stocksUp}↑</span>
                  <span className="text-text-muted">/</span>
                  <span className="text-bear-red">{sector.stocksDown}↓</span>
                </div>
              </div>
            );
          })}
        </div>
      </motion.div>

      {/* Two Column: Top Stocks + Events */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        {/* Top Movers */}
        <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.4 }}
          className="lg:col-span-3 card p-5">
          <h2 className="font-syne text-lg font-bold mb-4 flex items-center gap-2">
            <Activity size={18} className="text-brand-cyan" /> Top Movers Today
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-text-secondary text-xs uppercase tracking-wider border-b border-bg-border">
                  <th className="text-left py-2 px-2">Symbol</th>
                  <th className="text-right py-2 px-2">LTP</th>
                  <th className="text-right py-2 px-2">Change</th>
                  <th className="text-right py-2 px-2">Vol</th>
                  <th className="text-right py-2 px-2">Turnover</th>
                </tr>
              </thead>
              <tbody>
                {sortedByGain.slice(0, 10).map((s, i) => (
                  <tr key={s.symbol} onClick={() => navigate(`/stock/${s.symbol}`)}
                    className="border-b border-bg-border/30 hover:bg-bg-elevated/50 cursor-pointer transition-colors">
                    <td className="py-2.5 px-2">
                      <span className="font-semibold text-text-primary">{s.symbol}</span>
                      <span className="text-text-muted text-xs ml-1.5 hidden sm:inline">{s.sector}</span>
                    </td>
                    <td className="text-right py-2.5 px-2 font-jetbrains font-medium">{formatNepaliNumber(s.ltp)}</td>
                    <td className={`text-right py-2.5 px-2 font-jetbrains font-semibold ${getPriceColorClass(s.changePercent)}`}>
                      {formatPercent(s.changePercent)}
                    </td>
                    <td className="text-right py-2.5 px-2 font-jetbrains text-text-secondary">{formatVolume(s.volume)}</td>
                    <td className="text-right py-2.5 px-2 font-jetbrains text-text-secondary">{formatNPR(s.turnover, true)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </motion.div>

        {/* Upcoming Events */}
        <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.5 }}
          className="lg:col-span-2 card p-5">
          <h2 className="font-syne text-lg font-bold mb-4 flex items-center gap-2">
            <Calendar size={18} className="text-brand-gold" /> Upcoming Events
          </h2>
          <div className="space-y-2.5">
            {seedEvents.map((evt) => (
              <div key={evt.id} className={`rounded-lg p-3 border ${eventTypeColors[evt.type] || 'border-bg-border'} cursor-pointer
                hover:scale-[1.01] transition-all`}
                onClick={() => evt.symbol && navigate(`/stock/${evt.symbol}`)}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] uppercase tracking-wider font-semibold">{evt.type.replace('_', ' ')}</span>
                  <span className="text-[10px] text-text-muted font-jetbrains">{evt.date}</span>
                </div>
                <div className="text-sm font-medium text-text-primary">{evt.title}</div>
                {evt.description && <div className="text-xs text-text-secondary mt-0.5">{evt.description}</div>}
              </div>
            ))}
          </div>
        </motion.div>
      </div>

      {/* Market Statistics */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.6 }}
        className="card p-5">
        <h2 className="font-syne text-lg font-bold mb-4 flex items-center gap-2">
          <BarChart3 size={18} className="text-brand-violet" /> Today's Statistics
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
          {[
            { label: 'NEPSE Index', value: formatNepaliNumber(nepseIndex.value), sub: formatPercent(nepseIndex.changePercent), color: getPriceColorClass(nepseIndex.change) },
            { label: 'Total Turnover', value: formatNPR(totalTurnover, true), sub: '', color: 'text-text-primary' },
            { label: 'Shares Traded', value: formatVolume(totalTradedShares), sub: '', color: 'text-text-primary' },
            { label: 'Transactions', value: formatNepaliNumber(totalTransactions, 0), sub: '', color: 'text-text-primary' },
            { label: 'Advancing', value: String(advancing), sub: '', color: 'text-bull-green' },
            { label: 'Declining', value: String(declining), sub: '', color: 'text-bear-red' },
          ].map((stat, i) => (
            <div key={i} className="text-center">
              <div className="stat-label mb-1">{stat.label}</div>
              <div className={`font-jetbrains text-xl font-bold ${stat.color}`}>{stat.value}</div>
              {stat.sub && <div className={`font-jetbrains text-xs ${stat.color}`}>{stat.sub}</div>}
            </div>
          ))}
        </div>
      </motion.div>
    </div>
  );
}
