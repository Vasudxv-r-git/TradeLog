'use client';

import { useMemo } from 'react';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';
import { Trade } from '@/types';
import { useTheme } from '@/hooks/useTheme';

interface PnLChartProps {
  trades: Trade[];
}

export default function PnLChart({ trades }: PnLChartProps) {
  const { theme } = useTheme();

  const chartData = useMemo(() => {
    let cumulative = 0;
    return trades
      .filter((t) => t.reward !== null && t.reward !== undefined)
      .map((t, i) => {
        const reward = t.reward || 0;
        cumulative += reward;
        return { name: t.date || `Trade ${i + 1}`, reward, cumulative, pair: t.pair };
      });
  }, [trades]);

  if (chartData.length === 0) return null;

  const finalCumulative = chartData[chartData.length - 1]?.cumulative || 0;
  const isPositive = finalCumulative >= 0;

  const lineColor = isPositive
    ? (theme === 'dark' ? '#34d399' : '#10b981')
    : (theme === 'dark' ? '#f87171' : '#ef4444');
  const gradientId = 'pnlGradient';
  const textColor = theme === 'dark' ? '#71717a' : '#94a3b8';
  const gridColor = theme === 'dark' ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)';
  const tooltipBg = theme === 'dark' ? '#18181b' : '#ffffff';
  const tooltipBorder = theme === 'dark' ? '#27272a' : '#e2e8f0';

  return (
    <div style={{ background: 'var(--surface-card)', border: '1px solid var(--border-default)', borderRadius: 12, padding: '20px 20px 12px', animation: 'fadeIn 0.3s ease-out' }}>
      <h3 style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 16 }}>Cumulative P&L</h3>
      <ResponsiveContainer width="100%" height={260}>
        <AreaChart data={chartData} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={lineColor} stopOpacity={0.3} />
              <stop offset="95%" stopColor={lineColor} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke={gridColor} vertical={false} />
          <XAxis
            dataKey="name"
            tick={{ fill: textColor, fontSize: 11 }}
            tickLine={false}
            axisLine={{ stroke: gridColor }}
          />
          <YAxis
            tick={{ fill: textColor, fontSize: 11 }}
            tickLine={false}
            axisLine={false}
            tickFormatter={(v: number) => `$${v}`}
          />
          <Tooltip
            contentStyle={{
              background: tooltipBg,
              border: `1px solid ${tooltipBorder}`,
              borderRadius: '10px',
              fontSize: '12px',
              boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
              padding: '10px 14px',
            }}
            labelStyle={{ fontWeight: 600, marginBottom: 4, color: theme === 'dark' ? '#fafafa' : '#0f1729' }}
            formatter={(value: any, name: any) => {
              const label = name === 'cumulative' ? 'Cumulative P&L' : name;
              return [`$${Number(value).toFixed(2)}`, label];
            }}
            cursor={{ stroke: lineColor, strokeWidth: 1, strokeDasharray: '4 4' }}
          />
          <Area
            type="monotone"
            dataKey="cumulative"
            name="cumulative"
            stroke={lineColor}
            strokeWidth={2.5}
            fill={`url(#${gradientId})`}
            dot={false}
            activeDot={{ r: 5, fill: lineColor, stroke: theme === 'dark' ? '#18181b' : '#ffffff', strokeWidth: 2 }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
