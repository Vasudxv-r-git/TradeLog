'use client';

import { useState, useRef, useEffect } from 'react';
import { ChevronDown, Plus, Check, X } from 'lucide-react';

interface EditableSelectFieldProps {
  value: string;
  options: string[];
  placeholder?: string;
  onChange: (value: string) => void;
  onAddOption: (option: string) => void;
}

export default function EditableSelectField({ value, options, placeholder = 'Select', onChange, onAddOption }: EditableSelectFieldProps) {
  const [open, setOpen] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [newOption, setNewOption] = useState('');
  const ref = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
        setIsAdding(false);
        setNewOption('');
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (isAdding && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isAdding]);

  const handleAdd = () => {
    const trimmed = newOption.trim();
    if (trimmed && !options.includes(trimmed)) {
      onAddOption(trimmed);
      onChange(trimmed); // Select the newly added option immediately
      setOpen(false);
    }
    setIsAdding(false);
    setNewOption('');
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAdd();
    } else if (e.key === 'Escape') {
      setIsAdding(false);
      setNewOption('');
    }
  };

  return (
    <div style={{ position: 'relative', width: '100%' }} ref={ref}>
      <button
        type="button"
        onClick={() => {
          if (!isAdding) setOpen(!open);
        }}
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%',
          padding: '4px 8px', background: 'transparent', border: 'none',
          fontSize: '0.8125rem', cursor: 'pointer', borderRadius: 4, transition: 'background 0.15s ease',
          color: value ? 'var(--text-primary)' : 'var(--text-tertiary)',
          fontWeight: value ? 500 : 400
        }}
      >
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {value || placeholder}
        </span>
        <ChevronDown size={14} style={{ color: 'var(--text-tertiary)', transition: 'transform 0.2s ease', transform: open ? 'rotate(180deg)' : 'rotate(0)', flexShrink: 0 }} />
      </button>

      {open && (
        <div style={{ position: 'absolute', top: 'calc(100% + 4px)', left: 0, width: '100%', background: 'var(--surface-elevated)', border: '1px solid var(--border-default)', borderRadius: 8, boxShadow: 'var(--shadow-md)', padding: 4, zIndex: 300, animation: 'slideDown 0.15s ease-out', maxHeight: 250, overflowY: 'auto' }}>
          {options.length === 0 && !isAdding && (
            <div style={{ padding: '8px 10px', fontSize: '0.8125rem', color: 'var(--text-tertiary)', fontStyle: 'italic', textAlign: 'center' }}>
              No options available
            </div>
          )}
          
          {options.map((opt) => (
            <button
              key={opt}
              type="button"
              onClick={() => { onChange(opt); setOpen(false); }}
              style={{
                display: 'block', width: '100%', padding: '8px 10px', textAlign: 'left',
                fontSize: '0.8125rem', color: 'var(--text-secondary)', borderRadius: 4,
                cursor: 'pointer', border: 'none', background: opt === value ? 'var(--accent-light)' : 'transparent',
                fontWeight: opt === value ? 500 : 400, transition: 'all 0.1s ease',
                wordBreak: 'break-word'
              }}
            >
              {opt}
            </button>
          ))}

          <div style={{ borderTop: '1px solid var(--border-default)', marginTop: 4, paddingTop: 4 }}>
            {!isAdding ? (
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); setIsAdding(true); }}
                style={{
                  display: 'flex', alignItems: 'center', gap: 6, width: '100%', padding: '8px 10px',
                  textAlign: 'left', fontSize: '0.8125rem', color: 'var(--primary-color)', borderRadius: 4,
                  cursor: 'pointer', border: 'none', background: 'transparent', fontWeight: 500, transition: 'background 0.1s ease'
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = 'var(--accent-light)'}
                onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
              >
                <Plus size={14} /> Add Option
              </button>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '4px' }}>
                <input
                  ref={inputRef}
                  type="text"
                  placeholder="New option name..."
                  value={newOption}
                  onChange={(e) => setNewOption(e.target.value)}
                  onKeyDown={handleKeyDown}
                  style={{
                    flex: 1, padding: '6px 8px', fontSize: '0.8125rem', borderRadius: 4,
                    border: '1px solid var(--border-default)', background: 'var(--bg-primary)', color: 'var(--text-primary)', outline: 'none'
                  }}
                  onClick={(e) => e.stopPropagation()}
                />
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); handleAdd(); }}
                  style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--primary-color)', color: 'white', border: 'none', borderRadius: 4, padding: '6px', cursor: 'pointer' }}
                  title="Save"
                >
                  <Check size={14} />
                </button>
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); setIsAdding(false); setNewOption(''); }}
                  style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-tertiary)', color: 'var(--text-secondary)', border: '1px solid var(--border-default)', borderRadius: 4, padding: '5px', cursor: 'pointer' }}
                  title="Cancel"
                >
                  <X size={14} />
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
