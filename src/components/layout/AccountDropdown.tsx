import { User, Settings, Briefcase, Star, LogOut, ChevronRight, Moon, Sun, Monitor } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useUIStore } from '../../store';

interface AccountDropdownProps {
  onClose: () => void;
}

export default function AccountDropdown({ onClose }: AccountDropdownProps) {
  const { theme, setTheme } = useUIStore();

  const menuItems = [
    { label: 'My Profile', icon: User, path: '/settings', desc: 'Personal info & security' },
    { label: 'My Portfolio', icon: Briefcase, path: '/portfolio', desc: 'Track your investments' },
    { label: 'Watchlist', icon: Star, path: '/watchlist', desc: 'Monitor favorite stocks' },
    { label: 'App Settings', icon: Settings, path: '/settings', desc: 'Preferences & theme' },
  ];

  return (
    <div className="absolute top-full right-0 mt-2 w-72 bg-bg-surface border border-bg-border rounded-xl shadow-2xl overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-200">
      {/* User Header */}
      <div className="p-4 border-b border-bg-border bg-bg-elevated/30">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-brand-cyan to-brand-violet flex items-center justify-center shadow-glow-cyan/20">
            <User size={20} className="text-white" />
          </div>
          <div className="flex flex-col min-w-0">
            <span className="font-syne font-bold text-sm text-text-primary truncate">Guest User</span>
            <span className="text-[11px] text-text-muted truncate">Sign in to sync data</span>
          </div>
        </div>
      </div>

      {/* Menu Items */}
      <div className="p-2">
        {menuItems.map((item) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.label}
              to={item.path}
              onClick={onClose}
              className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-bg-elevated transition-colors group"
            >
              <div className="w-8 h-8 rounded-lg bg-bg-elevated flex items-center justify-center shrink-0 group-hover:bg-bg-border transition-colors">
                <Icon size={16} className="text-text-secondary group-hover:text-brand-cyan transition-colors" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[13px] font-semibold text-text-primary">{item.label}</p>
                <p className="text-[10px] text-text-muted truncate">{item.desc}</p>
              </div>
              <ChevronRight size={14} className="text-text-muted opacity-0 group-hover:opacity-100 -translate-x-2 group-hover:translate-x-0 transition-all" />
            </Link>
          );
        })}
      </div>

      {/* Theme Toggles */}
      <div className="mx-4 p-1 bg-bg-elevated rounded-lg flex gap-1 mb-2">
        {(['light', 'dark', 'system'] as const).map((t) => {
          const Icon = t === 'light' ? Sun : t === 'dark' ? Moon : Monitor;
          return (
            <button
              key={t}
              onClick={() => setTheme(t)}
              className={`flex-1 flex items-center justify-center py-1.5 rounded-md transition-all
                ${theme === t 
                  ? 'bg-bg-surface text-brand-cyan shadow-sm border border-bg-border' 
                  : 'text-text-muted hover:text-text-primary'}`}
              title={`${t.charAt(0).toUpperCase() + t.slice(1)} Mode`}
            >
              <Icon size={14} />
            </button>
          );
        })}
      </div>

      {/* Sign Out */}
      <div className="p-2 border-t border-bg-border bg-bg-elevated/20">
        <button 
          className="w-full flex items-center gap-3 p-2.5 rounded-lg text-bear-red hover:bg-bear-red/10 transition-colors group"
          onClick={() => {
            onClose();
          }}
        >
          <div className="w-8 h-8 rounded-lg bg-bear-red/10 flex items-center justify-center shrink-0 group-hover:bg-bear-red/20 transition-colors">
            <LogOut size={16} />
          </div>
          <span className="text-[13px] font-semibold">Sign Out</span>
        </button>
      </div>
    </div>
  );
}
