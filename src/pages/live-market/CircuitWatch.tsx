// ═══════════════════════════════════════════════════════════════════════════
//  CIRCUIT WATCH — Live Circuit-Breaker Probability Tracker
//  Sub-section of /live-market
// ═══════════════════════════════════════════════════════════════════════════
//
//  WHAT THIS DOES
//  --------------
//  Surfaces NEPSE equities that are likely to hit (or have already hit) their
//  daily ±10% price band, split into four buckets:
//
//    1. AT UPPER CIRCUIT  — stock is locked at +10% (no sellers)
//    2. WATCH UPPER       — stock is trending up hard but not yet locked
//    3. WATCH LOWER       — stock is bleeding hard but not yet locked
//    4. AT LOWER CIRCUIT  — stock is locked at -10% (no buyers)
//
//  RESEARCH BASIS — Circuit-proximity scoring
//  ------------------------------------------
//  We build a 0–100 score using ONLY data already available on the live
//  market endpoint (no extra API calls). The factors are weighted as follows:
//
//    Factor                                       Weight   Why it matters
//    ──────────────────────────────────────────────────────────────────────
//    A. Percent move toward band                   55%     Primary; closer
//                                                          to ±10% = closer
//                                                          to circuit.
//    B. LTP position vs day extreme               20%     LTP at day-high =
//                                                          buyers still in
//                                                          control (vs. a
//                                                          pulled-back tape
//                                                          where momentum
//                                                          has died).
//    C. Band coverage (day range vs full band)    15%     Stock that has
//                                                          swept most of
//                                                          its 20% band has
//                                                          directional
//                                                          conviction.
//    D. Turnover intensity                        10%     Volume confirms
//                                                          momentum (log-
//                                                          scaled so a few
//                                                          mega trades
//                                                          don't dominate).
//
//  TUNING
//  ------
//  • Locked threshold:  |changePercent| ≥ 9.95 (configurable via
//    CIRCUIT_LOCK_TOLERANCE in constants).
//  • Watch threshold:   score ≥ CIRCUIT_WATCH_MIN_SCORE (55).
//  • Danger threshold:  score ≥ CIRCUIT_DANGER_SCORE (80, gold pulse).
//
//  All weights live in WEIGHTS below so analysts can tune them in one place.
// ═══════════════════════════════════════════════════════════════════════════

import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  TrendingUp, TrendingDown, AlertTriangle, Lock, Activity,
  ArrowUpCircle, ArrowDownCircle, Flame, Info,
} from 'lucide-react';
import { useLiveTrading } from '../../hooks/useNepseData';
import { formatNepaliNumber, formatPercent, formatNPR } from '../../utils';
import {
  NEPSE_STOCK_CIRCUIT_PCT,
  CIRCUIT_LOCK_TOLERANCE,
  CIRCUIT_WATCH_MIN_SCORE,
  CIRCUIT_DANGER_SCORE,
} from '../../constants';

// ─────────────────────────────────────────────────────────────────────────
//  Type derived from useLiveTrading() raw rows
// ─────────────────────────────────────────────────────────────────────────
interface CircuitCandidate {
  symbol: string;
  companyName: string;
  ltp: number;
  previousClose: number;
  changePercent: number;
  high: number;
  low: number;
  volume: number;
  turnover: number;
  upperCircuit: number;     // previousClose * 1.10
  lowerCircuit: number;     // previousClose * 0.90
  distanceToUpperPct: number; // how many % away from upper (positive = below)
  distanceToLowerPct: number; // how many % away from lower (positive = above)
  bandUsedPct: number;      // (high - low) / previousClose * 100, max 20
  upperScore: number;       // 0-100 — likelihood of hitting upper circuit
  lowerScore: number;       // 0-100 — likelihood of hitting lower circuit
  status: 'locked-up' | 'locked-down' | 'watch-up' | 'watch-down' | 'neutral';
}

// ─────────────────────────────────────────────────────────────────────────
//  Score weights — tune here, not buried in calculations
// ─────────────────────────────────────────────────────────────────────────
const WEIGHTS = {
  percentMove: 0.55,
  ltpExtreme: 0.20,
  bandCoverage: 0.15,
  turnoverIntensity: 0.10,
};

