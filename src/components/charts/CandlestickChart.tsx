import { useEffect, useRef } from 'react';
import { createChart, ColorType, CandlestickSeries, HistogramSeries } from 'lightweight-charts';

interface CandlestickChartProps {
  data: any[];
  height?: number;
  colors?: {
    backgroundColor?: string;
    lineColor?: string;
    textColor?: string;
    areaTopColor?: string;
    areaBottomColor?: string;
  };
}

export default function CandlestickChart({
  data,
  height = 500,
  colors: {
    backgroundColor = '#0D1421',
    lineColor = '#00D4FF',
    textColor = '#7B8DB0',
  } = {},
}: CandlestickChartProps) {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<any>(null);
  const candlestickSeriesRef = useRef<any>(null);
  const volumeSeriesRef = useRef<any>(null);

  useEffect(() => {
    if (!chartContainerRef.current) return;

    const width = chartContainerRef.current.clientWidth;
    if (width <= 0) return;

    try {
      const chart = createChart(chartContainerRef.current, {
        layout: {
          background: { type: ColorType.Solid, color: backgroundColor },
          textColor,
          fontFamily: 'Outfit, sans-serif',
        },
        grid: {
          vertLines: { color: 'rgba(28, 38, 64, 0.5)' },
          horzLines: { color: 'rgba(28, 38, 64, 0.5)' },
        },
        crosshair: {
          mode: 0,
          vertLine: { color: '#00D4FF', labelBackgroundColor: '#131B2E' },
          horzLine: { color: '#00D4FF', labelBackgroundColor: '#131B2E' },
        },
        timeScale: {
          borderColor: 'rgba(28, 38, 64, 0.8)',
          timeVisible: true,
          secondsVisible: false,
        },
        rightPriceScale: {
          borderColor: 'rgba(28, 38, 64, 0.8)',
        },
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
        priceScaleId: '', // set as an overlay
      });

      volumeSeries.priceScale().applyOptions({
        scaleMargins: {
          top: 0.8,
          bottom: 0,
        },
      });

      chartRef.current = chart;
      candlestickSeriesRef.current = candlestickSeries;
      volumeSeriesRef.current = volumeSeries;

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
  }, [backgroundColor, textColor, height]);

  useEffect(() => {
    if (!candlestickSeriesRef.current || !volumeSeriesRef.current || !data.length) return;

    const candleData = data.map(d => ({
      time: d.time || d.date,
      open: d.open,
      high: d.high,
      low: d.low,
      close: d.close,
    })).sort((a, b) => (a.time > b.time ? 1 : -1));

    const volData = data.map(d => ({
      time: d.time || d.date,
      value: d.volume,
      color: d.close >= d.open ? 'rgba(0, 196, 140, 0.3)' : 'rgba(255, 77, 79, 0.3)',
    })).sort((a, b) => (a.time > b.time ? 1 : -1));

    candlestickSeriesRef.current.setData(candleData);
    volumeSeriesRef.current.setData(volData);
    
    chartRef.current?.timeScale().fitContent();
  }, [data]);

  return <div ref={chartContainerRef} className="chart-container" style={{ width: '100%', height }} />;
}
