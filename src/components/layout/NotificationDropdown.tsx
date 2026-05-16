import { Bell, TrendingUp, TrendingDown, Info, Clock } from 'lucide-react';
import { Link } from 'react-router-dom';

const recentNotifications = [
  {
    id: '1',
    type: 'market',
    title: 'NEPSE Index crossed 2800',
    description: 'Market shows strong bullish momentum as indices hit new monthly highs.',
    time: '5m ago',
    icon: TrendingUp,
    color: 'text-bull-green',
    bg: 'bg-bull-green/10'
  },
  {
    id: '2',
    type: 'alert',
    title: 'Price Alert: NABIL',
    description: 'NABIL has reached your target price of Rs. 1,250.',
    time: '25m ago',
    icon: Bell,
    color: 'text-brand-cyan',
    bg: 'bg-brand-cyan/10'
  },
  {
    id: '3',
    type: 'info',
    title: 'New IPO Announced',
    description: 'Aman Nepal Hydropower is opening IPO from tomorrow.',
    time: '1h ago',
    icon: Info,
    color: 'text-brand-violet',
    bg: 'bg-brand-violet/10'
  },
  {
    id: '4',
    type: 'market',
    title: 'Market Closed',
    description: 'Market closed at 2785.42 with a turnover of 4.52 Arba.',
    time: '3h ago',
    icon: Clock,
    color: 'text-text-muted',
    bg: 'bg-bg-elevated'
  }
];

interface NotificationDropdownProps {
  onClose: () => void;
}

export default function NotificationDropdown({ onClose }: NotificationDropdownProps) {
  return (
    <div className="absolute top-full right-0 mt-2 w-80 bg-bg-surface border border-bg-border rounded-xl shadow-2xl overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-200">
      <div className="flex items-center justify-between p-4 border-b border-bg-border bg-bg-elevated/30">
        <h3 className="font-syne font-bold text-sm text-text-primary">Notifications</h3>
        <span className="px-2 py-0.5 rounded-full bg-brand-cyan/10 text-brand-cyan text-[10px] font-bold uppercase tracking-wider">
          {recentNotifications.length} New
        </span>
      </div>
      
      <div className="max-h-[400px] overflow-y-auto">
        {recentNotifications.map((notif) => {
          const Icon = notif.icon;
          return (
            <div 
              key={notif.id} 
              className="p-4 border-b border-bg-border/50 hover:bg-bg-elevated/50 transition-colors cursor-pointer group"
            >
              <div className="flex gap-3">
                <div className={`w-8 h-8 rounded-lg ${notif.bg} flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform`}>
                  <Icon size={16} className={notif.color} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-start mb-0.5">
                    <p className="text-[13px] font-semibold text-text-primary truncate">{notif.title}</p>
                    <span className="text-[10px] text-text-muted whitespace-nowrap ml-2">{notif.time}</span>
                  </div>
                  <p className="text-xs text-text-secondary leading-relaxed line-clamp-2">
                    {notif.description}
                  </p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
      
      <Link 
        to="/news-alerts" 
        onClick={onClose}
        className="block p-3 text-center text-xs font-medium text-brand-cyan hover:bg-brand-cyan/5 transition-colors border-t border-bg-border"
      >
        View all notifications
      </Link>
    </div>
  );
}
