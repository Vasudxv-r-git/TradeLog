'use client';

import { useState } from 'react';
import { X } from 'lucide-react';
import { CustomColumn } from '@/types';

interface AddColumnModalProps {
  onAdd: (column: CustomColumn) => void;
  onClose: () => void;
}

export default function AddColumnModal({ onAdd, onClose }: AddColumnModalProps) {
  const [name, setName] = useState('');
  const [type, setType] = useState<'text' | 'number' | 'dropdown'>('text');

  const handleSubmit = () => {
    if (!name.trim()) return;
    const key = `custom_${name.trim().toLowerCase().replace(/\s+/g, '_')}_${Date.now()}`;
    const column: CustomColumn = { key, name: name.trim(), type, ...(type === 'dropdown' ? { options: [] } : {}) };
    onAdd(column);
  };

  const inputStyle: React.CSSProperties = { padding: '8px 12px', fontSize: '0.875rem', borderRadius: 8, background: 'var(--bg-tertiary)', border: '1px solid var(--border-default)', color: 'var(--text-primary)', width: '100%' };

  return (
    <div onClick={(e) => e.target === e.currentTarget && onClose()} style={{ position: 'fixed', inset: 0, background: 'var(--surface-overlay)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 500, animation: 'fadeIn 0.15s ease-out' }}>
      <div style={{ background: 'var(--surface-card)', border: '1px solid var(--border-default)', borderRadius: 16, boxShadow: 'var(--shadow-xl)', width: '100%', maxWidth: 420, animation: 'scaleIn 0.2s ease-out' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 24px 0' }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-primary)' }}>Add Custom Column</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', display: 'flex' }}><X size={18} /></button>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, padding: '20px 24px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <label style={{ fontSize: '0.8125rem', fontWeight: 500, color: 'var(--text-secondary)' }}>Column Name</label>
            <input style={inputStyle} placeholder="e.g., Timeframe" value={name} onChange={(e) => setName(e.target.value)} autoFocus />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <label style={{ fontSize: '0.8125rem', fontWeight: 500, color: 'var(--text-secondary)' }}>Type</label>
            <select style={inputStyle} value={type} onChange={(e) => setType(e.target.value as 'text' | 'number' | 'dropdown')}>
              <option value="text">Text</option>
              <option value="number">Number</option>
              <option value="dropdown">Dropdown</option>
            </select>
          </div>
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, padding: '0 24px 20px' }}>
          <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={handleSubmit} disabled={!name.trim()}>Add Column</button>
        </div>
      </div>
    </div>
  );
}
