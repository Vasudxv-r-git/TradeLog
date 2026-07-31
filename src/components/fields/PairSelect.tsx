'use client';

import { useState, useRef, useEffect } from 'react';
import { ChevronDown, Plus, X } from 'lucide-react';
import { DEFAULT_PAIR_GROUPS, PairGroup } from '@/lib/constants';
import { CustomPair } from '@/types';
import { useActiveJournal } from '@/hooks/useActiveJournal';

interface PairSelectProps {
  value: string;
  customPairs: CustomPair[];
  hiddenPairs: Set<string>;
  onChange: (pair: string) => void;
  onAddPair: (pair: CustomPair) => void;
  onDeletePair: (pairSymbol: string) => void;
}

export default function PairSelect({ value, customPairs, hiddenPairs, onChange, onAddPair, onDeletePair }: PairSelectProps) {
  const [open, setOpen] = useState(false);
  const [addingPair, setAddingPair] = useState(false);
  const [newSymbol, setNewSymbol] = useState('');
  const [newCategory, setNewCategory] = useState('Commodities');
  const [hoveredPair, setHoveredPair] = useState<string | null>(null);
  const { activeRole } = useActiveJournal();
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) { setOpen(false); setAddingPair(false); }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const groups: PairGroup[] = [...DEFAULT_PAIR_GROUPS.map((g) => ({ ...g, pairs: [...g.pairs] }))];
  for (const cp of customPairs) {
    let group = groups.find((g) => g.category === cp.category);
    if (!group) { group = { category: cp.category, pairs: [] }; groups.push(group); }
    if (!group.pairs.includes(cp.symbol)) group.pairs.push(cp.symbol);
  }
  
  // Filter out hidden pairs
  const visibleGroups = groups
    .map((g) => ({ ...g, pairs: g.pairs.filter((p) => !hiddenPairs.has(p)) }))
    .filter((g) => g.pairs.length > 0);

  const allCategories = groups.map((g) => g.category);

  const handleAddPair = () => {
    if (newSymbol.trim()) {
      onAddPair({ symbol: newSymbol.trim().toUpperCase(), category: newCategory });
      onChange(newSymbol.trim().toUpperCase());
      setNewSymbol(''); setAddingPair(false); setOpen(false);
    }
  };

  return (
    <div style={{ position: 'relative', width: '100%' }} ref={ref}>
      <button onClick={() => setOpen(!open)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', padding: '4px 8px', background: 'transparent', border: 'none', fontSize: '0.8125rem', cursor: 'pointer', borderRadius: 4, color: value ? 'var(--text-primary)' : 'var(--text-tertiary)', fontWeight: value ? 500 : 400 }}>
        <span>{value || 'Select pair'}</span>
        <ChevronDown size={12} style={{ color: 'var(--text-tertiary)', transition: 'transform 0.2s ease', transform: open ? 'rotate(180deg)' : 'rotate(0)' }} />
      </button>
      {open && (
        <div style={{ position: 'absolute', top: 'calc(100% + 4px)', left: 0, minWidth: 200, background: 'var(--surface-elevated)', border: '1px solid var(--border-default)', borderRadius: 10, boxShadow: 'var(--shadow-lg)', padding: 6, zIndex: 300, maxHeight: 320, overflowY: 'auto', animation: 'slideDown 0.15s ease-out' }}>
          {visibleGroups.map((group) => (
            <div key={group.category} style={{ marginBottom: 4 }}>
              <div style={{ padding: '6px 10px 4px', fontSize: '0.6875rem', fontWeight: 600, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{group.category}</div>
              {group.pairs.map((pair) => (
                <div key={pair} style={{ position: 'relative' }} onMouseEnter={() => setHoveredPair(pair)} onMouseLeave={() => setHoveredPair(null)}>
                  <button onClick={() => { onChange(pair); setOpen(false); }} style={{ display: 'block', width: '100%', padding: '6px 10px', textAlign: 'left', fontSize: '0.8125rem', color: pair === value ? 'var(--accent-text)' : 'var(--text-secondary)', background: pair === value ? 'var(--accent-light)' : 'transparent', borderRadius: 4, cursor: 'pointer', border: 'none', fontWeight: 500 }}>
                    {pair}
                  </button>
                  {hoveredPair === pair && activeRole === 'owner' && (
                    <button
                      onClick={(e) => { e.stopPropagation(); onDeletePair(pair); }}
                      title="Delete pair"
                      style={{ position: 'absolute', right: 4, top: '50%', transform: 'translateY(-50%)', background: 'var(--bg-tertiary)', border: '1px solid var(--border-default)', borderRadius: 4, padding: 2, cursor: 'pointer', color: 'var(--text-secondary)', display: 'flex' }}
                    >
                      <X size={12} />
                    </button>
                  )}
                </div>
              ))}
            </div>
          ))}
          <div style={{ height: 1, background: 'var(--border-default)', margin: '6px 0' }} />
          {activeRole === 'owner' && (
            addingPair ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, padding: 6 }}>
                <input placeholder="Symbol (e.g., BTC/USD)" value={newSymbol} onChange={(e) => setNewSymbol(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleAddPair()} autoFocus style={{ padding: '4px 8px', fontSize: '0.8125rem', borderRadius: 4, border: '1px solid var(--border-default)', background: 'transparent', color: 'var(--text-primary)' }} />
                <select value={newCategory} onChange={(e) => setNewCategory(e.target.value)} style={{ padding: '4px 8px', fontSize: '0.8125rem', borderRadius: 4, background: 'var(--bg-tertiary)', border: '1px solid var(--border-default)', color: 'var(--text-primary)' }}>
                  {allCategories.map((cat) => (<option key={cat} value={cat}>{cat}</option>))}
                </select>
                <button className="btn btn-primary btn-sm" onClick={handleAddPair}>Add</button>
              </div>
            ) : (
              <button onClick={() => setAddingPair(true)} style={{ display: 'flex', alignItems: 'center', gap: 6, width: '100%', padding: '6px 10px', fontSize: '0.8125rem', color: 'var(--accent-text)', borderRadius: 4, cursor: 'pointer', border: 'none', background: 'transparent' }}>
                <Plus size={14} /><span>Add Pair</span>
              </button>
            )
          )}
        </div>
      )}
    </div>
  );
}
