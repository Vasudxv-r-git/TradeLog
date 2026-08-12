'use client';

import { useState, useEffect, useRef } from 'react';
import { Settings2, Filter, EyeOff, LayoutGrid } from 'lucide-react';
import ConfirmModal from '@/components/ui/ConfirmModal';
import { useTrades } from '@/hooks/useTrades';
import { DEFAULT_COLUMNS } from '@/lib/constants';
import { Trade, CustomColumn, CustomPair, ColumnDef } from '@/types';
import TradeRow from './TradeRow';
import EmptyState from '@/components/layout/EmptyState';
import { Pencil, Check, RotateCcw } from 'lucide-react';

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
  const [colWidths, setColWidths] = useState<Record<string, number>>({});
  const [resizingCol, setResizingCol] = useState<string | null>(null);
  
  const resizeState = useRef({ startX: 0, startWidth: 0, colKey: '' });

  useEffect(() => {
    const saved = localStorage.getItem('tradeGridColWidths');
    if (saved) {
      try { setColWidths(JSON.parse(saved)); } catch (e) { console.error(e); }
    }
  }, []);

  const handleResizeStart = (e: React.MouseEvent | React.TouchEvent, colKey: string, currentWidth: string) => {
    e.preventDefault();
    setResizingCol(colKey);
    const clientX = 'touches' in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX;
    const widthNum = colWidths[colKey] || parseInt(currentWidth.replace('px', '') || '100');
    resizeState.current = { startX: clientX, startWidth: widthNum, colKey };
  };

  useEffect(() => {
    if (!resizingCol) return;

    const handleMove = (e: MouseEvent | TouchEvent) => {
      const clientX = 'touches' in e ? (e as TouchEvent).touches[0].clientX : (e as MouseEvent).clientX;
      const { startX, startWidth, colKey } = resizeState.current;
      const delta = clientX - startX;
      let newWidth = startWidth + delta;
      if (newWidth < 50) newWidth = 50;
      
      setColWidths(prev => ({ ...prev, [colKey]: newWidth }));
    };

    const handleUp = () => {
      setResizingCol(null);
    };

    document.addEventListener('mousemove', handleMove);
    document.addEventListener('mouseup', handleUp);
    document.addEventListener('touchmove', handleMove, { passive: false });
    document.addEventListener('touchend', handleUp);

    return () => {
      document.removeEventListener('mousemove', handleMove);
      document.removeEventListener('mouseup', handleUp);
      document.removeEventListener('touchmove', handleMove);
      document.removeEventListener('touchend', handleUp);
    };
  }, [resizingCol]);

  const toggleEditMode = () => {
    if (isEditMode) {
      localStorage.setItem('tradeGridColWidths', JSON.stringify(colWidths));
    }
    setIsEditMode(!isEditMode);
  };

  const handleResetWidths = () => {
    setColWidths({});
    localStorage.removeItem('tradeGridColWidths');
  };

  // Map NewTradePanel section keys to TradeGrid column keys
  const SECTION_TO_COLUMNS: Record<string, string[]> = {
    date: ['date', 'day'],
    pair: ['pair'],
    directionOutcome: ['direction', 'outcome'],
    financials: ['reward', 'commission'],
    entryModel: ['entryModel'],
    images: ['images'],
    remarks: ['remarks'],
    // customColumns is handled dynamically below
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
      
      // If both are missing from orderedColKeys, keep original order
      if (indexA === -1 && indexB === -1) return 0;
      // If a is missing, push it to the end
      if (indexA === -1) return 1;
      // If b is missing, push it to the end
      if (indexB === -1) return -1;
      
      return indexA - indexB;
    })
    .map((col) => ({
      ...col,
      width: colWidths[col.key] ? `${colWidths[col.key]}px` : col.width
    }));

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

  const headerCellStyle: React.CSSProperties = { padding: '10px 12px', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.3px', borderRight: '1px solid var(--grid-border)', userSelect: 'none', position: 'relative' };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h3 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-primary)' }}>Trades</h3>
        <div style={{ display: 'flex', gap: 8 }}>
          {isEditMode && (
            <button className="btn btn-secondary btn-sm" onClick={handleResetWidths}>
              <RotateCcw size={14} /><span>Reset</span>
            </button>
          )}
          <button
            className="btn btn-secondary btn-sm"
            style={{ background: isEditMode ? 'var(--primary-color)' : '', color: isEditMode ? '#fff' : '', borderColor: isEditMode ? 'var(--primary-color)' : '' }}
            onClick={toggleEditMode}
          >
            {isEditMode ? <><Check size={14} /><span>Done</span></> : <><Pencil size={14} /><span>Edit</span></>}
          </button>
        </div>
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
                >
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{col.label}</span>
                  {isEditMode && (
                    <div
                      onMouseDown={(e) => handleResizeStart(e, col.key, col.width as string)}
                      onTouchStart={(e) => handleResizeStart(e, col.key, col.width as string)}
                      style={{
                        position: 'absolute',
                        right: 0,
                        top: 0,
                        bottom: 0,
                        width: 10,
                        cursor: 'col-resize',
                        background: resizingCol === col.key ? 'var(--primary-color)' : 'var(--grid-border)',
                        opacity: resizingCol === col.key ? 1 : 0.3,
                        zIndex: 100,
                        transform: 'translateX(5px)',
                      }}
                      onMouseEnter={(e) => { if (!resizingCol) e.currentTarget.style.opacity = '0.8'; }}
                      onMouseLeave={(e) => { if (!resizingCol) e.currentTarget.style.opacity = '0.3'; }}
                    />
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
                onDelete={() => setConfirmDeleteTrade(trade.id)}
                removing={removingIds.has(trade.id)}
              />
            ))}
          </div>
        </div>
      )}

      {/* Delete trade confirmation */}
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
