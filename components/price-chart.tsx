'use client';

import { useEffect, useRef } from 'react';
import { useTheme } from 'next-themes';
import {
  createChart,
  LineSeries,
  LineStyle,
  type IChartApi,
  type ISeriesApi,
  type UTCTimestamp,
} from 'lightweight-charts';

export interface PriceChartPoint {
  /** Milliseconds since epoch */
  time: number;
  value: number;
}

interface PriceChartProps {
  data: PriceChartPoint[];
  targetPrice?: number;
  trend?: 'up' | 'down' | 'stable';
  className?: string;
  ariaLabel?: string;
}

const trendColor = (trend: PriceChartProps['trend']) =>
  trend === 'up' ? '#10b981' : trend === 'down' ? '#ef4444' : '#3b82f6';

export function PriceChart({ data, targetPrice, trend, className, ariaLabel }: PriceChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const historySeriesRef = useRef<ISeriesApi<'Line'> | null>(null);
  const targetSeriesRef = useRef<ISeriesApi<'Line'> | null>(null);
  const { resolvedTheme } = useTheme();

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const isDark = resolvedTheme === 'dark';
    const chart = createChart(container, {
      width: container.clientWidth,
      height: container.clientHeight,
      autoSize: false,
      layout: {
        background: { color: 'transparent' },
        textColor: isDark ? '#a1a1aa' : '#52525b',
      },
      grid: {
        vertLines: { visible: false },
        horzLines: { color: isDark ? '#27272a' : '#e4e4e7' },
      },
      timeScale: { timeVisible: true, secondsVisible: false, borderVisible: false },
      rightPriceScale: { borderVisible: false },
      crosshair: { mode: 1 },
    });
    chartRef.current = chart;
    historySeriesRef.current = chart.addSeries(LineSeries, {
      color: '#7c3aed',
      lineWidth: 2,
    });

    const ro = new ResizeObserver(() => {
      chart.applyOptions({ width: container.clientWidth, height: container.clientHeight });
    });
    ro.observe(container);

    return () => {
      ro.disconnect();
      chart.remove();
      chartRef.current = null;
      historySeriesRef.current = null;
      targetSeriesRef.current = null;
    };
  }, [resolvedTheme]);

  useEffect(() => {
    const series = historySeriesRef.current;
    if (!series) return;
    const sorted = [...data].sort((a, b) => a.time - b.time);
    const seen = new Set<number>();
    const points = sorted
      .map(p => ({ time: Math.floor(p.time / 1000) as UTCTimestamp, value: p.value }))
      .filter(p => {
        if (seen.has(p.time)) return false;
        seen.add(p.time);
        return true;
      });
    series.setData(points);
    chartRef.current?.timeScale().fitContent();
  }, [data]);

  useEffect(() => {
    const chart = chartRef.current;
    if (!chart) return;

    if (targetSeriesRef.current) {
      chart.removeSeries(targetSeriesRef.current);
      targetSeriesRef.current = null;
    }

    if (targetPrice === undefined || data.length < 2) return;

    const sorted = [...data].sort((a, b) => a.time - b.time);
    const last = sorted[sorted.length - 1];
    const stepMs = (last.time - sorted[0].time) / Math.max(1, sorted.length - 1);
    const futureTime = last.time + stepMs * Math.max(8, Math.ceil(sorted.length / 6));

    const series = chart.addSeries(LineSeries, {
      color: trendColor(trend),
      lineWidth: 2,
      lineStyle: LineStyle.Dashed,
      lastValueVisible: true,
      priceLineVisible: false,
    });
    series.setData([
      { time: Math.floor(last.time / 1000) as UTCTimestamp, value: last.value },
      { time: Math.floor(futureTime / 1000) as UTCTimestamp, value: targetPrice },
    ]);
    targetSeriesRef.current = series;
  }, [data, targetPrice, trend]);

  return (
    <div
      ref={containerRef}
      className={className ?? 'aspect-2/1 w-full'}
      role="img"
      aria-label={ariaLabel ?? 'Pi price chart'}
    />
  );
}
