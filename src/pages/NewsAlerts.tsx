import { useState } from 'react';
import { motion } from 'framer-motion';
import { Bell, TrendingUp, Calendar, FileText, Zap, CheckCircle, X, Plus } from 'lucide-react';

const newsItems = [
  { id: 1, headline: 'NEPSE hits 3-month high on strong banking sector performance', source: 'Mero Lagani', date: '2082-02-10', category: 'Market', sentiment: 'positive' },
  { id: 2, headline: 'NRB raises interest rate cap; potential impact on banking stocks', source: 'ShareSansar', date: '2082-02-09', category: 'Policy', sentiment: 'negative' },
  { id: 3, headline: 'NABIL reports 18% YoY profit growth for Q3 FY 2080/81', source: 'NepseAlpha', date: '2082-02-08', category: 'Financial', sentiment: 'positive' },
  { id: 4, headline: 'Budget 2082/83 to focus on capital market development', source: 'The Himalayan Times', date: '2082-02-07', category: 'Policy', sentiment: 'positive' },
  { id: 5, headline: 'Promoter lock-in period for 12 companies expires this month', source: 'Arthik Abhiyan', date: '2082-02-06', category: 'Promoter', sentiment: 'negative' },
  { id: 6, headline: 'IPO oversubscription: TPC receives 12.5x applications', source: 'Mero Lagani', date: '2082-02-05', category: 'IPO', sentiment: 'positive' },
];

const alerts = [
  { id: 1, symbol: 'NABIL', type: 'Price Above', value: 1300, active: true },
  { id: 2, symbol: 'UPPER', type: 'Price Below', value: 350, active: true },
  { id: 3, symbol: 'NHPC', type: 'Volume Above', value: 100000, active: false },
];

export default function NewsAlerts() {
  const [activeTab, setActiveTab] = useState<'news' | 'alerts'>('news');
  const [categoryFilter, setCategoryFilter] = useState('All');

  const categories = ['All', 'Market', 'Policy', 'Financial', 'IPO', 'Promoter'];
  const filtered = newsItems.filter(n => categoryFilter === 'All' || n.category === categoryFilter);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-syne text-2xl font-bold">News & Alerts</h1>
          <p className="text-xs text-text-secondary">Market news, corporate announcements, and price alerts</p>
        </div>
        {activeTab === 'alerts' && (
          <button className="btn-primary py-2 px-4 flex items-center gap-2 text-sm">
            <Plus size={16} /> New Alert
          </button>
        )}
      </div>

      <div className="flex gap-2 p-1.5 bg-bg-surface border border-bg-border rounded-xl w-fit">
        {[{ id: 'news', label: 'Market News', icon: FileText }, { id: 'alerts', label: 'Price Alerts', icon: Bell }].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all
              ${activeTab === tab.id ? 'bg-bg-elevated text-brand-cyan' : 'text-text-secondary hover:text-text-primary'}`}
          >
            <tab.icon size={16} /> {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'news' && (
        <div className="space-y-4">
          <div className="flex flex-wrap gap-2">
            {categories.map(cat => (
              <button
                key={cat}
                onClick={() => setCategoryFilter(cat)}
                className={`px-3 py-1 text-xs rounded-lg border font-bold transition-all
                  ${categoryFilter === cat ? 'bg-brand-cyan text-bg-base border-brand-cyan' : 'border-bg-border text-text-muted hover:border-text-muted'}`}
              >
                {cat}
              </button>
            ))}
          </div>
          <div className="space-y-3">
            {filtered.map((n, i) => (
              <motion.div
                key={n.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05 }}
                className="card p-4 hover:border-bg-border/80 cursor-pointer group transition-all"
              >
                <div className="flex items-start gap-4">
                  <div className={`w-1 self-stretch rounded-full shrink-0 ${n.sentiment === 'positive' ? 'bg-bull-green' : 'bg-bear-red'}`} />
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded ${
                        n.sentiment === 'positive' ? 'bg-bull-green/10 text-bull-green' : 'bg-bear-red/10 text-bear-red'
                      }`}>{n.category}</span>
                      <span className="text-[10px] text-text-muted">{n.source} • {n.date}</span>
                    </div>
                    <h3 className="text-sm font-medium text-text-primary group-hover:text-brand-cyan transition-colors">{n.headline}</h3>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'alerts' && (
        <div className="space-y-4">
          {alerts.map(alert => (
            <div key={alert.id} className={`card p-4 flex items-center justify-between ${!alert.active ? 'opacity-50' : ''}`}>
              <div className="flex items-center gap-4">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${alert.active ? 'bg-brand-cyan/20 text-brand-cyan' : 'bg-bg-elevated text-text-muted'}`}>
                  <Bell size={18} />
                </div>
                <div>
                  <div className="font-bold text-text-primary">{alert.symbol}</div>
                  <div className="text-xs text-text-secondary">{alert.type}: <span className="font-jetbrains text-text-primary">{alert.value.toLocaleString()}</span></div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded ${alert.active ? 'bg-bull-green/10 text-bull-green' : 'bg-bg-elevated text-text-muted'}`}>
                  {alert.active ? 'Active' : 'Paused'}
                </span>
                <button className="p-1.5 hover:bg-bg-elevated rounded-lg text-text-muted hover:text-bear-red transition-colors">
                  <X size={16} />
                </button>
              </div>
            </div>
          ))}
          <div className="card border-dashed p-8 flex flex-col items-center gap-3 text-text-muted hover:text-brand-cyan hover:border-brand-cyan/50 transition-all cursor-pointer">
            <Bell size={24} />
            <p className="text-sm font-medium">Create a new price alert</p>
          </div>
        </div>
      )}
    </div>
  );
}
