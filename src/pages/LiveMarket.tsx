// ═══════════════════════════════════════════════════════════════════════════
//  PAGE: Live Market — sub-navigation shell
//  Route: /live-market
// ═══════════════════════════════════════════════════════════════════════════
//
//  This page now hosts THREE sub-sections:
//
//    1. Live Stocks    — sortable/filterable board of every live scrip
//    2. Circuit Watch  — probability-scored tracker for stocks approaching
//                        or already locked at NEPSE's ±10% price band
//    3. Bulk Deals     — single-contract block transactions (≥ 1k qty OR
//                        ≥ Rs. 10 lakh value), split by buy/sell side
//
//  The active sub-section is reflected in `?tab=...` so users can bookmark
//  and share a specific view (e.g. /live-market?tab=circuit).
// ═══════════════════════════════════════════════════════════════════════════

import { useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { LayoutList, Zap, Layers } from 'lucide-react';
import LiveStocksTable from './live-market/LiveStocksTable';
import CircuitWatch from './live-market/CircuitWatch';
import BulkDeals from './live-market/BulkDeals';

type TabId = 'stocks' | 'circuit' | 'bulk';

const TABS: { id: TabId; label: string; icon: typeof LayoutList; description: string }[] = [
  { id: 'stocks',  label: 'Live Stocks',   icon: LayoutList, description: 'All scrips with live LTP and turnover' },
  { id: 'circuit', label: 'Circuit Watch', icon: Zap,        description: 'Stocks approaching or locked at ±10% band' },
  { id: 'bulk',    label: 'Bulk Deals',    icon: Layers,     description: 'Large single-contract block trades' },
];

export default function LiveMarket() {
  const [params, setParams] = useSearchParams();
  const activeTab = useMemo<TabId>(() => {
    const raw = params.get('tab') as TabId | null;
    return raw === 'circuit' || raw === 'bulk' ? raw : 'stocks';
  }, [params]);

  const setTab = (tab: TabId) => {
    const next = new URLSearchParams(params);
    if (tab === 'stocks') next.delete('tab');
    else next.set('tab', tab);
    setParams(next, { replace: true });
  };

  const activeMeta = TABS.find((t) => t.id === activeTab)!;

  return (
    <div className="space-y-5">
      {/* ═════════════ HEADER ═════════════ */}
      <div className="flex flex-col gap-1">
        <h1 className="font-syne text-2xl font-bold">Live Market</h1>
        <p className="text-sm text-text-secondary">{activeMeta.description}</p>
      </div>

      {/* ═════════════ SUB-NAV TABS ═════════════ */}
      <div className="flex flex-wrap items-center gap-1.5 border-b border-bg-border pb-0">
        {TABS.map((t) => {
          const Icon = t.icon;
          const active = activeTab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`relative inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium transition-all border-b-2 -mb-px ${
                active
                  ? 'text-brand-cyan border-brand-cyan'
                  : 'text-text-secondary border-transparent hover:text-text-primary hover:border-bg-border'
              }`}
            >
              <Icon size={16} />
              {t.label}
              {t.id === 'circuit' && (
                <span className="ml-1 inline-flex items-center px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-brand-gold/15 text-brand-gold">
                  PRO
                </span>
              )}
              {t.id === 'bulk' && (
                <span className="ml-1 inline-flex items-center px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-brand-violet/15 text-brand-violet">
                  NEW
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* ═════════════ ACTIVE PANEL ═════════════ */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.25 }}
        >
          {activeTab === 'stocks' && <LiveStocksTable />}
          {activeTab === 'circuit' && <CircuitWatch />}
          {activeTab === 'bulk' && <BulkDeals />}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
