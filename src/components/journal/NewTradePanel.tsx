'use client';

import { useState, useEffect } from 'react';
import { X, Columns3 } from 'lucide-react';
import { Trade, CustomColumn, CustomPair } from '@/types';
import { DEFAULT_COLUMNS } from '@/lib/constants';
import DatePickerField from '@/components/fields/DatePickerField';
import SelectField from '@/components/fields/SelectField';
import ImageUpload from '@/components/fields/ImageUpload';
import AddColumnModal from '@/components/journal/AddColumnModal';
import DeleteColumnModal from '@/components/journal/DeleteColumnModal';
import EditableSelectField from '@/components/fields/EditableSelectField';

interface TradePanelProps {
  customColumns: CustomColumn[];
  customPairs: CustomPair[];
  hiddenColumns: Set<string>;
  onAddPair: (pair: CustomPair) => void;
  onDeletePair: (pairSymbol: string) => void;
  onAddCustomColumn: (column: CustomColumn) => void;
  onUpdateCustomColumn: (column: CustomColumn) => void;
  onDeleteCustomColumn: (colKey: string) => void;
  sectionOrder: string[];
  onUpdateSectionOrder: (order: string[]) => void;
  onSave: (trade: Partial<Trade>) => void | Promise<void>;
  onClose: () => void;
  editingTrade?: Trade;
}

const directionOptions = [
  { label: 'Long', value: 'Long', color: 'var(--success-text)' },
  { label: 'Short', value: 'Short', color: 'var(--danger-text)' },
];
const outcomeOptions = [
  { label: 'Profit', value: 'Profit', color: 'var(--success-text)' },
  { label: 'Loss', value: 'Loss', color: 'var(--danger-text)' },
];

