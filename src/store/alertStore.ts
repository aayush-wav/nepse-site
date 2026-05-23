import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface PriceAlert {
  id: string;
  symbol: string;
  targetPrice: number;
  condition: 'ABOVE' | 'BELOW';
  isActive: boolean;
  createdAt: string;
}

interface AlertState {
  alerts: PriceAlert[];
  addAlert: (alert: Omit<PriceAlert, 'id' | 'createdAt' | 'isActive'>) => void;
  removeAlert: (id: string) => void;
  toggleAlert: (id: string) => void;
  deactivateAlert: (id: string) => void;
}

export const useAlertStore = create<AlertState>()(
  persist(
    (set) => ({
      alerts: [],
      addAlert: (alert) => set((state) => ({
        alerts: [
          ...state.alerts, 
          {
            ...alert,
            id: Math.random().toString(36).substring(2, 9),
            isActive: true,
            createdAt: new Date().toISOString()
          }
        ]
      })),
      removeAlert: (id) => set((state) => ({
        alerts: state.alerts.filter((a) => a.id !== id)
      })),
      toggleAlert: (id) => set((state) => ({
        alerts: state.alerts.map((a) => 
          a.id === id ? { ...a, isActive: !a.isActive } : a
        )
      })),
      deactivateAlert: (id) => set((state) => ({
        alerts: state.alerts.map((a) => 
          a.id === id ? { ...a, isActive: false } : a
        )
      })),
    }),
    {
      name: 'nepse-alerts-storage',
    }
  )
);
