'use client';

import { useState, useEffect, useRef } from 'react';
import { X, GripVertical, Settings2, RotateCcw, Check, Columns3 } from 'lucide-react';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Trade, CustomColumn, CustomPair } from '@/types';
import { DEFAULT_COLUMNS } from '@/lib/constants';
import DatePickerPopup from '@/components/fields/DatePickerPopup';
import SelectField from '@/components/fields/SelectField';
import ImageUpload from '@/components/fields/ImageUpload';
import { WEEKDAYS } from '@/lib/constants';
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
  onSave: (trade: Partial<Trade>) => void;
  onClose: () => void;
  /** If provided, the panel is in "Edit" mode with pre-filled values */
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
const dayOptions = WEEKDAYS.map((d) => ({ label: d, value: d }));

function SortableItem({ id, isRearranging, children }: { id: string, isRearranging: boolean, children: React.ReactNode }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });

  const style: React.CSSProperties = {
    transform: CSS.Translate.toString(transform),
    transition,
    opacity: isDragging ? 0.8 : 1,
    display: isRearranging ? 'flex' : 'block',
    gap: 16,
    alignItems: 'center',
    background: isRearranging ? 'var(--bg-secondary)' : 'transparent',
    padding: isRearranging ? '16px' : '0',
    borderRadius: '12px',
    border: isRearranging ? '1px dashed var(--border-default)' : 'none',
    position: isDragging ? 'relative' : 'static',
    zIndex: isDragging ? 999 : 'auto',
    boxShadow: isDragging ? '0 8px 24px rgba(0,0,0,0.12)' : 'none',
  };

  return (
    <div ref={setNodeRef} style={style}>
      {isRearranging && (
        <div 
          {...attributes} 
          {...listeners} 
          style={{ cursor: 'grab', padding: '4px', color: 'var(--text-tertiary)', flexShrink: 0 }}
        >
          <GripVertical size={20} />
        </div>
      )}
      <div style={{ flex: 1, minWidth: 0 }}>{children}</div>
    </div>
  );
}

