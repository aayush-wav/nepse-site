// ═══════════════════════════════════════════════════════════════════════════
//  PAGE: IPO Zone — sub-navigation shell
//  Route: /ipo-zone
// ═══════════════════════════════════════════════════════════════════════════
//
//  Two tabs:
//    1. Pipeline   (/ipo-zone)               — full IPO listing with financials
//    2. BOID Checker (/ipo-zone?tab=checker) — bulk allotment checker
// ═══════════════════════════════════════════════════════════════════════════

import { useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Rocket, KeyRound } from 'lucide-react';
import IPOPipeline from './ipo/IPOPipeline';
import BulkBoidChecker from './ipo/BulkBoidChecker';
import { useBoidStore } from '../store';

type TabId = 'pipeline' | 'checker';

export default function IPOZone() {
  const [params, setParams] = useSearchParams();
  const { boids } = useBoidStore();

  const activeTab = useMemo<TabId>(() => {
    return params.get('tab') === 'checker' ? 'checker' : 'pipeline';
  }, [params]);

  const setTab = (tab: TabId) => {
    const next = new URLSearchParams(params);
    if (tab === 'pipeline') next.delete('tab');
    else next.set('tab', tab);
    setParams(next, { replace: true });
  };

  return (
    <div className="space-y-5">
      {/* ═════════════ HEADER ═════════════ */}
      <div>
        <h1 className="font-syne text-2xl font-bold">IPO Zone</h1>
        <p className="text-sm text-text-secondary mt-0.5">
          Primary Market Hub — IPO, FPO, Rights &amp; Mutual Fund issuances
        </p>
      </div>

      {/* ═════════════ SUB-NAV TABS ═════════════ */}
      <div className="flex flex-wrap items-center gap-1.5 border-b border-bg-border pb-0">
        {([
          {
            id: 'pipeline' as TabId,
            label: 'IPO Pipeline',
            icon: Rocket,
            badge: null,
            description: 'All active, upcoming & closed issuances with financials',
          },
          {
            id: 'checker' as TabId,
            label: 'Bulk BOID Checker',
            icon: KeyRound,
            badge: boids.length > 0 ? String(boids.length) : null,
            description: 'Check allotment for up to 30 saved BOIDs at once',
          },
        ] as const).map((t) => {
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
              {t.badge && (
                <span className="inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full text-[10px] font-bold bg-brand-violet/20 text-brand-violet">
                  {t.badge}
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
          transition={{ duration: 0.22 }}
        >
          {activeTab === 'pipeline' && <IPOPipeline />}
          {activeTab === 'checker' && <BulkBoidChecker />}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
