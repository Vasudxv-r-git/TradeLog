'use client';

import { useState } from 'react';
import { useTrades } from '@/hooks/useTrades';
import { DEFAULT_COLUMNS } from '@/lib/constants';
import { Trade, CustomColumn, CustomPair, ColumnDef } from '@/types';
import TradeRow from './TradeRow';
import EmptyState from '@/components/layout/EmptyState';
import { Columns3, X } from 'lucide-react';
import AddColumnModal from './AddColumnModal';

interface TradeGridProps {
  customColumns: CustomColumn[];
  customPairs: CustomPair[];
  hiddenColumns: Set<string>;
  onAddCustomColumn: (column: CustomColumn) => void;
  onAddCustomPair: (pair: CustomPair) => void;
  onDeleteColumn: (columnKey: string) => void;
  onEditTrade: (trade: Trade) => void;
}

export default function TradeGrid({ customColumns, customPairs, hiddenColumns, onAddCustomColumn, onAddCustomPair, onDeleteColumn, onEditTrade }: TradeGridProps) {
  const { trades, loading, deleteTrade } = useTrades();
  const [showAddColumn, setShowAddColumn] = useState(false);
  const [removingIds, setRemovingIds] = useState<Set<string>>(new Set());
  const [confirmDeleteCol, setConfirmDeleteCol] = useState<string | null>(null);
  const [hoveredCol, setHoveredCol] = useState<string | null>(null);

  const allColumns: ColumnDef[] = [
    ...DEFAULT_COLUMNS,
    ...customColumns.map((cc) => ({ key: cc.key, label: cc.name, type: cc.type as ColumnDef['type'], width: '140px', options: cc.options })),
  ].filter((col) => !hiddenColumns.has(col.key));

  const handleDeleteRow = async (tradeId: string) => {
    setRemovingIds((prev) => new Set(prev).add(tradeId));
    setTimeout(async () => {
      await deleteTrade(tradeId);
      setRemovingIds((prev) => { const next = new Set(prev); next.delete(tradeId); return next; });
    }, 200);
  };

  const handleConfirmDeleteColumn = (colKey: string) => {
    onDeleteColumn(colKey);
    setConfirmDeleteCol(null);
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: '16px 0' }}>
        {[...Array(5)].map((_, i) => (<div key={i} className="skeleton" style={{ height: 44, borderRadius: 6 }} />))}
      </div>
    );
  }

  const headerCellStyle: React.CSSProperties = { padding: '10px 12px', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.3px', borderRight: '1px solid var(--grid-border)', userSelect: 'none', position: 'relative' };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h3 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-primary)' }}>Trades</h3>
        <button className="btn btn-secondary btn-sm" onClick={() => setShowAddColumn(true)}><Columns3 size={14} /><span>Add Column</span></button>
      </div>

      {trades.length === 0 ? <EmptyState /> : (
        <div style={{ overflowX: 'auto', border: '1px solid var(--grid-border)', borderRadius: 10, background: 'var(--surface-card)' }}>
          <div style={{ minWidth: 'max-content' }}>
            <div style={{ display: 'flex', alignItems: 'center', background: 'var(--grid-header-bg)', borderBottom: '1px solid var(--grid-border)', position: 'sticky', top: 0, zIndex: 10 }}>
              <div style={{ width: 40, minWidth: 40, padding: '10px 8px', textAlign: 'center', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-tertiary)' }}>#</div>
              {allColumns.map((col) => (
                <div
                  key={col.key}
                  style={{ ...headerCellStyle, width: col.width, minWidth: col.width, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}
                  onMouseEnter={() => !col.isDefault && setHoveredCol(col.key)}
                  onMouseLeave={() => setHoveredCol(null)}
                >
                  <span>{col.label}</span>
                  {!col.isDefault && (
                    <button
                      onClick={(e) => { e.stopPropagation(); setConfirmDeleteCol(col.key); }}
                      title="Delete column"
                      style={{
                        opacity: hoveredCol === col.key ? 1 : 0,
                        transition: 'opacity 0.15s ease',
                        padding: 2, borderRadius: 4, cursor: 'pointer',
                        color: 'var(--text-tertiary)', background: 'none', border: 'none', display: 'flex',
                        flexShrink: 0, marginLeft: 4,
                      }}
                    >
                      <X size={12} />
                    </button>
                  )}
                </div>
              ))}
              <div style={{ width: 70, minWidth: 70, padding: '10px 8px', textAlign: 'center', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-tertiary)', position: 'sticky', right: 0, background: 'var(--grid-header-bg)', borderLeft: '1px solid var(--grid-border)', zIndex: 11 }}>Actions</div>
            </div>
            {trades.map((trade, index) => (
              <TradeRow
                key={trade.id}
                trade={trade}
                index={index}
                columns={allColumns}
                onEdit={() => onEditTrade(trade)}
                onDelete={() => handleDeleteRow(trade.id)}
                removing={removingIds.has(trade.id)}
              />
            ))}
          </div>
        </div>
      )}

      {showAddColumn && <AddColumnModal onAdd={(column) => { onAddCustomColumn(column); setShowAddColumn(false); }} onClose={() => setShowAddColumn(false)} />}

      {/* Delete column confirmation */}
      {confirmDeleteCol && (
        <div onClick={() => setConfirmDeleteCol(null)} style={{ position: 'fixed', inset: 0, background: 'var(--surface-overlay)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 500, animation: 'fadeIn 0.15s ease-out' }}>
          <div onClick={(e) => e.stopPropagation()} style={{ background: 'var(--surface-card)', border: '1px solid var(--border-default)', borderRadius: 16, boxShadow: 'var(--shadow-xl)', padding: '28px 32px', maxWidth: 380, width: '100%', animation: 'scaleIn 0.2s ease-out', display: 'flex', flexDirection: 'column', gap: 20 }}>
            <div>
              <h3 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: 6 }}>Delete column?</h3>
              <p style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                This will hide <strong>{allColumns.find(c => c.key === confirmDeleteCol)?.label || confirmDeleteCol}</strong> from the table and the New Trade form. Existing data for this field will remain untouched in the database.
              </p>
            </div>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button className="btn btn-secondary" onClick={() => setConfirmDeleteCol(null)}>Cancel</button>
              <button className="btn btn-primary" style={{ background: 'var(--danger)', color: 'white' }} onClick={() => handleConfirmDeleteColumn(confirmDeleteCol)}>Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
