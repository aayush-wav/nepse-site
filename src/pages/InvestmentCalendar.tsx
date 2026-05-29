import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Rocket, LayoutDashboard, CheckCircle2, Search, Info, X, Loader2, Landmark, PieChart } from 'lucide-react';
import { useIpo, useDashboard } from '../hooks/useNepseData';
import { formatNepaliNumber } from '../utils';

export default function InvestmentCalendar() {
  const [activeTab, setActiveTab] = useState<'ipo' | 'agm' | 'dividend'>('ipo');
  
  // IPO State
  const [filter, setFilter] = useState<'all' | 'open' | 'upcoming' | 'closed'>('all');
  const [search, setSearch] = useState('');
  const { data: ipos, isLoading: ipoLoading } = useIpo();
  const [checkerOpen, setCheckerOpen] = useState(false);
  const [boid, setBoid] = useState('');
  const [selectedCompany, setSelectedCompany] = useState('');
  const [checkStatus, setCheckStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [checkResult, setCheckResult] = useState<any>(null);

  // Events State
  const { data: dashboard, isLoading: dashLoading } = useDashboard();
  const events = dashboard?.events || [];

  const ipoData = ipos || [];
  const filteredIpo = ipoData.filter((ipo: any) => {
    const statusMatch = filter === 'all' || ipo.status === filter;
    const searchMatch = ipo.company.toLowerCase().includes(search.toLowerCase()) || ipo.symbol?.toLowerCase().includes(search.toLowerCase());
    return statusMatch && searchMatch;
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'open': return <span className="badge-green animate-pulse">● Open</span>;
      case 'upcoming': return <span className="badge-yellow">Upcoming</span>;
      case 'closed': return <span className="badge-red">Closed</span>;
      default: return null;
    }
  };

  const handleCheckAllotment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (boid.length !== 16) {
      setCheckStatus('error');
      setCheckResult({ message: 'BOID must be exactly 16 digits' });
      return;
    }
    setCheckStatus('loading');
    setTimeout(() => {
      // Mock IPO check
      setCheckStatus('success');
      setCheckResult({ allotted: false, message: 'Sorry, not allotted for this BOID.' });
    }, 1500);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-brand-cyan/20 flex items-center justify-center text-brand-cyan">
            <LayoutDashboard size={22} />
          </div>
          <div>
            <h1 className="font-syne text-2xl font-bold">Investment Calendar</h1>
            <p className="text-xs text-text-secondary font-medium uppercase tracking-wider">IPO, AGM, Dividends & Corporate Events</p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-bg-border pb-px">
        {[
          { id: 'ipo', label: 'IPO / FPO / Right Share', icon: Rocket },
          { id: 'agm', label: 'AGM / SGM / Events', icon: Landmark },
          { id: 'dividend', label: 'Dividend History', icon: PieChart }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`flex items-center gap-2 px-4 py-3 text-sm font-bold border-b-2 transition-colors ${activeTab === tab.id ? 'border-brand-cyan text-brand-cyan' : 'border-transparent text-text-muted hover:text-text-primary'}`}
          >
            <tab.icon size={16} /> {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'ipo' && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
          <div className="flex flex-col md:flex-row justify-between gap-4">
            <motion.div className="card p-4 bg-bg-surface border-brand-cyan/20 flex flex-col sm:flex-row items-center justify-between gap-4 flex-1">
              <div className="flex items-center gap-3">
                <CheckCircle2 size={24} className="text-brand-cyan" />
                <div>
                  <h3 className="font-syne font-bold">IPO Result Checker</h3>
                  <p className="text-xs text-text-secondary">Check BOID for recent allotments.</p>
                </div>
              </div>
              <button onClick={() => setCheckerOpen(true)} className="btn-primary px-4 py-2 text-sm whitespace-nowrap">Check Results</button>
            </motion.div>
            
            <div className="flex flex-col sm:flex-row gap-2 shrink-0 items-center">
              <div className="relative flex items-center h-full">
                <Search size={16} className="absolute left-3 text-text-muted" />
                <input 
                  type="text" placeholder="Search IPOs..." value={search} onChange={e => setSearch(e.target.value)}
                  className="input-field pl-9 py-2 text-sm w-full md:w-48 h-full" 
                />
              </div>
              <select className="input-field py-2 text-sm h-full" value={filter} onChange={(e) => setFilter(e.target.value as any)}>
                <option value="all">All Status</option>
                <option value="open">Open Now</option>
                <option value="upcoming">Upcoming</option>
                <option value="closed">Closed</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {filteredIpo.map((ipo: any, idx: number) => (
              <div key={ipo.id} className="card p-5 hover:border-brand-cyan/50 transition-all flex flex-col">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <span className="text-[10px] uppercase font-bold tracking-widest text-text-muted mb-1">{ipo.type}</span>
                    <h3 className="font-syne font-bold text-text-primary leading-tight">{ipo.company}</h3>
                  </div>
                  {getStatusBadge(ipo.status)}
                </div>
                <div className="grid grid-cols-2 gap-3 mb-4">
                  <div className="p-2 rounded bg-bg-base/50">
                    <div className="text-[10px] text-text-muted uppercase">Issue Price</div>
                    <div className="font-jetbrains font-bold">Rs. {ipo.price}</div>
                  </div>
                  <div className="p-2 rounded bg-bg-base/50">
                    <div className="text-[10px] text-text-muted uppercase">Units</div>
                    <div className="font-jetbrains font-bold">{ipo.units.toLocaleString()}</div>
                  </div>
                </div>
                <div className="text-xs text-text-secondary space-y-1 mb-4 flex-1">
                  <div className="flex justify-between"><span>Open:</span> <span>{ipo.openDate}</span></div>
                  <div className="flex justify-between"><span>Close:</span> <span>{ipo.closeDate}</span></div>
                  <div className="flex justify-between"><span>Manager:</span> <span className="truncate ml-2">{ipo.banker}</span></div>
                </div>
                {ipo.status === 'open' && (
                  <a href="https://meroshare.cdsc.com.np/" target="_blank" rel="noreferrer" className="btn-primary w-full text-center py-2 text-xs mt-auto flex items-center justify-center gap-2">
                    <Rocket size={14} /> Apply via MeroShare
                  </a>
                )}
              </div>
            ))}
          </div>
          {ipoLoading && <div className="p-12 text-center animate-pulse">Loading IPOs...</div>}
        </motion.div>
      )}

      {activeTab === 'agm' && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="card p-6">
          <h2 className="font-syne text-lg font-bold mb-4">Upcoming Corporate Events</h2>
          {dashLoading ? (
            <div className="p-12 text-center animate-pulse">Loading events...</div>
          ) : events.length === 0 ? (
             <div className="p-12 text-center text-text-muted border border-dashed border-bg-border rounded-lg">No upcoming events scheduled.</div>
          ) : (
            <div className="space-y-4">
              {events.map((event: any, i: number) => (
                <div key={i} className="flex gap-4 p-4 rounded-lg bg-bg-surface border border-bg-border">
                  <div className="flex flex-col items-center justify-center shrink-0 w-16 h-16 rounded-lg bg-bg-elevated text-brand-cyan">
                    <span className="text-xs font-bold uppercase">{new Date(event.date).toLocaleString('default', { month: 'short' })}</span>
                    <span className="text-xl font-jetbrains font-bold">{new Date(event.date).getDate()}</span>
                  </div>
                  <div>
                    <h4 className="font-bold text-text-primary text-sm">{event.title}</h4>
                    <p className="text-xs text-text-secondary mt-1 line-clamp-2">{event.description}</p>
                    <div className="mt-2 inline-flex items-center gap-1 text-[10px] uppercase font-bold text-text-muted bg-bg-base px-2 py-0.5 rounded">
                      <Landmark size={12} /> {event.type}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </motion.div>
      )}

      {activeTab === 'dividend' && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="card p-12 text-center border-dashed border-bg-border">
          <PieChart size={40} className="mx-auto text-text-muted mb-4 opacity-50" />
          <h3 className="text-lg font-bold">Dividend Declarations</h3>
          <p className="text-sm text-text-secondary mt-2 max-w-md mx-auto">
            Recent dividend declarations and historical yields will be displayed here during the dividend season (Bhadra - Poush).
          </p>
        </motion.div>
      )}

      {/* Result Checker Modal */}
      <AnimatePresence>
        {checkerOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/60"
              onClick={() => setCheckerOpen(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
              className="relative w-full max-w-md bg-bg-surface border border-bg-border rounded-xl p-6"
            >
              <button onClick={() => setCheckerOpen(false)} className="absolute top-4 right-4 text-text-muted"><X size={20} /></button>
              <h2 className="font-syne font-bold text-xl mb-1">Check Allotment</h2>
              <form onSubmit={handleCheckAllotment} className="space-y-4 mt-6">
                <div>
                  <label className="block text-[10px] uppercase font-bold text-text-muted mb-1">Company</label>
                  <select className="input-field w-full text-sm py-2" required value={selectedCompany} onChange={e => setSelectedCompany(e.target.value)}>
                    <option value="" disabled>Select an IPO...</option>
                    {ipoData.filter((i:any) => i.status === 'closed').map((ipo: any) => (
                      <option key={ipo.id} value={ipo.id}>{ipo.company}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] uppercase font-bold text-text-muted mb-1">16-Digit BOID</label>
                  <input 
                    type="text" placeholder="1301234567890123" className="input-field w-full text-sm py-2"
                    value={boid} onChange={e => setBoid(e.target.value.replace(/\D/g, '').slice(0, 16))} required
                  />
                </div>
                <button type="submit" disabled={checkStatus === 'loading'} className="btn-primary w-full py-2.5">
                  {checkStatus === 'loading' ? 'Checking...' : 'View Result'}
                </button>
              </form>
              {checkStatus !== 'idle' && checkStatus !== 'loading' && checkResult && (
                <div className="mt-4 p-4 rounded-lg bg-bg-elevated text-center text-sm font-bold">
                  {checkResult.message}
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
