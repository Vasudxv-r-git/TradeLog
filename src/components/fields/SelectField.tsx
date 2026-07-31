'use client';

import { useState, useRef, useEffect } from 'react';
import { ChevronDown } from 'lucide-react';

interface SelectFieldProps {
  value: string;
  options: { label: string; value: string; color?: string }[];
  placeholder?: string;
  onChange: (value: string) => void;
}

export default function SelectField({ value, options, placeholder = 'Select', onChange }: SelectFieldProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const selected = options.find((o) => o.value === value);

  return (
    <div style={{ position: 'relative', width: '100%' }} ref={ref}>
      <button onClick={() => setOpen(!open)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', padding: '4px 8px', background: 'transparent', border: 'none', fontSize: '0.8125rem', cursor: 'pointer', borderRadius: 4, transition: 'background 0.15s ease', color: selected?.color || (selected ? 'var(--text-primary)' : 'var(--text-tertiary)'), fontWeight: selected ? 500 : 400 }}>
        <span>{selected?.label || placeholder}</span>
        <ChevronDown size={12} style={{ color: 'var(--text-tertiary)', transition: 'transform 0.2s ease', transform: open ? 'rotate(180deg)' : 'rotate(0)', flexShrink: 0 }} />
      </button>
      {open && (
        <div style={{ position: 'absolute', top: 'calc(100% + 4px)', left: 0, minWidth: 130, background: 'var(--surface-elevated)', border: '1px solid var(--border-default)', borderRadius: 8, boxShadow: 'var(--shadow-md)', padding: 4, zIndex: 300, animation: 'slideDown 0.15s ease-out' }}>
          {options.map((opt) => (
            <button key={opt.value} onClick={() => { onChange(opt.value); setOpen(false); }} style={{ display: 'block', width: '100%', padding: '6px 10px', textAlign: 'left', fontSize: '0.8125rem', color: opt.color || 'var(--text-secondary)', borderRadius: 4, cursor: 'pointer', border: 'none', background: opt.value === value ? 'var(--accent-light)' : 'transparent', fontWeight: 500, transition: 'all 0.1s ease' }}>{opt.label}</button>
          ))}
        </div>
      )}
    </div>
  );
}