export default function TradePanel({ customColumns, customPairs, hiddenColumns, onAddPair, onDeletePair, onAddCustomColumn, onUpdateCustomColumn, onDeleteCustomColumn, sectionOrder, onUpdateSectionOrder, onSave, onClose, editingTrade }: TradePanelProps) {
  const isEditing = !!editingTrade;
  const [trade, setTrade] = useState<Partial<Trade>>(
    editingTrade
      ? { ...editingTrade }
      : {
          tradeNumber: '', date: '', day: '', pair: '', direction: '', outcome: '',
          reward: null, commission: null, entryModel: '', images: [], remarks: '', customFields: {}
        }
  );
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showAddColumn, setShowAddColumn] = useState(false);
  const [showDeleteColumn, setShowDeleteColumn] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [panelMounted, setPanelMounted] = useState(false);

  const [isRearranging, setIsRearranging] = useState(false);
  const DEFAULT_SECTION_ORDER = [
    'date',
    'pair',
    'directionOutcome',
    'financials',
    'entryModel',
    'images',
    'remarks',
    'customColumns'
  ];

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const oldIndex = sectionOrder.indexOf(active.id as string);
      const newIndex = sectionOrder.indexOf(over.id as string);
      onUpdateSectionOrder(arrayMove(sectionOrder, oldIndex, newIndex));
    }
  };

  const toggleRearrange = () => {
    setIsRearranging(!isRearranging);
  };

  const resetOrder = () => {
    onUpdateSectionOrder(DEFAULT_SECTION_ORDER);
  };

  // Raw string state for the reward input so "-" can be typed freely
  const [rewardInput, setRewardInput] = useState<string>(
    editingTrade?.reward !== null && editingTrade?.reward !== undefined ? String(editingTrade.reward) : ''
  );
  const [commissionInput, setCommissionInput] = useState<string>(
    editingTrade?.commission !== null && editingTrade?.commission !== undefined ? `-${Math.abs(editingTrade.commission)}` : ''
  );

  const handleUpdate = (updates: Partial<Trade>) => setTrade((prev) => ({ ...prev, ...updates }));

  // Trigger entrance transition
  useEffect(() => {
    requestAnimationFrame(() => setPanelMounted(true));
  }, []);

  // Auto-calculate day when date changes and day is missing
  useEffect(() => {
    if (trade.date && !trade.day) {
      const parts = trade.date.split('-');
      if (parts.length === 3) {
        const d = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
        handleUpdate({ day: WEEKDAYS[d.getDay()] });
      }
    }
  }, [trade.date, trade.day]);

  // When outcome changes, auto-flip the reward sign to match
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

    handleUpdate({ outcome: newOutcome as any, reward: updatedReward });
    if (updatedReward !== currentReward && updatedReward !== null && updatedReward !== undefined) {
      setRewardInput(String(updatedReward));
    }
  };

  const handleRewardInputChange = (rawValue: string) => {
    // Allow digits, one dot, and a leading minus
    const cleaned = rawValue.replace(/[^0-9.\-]/g, '');
    setRewardInput(cleaned);

    if (cleaned === '' || cleaned === '-') {
      handleUpdate({ reward: null });
      return;
    }

    const num = parseFloat(cleaned);
    if (!isNaN(num)) {
      // Auto-enforce sign based on outcome
      let corrected = num;
      if (trade.outcome === 'Loss' && corrected > 0) corrected = -corrected;
      if (trade.outcome === 'Profit' && corrected < 0) corrected = -corrected;
      handleUpdate({ reward: corrected });
    }
  };

  // On blur, normalize the display to match the stored value
  const handleRewardBlur = () => {
    if (trade.reward !== null && trade.reward !== undefined) {
      setRewardInput(String(trade.reward));
    } else {
      setRewardInput('');
    }
  };

  const handleCommissionInputChange = (rawValue: string) => {
    const cleaned = rawValue.replace(/[^0-9.\-]/g, '');
    setCommissionInput(cleaned);

    if (cleaned === '' || cleaned === '-') {
      handleUpdate({ commission: null });
      return;
    }

    const num = parseFloat(cleaned);
    if (!isNaN(num)) {
      handleUpdate({ commission: num > 0 ? -num : num });
    }
  };

  const handleCommissionBlur = () => {
    if (trade.commission !== null && trade.commission !== undefined) {
      setCommissionInput(`-${Math.abs(trade.commission)}`);
    } else {
      setCommissionInput('');
    }
  };

  const handleSaveClick = () => {
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
    onSave(trade);
  };

  const isVisible = (key: string) => !hiddenColumns.has(key);

  const inputStyle: React.CSSProperties = { width: '100%', padding: '10px 14px', borderRadius: 10, border: '1px solid var(--border-default)', background: 'var(--bg-tertiary)', fontSize: '0.875rem', color: 'var(--text-primary)', transition: 'border-color 0.15s ease' };
  const labelStyle: React.CSSProperties = { fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 6, display: 'block' };
  const sectionStyle: React.CSSProperties = { display: 'flex', flexDirection: 'column', gap: 20 };
  const dividerStyle: React.CSSProperties = { height: 1, background: 'var(--border-default)', margin: '4px 0' };

  const imagesLabel = DEFAULT_COLUMNS.find(c => c.key === 'images')?.label || "IMAGE'S LINK";

  const sectionContents: Record<string, React.ReactNode> = {
    date: isVisible('date') ? (
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <div style={{ position: 'relative' }}>
          <label style={labelStyle}>Date</label>
          <button onClick={() => setShowDatePicker(!showDatePicker)} style={{ ...inputStyle, textAlign: 'left', cursor: 'pointer', color: trade.date ? 'var(--text-primary)' : 'var(--text-tertiary)' }}>{trade.date || 'Pick date'}</button>
          {showDatePicker && <DatePickerPopup value={trade.date || ''} onChange={(date, day) => { handleUpdate({ date, day }); setShowDatePicker(false); }} onClose={() => setShowDatePicker(false)} />}
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
    ) : null,
    pair: isVisible('pair') ? (
      <div>
        <label style={labelStyle}>Pair</label>
        <div style={{ ...inputStyle, padding: '6px 6px' }}>
          <EditableSelectField
            value={trade.pair || ''}
            options={customPairs.map(p => p.symbol)}
            onChange={(pair) => handleUpdate({ pair })}
            onAddOption={(newOption) => onAddPair({ symbol: newOption, category: 'Custom' })}
            onDeleteOption={(delOption) => onDeletePair(delOption)}
            placeholder="Select or Add Pair"
          />
        </div>
      </div>
    ) : null,
    directionOutcome: (isVisible('direction') || isVisible('outcome')) ? (
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        {isVisible('direction') && (
          <div>
            <label style={labelStyle}>Direction</label>
            <div style={{ ...inputStyle, padding: '6px 6px' }}>
              <SelectField value={trade.direction || ''} options={directionOptions} placeholder="Direction" onChange={(v) => handleUpdate({ direction: v as any })} />
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
    ) : null,
    financials: (isVisible('reward') || isVisible('commission')) ? (
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        {isVisible('reward') && (
          <div>
            <label style={labelStyle}>Reward ($)</label>
            <input
              style={{ ...inputStyle, color: trade.reward !== null && trade.reward !== undefined ? (trade.reward >= 0 ? 'var(--success-text)' : 'var(--danger-text)') : 'var(--text-primary)' }}
              type="text"
              value={rewardInput}
              onChange={(e) => handleRewardInputChange(e.target.value)}
              onBlur={handleRewardBlur}
              placeholder="0.00"
            />
          </div>
        )}
        {isVisible('commission') && (
          <div>
            <label style={labelStyle}>Commission ($)</label>
            <input
              style={{ ...inputStyle, color: 'var(--danger-text)' }}
              type="text"
              value={commissionInput}
              onChange={(e) => handleCommissionInputChange(e.target.value)}
              onBlur={handleCommissionBlur}
              placeholder="-0.00"
            />
          </div>
        )}
      </div>
    ) : null,
    entryModel: isVisible('entryModel') ? (
      <div>
        <label style={labelStyle}>Entry Model</label>
        <input style={inputStyle} value={trade.entryModel || ''} onChange={(e) => handleUpdate({ entryModel: e.target.value })} placeholder="e.g., Breakout, Pullback" />
      </div>
    ) : null,
    images: isVisible('images') ? (
      <div>
        <label style={labelStyle}>{imagesLabel}</label>
        <ImageUpload value={trade.images || []} onChange={(images) => handleUpdate({ images })} />
      </div>
    ) : null,
    remarks: isVisible('remarks') ? (
      <div>
        <label style={labelStyle}>Remarks</label>
        <textarea style={{ ...inputStyle, resize: 'vertical', minHeight: 90, lineHeight: 1.5 }} value={trade.remarks || ''} onChange={(e) => handleUpdate({ remarks: e.target.value })} placeholder="Trade notes, observations, lessons learned..." />
      </div>
    ) : null,
    customColumns: customColumns.filter((col) => isVisible(col.key)).length > 0 ? (
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        {customColumns.filter((col) => isVisible(col.key)).map((col) => {
          const val = trade.customFields?.[col.key];
          const valueStr = val !== undefined ? String(val) : '';
          
          return (
            <div key={col.key}>
              <label style={labelStyle}>{col.name}</label>
              {col.type === 'number' ? (
                <input
                  style={inputStyle}
                  type="number"
                  value={valueStr}
                  onChange={(e) => handleUpdate({ customFields: { ...trade.customFields, [col.key]: e.target.value ? Number(e.target.value) : '' } })}
                  placeholder="0"
                />
              ) : col.type === 'dropdown' ? (
                <div style={{ ...inputStyle, padding: '6px 6px' }}>
                  <EditableSelectField
                    value={valueStr}
                    options={col.options || []}
                    onChange={(newVal) => handleUpdate({ customFields: { ...trade.customFields, [col.key]: newVal } })}
                    onAddOption={(newOption) => onUpdateCustomColumn({ ...col, options: [...(col.options || []), newOption] })}
                    onDeleteOption={(delOption) => onUpdateCustomColumn({ ...col, options: col.options?.filter(o => o !== delOption) || [] })}
                  />
                </div>
              ) : (
                <input
                  style={inputStyle}
                  value={valueStr}
                  onChange={(e) => handleUpdate({ customFields: { ...trade.customFields, [col.key]: e.target.value } })}
                />
              )}
            </div>
          );
        })}
      </div>
    ) : null,
  };

  const activeOrder = sectionOrder.filter(key => sectionContents[key] !== null);

  return (
    <>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'var(--surface-overlay)', zIndex: 400, opacity: panelMounted ? 1 : 0, transition: 'opacity 250ms var(--ease-out)' }} />
      <div style={{ position: 'fixed', top: 0, right: 0, bottom: 0, width: '100%', maxWidth: 560, background: 'var(--surface-elevated)', zIndex: 410, display: 'flex', flexDirection: 'column', boxShadow: '-10px 0 40px rgba(0,0,0,0.15)', transform: panelMounted ? 'translateX(0)' : 'translateX(100%)', transition: 'transform 400ms var(--ease-drawer)' }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '24px 32px', borderBottom: '1px solid var(--border-default)' }}>
          <div>
            <h2 style={{ fontSize: '1.375rem', fontWeight: 700, color: 'var(--text-primary)' }}>{isEditing ? 'Edit Trade' : 'New Trade'}</h2>
            <p style={{ fontSize: '0.8125rem', color: 'var(--text-tertiary)', marginTop: 2 }}>{isEditing ? 'Modify the trade details below' : 'Fill in the details below'}</p>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            {!isRearranging && (
              <>
                <button onClick={() => setShowAddColumn(true)} data-tooltip="Add Column" style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border-default)', borderRadius: 8, cursor: 'pointer', color: 'var(--text-secondary)', display: 'flex', padding: 8 }}>
                  <Columns3 size={18} />
                </button>
                {customColumns.length > 0 && (
                  <button onClick={() => setShowDeleteColumn(true)} data-tooltip="Delete Column" style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border-default)', borderRadius: 8, cursor: 'pointer', color: 'var(--danger-text)', display: 'flex', padding: 8 }}>
                    <X size={18} />
                  </button>
                )}
              </>
            )}
            {isRearranging && (
              <button onClick={resetOrder} data-tooltip="Reset Order" style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border-default)', borderRadius: 8, cursor: 'pointer', color: 'var(--text-secondary)', display: 'flex', padding: 8 }}>
                <RotateCcw size={18} />
              </button>
            )}
            <button onClick={toggleRearrange} data-tooltip={isRearranging ? "Save Order" : "Rearrange Sections"} style={{ background: isRearranging ? 'var(--primary-color)' : 'var(--bg-tertiary)', border: '1px solid', borderColor: isRearranging ? 'var(--primary-color)' : 'var(--border-default)', borderRadius: 8, cursor: 'pointer', color: isRearranging ? '#fff' : 'var(--text-secondary)', display: 'flex', padding: 8 }}>
              {isRearranging ? <Check size={18} /> : <Settings2 size={18} />}
            </button>
            <button onClick={onClose} data-tooltip="Close" style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border-default)', borderRadius: 8, cursor: 'pointer', color: 'var(--text-secondary)', display: 'flex', padding: 8 }}>
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Form Body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '28px 32px' }}>
          <div style={sectionStyle}>
            {isRearranging ? (
              <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                <SortableContext items={activeOrder} strategy={verticalListSortingStrategy}>
                  {activeOrder.map((key) => (
                    <SortableItem key={key} id={key} isRearranging={isRearranging}>
                      {sectionContents[key]}
                    </SortableItem>
                  ))}
                </SortableContext>
              </DndContext>
            ) : (
              activeOrder.map((key, i) => (
                <div key={key} style={{ opacity: 0, animation: `staggerFadeIn 300ms var(--ease-out) ${i * 50}ms forwards` }}>
                  {sectionContents[key]}
                </div>
              ))
            )}
          </div>
        </div>

        {/* Footer */}
        <div style={{ padding: '20px 32px', borderTop: '1px solid var(--border-default)', display: 'flex', flexDirection: 'column', gap: 12, background: 'var(--surface-elevated)' }}>
          {error && <div style={{ color: 'var(--danger-text)', fontSize: '0.8125rem', textAlign: 'center' }}>{error}</div>}
          <div style={{ display: 'flex', gap: 12 }}>
            <button className="btn btn-secondary" style={{ flex: 1, padding: '12px 16px' }} onClick={onClose}>Cancel</button>
            <button className="btn btn-primary" style={{ flex: 1, padding: '12px 16px' }} onClick={handleSaveClick}>{isEditing ? 'Save Changes' : 'Save Trade'}</button>
          </div>
        </div>
      </div>

      {showAddColumn && (
        <AddColumnModal
          onClose={() => setShowAddColumn(false)}
          onAdd={(col) => { onAddCustomColumn(col); setShowAddColumn(false); }}
        />
      )}

      {showDeleteColumn && (
        <DeleteColumnModal
          customColumns={customColumns}
          onClose={() => setShowDeleteColumn(false)}
          onDelete={(colKey) => { onDeleteCustomColumn(colKey); setShowDeleteColumn(false); }}
        />
      )}
    </>
  );
}
