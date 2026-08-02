'use client';

interface ConfirmModalProps {
  title: string;
  message?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ConfirmModal({ title, message = 'This action cannot be undone.', onConfirm, onCancel }: ConfirmModalProps) {
  return (
    <div 
      onClick={onCancel} 
      style={{ 
        position: 'fixed', 
        inset: 0, 
        background: 'var(--surface-overlay)', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center', 
        zIndex: 2000, 
        animation: 'fadeIn 0.15s ease-out' 
      }}
    >
      <div 
        onClick={(e) => e.stopPropagation()} 
        style={{ 
          background: 'var(--surface-card)', 
          borderRadius: 14, 
          boxShadow: 'var(--shadow-xl)', 
          width: '100%', 
          maxWidth: 280, 
          animation: 'scaleIn 0.2s ease-out', 
          display: 'flex', 
          flexDirection: 'column', 
          overflow: 'hidden',
          border: '1px solid var(--border-default)'
        }}
      >
        <div style={{ padding: '20px 16px 16px', textAlign: 'center' }}>
          <h3 style={{ fontSize: '1.05rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: 4 }}>
            {title}
          </h3>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
            {message}
          </p>
        </div>
        <div style={{ display: 'flex', borderTop: '1px solid var(--border-default)' }}>
          <button 
            onClick={onCancel} 
            style={{ 
              flex: 1, 
              padding: '12px', 
              background: 'transparent', 
              border: 'none', 
              borderRight: '1px solid var(--border-default)', 
              fontSize: '1rem', 
              color: 'var(--accent)', 
              cursor: 'pointer' 
            }}
          >
            Cancel
          </button>
          <button 
            onClick={onConfirm} 
            style={{ 
              flex: 1, 
              padding: '12px', 
              background: 'transparent', 
              border: 'none', 
              fontSize: '1rem', 
              fontWeight: 600, 
              color: 'var(--danger-text)', 
              cursor: 'pointer' 
            }}
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}
