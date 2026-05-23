import { useEffect, useRef, memo, forwardRef, useImperativeHandle } from 'react';
import { 
  createChart, 
  ColorType, 
  CandlestickSeries, 
  LineSeries, 
  AreaSeries, 
  BarSeries, 
  HistogramSeries,
  BaselineSeries
} from 'lightweight-charts';
import type { OHLCVBar } from '../../utils/indicators';
import { calcSMA, calcEMA, calcBollingerBands, calcHeikinAshi, calcVWAP } from '../../utils/indicators';
import { useUIStore } from '../../store';
import { useChartStore, DrawingLine } from '../../store/chartStore';

export interface DrawingRef {
  setDrawMode: (mode: string) => void;
  clearDrawings: () => void;
}

export type ChartType = 'candlestick' | 'heikin-ashi' | 'line' | 'area' | 'bar' | 'baseline' | 'histogram';
export interface Overlay { id: string; label: string; color: string; enabled: boolean; }

interface Props {
  symbol: string;
  data: OHLCVBar[];
  chartType: ChartType;
  overlays: Overlay[];
  height?: number;
}

const CHART_COLORS = {
  bg: '#0A0F1E',
  grid: '#1A2240',
  text: '#4A5880',
  border: '#1A2240',
  up: '#00C48C',
  down: '#FF4D4F',
  wick: { up: '#00C48C', down: '#FF4D4F' },
};

