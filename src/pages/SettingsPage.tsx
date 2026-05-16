import { useState } from 'react';
import { motion } from 'framer-motion';
import { Settings, User, Bell, Shield, Palette, Database, Globe, ChevronRight, Check } from 'lucide-react';

export default function SettingsPage() {
  const [activeSection, setActiveSection] = useState('appearance');
  const [darkMode, setDarkMode] = useState(true);
  const [notifications, setNotifications] = useState({ price: true, news: true, ipo: false, system: true });
  const [currency, setCurrency] = useState('NPR');
  const [dateFormat, setDateFormat] = useState('BS');
  const [autoRefresh, setAutoRefresh] = useState('30');

  const sections = [
    { id: 'appearance', label: 'Appearance', icon: Palette },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'account', label: 'Account', icon: User },
    { id: 'data', label: 'Data & Privacy', icon: Database },
    { id: 'regional', label: 'Regional', icon: Globe },
    { id: 'security', label: 'Security', icon: Shield },
  ];

  const Toggle = ({ enabled, onChange }: { enabled: boolean; onChange: (v: boolean) => void }) => (
    <button
      onClick={() => onChange(!enabled)}
      className={`relative w-11 h-6 rounded-full transition-colors ${enabled ? 'bg-brand-cyan' : 'bg-bg-border'}`}
    >
      <div className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${enabled ? 'translate-x-5' : ''}`} />
    </button>
  );

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="font-syne text-2xl font-bold flex items-center gap-3">
          <Settings size={24} className="text-brand-cyan" /> Settings
        </h1>
        <p className="text-xs text-text-secondary">Customize your NEPSE Elite experience</p>
      </div>

      <div className="flex gap-6">
        {/* Sidebar Nav */}
        <aside className="w-52 shrink-0 space-y-1">
          {sections.map(s => (
            <button
              key={s.id}
              onClick={() => setActiveSection(s.id)}
              className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-all text-left
                ${activeSection === s.id ? 'bg-bg-elevated text-brand-cyan border border-bg-border' : 'text-text-secondary hover:text-text-primary hover:bg-bg-elevated/50'}`}
            >
              <s.icon size={16} />
              {s.label}
              {activeSection === s.id && <ChevronRight size={14} className="ml-auto" />}
            </button>
          ))}
        </aside>

        {/* Content */}
        <motion.div key={activeSection} initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} className="flex-1 card p-6 space-y-6">
          {activeSection === 'appearance' && (
            <>
              <h3 className="font-syne font-bold text-lg">Appearance</h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between py-3 border-b border-bg-border/30">
                  <div>
                    <div className="font-medium text-sm text-text-primary">Dark Mode</div>
                    <div className="text-xs text-text-muted">Use the dark theme for all interfaces</div>
                  </div>
                  <Toggle enabled={darkMode} onChange={setDarkMode} />
                </div>
                <div className="flex items-center justify-between py-3 border-b border-bg-border/30">
                  <div>
                    <div className="font-medium text-sm text-text-primary">Compact View</div>
                    <div className="text-xs text-text-muted">Show more data in denser table layouts</div>
                  </div>
                  <Toggle enabled={false} onChange={() => {}} />
                </div>
                <div className="space-y-2">
                  <div className="font-medium text-sm text-text-primary">Accent Color</div>
                  <div className="flex gap-3">
                    {['#00D4FF', '#00C48C', '#F5A623', '#8B5CF6', '#FF4D4F'].map(c => (
                      <button key={c} className={`w-8 h-8 rounded-full border-2 transition-all ${c === '#00D4FF' ? 'border-white scale-110' : 'border-transparent hover:scale-105'}`} style={{ backgroundColor: c }} />
                    ))}
                  </div>
                </div>
              </div>
            </>
          )}

          {activeSection === 'notifications' && (
            <>
              <h3 className="font-syne font-bold text-lg">Notifications</h3>
              <div className="space-y-4">
                {[
                  { key: 'price', label: 'Price Alerts', desc: 'Get notified when your price targets are hit' },
                  { key: 'news', label: 'Market News', desc: 'Breaking news and corporate announcements' },
                  { key: 'ipo', label: 'IPO Alerts', desc: 'Opening, closing dates and allotment results' },
                  { key: 'system', label: 'System Updates', desc: 'App updates and maintenance notifications' },
                ].map(item => (
                  <div key={item.key} className="flex items-center justify-between py-3 border-b border-bg-border/30">
                    <div>
                      <div className="font-medium text-sm text-text-primary">{item.label}</div>
                      <div className="text-xs text-text-muted">{item.desc}</div>
                    </div>
                    <Toggle
                      enabled={notifications[item.key as keyof typeof notifications]}
                      onChange={v => setNotifications({ ...notifications, [item.key]: v })}
                    />
                  </div>
                ))}
              </div>
            </>
          )}

          {activeSection === 'regional' && (
            <>
              <h3 className="font-syne font-bold text-lg">Regional Settings</h3>
              <div className="space-y-5">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-text-primary">Date Format</label>
                  <div className="flex gap-3">
                    {['BS', 'AD'].map(fmt => (
                      <button
                        key={fmt}
                        onClick={() => setDateFormat(fmt)}
                        className={`px-4 py-2 rounded-lg text-sm font-bold border transition-all
                          ${dateFormat === fmt ? 'bg-brand-cyan text-bg-base border-brand-cyan' : 'border-bg-border text-text-secondary'}`}
                      >
                        {fmt === 'BS' ? 'Bikram Sambat (BS)' : 'Anno Domini (AD)'}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-text-primary">Auto Refresh Interval</label>
                  <select
                    value={autoRefresh}
                    onChange={e => setAutoRefresh(e.target.value)}
                    className="input-field py-2 w-64"
                  >
                    <option value="10">Every 10 seconds</option>
                    <option value="30">Every 30 seconds</option>
                    <option value="60">Every 1 minute</option>
                    <option value="0">Disabled (manual refresh)</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-text-primary">Currency Display</label>
                  <select
                    value={currency}
                    onChange={e => setCurrency(e.target.value)}
                    className="input-field py-2 w-64"
                  >
                    <option value="NPR">Nepali Rupee (Rs.)</option>
                    <option value="USD">US Dollar ($)</option>
                    <option value="INR">Indian Rupee (₹)</option>
                  </select>
                </div>
              </div>
            </>
          )}

          {(activeSection === 'account' || activeSection === 'security' || activeSection === 'data') && (
            <div className="py-8 text-center space-y-3">
              <div className="w-16 h-16 rounded-full bg-bg-elevated mx-auto flex items-center justify-center text-text-muted">
                {activeSection === 'account' ? <User size={28} /> : activeSection === 'security' ? <Shield size={28} /> : <Database size={28} />}
              </div>
              <h3 className="font-syne font-bold text-text-primary">
                {activeSection === 'account' ? 'Account Settings' : activeSection === 'security' ? 'Security' : 'Data & Privacy'}
              </h3>
              <p className="text-sm text-text-muted max-w-sm mx-auto">
                Sign in with your NEPSE Elite account to manage {activeSection === 'account' ? 'your profile, BOID, and broker details' : activeSection === 'security' ? 'passwords, 2FA, and active sessions' : 'your data, exports, and privacy preferences'}.
              </p>
              <button className="btn-primary px-8 py-2.5 mt-2">Sign In / Create Account</button>
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
}