// Clamp helper
const clamp01 = (n: number) => Math.max(0, Math.min(1, n));

// Log-scaled turnover signal: Rs 0 → 0, Rs 1Cr (10M) → ~1
const turnoverIntensity = (turnover: number) => {
  if (turnover <= 0) return 0;
  return clamp01(Math.log10(turnover) / 7); // 10^7 = 1Cr
};

// ═══════════════════════════════════════════════════════════════════════════
//  CIRCUIT-PROXIMITY SCORING (the brain of this page)
// ═══════════════════════════════════════════════════════════════════════════
function scoreStock(row: any): CircuitCandidate | null {
  const ltp = Number(row.lastTradedPrice ?? row.ltp ?? 0);
  const previousClose = Number(row.previousClose ?? 0);
  const high = Number(row.highPrice ?? row.high ?? ltp);
  const low = Number(row.lowPrice ?? row.low ?? ltp);
  const volume = Number(row.totalTradeQuantity ?? row.volume ?? 0);
  const turnover = Number(row.totalTradeValue ?? row.totalTurnover ?? row.turnover ?? 0);
  const changePercent = Number(row.percentageChange ?? 0);

  if (!ltp || !previousClose || previousClose <= 0) return null;

  const upperCircuit = previousClose * (1 + NEPSE_STOCK_CIRCUIT_PCT / 100);
  const lowerCircuit = previousClose * (1 - NEPSE_STOCK_CIRCUIT_PCT / 100);
  // % of previousClose between current LTP and each band
  const distanceToUpperPct = ((upperCircuit - ltp) / previousClose) * 100;
  const distanceToLowerPct = ((ltp - lowerCircuit) / previousClose) * 100;

  // FACTOR A: percent move toward the band
  // For upper: changePercent / +10  (negative if moving away)
  // For lower: -changePercent / 10
  const moveUp = clamp01(changePercent / NEPSE_STOCK_CIRCUIT_PCT);
  const moveDown = clamp01(-changePercent / NEPSE_STOCK_CIRCUIT_PCT);

  // FACTOR B: LTP vs day extreme — at high = bullish, at low = bearish
  const dayRange = Math.max(high - low, 0.0001);
  const ltpPosition = clamp01((ltp - low) / dayRange); // 1 = at high, 0 = at low
  const extremeUp = ltpPosition;            // higher = closer to day high
  const extremeDown = 1 - ltpPosition;

  // FACTOR C: how much of the ±10% band has been used today
  const fullBand = previousClose * (NEPSE_STOCK_CIRCUIT_PCT * 2) / 100; // 20% range
  const bandUsedFraction = clamp01((high - low) / Math.max(fullBand, 0.0001));
  const bandUsedPct = bandUsedFraction * NEPSE_STOCK_CIRCUIT_PCT * 2;

  // FACTOR D: turnover intensity
  const turnoverScore = turnoverIntensity(turnover);

  // Combined 0-100
  const upperScore = Math.round(
    100 *
      (WEIGHTS.percentMove * moveUp +
        WEIGHTS.ltpExtreme * extremeUp +
        WEIGHTS.bandCoverage * bandUsedFraction +
        WEIGHTS.turnoverIntensity * turnoverScore),
  );

  const lowerScore = Math.round(
    100 *
      (WEIGHTS.percentMove * moveDown +
        WEIGHTS.ltpExtreme * extremeDown +
        WEIGHTS.bandCoverage * bandUsedFraction +
        WEIGHTS.turnoverIntensity * turnoverScore),
  );

  // Classify
  let status: CircuitCandidate['status'] = 'neutral';
  const lockedUpper = changePercent >= NEPSE_STOCK_CIRCUIT_PCT - CIRCUIT_LOCK_TOLERANCE;
  const lockedLower = changePercent <= -(NEPSE_STOCK_CIRCUIT_PCT - CIRCUIT_LOCK_TOLERANCE);
  if (lockedUpper) status = 'locked-up';
  else if (lockedLower) status = 'locked-down';
  else if (upperScore >= CIRCUIT_WATCH_MIN_SCORE && changePercent > 0) status = 'watch-up';
  else if (lowerScore >= CIRCUIT_WATCH_MIN_SCORE && changePercent < 0) status = 'watch-down';

  return {
    symbol: String(row.symbol || ''),
    companyName: String(row.securityName || row.companyName || row.symbol || ''),
    ltp, previousClose, changePercent, high, low, volume, turnover,
    upperCircuit, lowerCircuit,
    distanceToUpperPct, distanceToLowerPct,
    bandUsedPct,
    upperScore, lowerScore,
    status,
  };
}

