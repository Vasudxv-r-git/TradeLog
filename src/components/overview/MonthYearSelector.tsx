'use client';

import { useState, useRef, useEffect } from 'react';
import { ChevronDown } from 'lucide-react';
import { MONTHS } from '@/lib/constants';

interface MonthYearSelectorProps {
  year: number;
  month: number;
  onYearChange: (year: number) => void;
  onMonthChange: (month: number) => void;
}

export default function MonthYearSelector({ year, month, onYearChange, onMonthChange }: MonthYearSelectorProps) {
  const [monthOpen, setMonthOpen] = useState(false);
  const monthRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (monthRef.current && !monthRef.current.contains(e.target as Node)) setMonthOpen(false);
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 4, background: 'var(--bg-tertiary)', border: '1px solid var(--border-default)', borderRadius: 8, padding: 4 }}>
        <button onClick={() => onYearChange(year - 1)} style={{ width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 6, fontSize: '1.125rem', color: 'var(--text-secondary)', cursor: 'pointer', background: 'none', border: 'none', transition: 'all 0.15s ease' }}>‹</button>
        <span style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-primary)', minWidth: 44, textAlign: 'center' }}>{year}</span>
        <button onClick={() => onYearChange(year + 1)} style={{ width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 6, fontSize: '1.125rem', color: 'var(--text-secondary)', cursor: 'pointer', background: 'none', border: 'none', transition: 'all 0.15s ease' }}>›</button>
      </div>

      <div style={{ position: 'relative' }} ref={monthRef}>
        <button onClick={() => setMonthOpen(!monthOpen)} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 14px', background: 'var(--bg-tertiary)', border: '1px solid var(--border-default)', borderRadius: 8, fontSize: '0.875rem', fontWeight: 500, color: 'var(--text-primary)', cursor: 'pointer', transition: 'all 0.15s ease' }}>
          <span>{MONTHS[month - 1]}</span>
          <ChevronDown size={14} style={{ transition: 'transform 0.2s ease', transform: monthOpen ? 'rotate(180deg)' : 'rotate(0)' }} />
        </button>
        {monthOpen && (
          <div style={{ position: 'absolute', top: 'calc(100% + 6px)', left: 0, background: 'var(--surface-elevated)', border: '1px solid var(--border-default)', borderRadius: 10, boxShadow: 'var(--shadow-lg)', padding: 4, display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 2, minWidth: 240, zIndex: 200, animation: 'slideDown 0.2s ease-out' }}>
            {MONTHS.map((name, i) => (
              <button key={name} onClick={() => { onMonthChange(i + 1); setMonthOpen(false); }} style={{ padding: '8px 12px', borderRadius: 6, fontSize: '0.8125rem', fontWeight: i + 1 === month ? 600 : 400, color: i + 1 === month ? 'var(--accent-text)' : 'var(--text-secondary)', background: i + 1 === month ? 'var(--accent-light)' : 'transparent', textAlign: 'center', cursor: 'pointer', border: 'none', transition: 'all 0.15s ease' }}>{name}</button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
