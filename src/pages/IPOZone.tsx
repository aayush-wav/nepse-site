import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Rocket, Calendar, CheckCircle2, Clock, ExternalLink, Filter, Search, Info, X, Loader2 } from 'lucide-react';
import { formatNepaliNumber } from '../utils';
import { useIpo } from '../hooks/useNepseData';

export default function IPOZone() {
  const [filter, setFilter] = useState<'all' | 'open' | 'upcoming' | 'closed'>('all');
  const [search, setSearch] = useState('');
  const { data: ipos, isLoading } = useIpo();
  
  const [checkerOpen, setCheckerOpen] = useState(false);
  const [boid, setBoid] = useState('');
  const [selectedCompany, setSelectedCompany] = useState('');
  const [checkStatus, setCheckStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [checkResult, setCheckResult] = useState<any>(null);

  const ipoData = ipos || [];

  const filtered = ipoData.filter((ipo: any) => {
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
    try {
      const res = await fetch('http://127.0.0.1:8000/api/ipo/check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ boid, companyId: selectedCompany })
      });
      const data = await res.json();
      setCheckStatus(data.status === 'success' ? 'success' : 'error');
      setCheckResult(data);
    } catch (err) {
      setCheckStatus('error');
      setCheckResult({ message: 'Failed to connect to server.' });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="font-syne text-2xl font-bold">IPO Zone</h1>
          <p className="text-xs text-text-secondary font-medium uppercase tracking-wider mt-1">Primary Market Hub — IPO, FPO, Rights & Mutual Funds</p>
        </div>
        <div className="flex gap-2">
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
            <input 
              type="text" placeholder="Search issues..." value={search} onChange={e => setSearch(e.target.value)}
              className="input-field pl-9 py-1.5 text-sm w-full md:w-64" 
            />
          </div>
          <select className="input-field py-1.5 text-sm" value={filter} onChange={(e) => setFilter(e.target.value as any)}>
            <option value="all">All Status</option>
            <option value="open">Open Now</option>
            <option value="upcoming">Upcoming</option>
            <option value="closed">Recently Closed</option>
          </select>
        </div>
      </div>

      {/* Bulk Result Checker CTA */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="card p-6 bg-gradient-to-r from-brand-cyan/10 to-brand-violet/10 border-brand-cyan/20 flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-brand-cyan/20 flex items-center justify-center text-brand-cyan">
            <CheckCircle2 size={24} />
          </div>
          <div>
            <h3 className="font-syne font-bold text-lg">IPO Result Checker</h3>
            <p className="text-sm text-text-secondary">Check your BOID instantly for any recently allotted IPOs.</p>
          </div>
        </div>
        <button onClick={() => setCheckerOpen(true)} className="btn-primary px-6 py-2.5 whitespace-nowrap">Check Results Now</button>
      </motion.div>

      {/* IPO Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {filtered.map((ipo, idx) => (
          <motion.div 
            key={ipo.id} 
            initial={{ opacity: 0, scale: 0.95 }} 
            animate={{ opacity: 1, scale: 1 }} 
            transition={{ delay: idx * 0.05 }}
            className="card p-5 hover:border-bg-border/80 transition-all flex flex-col group"
          >
            <div className="flex justify-between items-start mb-4">
              <div className="flex flex-col">
                <span className="text-[10px] uppercase font-bold tracking-widest text-text-muted mb-1">{ipo.type} • {ipo.sector}</span>
                <h3 className="font-syne font-bold text-text-primary leading-tight group-hover:text-brand-cyan transition-colors">{ipo.company}</h3>
              </div>
              {getStatusBadge(ipo.status)}
            </div>

            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="p-2.5 rounded-lg bg-bg-base/50 border border-bg-border/30">
                <div className="text-[10px] text-text-muted uppercase mb-1">Issue Price</div>
                <div className="font-jetbrains font-bold text-text-primary">Rs. {ipo.price}</div>
              </div>
              <div className="p-2.5 rounded-lg bg-bg-base/50 border border-bg-border/30">
                <div className="text-[10px] text-text-muted uppercase mb-1">Units Available</div>
                <div className="font-jetbrains font-bold text-text-primary">{ipo.units.toLocaleString()}</div>
              </div>
              <div className="p-2.5 rounded-lg bg-bg-base/50 border border-bg-border/30">
                <div className="text-[10px] text-text-muted uppercase mb-1">Open Date</div>
                <div className="font-jetbrains font-bold text-text-primary">{ipo.openDate}</div>
              </div>
              <div className="p-2.5 rounded-lg bg-bg-base/50 border border-bg-border/30">
                <div className="text-[10px] text-text-muted uppercase mb-1">Close Date</div>
                <div className="font-jetbrains font-bold text-text-primary">{ipo.closeDate}</div>
              </div>
            </div>

            <div className="space-y-2 mb-6 flex-1">
              <div className="flex justify-between text-xs">
                <span className="text-text-muted">Issue Manager:</span>
                <span className="text-text-secondary font-medium">{ipo.banker}</span>
              </div>
              {ipo.rating && (
                <div className="flex justify-between text-xs">
                  <span className="text-text-muted">Rating:</span>
                  <span className="text-text-secondary font-medium">{ipo.rating}</span>
                </div>
              )}
              {ipo.oversubscribed && (
                <div className="flex justify-between text-xs">
                  <span className="text-text-muted">Oversubscribed:</span>
                  <span className="text-bull-green font-bold">{ipo.oversubscribed}</span>
                </div>
              )}
            </div>

            <div className="flex gap-2">
              <button className="btn-secondary flex-1 py-2 text-xs flex items-center justify-center gap-2">
                <Info size={14} /> Details
              </button>
              <a 
                href="https://meroshare.cdsc.com.np/" 
                target="_blank" 
                rel="noreferrer"
                className="btn-primary flex-1 py-2 text-xs flex items-center justify-center gap-2"
              >
                Apply Now <ExternalLink size={14} />
              </a>
            </div>
          </motion.div>
        ))}
      </div>
      
      {filtered.length === 0 && !isLoading && (
        <div className="card p-20 text-center text-text-muted">
          <Rocket size={40} className="mx-auto mb-4 opacity-20" />
          <p>No IPO issues found for this filter.</p>
        </div>
      )}

      {isLoading && (
        <div className="card p-20 text-center text-text-muted">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-brand-cyan mx-auto mb-4"></div>
          <p>Loading active and upcoming issues...</p>
        </div>
      )}

      {/* IPO Timeline/Calendar (simplified) */}
      <div className="card p-6">
        <h2 className="font-syne text-lg font-bold mb-6 flex items-center gap-2">
          <Calendar size={20} className="text-brand-gold" /> IPO Pipeline
        </h2>
        <div className="relative border-l border-bg-border ml-3 space-y-8 pb-4">
          {ipoData.slice(0, 4).map((ipo, i) => (
            <div key={i} className="relative pl-8">
              <div className={`absolute left-0 top-1 w-3 h-3 rounded-full -translate-x-1.5 border-2 border-bg-base ${ipo.status === 'open' ? 'bg-bull-green shadow-glow-green' : 'bg-bg-border'}`} />
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <h4 className="font-bold text-text-primary text-sm">{ipo.company}</h4>
                  <p className="text-xs text-text-muted">{ipo.type} • Rs. {ipo.price}</p>
                </div>
                <div className="flex items-center gap-3">
                   <div className="text-right">
                     <div className="text-[10px] text-text-muted uppercase">Expected Allotment</div>
                     <div className="text-xs font-jetbrains text-text-secondary">{ipo.allotmentDate || 'TBD'}</div>
                   </div>
                   <div className={`w-2 h-8 rounded-full ${ipo.status === 'open' ? 'bg-bull-green/20' : 'bg-bg-border/20'}`} />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Result Checker Modal */}
      <AnimatePresence>
        {checkerOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
              onClick={() => setCheckerOpen(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
              className="relative w-full max-w-md bg-bg-surface border border-bg-border rounded-xl shadow-2xl p-6"
            >
              <button 
                onClick={() => setCheckerOpen(false)}
                className="absolute top-4 right-4 text-text-muted hover:text-text-primary"
              >
                <X size={20} />
              </button>
              
              <h2 className="font-syne font-bold text-xl mb-1">Check Allotment</h2>
              <p className="text-xs text-text-muted mb-6">Enter your 16-digit BOID to check IPO results.</p>
              
              <form onSubmit={handleCheckAllotment} className="space-y-4">
                <div>
                  <label className="block text-[10px] uppercase font-bold text-text-muted mb-1">Select Company</label>
                  <select 
                    className="input-field w-full text-sm py-2" 
                    required 
                    value={selectedCompany} 
                    onChange={e => setSelectedCompany(e.target.value)}
                  >
                    <option value="" disabled>Select an IPO...</option>
                    {ipoData.filter((i:any) => i.status === 'closed').map((ipo: any) => (
                      <option key={ipo.id} value={ipo.id}>{ipo.company} ({ipo.symbol})</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] uppercase font-bold text-text-muted mb-1">16-Digit BOID</label>
                  <input 
                    type="text" 
                    placeholder="e.g. 1301234567890123" 
                    className="input-field w-full text-sm py-2"
                    value={boid}
                    onChange={e => setBoid(e.target.value.replace(/\D/g, '').slice(0, 16))}
                    required
                  />
                </div>
                
                <button 
                  type="submit" 
                  disabled={checkStatus === 'loading'}
                  className="btn-primary w-full py-2.5 flex items-center justify-center gap-2"
                >
                  {checkStatus === 'loading' ? <Loader2 size={16} className="animate-spin" /> : <Search size={16} />}
                  {checkStatus === 'loading' ? 'Checking...' : 'View Result'}
                </button>
              </form>
              
              {checkStatus !== 'idle' && checkStatus !== 'loading' && checkResult && (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                  className={`mt-6 p-4 rounded-lg border ${
                    checkResult.allotted 
                      ? 'bg-bull-green/10 border-bull-green/30' 
                      : checkStatus === 'error' && !checkResult.allotted
                        ? 'bg-bear-red/10 border-bear-red/30'
                        : 'bg-bg-elevated border-bg-border/50'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className={`mt-0.5 ${checkResult.allotted ? 'text-bull-green' : 'text-bear-red'}`}>
                      {checkResult.allotted ? <CheckCircle2 size={20} /> : <Info size={20} />}
                    </div>
                    <div>
                      <h4 className={`font-bold text-sm ${checkResult.allotted ? 'text-bull-green' : 'text-bear-red'}`}>
                        {checkResult.allotted ? 'Allotment Successful!' : 'Not Allotted'}
                      </h4>
                      <p className="text-xs text-text-secondary mt-1">{checkResult.message}</p>
                    </div>
                  </div>
                </motion.div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
