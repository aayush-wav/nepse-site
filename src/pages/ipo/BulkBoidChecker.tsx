// ═══════════════════════════════════════════════════════════════════════════
//  BULK BOID CHECKER
//  Sub-section of /ipo-zone  (tab: checker)
// ═══════════════════════════════════════════════════════════════════════════
//
//  FEATURES
//  ────────
//  • Save up to 30 named BOIDs locally (Zustand + localStorage).
//  • Select which IPO result to check (auto-selects most recent closed IPO).
//  • "Check All" fires a single bulk POST to /api/ipo/check-bulk.
//  • Results displayed as a card grid:  ✓ Allotted (green)  ✗ Not Allotted (red).
//  • Per-entry remove / rename inline controls.
//  • BOID is always stored as plain text (no encryption) — same as how
//    MeroShare stores it in browser localStorage on cdsc.com.np.
// ═══════════════════════════════════════════════════════════════════════════

import { useState, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  UserPlus, Trash2, CheckCircle2, XCircle, Loader2, Search,
  Users, BadgeCheck, Trophy, RefreshCw, Edit3, Save, X, AlertCircle,
  KeyRound, ChevronDown,
} from 'lucide-react';
import { useBoidStore, type BoidEntry } from '../../store';
import { useIpo } from '../../hooks/useNepseData';
import { nepseApi } from '../../lib/api';

const MAX_BOIDS = 30;

// ─────────────────────────────────────────────────────────────────────────
//  Types
// ─────────────────────────────────────────────────────────────────────────
interface CheckResult {
  id: string;
  name: string;
  boid: string;
  status: 'success' | 'error';
  allotted: boolean;
  units: number;
  message: string;
}

interface BulkResult {
  companyId: string;
  results: CheckResult[];
  summary: { total: number; allotted: number; notAllotted: number; totalUnits: number };
}

