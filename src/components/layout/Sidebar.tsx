import { NavLink } from 'react-router-dom';
import { useUIStore } from '../../store';
import {
  LayoutDashboard, Activity, CandlestickChart, Filter, FileSpreadsheet,
  Building2, Rocket, Briefcase, Star, BookOpen, PieChart, Landmark,
  Calculator, Bell, GraduationCap, Settings, ChevronLeft, ChevronRight, TrendingUp
} from 'lucide-react';

const iconMap: Record<string, React.ElementType> = {
  LayoutDashboard, Activity, CandlestickChart, Filter, FileSpreadsheet,
  Building2, Rocket, Briefcase, Star, BookOpen, PieChart, Landmark,
  Calculator, Bell, GraduationCap, Settings,
};

const navItems = [
  { path: '/dashboard', label: 'Dashboard', icon: 'LayoutDashboard' },
  { path: '/live-market', label: 'Live Market', icon: 'Activity' },
  { path: '/charts', label: 'Charts', icon: 'CandlestickChart' },
  { path: '/screener', label: 'Screener', icon: 'Filter' },
  { path: '/floorsheet', label: 'Floorsheet', icon: 'FileSpreadsheet' },
  { path: '/broker-intel', label: 'Broker Intel', icon: 'Building2' },
  { path: '/ipo-zone', label: 'IPO Zone', icon: 'Rocket' },
  { path: '/portfolio', label: 'Portfolio', icon: 'Briefcase' },
  { path: '/watchlist', label: 'Watchlist', icon: 'Star' },
  { path: '/fundamentals', label: 'Fundamentals', icon: 'BookOpen' },
  { path: '/sector', label: 'Sectors', icon: 'PieChart' },
  { path: '/mutual-funds', label: 'Mutual Funds', icon: 'Landmark' },
  { path: '/calculators', label: 'Calculators', icon: 'Calculator' },
  { path: '/news-alerts', label: 'News & Alerts', icon: 'Bell' },
  { path: '/education', label: 'Education', icon: 'GraduationCap' },
  { path: '/settings', label: 'Settings', icon: 'Settings' },
];

export default function Sidebar() {
  const { sidebarOpen, toggleSidebar } = useUIStore();

  return (
    <aside
      className={`fixed left-0 top-0 h-screen bg-bg-surface border-r border-bg-border z-40
        flex flex-col transition-all duration-300 ${sidebarOpen ? 'w-60' : 'w-[68px]'}`}
    >
      {/* Logo */}
      <div className="flex items-center gap-3 px-4 h-16 border-b border-bg-border shrink-0">
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-brand-cyan to-brand-violet flex items-center justify-center">
          <TrendingUp size={18} className="text-white" />
        </div>
        {sidebarOpen && (
          <div className="flex flex-col">
            <span className="font-syne font-bold text-sm text-text-primary tracking-tight">NEPSE Elite</span>
            <span className="text-[10px] text-text-muted">Nepal Stock Analysis</span>
          </div>
        )}
      </div>

      {/* Nav Items */}
      <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-0.5">
        {navItems.map((item) => {
          const Icon = iconMap[item.icon] || LayoutDashboard;
          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all duration-200
                ${isActive
                  ? 'text-brand-cyan bg-bg-elevated border-l-2 border-brand-cyan font-medium shadow-glow-cyan/10'
                  : 'text-text-secondary hover:text-text-primary hover:bg-bg-elevated/70 border-l-2 border-transparent'
                }`
              }
              title={item.label}
            >
              <Icon size={18} className="shrink-0" />
              {sidebarOpen && <span className="truncate">{item.label}</span>}
            </NavLink>
          );
        })}
      </nav>

      {/* Collapse Toggle */}
      <button
        onClick={toggleSidebar}
        className="flex items-center justify-center h-10 border-t border-bg-border text-text-muted hover:text-text-primary transition-colors"
      >
        {sidebarOpen ? <ChevronLeft size={18} /> : <ChevronRight size={18} />}
      </button>
    </aside>
  );
}
