'use client';

import { useState } from 'react';
import { Pencil, Check } from 'lucide-react';
import ConfirmModal from '@/components/ui/ConfirmModal';
import { useTrades } from '@/hooks/useTrades';
import { DEFAULT_COLUMNS } from '@/lib/constants';
import { Trade, CustomColumn, ColumnDef } from '@/types';
import TradeRow from './TradeRow';
import EmptyState from '@/components/layout/EmptyState';

interface TradeGridProps {
  customColumns: CustomColumn[];
  hiddenColumns: Set<string>;
  sectionOrder: string[];
  onEditTrade: (trade: Trade) => void;
}

export default function TradeGrid({ customColumns, hiddenColumns, sectionOrder, onEditTrade }: TradeGridProps) {
  const { trades, loading, deleteTrade } = useTrades();
  const [removingIds, setRemovingIds] = useState<Set<string>>(new Set());
  const [confirmDeleteTrade, setConfirmDeleteTrade] = useState<string | null>(null);
  const [isEditMode, setIsEditMode] = useState(false);

  const toggleEditMode = () => {
    setIsEditMode(!isEditMode);
  };

  const SECTION_TO_COLUMNS: Record<string, string[]> = {
    date: ['date', 'day'],
    pair: ['pair'],
    directionOutcome: ['direction', 'outcome'],
    financials: ['reward', 'commission'],
    entryModel: ['entryModel'],
    images: ['images'],
    remarks: ['remarks'],
  };

  const orderedColKeys = sectionOrder.flatMap(section => 
    section === 'customColumns' 
      ? customColumns.map(c => c.key)
      : (SECTION_TO_COLUMNS[section] || [section])
  );

  const baseColumns: ColumnDef[] = [
    ...DEFAULT_COLUMNS,
    ...customColumns.map((cc) => ({ key: cc.key, label: cc.name, type: cc.type as ColumnDef['type'], width: '140px', options: cc.options })),
  ].filter((col) => !hiddenColumns.has(col.key));

  const allColumns: ColumnDef[] = baseColumns
    .sort((a, b) => {
      if (a.key === 'tradeNumber') return -1;
      if (b.key === 'tradeNumber') return 1;

      const indexA = orderedColKeys.indexOf(a.key);
      const indexB = orderedColKeys.indexOf(b.key);
      
      if (indexA === -1 && indexB === -1) return 0;
      if (indexA === -1) return 1;
      if (indexB === -1) return -1;
      
      return indexA - indexB;
    });

  const handleDeleteRow = async (tradeId: string) => {
    setRemovingIds((prev) => new Set(prev).add(tradeId));
    setTimeout(async () => {
      await deleteTrade(tradeId);
      setRemovingIds((prev) => { const next = new Set(prev); next.delete(tradeId); return next; });
    }, 200);
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: '16px 0' }}>
        {[...Array(5)].map((_, i) => (<div key={i} className="skeleton" style={{ height: 44, borderRadius: 6, opacity: 0, animation: `staggerFadeIn 300ms var(--ease-out) ${i * 60}ms forwards` }} />))}
      </div>
    );
  }

  const headerCellStyle: React.CSSProperties = { padding: '10px 12px', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.3px', borderRight: '1px solid var(--grid-border)', userSelect: 'none' };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h3 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-primary)' }}>Trades</h3>
        <button
          className="btn btn-secondary btn-sm"
          style={{ background: isEditMode ? 'var(--primary-color)' : '', color: isEditMode ? '#fff' : '', borderColor: isEditMode ? 'var(--primary-color)' : '' }}
          onClick={toggleEditMode}
        >
          {isEditMode ? <><Check size={14} /><span>Done</span></> : <><Pencil size={14} /><span>Edit</span></>}
        </button>
      </div>

      {trades.length === 0 ? <EmptyState /> : (
        <div style={{ overflowX: 'auto', border: '1px solid var(--grid-border)', borderRadius: 10, background: 'var(--surface-card)' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 'max-content' }}>
            <thead style={{ background: 'var(--grid-header-bg)', position: 'sticky', top: 0, zIndex: 10 }}>
              <tr>
                <th style={{ width: 40, padding: '10px 8px', textAlign: 'center', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-tertiary)', borderBottom: '1px solid var(--grid-border)' }}>#</th>
                {allColumns.map((col) => (
                  <th key={col.key} style={{ ...headerCellStyle, width: col.width, minWidth: col.width, textAlign: 'left', borderBottom: '1px solid var(--grid-border)' }}>
                    {col.label}
                  </th>
                ))}
                {isEditMode && (
                  <th style={{ width: 70, padding: '10px 8px', textAlign: 'center', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-tertiary)', position: 'sticky', right: 0, background: 'var(--grid-header-bg)', borderLeft: '1px solid var(--grid-border)', borderBottom: '1px solid var(--grid-border)', zIndex: 11 }}>Actions</th>
                )}
              </tr>
            </thead>
            <tbody>
              {trades.map((trade, index) => (
                <TradeRow
                  key={trade.id}
                  trade={trade}
                  index={index}
                  columns={allColumns}
                  onEdit={() => onEditTrade(trade)}
                  onDelete={() => setConfirmDeleteTrade(trade.id)}
                  removing={removingIds.has(trade.id)}
                  isEditMode={isEditMode}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}

      {confirmDeleteTrade && (
        <ConfirmModal
          title="Delete Trade?"
          onConfirm={() => { handleDeleteRow(confirmDeleteTrade); setConfirmDeleteTrade(null); }}
          onCancel={() => setConfirmDeleteTrade(null)}
        />
      )}
    </div>
  );
}