// ═══════════════════════════════════════════════════════════════════════════
//  MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════
export default function BulkBoidChecker() {
  const { boids, addBoid, removeBoid, updateBoid } = useBoidStore();
  const { data: ipos } = useIpo();

  // Add form state
  const [newName, setNewName] = useState('');
  const [newBoid, setNewBoid] = useState('');
  const [addError, setAddError] = useState('');
  const nameInputRef = useRef<HTMLInputElement>(null);

  // Inline edit state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editBoid, setEditBoid] = useState('');

  // Check state
  const [selectedIpoId, setSelectedIpoId] = useState('');
  const [checking, setChecking] = useState(false);
  const [bulkResult, setBulkResult] = useState<BulkResult | null>(null);
  const [checkError, setCheckError] = useState('');

  // The IPOs that have results (closed) — auto-select most recent
  const closedIpos = useMemo(() => {
    return (ipos || []).filter((i: any) => i.status === 'closed' || i.allotmentDate);
  }, [ipos]);

  // Auto-select first closed IPO when list loads
  useMemo(() => {
    if (!selectedIpoId && closedIpos.length > 0) {
      setSelectedIpoId(closedIpos[0].id);
    }
  }, [closedIpos, selectedIpoId]);

  // ── Add BOID handler ──
  const handleAdd = () => {
    setAddError('');
    const result = addBoid(newName, newBoid);
    if (!result.ok) {
      setAddError(result.error || 'Could not add BOID.');
      return;
    }
    setNewName('');
    setNewBoid('');
    nameInputRef.current?.focus();
  };

  // ── Inline edit helpers ──
  const startEdit = (b: BoidEntry) => {
    setEditingId(b.id);
    setEditName(b.name);
    setEditBoid(b.boid);
  };
  const commitEdit = (id: string) => {
    if (editBoid.length !== 16 || !/^\d+$/.test(editBoid)) return;
    updateBoid(id, { name: editName, boid: editBoid });
    setEditingId(null);
  };

  // ── Bulk check handler ──
  const handleCheckAll = async () => {
    if (!selectedIpoId) { setCheckError('Please select an IPO first.'); return; }
    if (boids.length === 0) { setCheckError('Add at least one BOID before checking.'); return; }
    setCheckError('');
    setBulkResult(null);
    setChecking(true);
    try {
      const res = await nepseApi.checkAllotmentBulk(
        boids.map((b) => ({ id: b.id, name: b.name, boid: b.boid })),
        selectedIpoId
      );
      setBulkResult(res);
    } catch {
      setCheckError('Failed to reach server. Make sure the backend is running.');
    } finally {
      setChecking(false);
    }
  };

  const selectedIpo = (ipos || []).find((i: any) => i.id === selectedIpoId);

  return (
    <div className="space-y-6">
      {/* ═════════════ HEADER BANNER ═════════════ */}
      <div className="rounded-2xl border border-bg-border bg-bg-surface p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-brand-cyan/15 text-brand-cyan flex items-center justify-center shrink-0">
            <KeyRound size={24} />
          </div>
          <div>
            <h2 className="font-syne text-xl font-bold">Bulk BOID Checker</h2>
            <p className="text-sm text-text-secondary">
              Save up to {MAX_BOIDS} BOIDs — yours and your family's — and check IPO results all at once.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <div className="px-3 py-1.5 rounded-lg bg-bg-elevated border border-bg-border font-jetbrains">
            <span className={`font-bold ${boids.length >= MAX_BOIDS ? 'text-bear-red' : 'text-brand-cyan'}`}>
              {boids.length}
            </span>
            <span className="text-text-muted"> / {MAX_BOIDS} saved</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
        {/* ════════════════════════════════════════════════
            LEFT PANEL — Save / manage BOIDs
        ════════════════════════════════════════════════ */}
        <div className="lg:col-span-2 space-y-4">
          <div className="card p-4 space-y-4">
            <div className="font-syne font-bold flex items-center gap-2">
              <UserPlus size={16} className="text-brand-cyan" /> Add a BOID
            </div>

            <div className="space-y-2">
              <div>
                <label className="block text-[10px] uppercase font-bold text-text-muted mb-1">Label (name / relation)</label>
                <input
                  ref={nameInputRef}
                  type="text"
                  placeholder="e.g. My BOID, Dad, Mum…"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  maxLength={30}
                  className="input-field w-full text-sm"
                  onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
                />
              </div>
              <div>
                <label className="block text-[10px] uppercase font-bold text-text-muted mb-1">16-digit BOID</label>
                <input
                  type="text"
                  placeholder="1301234567890123"
                  value={newBoid}
                  onChange={(e) => setNewBoid(e.target.value.replace(/\D/g, '').slice(0, 16))}
                  className="input-field w-full text-sm font-jetbrains tracking-widest"
                  onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
                />
                <div className="flex justify-between mt-1">
                  <span className="text-[10px] text-text-muted">Starts with 1301…</span>
                  <span className={`text-[10px] font-jetbrains ${newBoid.length === 16 ? 'text-bull-green' : 'text-text-muted'}`}>
                    {newBoid.length}/16
                  </span>
                </div>
              </div>

              {addError && (
                <div className="flex items-center gap-2 text-xs text-bear-red bg-bear-red/10 border border-bear-red/20 rounded-lg px-3 py-2">
                  <AlertCircle size={14} /> {addError}
                </div>
              )}

              <button
                onClick={handleAdd}
                disabled={newBoid.length !== 16 || boids.length >= MAX_BOIDS}
                className="btn-primary w-full py-2 text-sm flex items-center justify-center gap-2 disabled:opacity-40"
              >
                <UserPlus size={15} /> Add BOID
              </button>
            </div>
          </div>

          {/* ── IPO selector ── */}
          <div className="card p-4 space-y-3">
            <div className="font-syne font-bold flex items-center gap-2">
              <Search size={16} className="text-brand-violet" /> Select IPO to Check
            </div>
            {closedIpos.length === 0 ? (
              <p className="text-xs text-text-muted italic">No closed IPOs with results yet.</p>
            ) : (
              <div className="relative">
                <select
                  value={selectedIpoId}
                  onChange={(e) => { setSelectedIpoId(e.target.value); setBulkResult(null); }}
                  className="input-field w-full text-sm pr-8 appearance-none"
                >
                  {closedIpos.map((ipo: any) => (
                    <option key={ipo.id} value={ipo.id}>
                      {ipo.company} ({ipo.symbol}) — {ipo.allotmentDate || 'TBD'}
                    </option>
                  ))}
                </select>
                <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none" />
              </div>
            )}
            {selectedIpo && (
              <div className="rounded-lg bg-bg-base border border-bg-border p-3 space-y-1.5">
                <div className="flex justify-between text-xs">
                  <span className="text-text-muted">Issue Price</span>
                  <span className="font-jetbrains font-bold text-text-primary">Rs. {selectedIpo.price}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-text-muted">Allotment Date</span>
                  <span className="font-jetbrains text-text-secondary">{selectedIpo.allotmentDate || 'TBD'}</span>
                </div>
                {selectedIpo.oversubscribed && (
                  <div className="flex justify-between text-xs">
                    <span className="text-text-muted">Oversubscribed</span>
                    <span className="font-bold text-brand-gold">{selectedIpo.oversubscribed}</span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* ── Check All CTA ── */}
          <button
            onClick={handleCheckAll}
            disabled={checking || boids.length === 0 || !selectedIpoId}
            className="w-full py-3 rounded-xl font-syne font-bold text-sm flex items-center justify-center gap-2
              bg-brand-cyan text-bg-base
              hover:bg-brand-cyan/90 transition-colors disabled:opacity-40"
          >
            {checking ? (
              <><Loader2 size={18} className="animate-spin" /> Checking {boids.length} BOIDs…</>
            ) : (
              <><RefreshCw size={18} /> Check All {boids.length} BOIDs</>
            )}
          </button>

          {checkError && (
            <div className="flex items-center gap-2 text-xs text-bear-red bg-bear-red/10 border border-bear-red/20 rounded-lg px-3 py-2.5">
              <AlertCircle size={14} /> {checkError}
            </div>
          )}
        </div>

        {/* ════════════════════════════════════════════════
            RIGHT PANEL — Saved BOIDs list + results
        ════════════════════════════════════════════════ */}
        <div className="lg:col-span-3 space-y-4">
          {/* ── Results summary bar (shows after check) ── */}
          <AnimatePresence>
            {bulkResult && (
              <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                className="grid grid-cols-2 md:grid-cols-4 gap-3"
              >
                <ResultKpi label="Checked" value={bulkResult.summary.total} hue="cyan" icon={<Users size={15} />} />
                <ResultKpi label="Allotted" value={bulkResult.summary.allotted} hue="green" icon={<BadgeCheck size={15} />} />
                <ResultKpi label="Not Allotted" value={bulkResult.summary.notAllotted} hue="red" icon={<XCircle size={15} />} />
                <ResultKpi label="Total Units" value={bulkResult.summary.totalUnits} hue="gold" icon={<Trophy size={15} />} />
              </motion.div>
            )}
          </AnimatePresence>

          {/* ── Saved BOID cards ── */}
          <div className="card overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-bg-border">
              <div className="font-syne font-bold flex items-center gap-2">
                <Users size={16} className="text-brand-cyan" />
                Saved BOIDs
                <span className="ml-1 font-jetbrains text-xs text-text-muted">({boids.length}/{MAX_BOIDS})</span>
              </div>
              {boids.length > 0 && !bulkResult && (
                <span className="text-[10px] text-text-muted italic">
                  Click "Check All" to see results
                </span>
              )}
            </div>

            {boids.length === 0 ? (
              <div className="p-12 text-center text-text-muted">
                <KeyRound size={32} className="mx-auto mb-3 opacity-20" />
                <p className="text-sm">No BOIDs saved yet.</p>
                <p className="text-xs mt-1 opacity-70">Add your BOID using the form on the left.</p>
              </div>
            ) : (
              <div className="divide-y divide-bg-border/40">
                {boids.map((b, idx) => {
                  const result = bulkResult?.results.find((r) => r.id === b.id);
                  const isEditing = editingId === b.id;
                  return (
                    <motion.div
                      key={b.id}
                      initial={{ opacity: 0, x: 10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: idx * 0.03 }}
                      className={`flex items-center gap-3 px-4 py-3 group transition-colors
                        ${result?.allotted === true ? 'bg-bull-green/[0.04]' : result?.allotted === false ? 'bg-bear-red/[0.03]' : 'hover:bg-bg-elevated/40'}`}
                    >
                      {/* Index */}
                      <span className="text-[11px] font-jetbrains text-text-muted w-5 shrink-0">
                        {idx + 1}
                      </span>

                      {/* Edit or display */}
                      {isEditing ? (
                        <div className="flex-1 flex items-center gap-2">
                          <input
                            value={editName}
                            onChange={(e) => setEditName(e.target.value)}
                            className="input-field text-xs py-1 w-28"
                            placeholder="Name"
                          />
                          <input
                            value={editBoid}
                            onChange={(e) => setEditBoid(e.target.value.replace(/\D/g, '').slice(0, 16))}
                            className="input-field text-xs py-1 font-jetbrains flex-1"
                            placeholder="16-digit BOID"
                          />
                          <button onClick={() => commitEdit(b.id)} className="text-brand-cyan hover:text-brand-cyan/80">
                            <Save size={14} />
                          </button>
                          <button onClick={() => setEditingId(null)} className="text-text-muted hover:text-text-primary">
                            <X size={14} />
                          </button>
                        </div>
                      ) : (
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-sm text-text-primary truncate">{b.name}</span>
                            {result && (
                              <ResultPill allotted={result.allotted} units={result.units} />
                            )}
                          </div>
                          <span className="font-jetbrains text-xs text-text-muted tracking-widest">
                            {b.boid.slice(0, 4)} {b.boid.slice(4, 8)} {b.boid.slice(8, 12)} {b.boid.slice(12, 16)}
                          </span>
                          {result?.message && (
                            <p className={`text-[11px] mt-0.5 ${result.allotted ? 'text-bull-green' : 'text-bear-red'}`}>
                              {result.message}
                            </p>
                          )}
                        </div>
                      )}

                      {/* Actions (visible on hover, not during edit) */}
                      {!isEditing && (
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                          <button
                            onClick={() => startEdit(b)}
                            className="p-1.5 rounded text-text-muted hover:text-brand-cyan hover:bg-brand-cyan/10 transition-colors"
                            title="Edit"
                          >
                            <Edit3 size={14} />
                          </button>
                          <button
                            onClick={() => removeBoid(b.id)}
                            className="p-1.5 rounded text-text-muted hover:text-bear-red hover:bg-bear-red/10 transition-colors"
                            title="Remove"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      )}

                      {/* Result icon (always visible when results exist) */}
                      {result && !isEditing && (
                        <div className="shrink-0">
                          {result.allotted
                            ? <CheckCircle2 size={20} className="text-bull-green" />
                            : <XCircle size={20} className="text-bear-red" />}
                        </div>
                      )}
                    </motion.div>
                  );
                })}
              </div>
            )}
          </div>

          {/* ── Disclaimer ── */}
          <div className="rounded-xl border border-bg-border bg-bg-surface px-4 py-3 text-xs text-text-muted leading-relaxed">
            <strong className="text-text-secondary">Privacy:</strong> BOIDs are stored only
            in your browser's localStorage — they never leave your device unless you click
            "Check All", at which point they are sent to the local backend for result lookup.
            No BOID data is logged or stored on any server.
          </div>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
//  Sub-component: Result KPI card
// ═══════════════════════════════════════════════════════════════════════════
function ResultKpi({
  label, value, hue, icon,
}: {
  label: string; value: number; hue: 'cyan' | 'green' | 'red' | 'gold'; icon: React.ReactNode;
}) {
  const cls = {
    cyan:  'border-brand-cyan/30 bg-brand-cyan/10 text-brand-cyan',
    green: 'border-bull-green/30 bg-bull-green/10 text-bull-green',
    red:   'border-bear-red/30 bg-bear-red/10 text-bear-red',
    gold:  'border-brand-gold/30 bg-brand-gold/10 text-brand-gold',
  }[hue];
  return (
    <div className={`rounded-xl border ${cls} p-3`}>
      <div className="flex items-center gap-1.5 text-xs font-medium opacity-90">{icon} {label}</div>
      <div className="mt-1 font-syne text-2xl font-black text-text-primary">{value}</div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
//  Sub-component: Inline allotment pill (shown in BOID row)
// ═══════════════════════════════════════════════════════════════════════════
function ResultPill({ allotted, units }: { allotted: boolean; units: number }) {
  if (allotted) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-bull-green/15 text-bull-green">
        <CheckCircle2 size={10} /> {units} units
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-bear-red/15 text-bear-red">
      <XCircle size={10} /> Not allotted
    </span>
  );
}
