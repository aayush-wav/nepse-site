import { useEffect, useRef, forwardRef, useImperativeHandle } from 'react';
import { createChart, ColorType, CandlestickSeries, HistogramSeries } from 'lightweight-charts';
import { useUIStore } from '../../store';
import { useChartStore, DrawingLine } from '../../store/chartStore';

export interface DrawingRef {
  setDrawMode: (mode: string) => void;
  clearDrawings: () => void;
}

interface CandlestickChartProps {
  symbol: string;
  data: any[];
  height?: number;
}

const CandlestickChart = forwardRef<DrawingRef, CandlestickChartProps>(function CandlestickChart(
  { symbol, data, height = 500 },
  ref
) {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<any>(null);
  const candlestickSeriesRef = useRef<any>(null);
  const volumeSeriesRef = useRef<any>(null);
  const drawModeRef = useRef<string>('none');
  const clickPointRef = useRef<{ price: number; time: number } | null>(null);
  const drawnLinesRef = useRef<any[]>([]);
  const { theme, accentColor } = useUIStore();
  const { drawings, addDrawing, clearDrawings: clearStoreDrawings } = useChartStore();

  useImperativeHandle(ref, () => ({
    setDrawMode: (mode: string) => {
      drawModeRef.current = mode;
      clickPointRef.current = null; // reset pending point
      if (chartContainerRef.current) {
        chartContainerRef.current.style.cursor = mode !== 'none' ? 'crosshair' : 'default';
      }
    },
    clearDrawings: () => {
      drawnLinesRef.current.forEach(line => {
        try { candlestickSeriesRef.current?.removePriceLine(line); } catch {}
      });
      drawnLinesRef.current = [];
      clickPointRef.current = null;
      if (symbol) clearStoreDrawings(symbol);
    },
  }));

  useEffect(() => {
    if (!chartContainerRef.current) return;
    const width = chartContainerRef.current.clientWidth;
    if (width <= 0) return;

    const formatColor = (val: string, fallback: string) =>
      val ? `rgb(${val.split(' ').filter(Boolean).join(', ')})` : fallback;

    const rs = getComputedStyle(document.documentElement);
    const bgColor = formatColor(rs.getPropertyValue('--bg-surface').trim(), '#0D1421');
    const textColor = formatColor(rs.getPropertyValue('--text-secondary').trim(), '#7B8DB0');
    const tooltipBg = formatColor(rs.getPropertyValue('--bg-elevated').trim(), '#131B2E');
    const gridColor = theme === 'light' ? 'rgba(203, 213, 225, 0.5)' : 'rgba(28, 38, 64, 0.5)';
    const brandColor = accentColor || '#00D4FF';

    try {
      const chart = createChart(chartContainerRef.current, {
        layout: {
          background: { type: ColorType.Solid, color: bgColor },
          textColor,
          fontFamily: 'Outfit, sans-serif',
        },
        grid: {
          vertLines: { color: gridColor },
          horzLines: { color: gridColor },
        },
        crosshair: {
          mode: 0,
          vertLine: { color: brandColor, labelBackgroundColor: tooltipBg },
          horzLine: { color: brandColor, labelBackgroundColor: tooltipBg },
        },
        timeScale: {
          borderColor: gridColor,
          timeVisible: true,
          secondsVisible: false,
        },
        rightPriceScale: { borderColor: gridColor },
        width,
        height,
      });

      const candlestickSeries = chart.addSeries(CandlestickSeries, {
        upColor: '#00C48C',
        downColor: '#FF4D4F',
        borderVisible: false,
        wickUpColor: '#00C48C',
        wickDownColor: '#FF4D4F',
      });

      const volumeSeries = chart.addSeries(HistogramSeries, {
        color: '#1C2640',
        priceFormat: { type: 'volume' },
        priceScaleId: '',
      });
      volumeSeries.priceScale().applyOptions({ scaleMargins: { top: 0.8, bottom: 0 } });

      chartRef.current = chart;
      candlestickSeriesRef.current = candlestickSeries;
      volumeSeriesRef.current = volumeSeries;

      // Load existing drawings
      const savedDrawings = drawings[symbol] || [];
      savedDrawings.forEach((config: DrawingLine) => {
        const line = candlestickSeries.createPriceLine({
          price: config.price,
          color: config.color,
          lineWidth: config.lineWidth as any,
          lineStyle: config.lineStyle as any,
          axisLabelVisible: true,
          title: config.title,
        });
        drawnLinesRef.current.push(line);
      });

      // Drawing tool click handler
      chart.subscribeClick((param: any) => {
        const mode = drawModeRef.current;
        if (mode === 'none' || !param.point || !candlestickSeries) return;

        const price = candlestickSeries.coordinateToPrice(param.point.y);
        if (price === null) return;

        if (mode === 'hline') {
          // Draw horizontal line immediately
          const config = { price, color: '#F5A623', lineWidth: 1, lineStyle: 0, title: `H: ${price.toFixed(2)}` };
          const line = candlestickSeries.createPriceLine({ ...config, axisLabelVisible: true } as any);
          drawnLinesRef.current.push(line);
          addDrawing(symbol, config);
        } else if (mode === 'trendline' || mode === 'fib') {
          if (!clickPointRef.current) {
            // First click — mark it
            clickPointRef.current = { price, time: param.time };
            // Draw a temporary marker line
            const marker = candlestickSeries.createPriceLine({
              price,
              color: '#00D4FF',
              lineWidth: 1,
              lineStyle: 2, // dashed
              axisLabelVisible: true,
              title: mode === 'fib' ? 'Fib Start' : 'Start',
            });
            drawnLinesRef.current.push(marker);
          } else {
            const firstPrice = clickPointRef.current.price;
            if (mode === 'trendline') {
              // Draw trendline as two horizontal price levels
              const cA = { price: firstPrice, color: '#8B5CF6', lineWidth: 1, lineStyle: 0, title: 'Trend A' };
              const cB = { price, color: '#8B5CF6', lineWidth: 1, lineStyle: 0, title: 'Trend B' };
              const lineA = candlestickSeries.createPriceLine({ ...cA, axisLabelVisible: true } as any);
              const lineB = candlestickSeries.createPriceLine({ ...cB, axisLabelVisible: true } as any);
              drawnLinesRef.current.push(lineA, lineB);
              addDrawing(symbol, cA); addDrawing(symbol, cB);
            } else if (mode === 'fib') {
              // Fibonacci: 23.6%, 38.2%, 50%, 61.8%, 78.6%
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
                const line = candlestickSeries.createPriceLine({ ...config, axisLabelVisible: true } as any);
                drawnLinesRef.current.push(line);
                addDrawing(symbol, config);
              });
            }
            clickPointRef.current = null;
          }
        } else if (mode === 'rect') {
          // Rectangle: draw top and bottom lines on two clicks
          if (!clickPointRef.current) {
            clickPointRef.current = { price, time: param.time };
            const top = candlestickSeries.createPriceLine({
              price,
              color: '#00D4FF',
              lineWidth: 1,
              lineStyle: 2,
              axisLabelVisible: true,
              title: 'Rect Top',
            });
            drawnLinesRef.current.push(top);
          } else {
            const firstPrice = clickPointRef.current.price;
            const cBot = { price, color: '#00D4FF', lineWidth: 1, lineStyle: 0, title: 'Rect Bot' };
            const cTop = { price: firstPrice, color: '#00D4FF', lineWidth: 1, lineStyle: 0, title: 'Rect Top' };
            const bottom = candlestickSeries.createPriceLine({ ...cBot, axisLabelVisible: true } as any);
            const top2 = candlestickSeries.createPriceLine({ ...cTop, axisLabelVisible: true } as any);
            drawnLinesRef.current.push(bottom, top2);
            addDrawing(symbol, cBot); addDrawing(symbol, cTop);
            clickPointRef.current = null;
          }
        }
      });

      const handleResize = () => {
        if (chartContainerRef.current) {
          chart.applyOptions({ width: chartContainerRef.current.clientWidth });
        }
      };
      window.addEventListener('resize', handleResize);
      return () => {
        window.removeEventListener('resize', handleResize);
        chart.remove();
      };
    } catch (err) {
      console.error('Error creating candlestick chart:', err);
    }
  }, [theme, accentColor, height]);

  useEffect(() => {
    if (!candlestickSeriesRef.current || !volumeSeriesRef.current || !data.length) return;

    const candleData = data.map(d => ({
      time: d.time || d.date,
      open: d.open,
      high: d.high,
      low: d.low,
      close: d.close,
    })).sort((a, b) => (a.time as number) - (b.time as number));

    const volData = data.map(d => ({
      time: d.time || d.date,
      value: d.volume,
      color: d.close >= d.open ? 'rgba(0, 196, 140, 0.3)' : 'rgba(255, 77, 79, 0.3)',
    })).sort((a, b) => (a.time as number) - (b.time as number));

    candlestickSeriesRef.current.setData(candleData);
    volumeSeriesRef.current.setData(volData);
    chartRef.current?.timeScale().fitContent();
  }, [data]);

  return <div ref={chartContainerRef} className="chart-container" style={{ width: '100%', height }} />;
});

export default CandlestickChart;