export default function TradePanel({ customColumns, customPairs, hiddenColumns, onAddPair, onDeletePair, onAddCustomColumn, onUpdateCustomColumn, onDeleteCustomColumn, sectionOrder, onUpdateSectionOrder, onSave, onClose, editingTrade }: TradePanelProps) {
  const isEditing = !!editingTrade;
  const [trade, setTrade] = useState<Partial<Trade>>(
    editingTrade
      ? { ...editingTrade }
      : {
          date: '', day: '', pair: '', direction: '', outcome: '',
          reward: null, commission: null, entryModel: '', images: [], remarks: '', customFields: {}
        }
  );
  const [showAddColumn, setShowAddColumn] = useState(false);
  const [showDeleteColumn, setShowDeleteColumn] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [panelMounted, setPanelMounted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleUpdate = (updates: Partial<Trade>) => setTrade((prev) => ({ ...prev, ...updates }));

  useEffect(() => {
    requestAnimationFrame(() => setPanelMounted(true));
  }, []);

  const handleOutcomeChange = (newOutcome: string) => {
    const currentReward = trade.reward;
    let updatedReward = currentReward;

    if (currentReward !== null && currentReward !== undefined && currentReward !== 0) {
      if (newOutcome === 'Loss' && currentReward > 0) {
        updatedReward = -Math.abs(currentReward);
      } else if (newOutcome === 'Profit' && currentReward < 0) {
        updatedReward = Math.abs(currentReward);
      }
    }
    handleUpdate({ outcome: newOutcome as 'Profit'|'Loss', reward: updatedReward });
  };

  const handleSaveClick = async () => {
    if (!isEditing) {
      const hasValue = (
        (trade.date || '').trim() !== '' ||
        (trade.day || '').trim() !== '' ||
        (trade.pair || '').trim() !== '' ||
        (trade.direction || '').trim() !== '' ||
        (trade.outcome || '').trim() !== '' ||
        (trade.entryModel || '').trim() !== '' ||
        (trade.remarks || '').trim() !== '' ||
        (trade.reward !== null && trade.reward !== undefined) ||
        (trade.commission !== null && trade.commission !== undefined) ||
        (trade.images && trade.images.length > 0) ||
        (trade.customFields && Object.values(trade.customFields).some(val => typeof val === 'string' && val.trim() !== ''))
      );

      if (!hasValue) {
        setError('Enter at least one detail before saving');
        return;
      }
    }
    setError(null);
    setIsSubmitting(true);
    try {
      await onSave(trade);
    } finally {
      setIsSubmitting(false);
    }
  };

  const isVisible = (key: string) => !hiddenColumns.has(key);

  const inputStyle: React.CSSProperties = { width: '100%', padding: '10px 14px', borderRadius: 10, border: '1px solid var(--border-default)', background: 'var(--bg-tertiary)', fontSize: '0.875rem', color: 'var(--text-primary)', transition: 'border-color 0.15s ease' };
  const labelStyle: React.CSSProperties = { fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 6, display: 'block' };
  const sectionStyle: React.CSSProperties = { display: 'flex', flexDirection: 'column', gap: 20 };

  const imagesLabel = DEFAULT_COLUMNS.find(c => c.key === 'images')?.label || "IMAGE'S LINK";

  const renderSection = (key: string) => {
    switch (key) {
      case 'date': return isVisible('date') ? (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <div style={{ position: 'relative' }}>
            <label style={labelStyle}>Date</label>
            <DatePickerField value={trade.date || ''} onChange={(date, day) => handleUpdate({ date, day })} placeholder="Pick date" />
          </div>
          {isVisible('day') && (
            <div>
              <label style={labelStyle}>Day</label>
              <div style={{ ...inputStyle, background: 'var(--bg-tertiary)', color: 'var(--text-tertiary)', cursor: 'not-allowed', opacity: 0.8 }}>
                {trade.day || 'Auto-filled'}
              </div>
            </div>
          )}
        </div>
      ) : null;
      case 'pair': return isVisible('pair') ? (
        <div>
          <label style={labelStyle}>Pair</label>
          <div style={{ ...inputStyle, padding: '6px 6px' }}>
            <EditableSelectField value={trade.pair || ''} options={customPairs.map(p => p.symbol)} onChange={(pair) => handleUpdate({ pair })} onAddOption={(newOption) => onAddPair({ symbol: newOption, category: 'Custom' })} onDeleteOption={onDeletePair} placeholder="Select or Add Pair" />
          </div>
        </div>
      ) : null;
      case 'directionOutcome': return (isVisible('direction') || isVisible('outcome')) ? (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          {isVisible('direction') && (
            <div>
              <label style={labelStyle}>Direction</label>
              <div style={{ ...inputStyle, padding: '6px 6px' }}>
                <SelectField value={trade.direction || ''} options={directionOptions} placeholder="Direction" onChange={(v) => handleUpdate({ direction: v as 'Long'|'Short' })} />
              </div>
            </div>
          )}
          {isVisible('outcome') && (
            <div>
              <label style={labelStyle}>Outcome</label>
              <div style={{ ...inputStyle, padding: '6px 6px' }}>
                <SelectField value={trade.outcome || ''} options={outcomeOptions} placeholder="Outcome" onChange={(v) => handleOutcomeChange(v)} />
              </div>
            </div>
          )}
        </div>
      ) : null;
      case 'financials': return (isVisible('reward') || isVisible('commission')) ? (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          {isVisible('reward') && (
            <div>
              <label style={labelStyle}>Reward ($)</label>
              <input style={{ ...inputStyle, color: trade.reward !== null && trade.reward !== undefined ? (trade.reward >= 0 ? 'var(--success-text)' : 'var(--danger-text)') : 'var(--text-primary)' }} type="number" step="0.01" value={trade.reward ?? ''} onChange={(e) => handleUpdate({ reward: e.target.value ? parseFloat(e.target.value) : null })} placeholder="0.00" />
            </div>
          )}
          {isVisible('commission') && (
            <div>
              <label style={labelStyle}>Commission ($)</label>
              <input style={{ ...inputStyle, color: 'var(--danger-text)' }} type="number" step="0.01" value={trade.commission ?? ''} onChange={(e) => { const v = parseFloat(e.target.value); handleUpdate({ commission: isNaN(v) ? null : (v > 0 ? -Math.abs(v) : v) }); }} placeholder="-0.00" />
            </div>
          )}
        </div>
      ) : null;
      case 'entryModel': return isVisible('entryModel') ? (
        <div>
          <label style={labelStyle}>Entry Model</label>
          <input style={inputStyle} value={trade.entryModel || ''} onChange={(e) => handleUpdate({ entryModel: e.target.value })} placeholder="e.g., Breakout, Pullback" />
        </div>
      ) : null;
      case 'images': return isVisible('images') ? (
        <div>
          <label style={labelStyle}>{imagesLabel}</label>
          <ImageUpload value={trade.images || []} onChange={(images) => handleUpdate({ images })} />
        </div>
      ) : null;
      case 'remarks': return isVisible('remarks') ? (
        <div>
          <label style={labelStyle}>Remarks</label>
          <textarea style={{ ...inputStyle, resize: 'vertical', minHeight: 90, lineHeight: 1.5 }} value={trade.remarks || ''} onChange={(e) => handleUpdate({ remarks: e.target.value })} placeholder="Trade notes, observations, lessons learned..." />
        </div>
      ) : null;
      case 'customColumns': return customColumns.filter((col) => isVisible(col.key)).length > 0 ? (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          {customColumns.filter((col) => isVisible(col.key)).map((col) => {
            const val = trade.customFields?.[col.key];
            const valueStr = val !== undefined ? String(val) : '';
            return (
              <div key={col.key}>
                <label style={labelStyle}>{col.name}</label>
                {col.type === 'number' ? (
                  <input style={inputStyle} type="number" value={valueStr} onChange={(e) => handleUpdate({ customFields: { ...trade.customFields, [col.key]: e.target.value ? Number(e.target.value) : '' } })} placeholder="0" />
                ) : col.type === 'dropdown' ? (
                  <div style={{ ...inputStyle, padding: '6px 6px' }}>
                    <EditableSelectField value={valueStr} options={col.options || []} onChange={(newVal) => handleUpdate({ customFields: { ...trade.customFields, [col.key]: newVal } })} onAddOption={(newOption) => onUpdateCustomColumn({ ...col, options: [...(col.options || []), newOption] })} onDeleteOption={(delOption) => onUpdateCustomColumn({ ...col, options: col.options?.filter(o => o !== delOption) || [] })} />
                  </div>
                ) : (
                  <input style={inputStyle} value={valueStr} onChange={(e) => handleUpdate({ customFields: { ...trade.customFields, [col.key]: e.target.value } })} />
                )}
              </div>
            );
          })}
        </div>
      ) : null;
      default: return null;
    }
  };

  const sectionsToRender = sectionOrder.filter(key => renderSection(key) !== null);

  return (
    <>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'var(--surface-overlay)', zIndex: 400, opacity: panelMounted ? 1 : 0, transition: 'opacity 250ms var(--ease-out)' }} />
      <div style={{ position: 'fixed', top: 0, right: 0, bottom: 0, width: '100%', maxWidth: 560, background: 'var(--surface-elevated)', zIndex: 410, display: 'flex', flexDirection: 'column', boxShadow: '-10px 0 40px rgba(0,0,0,0.15)', transform: panelMounted ? 'translateX(0)' : 'translateX(100%)', transition: 'transform 400ms var(--ease-drawer)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '24px 32px', borderBottom: '1px solid var(--border-default)' }}>
          <div>
            <h2 style={{ fontSize: '1.375rem', fontWeight: 700, color: 'var(--text-primary)' }}>{isEditing ? 'Edit Trade' : 'New Trade'}</h2>
            <p style={{ fontSize: '0.8125rem', color: 'var(--text-tertiary)', marginTop: 2 }}>{isEditing ? 'Modify the trade details below' : 'Fill in the details below'}</p>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={() => setShowAddColumn(true)} data-tooltip="Add Column" style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border-default)', borderRadius: 8, cursor: 'pointer', color: 'var(--text-secondary)', display: 'flex', padding: 8 }}>
              <Columns3 size={18} />
            </button>
            {customColumns.length > 0 && (
              <button onClick={() => setShowDeleteColumn(true)} data-tooltip="Delete Column" style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border-default)', borderRadius: 8, cursor: 'pointer', color: 'var(--danger-text)', display: 'flex', padding: 8 }}>
                <X size={18} />
              </button>
            )}
            <button onClick={onClose} data-tooltip="Close" style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border-default)', borderRadius: 8, cursor: 'pointer', color: 'var(--text-secondary)', display: 'flex', padding: 8 }}>
              <X size={18} />
            </button>
          </div>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '28px 32px' }}>
          <div style={sectionStyle}>
            {sectionsToRender.map((key) => (
              <div key={key}>
                {renderSection(key)}
              </div>
            ))}
          </div>
        </div>

        <div style={{ padding: '20px 32px', borderTop: '1px solid var(--border-default)', display: 'flex', flexDirection: 'column', gap: 12, background: 'var(--surface-elevated)' }}>
          {error && <div style={{ color: 'var(--danger-text)', fontSize: '0.8125rem', textAlign: 'center' }}>{error}</div>}
          <div style={{ display: 'flex', gap: 12 }}>
            <button className="btn btn-secondary" style={{ flex: 1, padding: '12px 16px' }} onClick={onClose} disabled={isSubmitting}>Cancel</button>
            <button className="btn btn-primary" style={{ flex: 1, padding: '12px 16px' }} onClick={handleSaveClick} disabled={isSubmitting}>
              {isEditing ? (isSubmitting ? 'Saving...' : 'Save Changes') : (isSubmitting ? 'Saving...' : 'Save Trade')}
            </button>
          </div>
        </div>
      </div>

      {showAddColumn && <AddColumnModal onClose={() => setShowAddColumn(false)} onAdd={(col) => { onAddCustomColumn(col); setShowAddColumn(false); }} />}
      {showDeleteColumn && <DeleteColumnModal customColumns={customColumns} onClose={() => setShowDeleteColumn(false)} onDelete={(colKey) => { onDeleteCustomColumn(colKey); setShowDeleteColumn(false); }} />}
    </>
  );
}
