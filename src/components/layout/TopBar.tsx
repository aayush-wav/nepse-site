import { useState, useEffect } from 'react';
import { Search, Bell, User, Menu, Wifi, WifiOff } from 'lucide-react';
import { useUIStore, useMarketStore } from '../../store';
import { formatNepaliNumber, formatPercent, getMarketStatus, getTimeToMarketEvent, getPriceColorClass } from '../../utils';

export default function TopBar() {
  const { toggleSidebar, toggleSearch, sidebarOpen } = useUIStore();
  const { nepseIndex, sensitiveIndex, floatIndex, totalTurnover, advancing, declining, unchanged } = useMarketStore();
  const [marketStatus, setMarketStatus] = useState(getMarketStatus());
  const [countdown, setCountdown] = useState(getTimeToMarketEvent());
  const [apiOnline, setApiOnline] = useState(true);

  useEffect(() => {
    const interval = setInterval(() => {
      setMarketStatus(getMarketStatus());
      setCountdown(getTimeToMarketEvent());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    fetch('http://localhost:3001/api/health')
      .then(r => r.ok ? setApiOnline(true) : setApiOnline(false))
      .catch(() => setApiOnline(false));
  }, []);

  const statusColor = marketStatus === 'OPEN' ? 'bg-bull-green' : marketStatus === 'PRE_OPEN' ? 'bg-neutral-yellow' : 'bg-bear-red';
  const statusPulse = marketStatus === 'OPEN' ? 'animate-pulse' : '';
  const total = advancing + declining + unchanged;
  const advanceRatio = total > 0 ? (advancing / total) * 100 : 50;

  return (
    <header className={`fixed top-0 right-0 z-30 h-auto bg-bg-surface/95 backdrop-blur-md border-b border-bg-border
      transition-all duration-300 ${sidebarOpen ? 'left-60' : 'left-[68px]'}`}>
      
      {/* Market Pulse Bar */}
      <div className="flex items-center gap-4 px-4 h-12 overflow-x-auto scrollbar-none text-xs">
        <button onClick={toggleSidebar} className="lg:hidden text-text-secondary hover:text-text-primary">
          <Menu size={18} />
        </button>

        {/* NEPSE Index */}
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-text-secondary font-medium">NEPSE</span>
          <span className="font-jetbrains font-bold text-text-primary">{formatNepaliNumber(nepseIndex.value)}</span>
          <span className={`font-jetbrains font-semibold ${getPriceColorClass(nepseIndex.change)}`}>
            {formatPercent(nepseIndex.changePercent)}
          </span>
        </div>

        <div className="w-px h-5 bg-bg-border shrink-0" />

        {/* Sensitive */}
        <div className="flex items-center gap-1.5 shrink-0">
          <span className="text-text-muted">Sensitive</span>
          <span className="font-jetbrains text-text-primary">{sensitiveIndex.value.toFixed(2)}</span>
          <span className={`font-jetbrains ${getPriceColorClass(sensitiveIndex.change)}`}>
            {formatPercent(sensitiveIndex.changePercent)}
          </span>
        </div>

        <div className="w-px h-5 bg-bg-border shrink-0" />

        {/* Float */}
        <div className="flex items-center gap-1.5 shrink-0">
          <span className="text-text-muted">Float</span>
          <span className="font-jetbrains text-text-primary">{floatIndex.value.toFixed(2)}</span>
          <span className={`font-jetbrains ${getPriceColorClass(floatIndex.change)}`}>
            {formatPercent(floatIndex.changePercent)}
          </span>
        </div>

        <div className="w-px h-5 bg-bg-border shrink-0" />

        {/* Turnover */}
        <div className="flex items-center gap-1.5 shrink-0">
          <span className="text-text-muted">Turnover</span>
          <span className="font-jetbrains text-text-primary">
            Rs. {(totalTurnover / 1e7).toFixed(2)} Cr
          </span>
        </div>

        <div className="w-px h-5 bg-bg-border shrink-0" />

        {/* Advance/Decline */}
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-bull-green font-jetbrains">{advancing}↑</span>
          <div className="w-20 h-1.5 bg-bear-red/30 rounded-full overflow-hidden">
            <div className="h-full bg-bull-green rounded-full transition-all" style={{ width: `${advanceRatio}%` }} />
          </div>
          <span className="text-bear-red font-jetbrains">{declining}↓</span>
        </div>

        <div className="flex-1" />

        {/* Market Status */}
        <div className="flex items-center gap-2 shrink-0">
          <div className={`w-2 h-2 rounded-full ${statusColor} ${statusPulse}`} />
          <span className="text-text-secondary font-medium uppercase text-[11px]">{marketStatus.replace('_', '-')}</span>
        </div>

        {/* Countdown */}
        <div className="flex items-center gap-1 shrink-0 text-text-muted">
          <span>{countdown.event}:</span>
          <span className="font-jetbrains text-text-primary">
            {String(countdown.hours).padStart(2, '0')}:{String(countdown.minutes).padStart(2, '0')}:{String(countdown.seconds).padStart(2, '0')}
          </span>
        </div>

        {/* API Status */}
        <div className="shrink-0" title={apiOnline ? 'API Connected' : 'API Offline — Using cached data'}>
          {apiOnline ? <Wifi size={14} className="text-bull-green" /> : <WifiOff size={14} className="text-bear-red" />}
        </div>

        {/* Actions */}
        <button onClick={toggleSearch} className="p-1.5 hover:bg-bg-elevated rounded-lg text-text-secondary hover:text-text-primary transition-colors" title="Search (Ctrl+K)">
          <Search size={16} />
        </button>
        <button className="p-1.5 hover:bg-bg-elevated rounded-lg text-text-secondary hover:text-text-primary transition-colors relative">
          <Bell size={16} />
          <span className="absolute top-0.5 right-0.5 w-1.5 h-1.5 bg-brand-cyan rounded-full" />
        </button>
        <button className="w-7 h-7 rounded-full bg-gradient-to-br from-brand-cyan to-brand-violet flex items-center justify-center">
          <User size={14} className="text-white" />
        </button>
      </div>
    </header>
  );
}
