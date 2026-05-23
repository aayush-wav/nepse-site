import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface DrawingLine {
  price: number;
  color: string;
  lineWidth: number;
  lineStyle: number;
  title: string;
}

interface ChartState {
  drawings: Record<string, DrawingLine[]>;
  addDrawing: (symbol: string, line: DrawingLine) => void;
  setDrawings: (symbol: string, lines: DrawingLine[]) => void;
  clearDrawings: (symbol: string) => void;
}

export const useChartStore = create<ChartState>()(
  persist(
    (set) => ({
      drawings: {},
      addDrawing: (symbol, line) => set((state) => {
        const current = state.drawings[symbol] || [];
        return { drawings: { ...state.drawings, [symbol]: [...current, line] } };
      }),
      setDrawings: (symbol, lines) => set((state) => ({
        drawings: { ...state.drawings, [symbol]: lines }
      })),
      clearDrawings: (symbol) => set((state) => {
        const newDrawings = { ...state.drawings };
        delete newDrawings[symbol];
        return { drawings: newDrawings };
      }),
    }),
    {
      name: 'nepse-chart-storage',
    }
  )
);
