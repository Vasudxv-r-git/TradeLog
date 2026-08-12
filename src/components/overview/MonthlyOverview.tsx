'use client';

import { useMemo } from 'react';
import { Trade } from '@/types';
import { MONTHS } from '@/lib/constants';

interface MonthlyOverviewProps {
  trades: Trade[];
  year: number;
  month: number;
}

export default function MonthlyOverview({ trades, year, month }: MonthlyOverviewProps) {
  const stats = useMemo(() => {
    const totalPnL = trades.reduce((sum, t) => sum + (t.reward || 0), 0);
    const totalCommission = trades.reduce((sum, t) => sum + (t.commission || 0), 0);
    const netPnL = totalPnL + totalCommission;
    const tradeCount = trades.length;
    const wins = trades.filter((t) => t.outcome === 'Profit').length;
    const winRate = tradeCount > 0 ? Math.round((wins / tradeCount) * 100) : 0;
    return { totalPnL, totalCommission, netPnL, tradeCount, winRate };
  }, [trades]);

  if (trades.length === 0) return null;

  const cards = [
    { label: 'Total P&L', value: `$${stats.totalPnL.toFixed(2)}`, color: stats.totalPnL >= 0 ? 'var(--success-text)' : 'var(--danger-text)' },
    { label: 'Commission', value: `$${Math.abs(stats.totalCommission).toFixed(2)}`, color: 'var(--danger-text)' },
    { label: 'Net P&L', value: `$${stats.netPnL.toFixed(2)}`, color: stats.netPnL >= 0 ? 'var(--success-text)' : 'var(--danger-text)' },
    { label: 'Trades', value: String(stats.tradeCount), color: 'var(--text-primary)' },
    { label: 'Win Rate', value: `${stats.winRate}%`, color: stats.winRate >= 50 ? 'var(--success-text)' : 'var(--danger-text)' },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <h3 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-primary)', opacity: 0, animation: 'staggerFadeIn 300ms var(--ease-out) forwards' }}>{MONTHS[month - 1]} {year} Overview</h3>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 12 }}>
        {cards.map((card, index) => (
          <div
            key={card.label}
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 4,
              padding: 16,
              background: 'var(--surface-card)',
              border: '1px solid var(--border-default)',
              borderRadius: 10,
              transition: 'transform 200ms var(--ease-out), box-shadow 200ms var(--ease-out)',
              cursor: 'default',
              opacity: 0,
              animation: `staggerFadeIn 300ms var(--ease-out) ${(index + 1) * 50}ms forwards`,
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-2px)';
              e.currentTarget.style.boxShadow = 'var(--shadow-md)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = 'none';
            }}
          >
            <span style={{ fontSize: '0.75rem', fontWeight: 500, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{card.label}</span>
            <span style={{ fontSize: '1.25rem', fontWeight: 700, color: card.color }}>{card.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
