'use client';

import { useState } from 'react';
import { Trash2, Pencil } from 'lucide-react';
import { Trade, ColumnDef, CustomPair } from '@/types';

interface TradeRowProps {
  trade: Trade;
  index: number;
  columns: ColumnDef[];
  onEdit: () => void;
  onDelete: () => void;
  removing: boolean;
}

export default function TradeRow({ trade, index, columns, onEdit, onDelete, removing }: TradeRowProps) {
  const [hovered, setHovered] = useState(false);

  const cellStyle: React.CSSProperties = {
    display: 'flex', alignItems: 'center', borderRight: '1px solid var(--grid-border)', minHeight: 44,
    padding: '4px 10px', fontSize: '0.8125rem', color: 'var(--text-primary)',
  };

  const renderCellValue = (col: ColumnDef) => {
    switch (col.key) {
      case 'tradeNumber': return <span style={{ fontWeight: 500 }}>{index + 1}</span>;
      case 'date': return trade.date || '—';
      case 'day': return trade.day || '—';
      case 'pair': return trade.pair || '—';
      case 'direction':
        return (
          <span style={{ color: trade.direction === 'Long' ? 'var(--success-text)' : trade.direction === 'Short' ? 'var(--danger-text)' : 'var(--text-tertiary)', fontWeight: 500 }}>
            {trade.direction || '—'}
          </span>
        );
      case 'outcome':
        return (
          <span style={{ color: trade.outcome === 'Profit' ? 'var(--success-text)' : trade.outcome === 'Loss' ? 'var(--danger-text)' : 'var(--text-tertiary)', fontWeight: 500 }}>
            {trade.outcome || '—'}
          </span>
        );
      case 'reward':
        return trade.reward !== null && trade.reward !== undefined
          ? <span style={{ color: trade.reward >= 0 ? 'var(--success-text)' : 'var(--danger-text)', fontWeight: 500 }}>${trade.reward}</span>
          : <span style={{ color: 'var(--text-tertiary)' }}>—</span>;
      case 'commission':
        return trade.commission !== null && trade.commission !== undefined
          ? <span style={{ color: 'var(--danger-text)', fontWeight: 500 }}>-${Math.abs(trade.commission)}</span>
          : <span style={{ color: 'var(--text-tertiary)' }}>—</span>;
      case 'entryModel': return trade.entryModel || '—';
      case 'images': {
        const imgs = trade.images || [];
        if (imgs.length === 0) return <span style={{ color: 'var(--text-tertiary)' }}>—</span>;
        return (
          <div style={{ display: 'flex', gap: 4 }}>
            {imgs.map((img, i) => (
              <a key={i} href={img.url} target="_blank" rel="noopener noreferrer" style={{ width: 28, height: 28, borderRadius: 4, overflow: 'hidden', border: '1px solid var(--border-default)', display: 'block', flexShrink: 0 }}>
                <img src={img.url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              </a>
            ))}
          </div>
        );
      }
      case 'remarks':
        return trade.remarks
          ? <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '100%', display: 'block' }} title={trade.remarks}>{trade.remarks}</span>
          : <span style={{ color: 'var(--text-tertiary)' }}>—</span>;
      default: {
        // Custom fields
        const val = trade.customFields?.[col.key];
        return val || <span style={{ color: 'var(--text-tertiary)' }}>—</span>;
      }
    }
  };

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: 'flex', alignItems: 'stretch', borderBottom: '1px solid var(--grid-border)',
        transition: 'background-color 0.15s ease, opacity 0.2s ease, transform 0.2s ease',
        animation: 'rowInsert 0.25s ease-out',
        background: hovered ? 'var(--grid-row-hover)' : (index % 2 === 1 ? 'var(--grid-row-alt)' : 'transparent'),
        opacity: removing ? 0 : 1, transform: removing ? 'translateX(-20px)' : 'none',
      }}
    >
      {/* Row number */}
      <div style={{ width: 40, minWidth: 40, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', fontWeight: 500, color: 'var(--text-tertiary)', borderRight: '1px solid var(--grid-border)' }}>
        {index + 1}
      </div>

      {/* Data cells (read-only) */}
      {columns.map((col) => (
        <div key={col.key} style={{ ...cellStyle, width: col.width, minWidth: col.width }}>
          {renderCellValue(col)}
        </div>
      ))}

      {/* Actions */}
      <div style={{ width: 70, minWidth: 70, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4, position: 'sticky', right: 0, background: hovered ? 'var(--grid-row-hover)' : (index % 2 === 1 ? 'var(--grid-row-alt)' : 'var(--surface-card)'), borderLeft: '1px solid var(--grid-border)', zIndex: 1 }}>
          <button onClick={onEdit} title="Edit trade" style={{ opacity: hovered ? 1 : 0, color: 'var(--accent-text)', padding: 4, borderRadius: 4, cursor: 'pointer', background: 'none', border: 'none', transition: 'all 0.15s ease', display: 'flex' }}>
            <Pencil size={14} />
          </button>
          <button onClick={onDelete} title="Delete trade" style={{ opacity: hovered ? 1 : 0, color: 'var(--text-tertiary)', padding: 4, borderRadius: 4, cursor: 'pointer', background: 'none', border: 'none', transition: 'all 0.15s ease', display: 'flex' }}>
            <Trash2 size={14} />
          </button>
      </div>
    </div>
  );
}
