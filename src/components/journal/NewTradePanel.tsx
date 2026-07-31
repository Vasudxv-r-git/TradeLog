'use client';

import { useState } from 'react';
import { X } from 'lucide-react';
import { Trade, CustomColumn, CustomPair } from '@/types';
import { DEFAULT_COLUMNS } from '@/lib/constants';
import DatePickerPopup from '@/components/fields/DatePickerPopup';
import PairSelect from '@/components/fields/PairSelect';
import SelectField from '@/components/fields/SelectField';
import ImageUpload from '@/components/fields/ImageUpload';
import { WEEKDAYS } from '@/lib/constants';

interface TradePanelProps {
  customColumns: CustomColumn[];
  customPairs: CustomPair[];
  hiddenColumns: Set<string>;
  hiddenPairs: Set<string>;
  onAddPair: (pair: CustomPair) => void;
  onDeletePair: (pairSymbol: string) => void;
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

export default function TradePanel({ customColumns, customPairs, hiddenColumns, hiddenPairs, onAddPair, onDeletePair, onSave, onClose, editingTrade }: TradePanelProps) {
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
  const [error, setError] = useState<string | null>(null);

  // Raw string state for the reward input so "-" can be typed freely
  const [rewardInput, setRewardInput] = useState<string>(
    editingTrade?.reward !== null && editingTrade?.reward !== undefined ? String(editingTrade.reward) : ''
  );
  const [commissionInput, setCommissionInput] = useState<string>(
    editingTrade?.commission !== null && editingTrade?.commission !== undefined ? `-${Math.abs(editingTrade.commission)}` : ''
  );

  const handleUpdate = (updates: Partial<Trade>) => setTrade((prev) => ({ ...prev, ...updates }));

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

  return (
    <>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'var(--surface-overlay)', zIndex: 400, animation: 'fadeIn 0.2s ease' }} />
      <div style={{ position: 'fixed', top: 0, right: 0, bottom: 0, width: '100%', maxWidth: 560, background: 'var(--surface-elevated)', zIndex: 410, display: 'flex', flexDirection: 'column', boxShadow: '-10px 0 40px rgba(0,0,0,0.15)', animation: 'slideInRight 0.3s cubic-bezier(0.16, 1, 0.3, 1)' }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '24px 32px', borderBottom: '1px solid var(--border-default)' }}>
          <div>
            <h2 style={{ fontSize: '1.375rem', fontWeight: 700, color: 'var(--text-primary)' }}>{isEditing ? 'Edit Trade' : 'New Trade'}</h2>
            <p style={{ fontSize: '0.8125rem', color: 'var(--text-tertiary)', marginTop: 2 }}>{isEditing ? 'Modify the trade details below' : 'Fill in the details below'}</p>
          </div>
          <button onClick={onClose} style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border-default)', borderRadius: 8, cursor: 'pointer', color: 'var(--text-secondary)', display: 'flex', padding: 8 }}><X size={18} /></button>
        </div>

        {/* Form Body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '28px 32px' }}>
          <div style={sectionStyle}>
            {/* Section: Date */}
            {isVisible('date') && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <div style={{ position: 'relative' }}>
                  <label style={labelStyle}>Date</label>
                  <button onClick={() => setShowDatePicker(!showDatePicker)} style={{ ...inputStyle, textAlign: 'left', cursor: 'pointer', color: trade.date ? 'var(--text-primary)' : 'var(--text-tertiary)' }}>{trade.date || 'Pick date'}</button>
                  {showDatePicker && <DatePickerPopup value={trade.date || ''} onChange={(date, day) => { handleUpdate({ date, day }); setShowDatePicker(false); }} onClose={() => setShowDatePicker(false)} />}
                </div>
                {isVisible('day') && (
                  <div>
                    <label style={labelStyle}>Day</label>
                    <div style={{ ...inputStyle, padding: '6px 6px' }}>
                      <SelectField value={trade.day || ''} options={dayOptions} placeholder="Day" onChange={(day) => handleUpdate({ day })} />
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Section: Pair */}
            {isVisible('pair') && (
              <div>
                <label style={labelStyle}>Pair</label>
                <div style={{ ...inputStyle, padding: '6px 6px' }}>
                  <PairSelect value={trade.pair || ''} customPairs={customPairs} hiddenPairs={hiddenPairs} onChange={(pair) => handleUpdate({ pair })} onAddPair={onAddPair} onDeletePair={onDeletePair} />
                </div>
              </div>
            )}

            <div style={dividerStyle} />

            {/* Section: Direction & Outcome */}
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

            {/* Section: Financials */}
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

            <div style={dividerStyle} />

            {/* Section: Details */}
            {isVisible('entryModel') && (
              <div>
                <label style={labelStyle}>Entry Model</label>
                <input style={inputStyle} value={trade.entryModel || ''} onChange={(e) => handleUpdate({ entryModel: e.target.value })} placeholder="e.g., Breakout, Pullback" />
              </div>
            )}

            {isVisible('images') && (
              <div>
                <label style={labelStyle}>{imagesLabel}</label>
                <ImageUpload value={trade.images || []} onChange={(images) => handleUpdate({ images })} />
              </div>
            )}

            {isVisible('remarks') && (
              <div>
                <label style={labelStyle}>Remarks</label>
                <textarea style={{ ...inputStyle, resize: 'vertical', minHeight: 90, lineHeight: 1.5 }} value={trade.remarks || ''} onChange={(e) => handleUpdate({ remarks: e.target.value })} placeholder="Trade notes, observations, lessons learned..." />
              </div>
            )}

            {/* Custom Columns */}
            {customColumns.filter((col) => isVisible(col.key)).length > 0 && (
              <>
                <div style={dividerStyle} />
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                  {customColumns.filter((col) => isVisible(col.key)).map((col) => (
                    <div key={col.key}>
                      <label style={labelStyle}>{col.name}</label>
                      <input style={inputStyle} value={trade.customFields?.[col.key] || ''} onChange={(e) => handleUpdate({ customFields: { ...trade.customFields, [col.key]: e.target.value } })} placeholder="—" />
                    </div>
                  ))}
                </div>
              </>
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
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes slideInRight {
          from { transform: translateX(100%); }
          to { transform: translateX(0); }
        }
      `}} />
    </>
  );
}
