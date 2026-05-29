// ═══════════════════════════════════════════════════════════════════════════
//  IPO PIPELINE
//  Sub-section of /ipo-zone  (tab: pipeline, default)
// ═══════════════════════════════════════════════════════════════════════════
//
//  Shows all IPO / FPO / Rights / MF issuances with full detail:
//    • Status + dates (open / close / allotment / listing)
//    • Issue price, face value, share structure (total / public / promoter)
//    • Financial metrics: EPS, NAV, P/E, net profit, paid-up capital
//    • Issue purpose, banker, credit rating
//    • Oversubscription ratio (badge)
//  Layout: status-filter pills → vertical timeline (mobile) + grid toggle (desktop)
// ═══════════════════════════════════════════════════════════════════════════

import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  Rocket, Calendar, Search, Filter, ExternalLink, Info,
  TrendingUp, Building, BarChart3, Layers, Clock, CheckCircle2,
  ChevronRight, LayoutGrid, AlignLeft, Award,
} from 'lucide-react';
import { useIpo } from '../../hooks/useNepseData';
import { formatNPR } from '../../utils';

// ─────────────────────────────────────────────────────────────────────────
//  Status config
// ─────────────────────────────────────────────────────────────────────────
const STATUS_CONFIG = {
  open: {
    label: 'Open Now',
    dot: 'bg-bull-green animate-pulse',
    badge: 'bg-bull-green/15 text-bull-green border border-bull-green/30',
    border: 'border-bull-green/30',
    accent: 'brand-cyan',
  },
  upcoming: {
    label: 'Upcoming',
    dot: 'bg-neutral-yellow',
    badge: 'bg-neutral-yellow/15 text-neutral-yellow border border-neutral-yellow/30',
    border: 'border-neutral-yellow/20',
    accent: 'brand-gold',
  },
  closed: {
    label: 'Closed',
    dot: 'bg-bear-red',
    badge: 'bg-bear-red/10 text-bear-red border border-bear-red/20',
    border: 'border-bg-border',
    accent: 'brand-violet',
  },
} as const;

type StatusKey = keyof typeof STATUS_CONFIG;

// ─────────────────────────────────────────────────────────────────────────
//  Helpers
// ─────────────────────────────────────────────────────────────────────────
function ratingColor(rating: string | null | undefined): string {
  if (!rating) return 'text-text-muted';
  const r = rating.toUpperCase();
  if (r.includes('AAA') || r.includes('AA')) return 'text-bull-green';
  if (r.includes('A')) return 'text-brand-cyan';
  if (r.includes('BBB')) return 'text-brand-gold';
  if (r.includes('BB')) return 'text-neutral-yellow';
  return 'text-bear-red';
}