// ═══════════════════════════════════════════════════════════════════════════
//  MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════
export default function CircuitWatch() {
  const navigate = useNavigate();
  const { data: rawData, isLoading, isError } = useLiveTrading();
  const [activeBucket, setActiveBucket] = useState<'all' | 'up' | 'down'>('all');

  // Score every stock and bucket them
  const { lockedUp, lockedDown, watchUp, watchDown, total } = useMemo(() => {
    if (!rawData?.length) {
      return { lockedUp: [], lockedDown: [], watchUp: [], watchDown: [], total: 0 };
    }
    const scored = rawData
      .map(scoreStock)
      .filter((c): c is CircuitCandidate => !!c && !!c.symbol);

    return {
      total: scored.length,
      lockedUp: scored
        .filter(c => c.status === 'locked-up')
        .sort((a, b) => b.turnover - a.turnover),
      lockedDown: scored
        .filter(c => c.status === 'locked-down')
        .sort((a, b) => b.turnover - a.turnover),
      watchUp: scored
        .filter(c => c.status === 'watch-up')
        .sort((a, b) => b.upperScore - a.upperScore)
        .slice(0, 30),
      watchDown: scored
        .filter(c => c.status === 'watch-down')
        .sort((a, b) => b.lowerScore - a.lowerScore)
        .slice(0, 30),
    };
  }, [rawData]);

  if (isLoading) {
    return (
      <div className="card p-12 text-center">
        <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-brand-cyan mx-auto" />
        <p className="mt-4 text-text-muted">Computing circuit probabilities…</p>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="card p-8 text-center text-bear-red">
        Failed to load live market data. Circuit watch needs live prices.
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* ═════════════ EXPLAINER BANNER ═════════════ */}
      <div className="rounded-2xl border border-bg-border bg-bg-surface p-4 flex items-start gap-3">
        <div className="shrink-0 w-9 h-9 rounded-xl bg-brand-cyan/15 text-brand-cyan flex items-center justify-center">
          <Activity size={18} />
        </div>
        <div className="text-sm text-text-secondary leading-relaxed">
          <strong className="text-text-primary">Circuit Watch</strong> tracks stocks
          approaching NEPSE&apos;s <strong>±{NEPSE_STOCK_CIRCUIT_PCT}%</strong> daily
          price band. Each stock gets a 0-100 probability score combining its current
          % move, position within the day range, band coverage, and turnover intensity.
          Stocks already locked at the band appear in the &quot;At Circuit&quot; lanes.
        </div>
      </div>

      {/* ═════════════ KPI ROW ═════════════ */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        <KpiCard
          label="At Upper Circuit"
          value={lockedUp.length}
          icon={<Lock size={18} />}
          accent="bull"
          subtitle="Locked at +10%"
          pulse={lockedUp.length > 0}
        />
        <KpiCard
          label="Watching Upper"
          value={watchUp.length}
          icon={<TrendingUp size={18} />}
          accent="bull-soft"
          subtitle={`Score ≥ ${CIRCUIT_WATCH_MIN_SCORE}`}
        />
        <KpiCard
          label="Total Tracked"
          value={total}
          icon={<Activity size={18} />}
          accent="cyan"
          subtitle="Live scrips"
        />
        <KpiCard
          label="Watching Lower"
          value={watchDown.length}
          icon={<TrendingDown size={18} />}
          accent="bear-soft"
          subtitle={`Score ≥ ${CIRCUIT_WATCH_MIN_SCORE}`}
        />
        <KpiCard
          label="At Lower Circuit"
          value={lockedDown.length}
          icon={<Lock size={18} />}
          accent="bear"
          subtitle="Locked at -10%"
          pulse={lockedDown.length > 0}
        />
      </div>

      {/* ═════════════ BUCKET FILTER PILLS ═════════════ */}
      <div className="flex flex-wrap items-center gap-2">
        {[
          { id: 'all',  label: 'Both Sides',   icon: Activity },
          { id: 'up',   label: 'Upper Only',   icon: ArrowUpCircle },
          { id: 'down', label: 'Lower Only',   icon: ArrowDownCircle },
        ].map((b) => {
          const Icon = b.icon;
          const active = activeBucket === b.id;
          return (
            <button
              key={b.id}
              onClick={() => setActiveBucket(b.id as any)}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all border ${
                active
                  ? 'bg-brand-cyan/15 text-brand-cyan border-brand-cyan/40'
                  : 'border-bg-border text-text-secondary hover:text-text-primary hover:bg-bg-elevated/50'
              }`}
            >
              <Icon size={14} /> {b.label}
            </button>
          );
        })}
      </div>

      {/* ═════════════ TWO-COLUMN BUCKET LAYOUT ═════════════ */}
      <div
        className={`grid gap-4 ${
          activeBucket === 'all' ? 'lg:grid-cols-2' : 'grid-cols-1'
        }`}
      >
        {(activeBucket === 'all' || activeBucket === 'up') && (
          <CircuitColumn
            kind="upper"
            locked={lockedUp}
            watch={watchUp}
            onRowClick={(s) => navigate(`/stock/${s}`)}
          />
        )}
        {(activeBucket === 'all' || activeBucket === 'down') && (
          <CircuitColumn
            kind="lower"
            locked={lockedDown}
            watch={watchDown}
            onRowClick={(s) => navigate(`/stock/${s}`)}
          />
        )}
      </div>

      {/* ═════════════ METHODOLOGY DISCLOSURE ═════════════ */}
      <details className="rounded-xl border border-bg-border bg-bg-surface p-4 text-sm">
        <summary className="cursor-pointer font-semibold text-text-primary flex items-center gap-2">
          <Info size={16} className="text-text-muted" /> How is the probability score computed?
        </summary>
        <div className="mt-3 space-y-2 text-text-secondary leading-relaxed">
          <p>
            For every live scrip we calculate two scores (upper and lower circuit
            likelihood) on a 0-100 scale. The score blends four signals:
          </p>
          <ul className="ml-5 list-disc space-y-1">
            <li><strong>55%</strong> — proximity of today&apos;s % change to ±{NEPSE_STOCK_CIRCUIT_PCT}%.</li>
            <li><strong>20%</strong> — where LTP sits in today&apos;s high/low range (closer to high = bullish pressure).</li>
            <li><strong>15%</strong> — how much of the ±{NEPSE_STOCK_CIRCUIT_PCT}% band has been swept by today&apos;s range.</li>
            <li><strong>10%</strong> — log-scaled turnover intensity (volume confirms momentum).</li>
          </ul>
          <p className="text-xs text-text-muted">
            Disclaimer: This is a heuristic, not a prediction. Stocks can hover near
            a band for hours without locking, and locked stocks can break the lock
            when matching orders arrive. Use for situational awareness, not as a
            buy/sell signal.
          </p>
        </div>
      </details>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
//  SUB-COMPONENT: KPI Card
// ═══════════════════════════════════════════════════════════════════════════
function KpiCard({
  label, value, icon, accent, subtitle, pulse,
}: {
  label: string; value: number; icon: React.ReactNode; subtitle?: string;
  accent: 'bull' | 'bear' | 'cyan' | 'bull-soft' | 'bear-soft';
  pulse?: boolean;
}) {
  const styles = {
    'bull':      'border-bull-green/40 bg-bull-green/10 text-bull-green',
    'bull-soft': 'border-bull-green/25 bg-bull-green/[0.06] text-bull-green',
    'bear':      'border-bear-red/40 bg-bear-red/10 text-bear-red',
    'bear-soft': 'border-bear-red/25 bg-bear-red/[0.06] text-bear-red',
    'cyan':      'border-brand-cyan/30 bg-brand-cyan/10 text-brand-cyan',
  }[accent];
  return (
    <div className={`relative rounded-xl border ${styles} p-3.5`}>
      {pulse && (
        <div className="absolute top-2 right-2 flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 bg-current" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-current" />
        </div>
      )}
      <div className="flex items-center gap-2 text-xs font-medium opacity-90">
        {icon} {label}
      </div>
      <div className="mt-1.5 font-syne text-3xl font-black">{value}</div>
      {subtitle && (
        <div className="mt-0.5 text-[11px] text-text-muted">{subtitle}</div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
//  SUB-COMPONENT: Bucket Column (locked rows + watch rows for one side)
// ═══════════════════════════════════════════════════════════════════════════
// Static class palettes (Tailwind JIT requires literal class names, no interpolation)
const PAL = {
  upper: {
    text: 'text-bull-green',
    bg15: 'bg-bull-green/15',
    bg05: 'bg-bull-green/[0.05]',
    bg30: 'bg-bull-green/30',
    bgFull: 'bg-bull-green',
  },
  lower: {
    text: 'text-bear-red',
    bg15: 'bg-bear-red/15',
    bg05: 'bg-bear-red/[0.05]',
    bg30: 'bg-bear-red/30',
    bgFull: 'bg-bear-red',
  },
} as const;

function CircuitColumn({
  kind, locked, watch, onRowClick,
}: {
  kind: 'upper' | 'lower';
  locked: CircuitCandidate[];
  watch: CircuitCandidate[];
  onRowClick: (symbol: string) => void;
}) {
  const isUpper = kind === 'upper';
  const HeadIcon = isUpper ? ArrowUpCircle : ArrowDownCircle;
  const pal = PAL[kind];

  return (
    <div className="card overflow-hidden">
      <div className={`flex items-center justify-between gap-2 px-4 py-3 border-b border-bg-border ${pal.bg05}`}>
        <div className="flex items-center gap-2">
          <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${pal.text} ${pal.bg15}`}>
            <HeadIcon size={18} />
          </div>
          <div>
            <div className="font-syne font-bold text-base">
              {isUpper ? 'Upper Circuit Activity' : 'Lower Circuit Activity'}
            </div>
            <div className="text-[11px] text-text-muted">
              {isUpper
                ? `Stocks near or locked at +${NEPSE_STOCK_CIRCUIT_PCT}%`
                : `Stocks near or locked at -${NEPSE_STOCK_CIRCUIT_PCT}%`}
            </div>
          </div>
        </div>
        <div className={`${pal.text} text-xs font-jetbrains`}>
          {locked.length + watch.length} stocks
        </div>
      </div>

      {/* ── LOCKED LANE ── */}
      <SubSection
        title={isUpper ? 'At Upper Circuit' : 'At Lower Circuit'}
        subtitle={isUpper ? 'Currently locked — buyers in queue, no sellers' : 'Currently locked — sellers in queue, no buyers'}
        icon={<Lock size={14} />}
        kind={kind}
        emptyText={isUpper ? 'No stocks locked at upper band right now.' : 'No stocks locked at lower band right now.'}
        stocks={locked}
        showLocked
        onRowClick={onRowClick}
      />

      <div className="border-t border-bg-border" />

      {/* ── WATCH LANE ── */}
      <SubSection
        title={isUpper ? 'Watch List — Pushing Up' : 'Watch List — Sliding Down'}
        subtitle={isUpper
          ? 'High probability of hitting +10% if momentum persists'
          : 'High probability of hitting -10% if pressure persists'}
        icon={isUpper ? <Flame size={14} /> : <AlertTriangle size={14} />}
        kind={kind}
        emptyText="No qualifying candidates."
        stocks={watch}
        onRowClick={onRowClick}
      />
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
//  SUB-COMPONENT: Sub-section (Locked lane or Watch lane)
// ═══════════════════════════════════════════════════════════════════════════
function SubSection({
  title, subtitle, icon, emptyText, stocks, kind, showLocked = false, onRowClick,
}: {
  title: string;
  subtitle: string;
  icon: React.ReactNode;
  emptyText: string;
  stocks: CircuitCandidate[];
  kind: 'upper' | 'lower';
  showLocked?: boolean;
  onRowClick: (symbol: string) => void;
}) {
  const pal = PAL[kind];
  return (
    <div className="p-3">
      <div className="flex items-center gap-2 px-2 py-1.5">
        <span className={pal.text}>{icon}</span>
        <div className="flex-1">
          <div className="text-xs font-bold uppercase tracking-wider text-text-primary">
            {title}
          </div>
          <div className="text-[10.5px] text-text-muted">{subtitle}</div>
        </div>
        <span className="font-jetbrains text-xs text-text-muted">{stocks.length}</span>
      </div>

      {stocks.length === 0 ? (
        <div className="text-center py-6 text-xs text-text-muted italic">
          {emptyText}
        </div>
      ) : (
        <div className="space-y-1.5 mt-1">
          {stocks.map((s, i) => (
            <motion.button
              key={s.symbol}
              initial={{ opacity: 0, x: kind === 'upper' ? -8 : 8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.02 }}
              onClick={() => onRowClick(s.symbol)}
              className="w-full text-left rounded-lg border border-bg-border bg-bg-base hover:border-brand-cyan/40 hover:bg-bg-elevated transition-colors px-3 py-2.5 group"
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  <span className="text-[10px] font-jetbrains text-text-muted w-5">
                    #{i + 1}
                  </span>
                  <div className="min-w-0">
                    <div className="font-syne font-bold text-sm text-text-primary truncate">
                      {s.symbol}
                    </div>
                    <div className="text-[10.5px] text-text-muted truncate max-w-[180px]">
                      {s.companyName}
                    </div>
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <div className="font-jetbrains text-sm font-semibold text-text-primary">
                    {formatNepaliNumber(s.ltp)}
                  </div>
                  <div className={`text-[11px] font-jetbrains font-bold ${pal.text}`}>
                    {formatPercent(s.changePercent)}
                  </div>
                </div>
              </div>

              <div className="mt-2 space-y-1">
                {showLocked ? (
                  <LockedBar kind={kind} />
                ) : (
                  <ProbabilityBar kind={kind} stock={s} />
                )}

                <div className="flex justify-between text-[10px] font-jetbrains text-text-muted">
                  <span>
                    {kind === 'upper'
                      ? `Circuit: ${formatNepaliNumber(s.upperCircuit)}`
                      : `Circuit: ${formatNepaliNumber(s.lowerCircuit)}`}
                  </span>
                  <span>Turnover: {formatNPR(s.turnover, true)}</span>
                </div>
              </div>
            </motion.button>
          ))}
        </div>
      )}
    </div>
  );
}

function LockedBar({ kind }: { kind: 'upper' | 'lower' }) {
  const pal = PAL[kind];
  return (
    <div className={`relative h-2 rounded-full ${pal.bg30} overflow-hidden`}>
      <div className={`absolute inset-0 ${pal.bgFull} animate-pulse`} style={{ width: '100%' }} />
      <div className="absolute inset-0 flex items-center justify-center">
        <Lock size={9} className="text-white drop-shadow" />
      </div>
    </div>
  );
}

function ProbabilityBar({ kind, stock }: { kind: 'upper' | 'lower'; stock: CircuitCandidate }) {
  const score = kind === 'upper' ? stock.upperScore : stock.lowerScore;
  const pal = PAL[kind];
  const isDanger = score >= CIRCUIT_DANGER_SCORE;
  return (
    <div>
      <div className="flex justify-between text-[10px] mb-0.5">
        <span className="text-text-muted">
          Probability {kind === 'upper' ? 'Upper' : 'Lower'}
        </span>
        <span className={`font-bold font-jetbrains ${pal.text} ${isDanger ? 'animate-pulse' : ''}`}>
          {score}/100 {isDanger && '⚠'}
        </span>
      </div>
      <div className="h-1.5 rounded-full bg-bg-elevated overflow-hidden">
        <div
          className={`h-full ${pal.bgFull} transition-all duration-500`}
          style={{ width: `${score}%` }}
        />
      </div>
    </div>
  );
}
