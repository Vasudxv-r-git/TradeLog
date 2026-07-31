'use client';

import { useState, useRef, useEffect } from 'react';
import { ChevronDown } from 'lucide-react';
import { WEEKDAYS, MONTHS } from '@/lib/constants';

interface DatePickerPopupProps {
  value: string;
  onChange: (date: string, day: string) => void;
  onClose: () => void;
}

export default function DatePickerPopup({ value, onChange, onClose }: DatePickerPopupProps) {
  const now = new Date();
  
  // Helper to parse 'YYYY-MM-DD' into local date
  const parseLocalDate = (dateStr: string) => {
    if (!dateStr) return null;
    const parts = dateStr.split('-');
    if (parts.length !== 3) return new Date(dateStr); // Fallback
    return new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
  };

  const initial = value ? (parseLocalDate(value) || now) : now;
  const [viewYear, setViewYear] = useState(initial.getFullYear());
  const [viewMonth, setViewMonth] = useState(initial.getMonth());
  const [yearDropdownOpen, setYearDropdownOpen] = useState(false);
  const [monthDropdownOpen, setMonthDropdownOpen] = useState(false);
  const popupRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (popupRef.current && !popupRef.current.contains(e.target as Node)) onClose();
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);

  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const firstDay = new Date(viewYear, viewMonth, 1).getDay();
  const selectedDate = value ? parseLocalDate(value) : null;
  const isSelected = (day: number) => selectedDate && selectedDate.getFullYear() === viewYear && selectedDate.getMonth() === viewMonth && selectedDate.getDate() === day;
  const isToday = (day: number) => now.getFullYear() === viewYear && now.getMonth() === viewMonth && now.getDate() === day;
  const yearRange = Array.from({ length: 15 }, (_, i) => now.getFullYear() - 5 + i);

  const handleSelectDate = (day: number) => {
    const date = new Date(viewYear, viewMonth, day);
    // Format manually to keep local timezone instead of .toISOString() which converts to UTC
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    const localDateString = `${y}-${m}-${d}`;
    
    const dayName = WEEKDAYS[date.getDay()];
    onChange(localDateString, dayName);
    onClose();
  };

  const dropdownStyle: React.CSSProperties = { position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0, background: 'var(--surface-elevated)', border: '1px solid var(--border-default)', borderRadius: 8, boxShadow: 'var(--shadow-md)', padding: 4, maxHeight: 200, overflowY: 'auto', zIndex: 310, animation: 'slideDown 0.15s ease-out' };
  const selectorBtnStyle: React.CSSProperties = { display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', padding: '6px 10px', background: 'var(--bg-tertiary)', border: '1px solid var(--border-default)', borderRadius: 6, fontSize: '0.8125rem', fontWeight: 500, color: 'var(--text-primary)', cursor: 'pointer' };

  return (
    <div ref={popupRef} style={{ position: 'absolute', top: 'calc(100% + 4px)', left: 0, zIndex: 300, background: 'var(--surface-elevated)', border: '1px solid var(--border-default)', borderRadius: 12, boxShadow: 'var(--shadow-lg)', padding: 12, minWidth: 260, animation: 'scaleIn 0.2s ease-out', transformOrigin: 'top left' }}>
      <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
        <div style={{ position: 'relative', flex: 1 }}>
          <button style={selectorBtnStyle} onClick={() => { setMonthDropdownOpen(!monthDropdownOpen); setYearDropdownOpen(false); }}>
            {MONTHS[viewMonth]} <ChevronDown size={12} style={{ transform: monthDropdownOpen ? 'rotate(180deg)' : 'rotate(0)' }} />
          </button>
          {monthDropdownOpen && (
            <div style={dropdownStyle}>
              {MONTHS.map((name, i) => (
                <button key={name} onClick={() => { setViewMonth(i); setMonthDropdownOpen(false); }} style={{ display: 'block', width: '100%', padding: '5px 10px', textAlign: 'left', fontSize: '0.8125rem', color: i === viewMonth ? 'var(--accent-text)' : 'var(--text-secondary)', background: i === viewMonth ? 'var(--accent-light)' : 'transparent', borderRadius: 4, cursor: 'pointer', border: 'none', fontWeight: i === viewMonth ? 600 : 400 }}>{name}</button>
              ))}
            </div>
          )}
        </div>
        <div style={{ position: 'relative', flex: 1 }}>
          <button style={selectorBtnStyle} onClick={() => { setYearDropdownOpen(!yearDropdownOpen); setMonthDropdownOpen(false); }}>
            {viewYear} <ChevronDown size={12} style={{ transform: yearDropdownOpen ? 'rotate(180deg)' : 'rotate(0)' }} />
          </button>
          {yearDropdownOpen && (
            <div style={dropdownStyle}>
              {yearRange.map((y) => (
                <button key={y} onClick={() => { setViewYear(y); setYearDropdownOpen(false); }} style={{ display: 'block', width: '100%', padding: '5px 10px', textAlign: 'left', fontSize: '0.8125rem', color: y === viewYear ? 'var(--accent-text)' : 'var(--text-secondary)', background: y === viewYear ? 'var(--accent-light)' : 'transparent', borderRadius: 4, cursor: 'pointer', border: 'none', fontWeight: y === viewYear ? 600 : 400 }}>{y}</button>
              ))}
            </div>
          )}
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 2, marginBottom: 4 }}>
        {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map((d) => (
          <span key={d} style={{ textAlign: 'center', fontSize: '0.6875rem', fontWeight: 600, color: 'var(--text-tertiary)', padding: '4px 0' }}>{d}</span>
        ))}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 2 }}>
        {Array.from({ length: firstDay }, (_, i) => (<div key={`e${i}`} style={{ aspectRatio: '1' }} />))}
        {Array.from({ length: daysInMonth }, (_, i) => {
          const day = i + 1;
          return (
            <button key={day} onClick={() => handleSelectDate(day)} style={{ aspectRatio: '1', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.8125rem', color: isSelected(day) ? 'white' : isToday(day) ? 'var(--accent-text)' : 'var(--text-secondary)', background: isSelected(day) ? 'var(--accent)' : 'transparent', border: isToday(day) && !isSelected(day) ? '1px solid var(--accent)' : 'none', borderRadius: 6, cursor: 'pointer', fontWeight: isSelected(day) || isToday(day) ? 600 : 400 }}>{day}</button>
          );
        })}
      </div>
    </div>
  );
}
