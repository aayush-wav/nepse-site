import { useEffect, useRef } from 'react';
import { useAlertStore } from '../store/alertStore';
import { useLiveTrading } from './useNepseData';
import toast from 'react-hot-toast';

export function useAlertChecker() {
  const { alerts, deactivateAlert } = useAlertStore();
  const { data: liveData } = useLiveTrading();
  
  // Keep track of recently triggered alerts to avoid spamming
  const triggeredRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    // Request notification permission if not granted
    if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);

  useEffect(() => {
    if (!liveData || liveData.length === 0 || alerts.length === 0) return;

    const activeAlerts = alerts.filter(a => a.isActive);
    if (activeAlerts.length === 0) return;

    const priceMap = new Map();
    liveData.forEach((s: any) => priceMap.set(s.symbol, s.lastTradedPrice || s.ltp));

    activeAlerts.forEach(alert => {
      const currentPrice = priceMap.get(alert.symbol);
      if (!currentPrice) return;

      let isTriggered = false;
      if (alert.condition === 'ABOVE' && currentPrice > alert.targetPrice) {
        isTriggered = true;
      } else if (alert.condition === 'BELOW' && currentPrice < alert.targetPrice) {
        isTriggered = true;
      }

      if (isTriggered && !triggeredRef.current.has(alert.id)) {
        triggeredRef.current.add(alert.id);
        
        // Deactivate the alert so it only fires once
        deactivateAlert(alert.id);

        const msg = `${alert.symbol} crossed ${alert.condition.toLowerCase()} Rs. ${alert.targetPrice} (Current: ${currentPrice})`;
        
        // Browser Notification
        if ('Notification' in window && Notification.permission === 'granted') {
          new Notification(`Price Alert: ${alert.symbol}`, {
            body: msg,
            icon: '/favicon.ico'
          });
        }
        
        // In-app Toast
        toast.success(msg, { duration: 8000, icon: '🔔' });
      }
    });

  }, [liveData, alerts, deactivateAlert]);
}
