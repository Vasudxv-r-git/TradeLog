import { useState } from 'react';
import { X, Trash2 } from 'lucide-react';
import { CustomColumn } from '@/types';

import ConfirmModal from '@/components/ui/ConfirmModal';

interface DeleteColumnModalProps {
  customColumns: CustomColumn[];
  onClose: () => void;
  onDelete: (colKey: string) => void;
}

export default function DeleteColumnModal({ customColumns, onClose, onDelete }: DeleteColumnModalProps) {
  const [selectedColKey, setSelectedColKey] = useState<string>('');
  const [showConfirm, setShowConfirm] = useState(false);

  const handleDeleteClick = () => {
    if (selectedColKey) {
      setShowConfirm(true);
    }
  };

  const handleConfirmDelete = () => {
    if (selectedColKey) {
      onDelete(selectedColKey);
      setShowConfirm(false);
    }
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'var(--surface-overlay)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, animation: 'fadeIn 0.2s ease-out' }}>
      <div onClick={(e) => e.stopPropagation()} style={{ background: 'var(--surface-card)', border: '1px solid var(--border-default)', borderRadius: 16, padding: '24px', width: '100%', maxWidth: 400, boxShadow: 'var(--shadow-xl)', animation: 'scaleIn 0.2s ease-out' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 600, color: 'var(--text-primary)' }}>Delete Column</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', padding: 4 }}>
            <X size={20} />
          </button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {customColumns.length === 0 ? (
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>No custom columns available to delete.</p>
          ) : (
            <>
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 8, textTransform: 'uppercase' }}>
                  Select Column to Delete
                </label>
                <select
                  value={selectedColKey}
                  onChange={(e) => setSelectedColKey(e.target.value)}
                  style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid var(--border-default)', background: 'var(--bg-primary)', color: 'var(--text-primary)', fontSize: '0.875rem', outline: 'none' }}
                >
                  <option value="" disabled>Select a column</option>
                  {customColumns.map(col => (
                    <option key={col.key} value={col.key}>{col.name}</option>
                  ))}
                </select>
              </div>

              <div style={{ background: 'rgba(239, 68, 68, 0.1)', padding: 12, borderRadius: 8, border: '1px solid rgba(239, 68, 68, 0.2)' }}>
                <p style={{ color: 'var(--danger-text)', fontSize: '0.8125rem', lineHeight: 1.5 }}>
                  <strong>Warning:</strong> This will hide the column from the table and the New Trade form. Existing data for this field will remain untouched in the database.
                </p>
              </div>
            </>
          )}
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 24 }}>
          <button className="btn btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button
            className="btn btn-primary"
            onClick={handleDeleteClick}
            disabled={!selectedColKey}
            style={{ background: selectedColKey ? 'var(--danger)' : 'var(--border-default)', color: 'white', border: 'none', opacity: selectedColKey ? 1 : 0.5, cursor: selectedColKey ? 'pointer' : 'not-allowed' }}
          >
            <Trash2 size={16} /><span>Delete</span>
          </button>
        </div>
      </div>

      {showConfirm && (
        <ConfirmModal
          title="Delete Column?"
          onConfirm={handleConfirmDelete}
          onCancel={() => setShowConfirm(false)}
        />
      )}
    </div>
  );
}