const MainChart = forwardRef<DrawingRef, Props>(function MainChart(
  { symbol, data, chartType, overlays, height = 540 },
  ref
) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<any>(null);
  const seriesRef = useRef<any>(null);
  const helperSeriesRef = useRef<Map<string, any>>(new Map());
  const { theme, accentColor } = useUIStore();
  const { drawings, addDrawing, clearDrawings: clearStoreDrawings } = useChartStore();

  const drawModeRef = useRef<string>('none');
  const clickPointRef = useRef<{ price: number; time: number } | null>(null);
  const drawnLinesRef = useRef<any[]>([]);

  useImperativeHandle(ref, () => ({
    setDrawMode: (mode: string) => {
      drawModeRef.current = mode;
      clickPointRef.current = null;
      if (containerRef.current) {
        containerRef.current.style.cursor = mode !== 'none' ? 'crosshair' : 'default';
      }
    },
    clearDrawings: () => {
      drawnLinesRef.current.forEach(line => {
        try { seriesRef.current?.removePriceLine(line); } catch {}
      });
      drawnLinesRef.current = [];
      clickPointRef.current = null;
      if (symbol) clearStoreDrawings(symbol);
    },
  }));

  useEffect(() => {
    if (!containerRef.current || data.length === 0) return;

    const width = containerRef.current.clientWidth;
    if (width <= 0) return; // Wait for container to have a width

    try {
      const formatColor = (val: string, fallback: string) => 
        val ? `rgb(${val.split(' ').filter(Boolean).join(', ')})` : fallback;

      const rs = getComputedStyle(document.documentElement);
      const bgColor = formatColor(rs.getPropertyValue('--bg-surface').trim(), CHART_COLORS.bg);
      const textColor = formatColor(rs.getPropertyValue('--text-secondary').trim(), CHART_COLORS.text);
      const tooltipBg = formatColor(rs.getPropertyValue('--bg-elevated').trim(), '#131B2E');
      
      const gridColor = theme === 'light' ? 'rgba(203, 213, 225, 0.5)' : CHART_COLORS.grid;
      const brandColor = accentColor || '#00D4FF';

      const chart = createChart(containerRef.current, {
        layout: { 
          background: { type: ColorType.Solid, color: bgColor }, 
          textColor: textColor, 
          fontFamily: 'JetBrains Mono, monospace' 
        },
        grid: { 
          vertLines: { color: gridColor }, 
          horzLines: { color: gridColor } 
        },
        crosshair: { 
          mode: 0, 
          vertLine: { color: `${brandColor}55`, labelBackgroundColor: tooltipBg }, 
          horzLine: { color: `${brandColor}55`, labelBackgroundColor: tooltipBg } 
        },
        timeScale: { 
          borderColor: gridColor, 
          timeVisible: true, 
          secondsVisible: false, 
          fixLeftEdge: true 
        },
        rightPriceScale: { 
          borderColor: gridColor, 
          scaleMargins: { top: 0.1, bottom: 0.2 } 
        },
        width,
        height,
      });

      const displayData = chartType === 'heikin-ashi' ? calcHeikinAshi(data) : data;

      let mainSeries: any;
      if (chartType === 'line') {
        mainSeries = chart.addSeries(LineSeries, { color: '#00D4FF', lineWidth: 2 });
        mainSeries.setData(displayData.map(d => ({ time: d.time as any, value: d.close })));
      } else if (chartType === 'area') {
        mainSeries = chart.addSeries(AreaSeries, { 
          topColor: 'rgba(0,212,255,0.3)', 
          bottomColor: 'rgba(0,212,255,0)', 
          lineColor: '#00D4FF', 
          lineWidth: 2 
        });
        mainSeries.setData(displayData.map(d => ({ time: d.time as any, value: d.close })));
      } else if (chartType === 'bar') {
        mainSeries = chart.addSeries(BarSeries, { upColor: CHART_COLORS.up, downColor: CHART_COLORS.down });
        mainSeries.setData(displayData.map(d => ({ time: d.time as any, open: d.open, high: d.high, low: d.low, close: d.close })));
      } else if (chartType === 'baseline') {
        const baseValue = displayData.length > 0 ? displayData[0].close : 0;
        mainSeries = chart.addSeries(BaselineSeries, {
          baseValue: { type: 'price', price: baseValue },
          topFillColor1: 'rgba(0, 196, 140, 0.28)',
          topFillColor2: 'rgba(0, 196, 140, 0.05)',
          topLineColor: CHART_COLORS.up,
          bottomFillColor1: 'rgba(255, 77, 79, 0.05)',
          bottomFillColor2: 'rgba(255, 77, 79, 0.28)',
          bottomLineColor: CHART_COLORS.down,
        });
        mainSeries.setData(displayData.map(d => ({ time: d.time as any, value: d.close })));
      } else if (chartType === 'histogram') {
        mainSeries = chart.addSeries(HistogramSeries, {
          color: '#8B5CF6',
        });
        mainSeries.setData(displayData.map(d => ({ 
          time: d.time as any, 
          value: d.close, 
          color: d.close >= d.open ? CHART_COLORS.up : CHART_COLORS.down 
        })));
      } else {
        mainSeries = chart.addSeries(CandlestickSeries, { 
          upColor: CHART_COLORS.up, 
          downColor: CHART_COLORS.down, 
          borderVisible: false, 
          wickUpColor: CHART_COLORS.up, 
          wickDownColor: CHART_COLORS.down 
        });
        mainSeries.setData(displayData.map(d => ({ time: d.time as any, open: d.open, high: d.high, low: d.low, close: d.close })));
      }
      seriesRef.current = mainSeries;

      // Volume
      const volSeries = chart.addSeries(HistogramSeries, { 
        color: '#1C2640', 
        priceFormat: { type: 'volume' }, 
        priceScaleId: '' 
      });
      volSeries.priceScale().applyOptions({ scaleMargins: { top: 0.82, bottom: 0 } });
      volSeries.setData(displayData.map(d => ({ 
        time: d.time as any, 
        value: d.volume, 
        color: d.close >= d.open ? 'rgba(0,196,140,0.35)' : 'rgba(255,77,79,0.35)' 
      })));

      // Overlays
      const adds = new Map<string, any>();
      const addLine = (vals: (number | null)[], color: string, width = 1) => {
        const s = chart.addSeries(LineSeries, { 
          color, 
          lineWidth: width as any, 
          priceLineVisible: false, 
          lastValueVisible: false, 
          crosshairMarkerVisible: false 
        });
        const d2 = data.map((d, i) => vals[i] !== null ? { time: d.time as any, value: vals[i] as number } : null).filter(Boolean);
        s.setData(d2 as any[]);
        return s;
      };

      overlays.forEach(ov => {
        if (!ov.enabled) return;
        if (ov.id === 'sma9') adds.set(ov.id, addLine(calcSMA(data, 9), '#FFD700', 1.5));
        else if (ov.id === 'sma20') adds.set(ov.id, addLine(calcSMA(data, 20), '#00D4FF', 1.5));
        else if (ov.id === 'sma50') adds.set(ov.id, addLine(calcSMA(data, 50), '#8B5CF6', 1.5));
        else if (ov.id === 'sma200') adds.set(ov.id, addLine(calcSMA(data, 200), '#F5A623', 1.5));
        else if (ov.id === 'ema9') adds.set(ov.id, addLine(calcEMA(data, 9), '#FF69B4', 1.5));
        else if (ov.id === 'ema21') adds.set(ov.id, addLine(calcEMA(data, 21), '#00FF7F', 1.5));
        else if (ov.id === 'vwap') adds.set(ov.id, addLine(calcVWAP(data), '#FF8C00', 1.5));
        else if (ov.id === 'bb') {
          const bb = calcBollingerBands(data);
          const upper = chart.addSeries(LineSeries, { color: 'rgba(138,43,226,0.7)', lineWidth: 1, priceLineVisible: false, lastValueVisible: false });
          const mid = chart.addSeries(LineSeries, { color: 'rgba(138,43,226,0.5)', lineWidth: 1, lineStyle: 2, priceLineVisible: false, lastValueVisible: false });
          const lower = chart.addSeries(LineSeries, { color: 'rgba(138,43,226,0.7)', lineWidth: 1, priceLineVisible: false, lastValueVisible: false });
          upper.setData(data.map((d, i) => bb[i].upper !== null ? { time: d.time as any, value: bb[i].upper as number } : null).filter(Boolean) as any[]);
          mid.setData(data.map((d, i) => bb[i].middle !== null ? { time: d.time as any, value: bb[i].middle as number } : null).filter(Boolean) as any[]);
          lower.setData(data.map((d, i) => bb[i].lower !== null ? { time: d.time as any, value: bb[i].lower as number } : null).filter(Boolean) as any[]);
          adds.set('bb_upper', upper); adds.set('bb_mid', mid); adds.set('bb_lower', lower);
        }
      });

      helperSeriesRef.current = adds;
      chartRef.current = chart;
      chart.timeScale().fitContent();

      // Load existing drawings
      const savedDrawings = drawings[symbol] || [];
      savedDrawings.forEach((config: DrawingLine) => {
        if (seriesRef.current) {
          const line = seriesRef.current.createPriceLine({
            price: config.price,
            color: config.color,
            lineWidth: config.lineWidth as any,
            lineStyle: config.lineStyle as any,
            axisLabelVisible: true,
            title: config.title,
          });
          drawnLinesRef.current.push(line);
        }
      });

      // Drawing Tool Click Handler
      chart.subscribeClick((param: any) => {
        const mode = drawModeRef.current;
        if (mode === 'none' || !param.point || !seriesRef.current) return;

        const price = seriesRef.current.coordinateToPrice(param.point.y);
        if (price === null) return;

        if (mode === 'hline') {
          const config = { price, color: '#F5A623', lineWidth: 1, lineStyle: 0, title: `H: ${price.toFixed(2)}` };
          const line = seriesRef.current.createPriceLine({ ...config, axisLabelVisible: true } as any);
          drawnLinesRef.current.push(line);
          addDrawing(symbol, config);
        } else if (mode === 'trendline' || mode === 'fib') {
          if (!clickPointRef.current) {
            clickPointRef.current = { price, time: param.time };
            const marker = seriesRef.current.createPriceLine({
              price,
              color: '#00D4FF',
              lineWidth: 1,
              lineStyle: 2,
              axisLabelVisible: true,
              title: mode === 'fib' ? 'Fib Start' : 'Start',
            });
            drawnLinesRef.current.push(marker);
          } else {
            const firstPrice = clickPointRef.current.price;
            if (mode === 'trendline') {
              const cA = { price: firstPrice, color: '#8B5CF6', lineWidth: 1, lineStyle: 0, title: 'Trend A' };
              const cB = { price, color: '#8B5CF6', lineWidth: 1, lineStyle: 0, title: 'Trend B' };
              const lineA = seriesRef.current.createPriceLine({ ...cA, axisLabelVisible: true } as any);
              const lineB = seriesRef.current.createPriceLine({ ...cB, axisLabelVisible: true } as any);
              drawnLinesRef.current.push(lineA, lineB);
              addDrawing(symbol, cA); addDrawing(symbol, cB);
            } else if (mode === 'fib') {
              const high = Math.max(firstPrice, price);
              const low = Math.min(firstPrice, price);
              const diff = high - low;
              const levels = [
                { ratio: 0, label: '0%', color: '#FF4D4F' },
                { ratio: 0.236, label: '23.6%', color: '#F5A623' },
                { ratio: 0.382, label: '38.2%', color: '#00C48C' },
                { ratio: 0.5, label: '50%', color: '#00D4FF' },
                { ratio: 0.618, label: '61.8%', color: '#00C48C' },
                { ratio: 0.786, label: '78.6%', color: '#F5A623' },
                { ratio: 1, label: '100%', color: '#FF4D4F' },
              ];
              levels.forEach(({ ratio, label, color }) => {
                const lvlPrice = high - diff * ratio;
                const config = { price: lvlPrice, color, lineWidth: 1, lineStyle: 1, title: `Fib ${label}` };
                const line = seriesRef.current.createPriceLine({ ...config, axisLabelVisible: true } as any);
                drawnLinesRef.current.push(line);
                addDrawing(symbol, config);
              });
            }
            clickPointRef.current = null;
          }
        } else if (mode === 'rect') {
          if (!clickPointRef.current) {
            clickPointRef.current = { price, time: param.time };
            const top = seriesRef.current.createPriceLine({
              price, color: '#00D4FF', lineWidth: 1, lineStyle: 2, axisLabelVisible: true, title: 'Rect Top',
            });
            drawnLinesRef.current.push(top);
          } else {
            const firstPrice = clickPointRef.current.price;
            const cBot = { price, color: '#00D4FF', lineWidth: 1, lineStyle: 0, title: 'Rect Bot' };
            const cTop = { price: firstPrice, color: '#00D4FF', lineWidth: 1, lineStyle: 0, title: 'Rect Top' };
            const bottom = seriesRef.current.createPriceLine({ ...cBot, axisLabelVisible: true } as any);
            const top2 = seriesRef.current.createPriceLine({ ...cTop, axisLabelVisible: true } as any);
            drawnLinesRef.current.push(bottom, top2);
            addDrawing(symbol, cBot); addDrawing(symbol, cTop);
            clickPointRef.current = null;
          }
        }
      });

      const handleResize = () => {
        if (containerRef.current) {
          chart.applyOptions({ width: containerRef.current.clientWidth });
        }
      };
      window.addEventListener('resize', handleResize);
      return () => { 
        window.removeEventListener('resize', handleResize); 
        chart.remove(); 
      };
    } catch (err) {
      console.error('Error creating chart:', err);
    }
  }, [data, chartType, overlays, height, theme, accentColor]);

  return <div ref={containerRef} className="w-full" style={{ height }} />;
});

export default memo(MainChart);