function OversubBadge({ ratio }: { ratio: number | null | undefined }) {
  if (!ratio) return null;
  const color = ratio >= 5 ? 'bg-bull-green/15 text-bull-green border-bull-green/30'
    : ratio >= 2 ? 'bg-brand-cyan/15 text-brand-cyan border-brand-cyan/30'
    : 'bg-neutral-yellow/15 text-neutral-yellow border-neutral-yellow/30';
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border ${color}`}>
      <TrendingUp size={9} /> {ratio}x subscribed
    </span>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
//  MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════
export default function IPOPipeline() {
  const { data: ipos, isLoading } = useIpo();
  const [statusFilter, setStatusFilter] = useState<StatusKey | 'all'>('all');
  const [search, setSearch] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'timeline'>('grid');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const ipoData: any[] = ipos || [];

  const filtered = useMemo(() => {
    return ipoData.filter((ipo) => {
      const statusOk = statusFilter === 'all' || ipo.status === statusFilter;
      const q = search.toLowerCase();
      const searchOk = !q || ipo.company?.toLowerCase().includes(q) || ipo.symbol?.toLowerCase().includes(q) || ipo.sector?.toLowerCase().includes(q);
      return statusOk && searchOk;
    });
  }, [ipoData, statusFilter, search]);

  // Count per status for badge numbers
  const counts = useMemo(() => ({
    all: ipoData.length,
    open: ipoData.filter((i) => i.status === 'open').length,
    upcoming: ipoData.filter((i) => i.status === 'upcoming').length,
    closed: ipoData.filter((i) => i.status === 'closed').length,
  }), [ipoData]);

  return (
    <div className="space-y-5">
      {/* ═════════════ CONTROLS ═════════════ */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Status pills */}
        <div className="flex flex-wrap gap-1.5">
          {(['all', 'open', 'upcoming', 'closed'] as const).map((s) => {
            const active = statusFilter === s;
            const cfg = s !== 'all' ? STATUS_CONFIG[s] : null;
            return (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                  active
                    ? 'bg-brand-cyan/15 text-brand-cyan border-brand-cyan/40'
                    : 'border-bg-border text-text-secondary hover:text-text-primary hover:bg-bg-elevated/50'
                }`}
              >
                {cfg && <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot.split(' ')[0]}`} />}
                {s === 'all' ? 'All Issues' : STATUS_CONFIG[s].label}
                <span className="font-jetbrains opacity-70">({counts[s]})</span>
              </button>
            );
          })}
        </div>

        <div className="flex-1" />

        {/* Search */}
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
          <input
            type="text"
            placeholder="Search company, symbol…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input-field pl-8 text-sm w-56"
          />
        </div>

        {/* View toggle */}
        <div className="flex rounded-lg overflow-hidden border border-bg-border">
          <button
            onClick={() => setViewMode('grid')}
            className={`p-2 transition-colors ${viewMode === 'grid' ? 'bg-brand-cyan/15 text-brand-cyan' : 'text-text-muted hover:bg-bg-elevated'}`}
            title="Grid view"
          >
            <LayoutGrid size={16} />
          </button>
          <button
            onClick={() => setViewMode('timeline')}
            className={`p-2 transition-colors ${viewMode === 'timeline' ? 'bg-brand-cyan/15 text-brand-cyan' : 'text-text-muted hover:bg-bg-elevated'}`}
            title="Timeline view"
          >
            <AlignLeft size={16} />
          </button>
        </div>
      </div>

      {/* ═════════════ LOADING ═════════════ */}
      {isLoading && (
        <div className="card p-16 text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-brand-cyan mx-auto mb-4" />
          <p className="text-text-muted">Loading IPO pipeline…</p>
        </div>
      )}

      {/* ═════════════ EMPTY ═════════════ */}
      {!isLoading && filtered.length === 0 && (
        <div className="card p-16 text-center text-text-muted">
          <Rocket size={40} className="mx-auto mb-4 opacity-20" />
          <p>No issues match this filter.</p>
        </div>
      )}

      {/* ═════════════ GRID VIEW ═════════════ */}
      {!isLoading && viewMode === 'grid' && filtered.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {filtered.map((ipo, idx) => (
            <IpoCard
              key={ipo.id}
              ipo={ipo}
              idx={idx}
              expanded={expandedId === ipo.id}
              onToggle={() => setExpandedId(expandedId === ipo.id ? null : ipo.id)}
            />
          ))}
        </div>
      )}

      {/* ═════════════ TIMELINE VIEW ═════════════ */}
      {!isLoading && viewMode === 'timeline' && filtered.length > 0 && (
        <div className="relative border-l-2 border-bg-border ml-4 space-y-0">
          {filtered.map((ipo, idx) => (
            <TimelineRow key={ipo.id} ipo={ipo} idx={idx} />
          ))}
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
//  Sub-component: Full-detail IPO card (grid view)
// ═══════════════════════════════════════════════════════════════════════════
function IpoCard({
  ipo, idx, expanded, onToggle,
}: {
  ipo: any; idx: number; expanded: boolean; onToggle: () => void;
}) {
  const cfg = STATUS_CONFIG[ipo.status as StatusKey] || STATUS_CONFIG.closed;
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: idx * 0.06 }}
      className={`card flex flex-col border ${cfg.border} transition-colors`}
    >
      {/* ── Card header ── */}
      <div className="p-5 border-b border-bg-border/60">
        <div className="flex justify-between items-start gap-2 mb-2">
          <div className="min-w-0">
            <div className="text-[10px] uppercase font-bold tracking-widest text-text-muted mb-0.5">
              {ipo.type} · {ipo.sector}
            </div>
            <h3 className="font-syne font-bold text-text-primary leading-tight">
              {ipo.company}
            </h3>
            {ipo.symbol && (
              <span className="text-xs font-jetbrains text-brand-cyan">{ipo.symbol}</span>
            )}
          </div>
          <div className="shrink-0 flex flex-col items-end gap-1.5">
            <span className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-[10px] font-bold ${cfg.badge}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot.split(' ')[0]}`} />
              {cfg.label}
            </span>
            {ipo.oversubscriptionRatio && (
              <OversubBadge ratio={ipo.oversubscriptionRatio} />
            )}
          </div>
        </div>
      </div>

      {/* ── Key metrics grid ── */}
      <div className="p-4 grid grid-cols-2 gap-2">
        <MetricCell label="Issue Price" value={`Rs. ${ipo.price}`} mono />
        <MetricCell label="Face Value" value={`Rs. ${ipo.faceValue ?? 100}`} mono />
        <MetricCell label="Public Units" value={(ipo.units ?? 0).toLocaleString()} mono />
        <MetricCell label="Listed Shares" value={(ipo.listedShares ?? 0).toLocaleString()} mono />
        <MetricCell label="Open Date" value={ipo.openDate} />
        <MetricCell label="Close Date" value={ipo.closeDate} />
        {ipo.allotmentDate && <MetricCell label="Allotment" value={ipo.allotmentDate} />}
        {ipo.listingDate && <MetricCell label="Listing" value={ipo.listingDate} />}
      </div>

      {/* ── Issue manager + rating ── */}
      <div className="px-4 pb-2 space-y-1.5">
        <div className="flex justify-between text-xs">
          <span className="text-text-muted flex items-center gap-1"><Building size={11} /> Issue Manager</span>
          <span className="text-text-secondary font-medium text-right max-w-[180px] truncate">{ipo.banker}</span>
        </div>
        {ipo.rating && (
          <div className="flex justify-between text-xs">
            <span className="text-text-muted flex items-center gap-1"><Award size={11} /> Credit Rating</span>
            <span className={`font-bold ${ratingColor(ipo.rating)}`}>{ipo.rating}</span>
          </div>
        )}
        {ipo.minApplication && (
          <div className="flex justify-between text-xs">
            <span className="text-text-muted">Min / Max Application</span>
            <span className="text-text-secondary font-jetbrains">
              {ipo.minApplication} / {ipo.maxApplication} units
            </span>
          </div>
        )}
      </div>

      {/* ── Expand for financials ── */}
      <button
        onClick={onToggle}
        className="mx-4 mb-3 mt-1 flex items-center justify-between gap-2 text-xs font-medium text-brand-cyan hover:text-brand-cyan/80 py-2 px-3 rounded-lg bg-brand-cyan/[0.06] hover:bg-brand-cyan/10 transition-colors"
      >
        <span className="flex items-center gap-1.5"><BarChart3 size={13} /> Company Financials</span>
        <ChevronRight size={13} className={`transition-transform ${expanded ? 'rotate-90' : ''}`} />
      </button>

      {/* ── Financial details (expanded) ── */}
      {expanded && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          className="border-t border-bg-border/60 p-4 space-y-2"
        >
          <div className="text-[10px] uppercase font-bold tracking-widest text-text-muted mb-2 flex items-center gap-1">
            <Info size={11} /> Financial Snapshot (Pre-IPO)
          </div>
          <div className="grid grid-cols-2 gap-2">
            {ipo.eps != null && <MetricCell label="EPS (Rs.)" value={ipo.eps?.toFixed(2)} mono highlight />}
            {ipo.nav != null && <MetricCell label="NAV (Rs.)" value={ipo.nav?.toFixed(2)} mono />}
            {ipo.peRatio != null && <MetricCell label="P/E Ratio" value={ipo.peRatio?.toFixed(2)} mono />}
            {ipo.bookValue != null && <MetricCell label="Book Value" value={`Rs. ${ipo.bookValue?.toFixed(2)}`} mono />}
            {ipo.netProfit != null && <MetricCell label="Net Profit" value={formatNPR(ipo.netProfit, true)} />}
            {ipo.paidUpCapital != null && <MetricCell label="Paid-up Capital" value={formatNPR(ipo.paidUpCapital, true)} />}
            {ipo.promoterShares != null && <MetricCell label="Promoter Shares" value={ipo.promoterShares.toLocaleString()} mono />}
            {ipo.publicShares != null && <MetricCell label="Public Shares" value={ipo.publicShares.toLocaleString()} mono />}
          </div>
          {ipo.purpose && (
            <div className="mt-3 p-3 rounded-lg bg-bg-base border border-bg-border">
              <div className="text-[10px] uppercase font-bold tracking-wider text-text-muted mb-1 flex items-center gap-1">
                <Layers size={10} /> Purpose of Issue
              </div>
              <p className="text-xs text-text-secondary leading-relaxed">{ipo.purpose}</p>
            </div>
          )}
        </motion.div>
      )}

      {/* ── Actions ── */}
      <div className="flex gap-2 px-4 pb-4 mt-auto pt-2">
        <a
          href="https://meroshare.cdsc.com.np/"
          target="_blank"
          rel="noreferrer"
          className={`flex-1 py-2 text-xs flex items-center justify-center gap-1.5 rounded-lg font-semibold transition-all
            ${ipo.status === 'open'
              ? 'bg-brand-cyan text-bg-base hover:bg-brand-cyan/90'
              : 'bg-bg-elevated border border-bg-border text-text-secondary hover:bg-bg-elevated/80'}`}
        >
          {ipo.status === 'open' ? <><Rocket size={13} /> Apply on MeroShare</> : <><ExternalLink size={13} /> MeroShare</>}
        </a>
      </div>
    </motion.div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
