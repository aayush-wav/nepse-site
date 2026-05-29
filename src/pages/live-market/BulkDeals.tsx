// ═══════════════════════════════════════════════════════════════════════════
//  BULK DEALS — Live Bulk Transaction Tracker
//  Sub-section of /live-market
// ═══════════════════════════════════════════════════════════════════════════
//
//  WHAT THIS DOES
//  --------------
//  Pulls today's full floorsheet and surfaces only the BULK contracts — single
//  transactions where one party transferred a large block of shares. Split
//  into BUY-SIDE (accumulation) and SELL-SIDE (distribution) views by
//  cross-referencing each stock's current intraday direction.
//
//  WHY THIS MATTERS
//  ----------------
//  Bulk deals signal institutional or HNI activity. When a stock is rising
//  and bulk contracts keep printing, it indicates accumulation by informed
//  money. When a stock is falling and bulk contracts keep printing, it
//  signals distribution. Tracking these in real time gives traders an early
//  read on smart-money positioning.
//
//  BULK-DEAL DEFINITION (per Nepali platform convention, not SEBON-official)
//  ------------------------------------------------------------------------
//  NEPSE has NO formal "bulk deal" rule. We adopt the industry-standard
//  test: EITHER (qty ≥ N shares) OR (value ≥ Rs. V) qualifies as bulk.
//  Defaults: 1,000 shares OR Rs. 10 lakh. User can adjust thresholds.
//
//  CLASSIFICATION (Buy-side vs Sell-side)
//  --------------------------------------
//  NEPSE's floorsheet does NOT tag the aggressive side (taker vs maker), so
//  we use the stock's current intraday % change as a proxy:
//    • Stock UP today (+0.5%+) → bulk trades on that stock are BUY-SIDE biased
//    • Stock DOWN today (-0.5%+) → bulk trades are SELL-SIDE biased
//    • Stock flat → NEUTRAL (still shown in tape, excluded from aggregates)
//  This matches how Nepali analysts read floorsheets in practice.
// ═══════════════════════════════════════════════════════════════════════════

import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Layers, TrendingUp, TrendingDown, ArrowDownToLine, ArrowUpFromLine,
  Building, Filter, Activity, Info, AlertTriangle,
} from 'lucide-react';
import { useFloorsheet, useLiveTrading } from '../../hooks/useNepseData';
import { useUIStore } from '../../store';
import { normalizeFloorsheetTrades, type FloorsheetTrade } from '../../lib/stockData';
import {
  formatNepaliNumber, formatPercent, formatNPR, formatVolume,
} from '../../utils';
import {
  BULK_DEAL_MIN_QUANTITY, BULK_DEAL_MIN_VALUE,
  BULK_QTY_PRESETS, BULK_VALUE_PRESETS,
} from '../../constants';

// ─────────────────────────────────────────────────────────────────────────
//  Local types
// ─────────────────────────────────────────────────────────────────────────
interface BulkTrade extends FloorsheetTrade {
  amount: number;          // qty × rate
  side: 'buy' | 'sell' | 'neutral'; // inferred from stock's intraday direction
  changePercent: number;   // host stock's % change today
}

interface AggregatedSymbol {
  symbol: string;
  totalQty: number;
  totalValue: number;
  tradeCount: number;
  changePercent: number;
  ltp: number;
  // For tooltips:
  topBuyerBroker?: string;
  topSellerBroker?: string;
}

// Side classification thresholds — small dead-zone around zero prevents
// flat-tape trades from leaking into either side bucket.
const DIRECTION_DEAD_ZONE = 0.5; // % change |x| < 0.5 → neutral

function classifySide(changePercent: number): BulkTrade['side'] {
  if (changePercent > DIRECTION_DEAD_ZONE) return 'buy';
  if (changePercent < -DIRECTION_DEAD_ZONE) return 'sell';
  return 'neutral';
}

