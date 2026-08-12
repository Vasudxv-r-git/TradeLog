'use client';

import { useEffect, useState } from 'react';

interface ConfirmModalProps {
  title: string;
  message?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ConfirmModal({ title, message = 'This action cannot be undone.', onConfirm, onCancel }: ConfirmModalProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // Trigger entrance transition on next frame
    requestAnimationFrame(() => setMounted(true));
  }, []);

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
        opacity: mounted ? 1 : 0,
        transition: 'opacity 250ms var(--ease-out)',
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
          display: 'flex', 
          flexDirection: 'column', 
          overflow: 'hidden',
          border: '1px solid var(--border-default)',
          opacity: mounted ? 1 : 0,
          transform: mounted ? 'scale(1)' : 'scale(0.96)',
          transition: 'opacity 250ms var(--ease-out), transform 250ms var(--ease-out)',
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
              cursor: 'pointer',
              transition: 'transform 160ms var(--ease-out), background-color 150ms ease',
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
              cursor: 'pointer',
              transition: 'transform 160ms var(--ease-out), background-color 150ms ease',
            }}
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}