//  Sub-component: Timeline row (compact, horizontal)
// ═══════════════════════════════════════════════════════════════════════════
function TimelineRow({ ipo, idx }: { ipo: any; idx: number }) {
  const cfg = STATUS_CONFIG[ipo.status as StatusKey] || STATUS_CONFIG.closed;
  const [expanded, setExpanded] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, x: -12 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: idx * 0.05 }}
      className="relative pl-8 pb-6"
    >
      {/* Dot */}
      <div className={`absolute left-0 top-2 w-3.5 h-3.5 rounded-full border-2 border-bg-base -translate-x-1/2 ${cfg.dot.split(' ')[0]}`} />

      <div className={`card border ${cfg.border} p-4`}>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${cfg.badge}`}>
                {cfg.label}
              </span>
              <span className="text-[10px] uppercase font-bold tracking-widest text-text-muted">
                {ipo.type} · {ipo.sector}
              </span>
              {ipo.oversubscriptionRatio && <OversubBadge ratio={ipo.oversubscriptionRatio} />}
            </div>
            <h4 className="font-syne font-bold text-text-primary">{ipo.company}</h4>
            {ipo.symbol && <span className="text-xs font-jetbrains text-brand-cyan">{ipo.symbol}</span>}
          </div>

          <div className="flex flex-wrap items-center gap-4 text-xs shrink-0">
            <div className="text-right">
              <div className="text-[10px] text-text-muted uppercase">Issue Price</div>
              <div className="font-jetbrains font-bold text-text-primary">Rs. {ipo.price}</div>
            </div>
            <div className="text-right">
              <div className="text-[10px] text-text-muted uppercase">Public Units</div>
              <div className="font-jetbrains font-bold text-text-primary">{(ipo.units ?? 0).toLocaleString()}</div>
            </div>
            <div className="text-right">
              <div className="text-[10px] text-text-muted uppercase">
                {ipo.status === 'open' ? 'Closes' : ipo.status === 'upcoming' ? 'Opens' : 'Allotment'}
              </div>
              <div className="font-jetbrains text-text-secondary">
                {ipo.status === 'open' ? ipo.closeDate : ipo.status === 'upcoming' ? ipo.openDate : (ipo.allotmentDate || 'TBD')}
              </div>
            </div>
            <button
              onClick={() => setExpanded((v) => !v)}
              className="p-1.5 rounded text-text-muted hover:text-brand-cyan hover:bg-brand-cyan/10 transition-colors"
              title={expanded ? 'Collapse' : 'Expand details'}
            >
              <ChevronRight size={16} className={`transition-transform ${expanded ? 'rotate-90' : ''}`} />
            </button>
          </div>
        </div>

        {expanded && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="mt-4 pt-4 border-t border-bg-border/60 grid grid-cols-2 md:grid-cols-4 gap-3"
          >
            {ipo.eps != null && <MetricCell label="EPS" value={`Rs. ${ipo.eps?.toFixed(2)}`} mono highlight />}
            {ipo.nav != null && <MetricCell label="NAV" value={`Rs. ${ipo.nav?.toFixed(2)}`} mono />}
            {ipo.peRatio != null && <MetricCell label="P/E" value={ipo.peRatio?.toFixed(2)} mono />}
            {ipo.netProfit != null && <MetricCell label="Net Profit" value={formatNPR(ipo.netProfit, true)} />}
            <MetricCell label="Issue Manager" value={ipo.banker} />
            {ipo.rating && (
              <div className="p-2.5 rounded-lg bg-bg-base/50 border border-bg-border/30">
                <div className="text-[10px] text-text-muted uppercase mb-1">Rating</div>
                <div className={`text-sm font-bold ${ratingColor(ipo.rating)}`}>{ipo.rating}</div>
              </div>
            )}
            {ipo.purpose && (
              <div className="col-span-2 md:col-span-4 p-3 rounded-lg bg-bg-base border border-bg-border">
                <div className="text-[10px] uppercase font-bold tracking-wider text-text-muted mb-1">Purpose</div>
                <p className="text-xs text-text-secondary leading-relaxed">{ipo.purpose}</p>
              </div>
            )}
          </motion.div>
        )}
      </div>
    </motion.div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
//  Sub-component: Single metric cell
// ═══════════════════════════════════════════════════════════════════════════
function MetricCell({
  label, value, mono, highlight,
}: {
  label: string; value: string | number | null | undefined; mono?: boolean; highlight?: boolean;
}) {
  return (
    <div className="p-2.5 rounded-lg bg-bg-base/50 border border-bg-border/30">
      <div className="text-[10px] text-text-muted uppercase mb-1 truncate">{label}</div>
      <div className={`text-sm font-bold truncate ${mono ? 'font-jetbrains' : ''} ${highlight ? 'text-brand-cyan' : 'text-text-primary'}`}>
        {value ?? '—'}
      </div>
    </div>
  );
}
