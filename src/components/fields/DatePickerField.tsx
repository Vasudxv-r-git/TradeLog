'use client';

import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown, Calendar } from 'lucide-react';
import { WEEKDAYS, MONTHS } from '@/lib/constants';

interface DatePickerFieldProps {
  value: string;
  onChange: (date: string, day: string) => void;
  placeholder?: string;
  style?: React.CSSProperties;
  showIcon?: boolean;
}

export default function DatePickerField({ value, onChange, placeholder = 'Select Date', style, showIcon = false }: DatePickerFieldProps) {
  const [open, setOpen] = useState(false);
  const [coords, setCoords] = useState({ top: 0, left: 0, width: 0 });
  const ref = useRef<HTMLDivElement>(null);
  const popupRef = useRef<HTMLDivElement>(null);

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

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        ref.current && !ref.current.contains(e.target as Node) &&
        (!popupRef.current || !popupRef.current.contains(e.target as Node))
      ) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleToggle = () => {
    if (!open && ref.current) {
      const rect = ref.current.getBoundingClientRect();
      setCoords({
        top: rect.bottom + window.scrollY + 4,
        left: rect.left + window.scrollX,
        width: Math.max(rect.width, 260) // ensure min-width
      });
      // Reset view to currently selected date when opening
      const current = value ? (parseLocalDate(value) || now) : now;
      setViewYear(current.getFullYear());
      setViewMonth(current.getMonth());
    }
    setOpen(!open);
    setYearDropdownOpen(false);
    setMonthDropdownOpen(false);
  };

  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const firstDay = new Date(viewYear, viewMonth, 1).getDay();
  const selectedDate = value ? parseLocalDate(value) : null;
  const isSelected = (day: number) => selectedDate && selectedDate.getFullYear() === viewYear && selectedDate.getMonth() === viewMonth && selectedDate.getDate() === day;
  const isToday = (day: number) => now.getFullYear() === viewYear && now.getMonth() === viewMonth && now.getDate() === day;
  const yearRange = Array.from({ length: 15 }, (_, i) => now.getFullYear() - 5 + i);

  const handleSelectDate = (day: number) => {
    const date = new Date(viewYear, viewMonth, day);
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    const localDateString = `${y}-${m}-${d}`;
    
    const dayName = WEEKDAYS[date.getDay()];
    onChange(localDateString, dayName);
    setOpen(false);
  };

  const dropdownStyle: React.CSSProperties = { position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0, background: 'var(--surface-elevated)', border: '1px solid var(--border-default)', borderRadius: 8, boxShadow: 'var(--shadow-md)', padding: 4, maxHeight: 200, overflowY: 'auto', zIndex: 310, animation: 'slideDown 0.15s ease-out' };
  const selectorBtnStyle: React.CSSProperties = { display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', padding: '6px 10px', background: 'var(--bg-tertiary)', border: '1px solid var(--border-default)', borderRadius: 6, fontSize: '0.8125rem', fontWeight: 500, color: 'var(--text-primary)', cursor: 'pointer' };

  return (
    <div style={{ position: 'relative', width: '100%' }} ref={ref}>
      <button 
        type="button"
        onClick={handleToggle} 
        style={{ 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: showIcon ? 'space-between' : 'flex-start',
          width: '100%', 
          padding: '10px 14px', 
          borderRadius: 10, 
          border: '1px solid var(--border-default)', 
          background: 'var(--bg-tertiary)', 
          fontSize: '0.875rem', 
          color: value ? 'var(--text-primary)' : 'var(--text-tertiary)', 
          transition: 'border-color 0.15s ease',
          cursor: 'pointer',
          ...style 
        }}
      >
        <span>{value || placeholder}</span>
        {showIcon && <Calendar size={14} style={{ color: 'var(--text-tertiary)' }} />}
      </button>

      {open && typeof document !== 'undefined' && createPortal(
        <div ref={popupRef} style={{ position: 'absolute', top: coords.top, left: coords.left, zIndex: 9999, background: 'var(--surface-elevated)', border: '1px solid var(--border-default)', borderRadius: 12, boxShadow: 'var(--shadow-lg)', padding: 12, width: coords.width, minWidth: 260, animation: 'scaleIn 0.2s ease-out', transformOrigin: 'top left' }}>
          <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
            <div style={{ position: 'relative', flex: 1 }}>
              <button type="button" style={selectorBtnStyle} onClick={(e) => { e.stopPropagation(); setMonthDropdownOpen(!monthDropdownOpen); setYearDropdownOpen(false); }}>
                {MONTHS[viewMonth]} <ChevronDown size={12} style={{ transform: monthDropdownOpen ? 'rotate(180deg)' : 'rotate(0)' }} />
              </button>
              {monthDropdownOpen && (
                <div style={dropdownStyle}>
                  {MONTHS.map((name, i) => (
                    <button type="button" key={name} onClick={(e) => { e.stopPropagation(); setViewMonth(i); setMonthDropdownOpen(false); }} style={{ display: 'block', width: '100%', padding: '5px 10px', textAlign: 'left', fontSize: '0.8125rem', color: i === viewMonth ? 'var(--accent-text)' : 'var(--text-secondary)', background: i === viewMonth ? 'var(--accent-light)' : 'transparent', borderRadius: 4, cursor: 'pointer', border: 'none', fontWeight: i === viewMonth ? 600 : 400 }}>{name}</button>
                  ))}
                </div>
              )}
            </div>
            <div style={{ position: 'relative', flex: 1 }}>
              <button type="button" style={selectorBtnStyle} onClick={(e) => { e.stopPropagation(); setYearDropdownOpen(!yearDropdownOpen); setMonthDropdownOpen(false); }}>
                {viewYear} <ChevronDown size={12} style={{ transform: yearDropdownOpen ? 'rotate(180deg)' : 'rotate(0)' }} />
              </button>
              {yearDropdownOpen && (
                <div style={dropdownStyle}>
                  {yearRange.map((y) => (
                    <button type="button" key={y} onClick={(e) => { e.stopPropagation(); setViewYear(y); setYearDropdownOpen(false); }} style={{ display: 'block', width: '100%', padding: '5px 10px', textAlign: 'left', fontSize: '0.8125rem', color: y === viewYear ? 'var(--accent-text)' : 'var(--text-secondary)', background: y === viewYear ? 'var(--accent-light)' : 'transparent', borderRadius: 4, cursor: 'pointer', border: 'none', fontWeight: y === viewYear ? 600 : 400 }}>{y}</button>
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
                <button type="button" key={day} onClick={(e) => { e.stopPropagation(); handleSelectDate(day); }} style={{ aspectRatio: '1', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.8125rem', color: isSelected(day) ? 'white' : isToday(day) ? 'var(--accent-text)' : 'var(--text-secondary)', background: isSelected(day) ? 'var(--accent)' : 'transparent', border: isToday(day) && !isSelected(day) ? '1px solid var(--accent)' : 'none', borderRadius: 6, cursor: 'pointer', fontWeight: isSelected(day) || isToday(day) ? 600 : 400 }}>{day}</button>
              );
            })}
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