// ═══════════════════════════════════════════════════════════════════════════
//  MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════
export default function BulkDeals() {
  const navigate = useNavigate();
  const setSelectedBrokerId = useUIStore((s: any) => s.setSelectedBrokerId);
  const { data: rawFloorsheet, isLoading: loadingFloor, isError: floorError } = useFloorsheet();
  const { data: rawLive } = useLiveTrading();

  // User-controllable bulk thresholds (default: 1,000 shares OR Rs. 10 lakh)
  const [minQty, setMinQty] = useState<number>(BULK_DEAL_MIN_QUANTITY);
  const [minValue, setMinValue] = useState<number>(BULK_DEAL_MIN_VALUE);
  const [searchSymbol, setSearchSymbol] = useState('');
  const [tapeView, setTapeView] = useState<'buy' | 'sell' | 'all'>('all');

  // ── 1. Build symbol → % change / ltp lookup from live data ──
  const liveLookup = useMemo(() => {
    const map = new Map<string, { changePercent: number; ltp: number; companyName: string }>();
    (rawLive || []).forEach((r: any) => {
      const sym = String(r.symbol || '').toUpperCase();
      if (!sym) return;
      map.set(sym, {
        changePercent: Number(r.percentageChange ?? 0),
        ltp: Number(r.lastTradedPrice ?? r.ltp ?? 0),
        companyName: String(r.securityName || r.companyName || sym),
      });
    });
    return map;
  }, [rawLive]);

  // ── 2. Normalize floorsheet + filter to bulk only + classify side ──
  const bulkTrades: BulkTrade[] = useMemo(() => {
    const normalized = normalizeFloorsheetTrades(rawFloorsheet || []);
    return normalized
      .map((t) => {
        const amount = (t.contractQuantity || 0) * (t.contractRate || 0);
        const meta = liveLookup.get(t.stockSymbol);
        const cp = meta?.changePercent ?? 0;
        return {
          ...t,
          amount,
          side: classifySide(cp),
          changePercent: cp,
        } as BulkTrade;
      })
      .filter((t) => t.contractQuantity >= minQty || t.amount >= minValue);
  }, [rawFloorsheet, liveLookup, minQty, minValue]);

  // ── 3. Aggregate by symbol, split by side ──
  const { buySideAgg, sellSideAgg, summary } = useMemo(() => {
    const bySymbol = new Map<string, AggregatedSymbol>();

    for (const t of bulkTrades) {
      const sym = t.stockSymbol;
      if (!sym) continue;
      const existing = bySymbol.get(sym);
      const meta = liveLookup.get(sym);
      if (existing) {
        existing.totalQty += t.contractQuantity;
        existing.totalValue += t.amount;
        existing.tradeCount += 1;
      } else {
        bySymbol.set(sym, {
          symbol: sym,
          totalQty: t.contractQuantity,
          totalValue: t.amount,
          tradeCount: 1,
          changePercent: meta?.changePercent ?? 0,
          ltp: meta?.ltp ?? t.contractRate,
        });
      }
    }

    const allAgg = Array.from(bySymbol.values());
    const buy = allAgg
      .filter((a) => a.changePercent > DIRECTION_DEAD_ZONE)
      .sort((a, b) => b.totalValue - a.totalValue);
    const sell = allAgg
      .filter((a) => a.changePercent < -DIRECTION_DEAD_ZONE)
      .sort((a, b) => b.totalValue - a.totalValue);

    return {
      buySideAgg: buy,
      sellSideAgg: sell,
      summary: {
        totalTrades: bulkTrades.length,
        totalValue: bulkTrades.reduce((s, t) => s + t.amount, 0),
        totalQty: bulkTrades.reduce((s, t) => s + t.contractQuantity, 0),
        uniqueSymbols: bySymbol.size,
      },
    };
  }, [bulkTrades, liveLookup]);

  // ── 4. Build live tape — most recent first ──
  const liveTape = useMemo(() => {
    const filtered = bulkTrades.filter((t) => {
      if (tapeView === 'buy' && t.side !== 'buy') return false;
      if (tapeView === 'sell' && t.side !== 'sell') return false;
      if (searchSymbol) {
        return t.stockSymbol.toLowerCase().includes(searchSymbol.toLowerCase());
      }
      return true;
    });
    // Floorsheet rows usually arrive newest-last; reverse to show newest-first.
    return [...filtered].reverse().slice(0, 200);
  }, [bulkTrades, tapeView, searchSymbol]);

  if (loadingFloor) {
    return (
      <div className="card p-12 text-center">
        <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-brand-cyan mx-auto" />
        <p className="mt-4 text-text-muted">
          Loading today&apos;s full floorsheet — this can take 30-60s on first load…
        </p>
      </div>
    );
  }

  if (floorError) {
    return (
      <div className="card p-8 text-center text-bear-red">
        <AlertTriangle size={32} className="mx-auto mb-2" />
        Failed to load floorsheet. NEPSE may be offline or the backend is unreachable.
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* ═════════════ EXPLAINER BANNER ═════════════ */}
      <div className="rounded-2xl border border-bg-border bg-bg-surface p-4 flex items-start gap-3">
        <div className="shrink-0 w-9 h-9 rounded-xl bg-brand-violet/15 text-brand-violet flex items-center justify-center">
          <Layers size={18} />
        </div>
        <div className="text-sm text-text-secondary leading-relaxed">
          <strong className="text-text-primary">Bulk Deals</strong> filters today&apos;s
          floorsheet for single contracts ≥ <strong>{minQty.toLocaleString()} shares</strong> OR
          ≥ <strong>Rs. {(minValue / 1e5).toFixed(0)} lakh</strong> in value. Trades are
          classified <strong className="text-bull-green">buy-side</strong> (stock is up today)
          or <strong className="text-bear-red">sell-side</strong> (stock is down today) — the
          industry-standard heuristic since NEPSE doesn&apos;t tag aggressive sides.
        </div>
      </div>

      {/* ═════════════ SUMMARY KPI ROW ═════════════ */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard label="Bulk Contracts" value={summary.totalTrades.toLocaleString()} icon={<Layers size={16} />} hue="violet" />
        <StatCard label="Bulk Value" value={formatNPR(summary.totalValue, true)} icon={<Activity size={16} />} hue="cyan" />
        <StatCard label="Total Shares Moved" value={formatVolume(summary.totalQty)} icon={<TrendingUp size={16} />} hue="gold" />
        <StatCard label="Unique Symbols" value={summary.uniqueSymbols.toLocaleString()} icon={<Building size={16} />} hue="cyan" />
      </div>

      {/* ═════════════ THRESHOLD CONTROLS ═════════════ */}
      <div className="card p-3 flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2 text-xs text-text-secondary">
          <Filter size={14} /> <span className="font-semibold uppercase tracking-wider">Threshold</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="text-xs text-text-muted">Qty ≥</span>
          {BULK_QTY_PRESETS.map((q) => (
            <button
              key={q}
              onClick={() => setMinQty(q)}
              className={`px-2 py-1 rounded text-xs font-jetbrains transition-colors ${
                minQty === q
                  ? 'bg-brand-cyan/15 text-brand-cyan border border-brand-cyan/40'
                  : 'border border-bg-border text-text-secondary hover:bg-bg-elevated/50'
              }`}
            >
              {q.toLocaleString()}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-1">
          <span className="text-xs text-text-muted">OR Value ≥</span>
          {BULK_VALUE_PRESETS.map((v) => (
            <button
              key={v}
              onClick={() => setMinValue(v)}
              className={`px-2 py-1 rounded text-xs font-jetbrains transition-colors ${
                minValue === v
                  ? 'bg-brand-cyan/15 text-brand-cyan border border-brand-cyan/40'
                  : 'border border-bg-border text-text-secondary hover:bg-bg-elevated/50'
              }`}
            >
              {v >= 1e7 ? `${v / 1e7} Cr` : `${v / 1e5}L`}
            </button>
          ))}
        </div>
      </div>

      {/* ═════════════ AGGREGATED BY-SIDE COLUMNS ═════════════ */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <AggregateColumn
          kind="buy"
          rows={buySideAgg}
          onSymbolClick={(s) => navigate(`/stock/${s}`)}
        />
        <AggregateColumn
          kind="sell"
          rows={sellSideAgg}
          onSymbolClick={(s) => navigate(`/stock/${s}`)}
        />
      </div>

      {/* ═════════════ LIVE TAPE ═════════════ */}
      <div className="card overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 border-b border-bg-border">
          <div className="flex items-center gap-2">
            <Activity size={18} className="text-brand-cyan" />
            <div>
              <div className="font-syne font-bold">Live Bulk Tape</div>
              <div className="text-[11px] text-text-muted">
                Newest first · {liveTape.length} of {bulkTrades.length} bulk contracts
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="text"
              placeholder="Filter symbol…"
              value={searchSymbol}
              onChange={(e) => setSearchSymbol(e.target.value.toUpperCase())}
              className="input-field text-xs w-32"
            />
            <div className="flex rounded-lg overflow-hidden border border-bg-border">
              {(['all', 'buy', 'sell'] as const).map((v) => (
                <button
                  key={v}
                  onClick={() => setTapeView(v)}
                  className={`px-3 py-1.5 text-xs font-medium transition-colors ${
                    tapeView === v
                      ? v === 'buy'
                        ? 'bg-bull-green text-bg-base'
                        : v === 'sell'
                        ? 'bg-bear-red text-white'
                        : 'bg-brand-cyan text-bg-base'
                      : 'text-text-secondary hover:bg-bg-elevated'
                  }`}
                >
                  {v === 'all' ? 'All' : v === 'buy' ? '↑ Buy' : '↓ Sell'}
                </button>
              ))}
            </div>
          </div>
        </div>

        {liveTape.length === 0 ? (
          <div className="p-10 text-center text-text-muted text-sm">
            No bulk trades matching the current filters.
          </div>
        ) : (
          <div className="overflow-x-auto max-h-[480px] overflow-y-auto">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-bg-base z-10">
                <tr>
                  <th className="table-header text-left">Side</th>
                  <th className="table-header text-left">Symbol</th>
                  <th className="table-header text-right">Qty</th>
                  <th className="table-header text-right">Rate</th>
                  <th className="table-header text-right">Value</th>
                  <th className="table-header text-center">Buyer</th>
                  <th className="table-header text-center">Seller</th>
                  <th className="table-header text-right">Time</th>
                  <th className="table-header text-right">Day %</th>
                </tr>
              </thead>
              <tbody>
                {liveTape.map((t, i) => (
                  <motion.tr
                    key={`${t.contractId}-${i}`}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.2, delay: Math.min(i * 0.01, 0.3) }}
                    className="border-b border-bg-border/30 hover:bg-bg-elevated/40 cursor-pointer"
                    onClick={() => navigate(`/stock/${t.stockSymbol}`)}
                  >
                    <td className="table-cell">
                      <SideBadge side={t.side} />
                    </td>
                    <td className="table-cell font-semibold text-text-primary">
                      {t.stockSymbol}
                    </td>
                    <td className="table-cell text-right font-jetbrains font-medium">
                      {t.contractQuantity.toLocaleString()}
                      {t.contractQuantity >= 10000 && (
                        <span className="ml-1 text-brand-gold" title="Mega block">⚡</span>
                      )}
                    </td>
                    <td className="table-cell text-right font-jetbrains text-text-secondary">
                      {formatNepaliNumber(t.contractRate)}
                    </td>
                    <td className="table-cell text-right font-jetbrains font-semibold text-text-primary">
                      {formatNPR(t.amount, true)}
                    </td>
                    <td
                      className="table-cell text-center"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (setSelectedBrokerId) setSelectedBrokerId(t.buyerMemberId);
                      }}
                    >
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-jetbrains bg-bull-green/10 text-bull-green hover:bg-bull-green/20 transition-colors">
                        #{t.buyerMemberId}
                      </span>
                    </td>
                    <td
                      className="table-cell text-center"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (setSelectedBrokerId) setSelectedBrokerId(t.sellerMemberId);
                      }}
                    >
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-jetbrains bg-bear-red/10 text-bear-red hover:bg-bear-red/20 transition-colors">
                        #{t.sellerMemberId}
                      </span>
                    </td>
                    <td className="table-cell text-right font-jetbrains text-[11px] text-text-muted">
                      {t.contractTime}
                    </td>
                    <td className="table-cell text-right">
                      <span
                        className={`text-xs font-jetbrains font-bold ${
                          t.changePercent > 0
                            ? 'text-bull-green'
                            : t.changePercent < 0
                            ? 'text-bear-red'
                            : 'text-neutral-yellow'
                        }`}
                      >
                        {formatPercent(t.changePercent)}
                      </span>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ═════════════ METHODOLOGY DISCLOSURE ═════════════ */}
      <details className="rounded-xl border border-bg-border bg-bg-surface p-4 text-sm">
        <summary className="cursor-pointer font-semibold text-text-primary flex items-center gap-2">
          <Info size={16} className="text-text-muted" /> How are bulk deals identified?
        </summary>
        <div className="mt-3 space-y-2 text-text-secondary leading-relaxed">
          <p>
            A floorsheet contract is flagged as &quot;bulk&quot; if it meets <strong>either</strong>
            test:
          </p>
          <ul className="ml-5 list-disc space-y-1">
            <li>Quantity ≥ <span className="font-jetbrains">{minQty.toLocaleString()}</span> shares, OR</li>
            <li>Trade value ≥ <span className="font-jetbrains">Rs. {(minValue / 1e5).toFixed(0)} lakh</span></li>
          </ul>
          <p>
            <strong>Side classification</strong>: NEPSE does not publish aggressor side. We use
            the stock&apos;s current intraday % change as proxy: up &gt; +0.5% → buy-side, down &lt; -0.5%
            → sell-side, otherwise neutral. This is the same convention used by analysts
            reading sharesansar / merolagani floorsheets.
          </p>
          <p className="text-xs text-text-muted">
            Disclaimer: A buy-side flag means buyers are likely the aggressors in aggregate
            today; it does not mean every individual contract was buyer-initiated. Always
            cross-check with order-book depth before drawing conclusions.
          </p>
        </div>
      </details>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
//  Sub-component: Aggregate column (by-symbol totals on one side)
// ═══════════════════════════════════════════════════════════════════════════
function AggregateColumn({
  kind, rows, onSymbolClick,
}: {
  kind: 'buy' | 'sell';
  rows: AggregatedSymbol[];
  onSymbolClick: (symbol: string) => void;
}) {
  const isBuy = kind === 'buy';
  const HeadIcon = isBuy ? ArrowDownToLine : ArrowUpFromLine;
  const headerBg = isBuy ? 'bg-bull-green/[0.05]' : 'bg-bear-red/[0.05]';
  const iconBg = isBuy ? 'bg-bull-green/15 text-bull-green' : 'bg-bear-red/15 text-bear-red';
  const accent = isBuy ? 'text-bull-green' : 'text-bear-red';
  const barColor = isBuy ? 'bg-bull-green' : 'bg-bear-red';

  // Use top row's value as bar scale
  const maxValue = rows[0]?.totalValue || 1;

  return (
    <div className="card overflow-hidden">
      <div className={`flex items-center justify-between gap-2 px-4 py-3 border-b border-bg-border ${headerBg}`}>
        <div className="flex items-center gap-2">
          <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${iconBg}`}>
            <HeadIcon size={18} />
          </div>
          <div>
            <div className="font-syne font-bold text-base">
              {isBuy ? 'Bulk Buy-Side Activity' : 'Bulk Sell-Side Activity'}
            </div>
            <div className="text-[11px] text-text-muted">
              {isBuy
                ? 'Stocks rising today with large block accumulation'
                : 'Stocks falling today with large block distribution'}
            </div>
          </div>
        </div>
        <div className={`text-xs font-jetbrains ${accent}`}>{rows.length} symbols</div>
      </div>

      {rows.length === 0 ? (
        <div className="p-8 text-center text-xs text-text-muted italic">
          No qualifying {kind === 'buy' ? 'buy-side' : 'sell-side'} bulk activity yet today.
        </div>
      ) : (
        <div className="p-2 max-h-[420px] overflow-y-auto space-y-1">
          {rows.slice(0, 20).map((r, i) => {
            const widthPct = (r.totalValue / maxValue) * 100;
            return (
              <motion.button
                key={r.symbol}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.02 }}
                onClick={() => onSymbolClick(r.symbol)}
                className="w-full text-left rounded-lg border border-bg-border bg-bg-base hover:border-brand-cyan/40 hover:bg-bg-elevated transition-colors px-3 py-2.5"
              >
                <div className="flex items-center justify-between gap-2 mb-1.5">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-[10px] font-jetbrains text-text-muted w-5">
                      #{i + 1}
                    </span>
                    <span className="font-syne font-bold text-sm text-text-primary">
                      {r.symbol}
                    </span>
                    <span className={`text-[11px] font-jetbrains font-bold ${accent}`}>
                      {formatPercent(r.changePercent)}
                    </span>
                  </div>
                  <div className="text-right">
                    <div className="text-xs font-jetbrains font-bold text-text-primary">
                      {formatNPR(r.totalValue, true)}
                    </div>
                    <div className="text-[10px] text-text-muted font-jetbrains">
                      {r.tradeCount} trades · {formatVolume(r.totalQty)} sh
                    </div>
                  </div>
                </div>
                <div className="h-1 rounded-full bg-bg-elevated overflow-hidden">
                  <div
                    className={`h-full ${barColor} transition-all duration-500`}
                    style={{ width: `${widthPct}%` }}
                  />
                </div>
              </motion.button>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
//  Sub-component: Stat KPI card
// ═══════════════════════════════════════════════════════════════════════════
function StatCard({
  label, value, icon, hue,
}: {
  label: string; value: string | number; icon: React.ReactNode;
  hue: 'cyan' | 'violet' | 'gold' | 'green';
}) {
  const cls = {
    cyan: 'border-brand-cyan/30 bg-brand-cyan/10 text-brand-cyan',
    violet: 'border-brand-violet/30 bg-brand-violet/10 text-brand-violet',
    gold: 'border-brand-gold/30 bg-brand-gold/10 text-brand-gold',
    green: 'border-bull-green/30 bg-bull-green/10 text-bull-green',
  }[hue];
  return (
    <div className={`rounded-xl border ${cls} p-3.5`}>
      <div className="flex items-center gap-2 text-xs font-medium opacity-90">
        {icon} {label}
      </div>
      <div className="mt-1.5 font-syne text-2xl font-black text-text-primary">{value}</div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
//  Sub-component: Side badge (buy / sell / neutral)
// ═══════════════════════════════════════════════════════════════════════════
function SideBadge({ side }: { side: BulkTrade['side'] }) {
  if (side === 'buy') {
    return (
      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-bull-green/15 text-bull-green">
        <TrendingUp size={11} /> BUY
      </span>
    );
  }
  if (side === 'sell') {
    return (
      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-bear-red/15 text-bear-red">
        <TrendingDown size={11} /> SELL
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-neutral-yellow/15 text-neutral-yellow">
      —
    </span>
  );
}
