'use client';

import { BarChart3 } from 'lucide-react';

export default function EmptyState({ title = 'No trades yet', description = 'Add your first trade to start tracking your performance.' }: { title?: string; description?: string }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16, padding: '80px 24px', textAlign: 'center' }}>
      <div
        style={{
          width: 80,
          height: 80,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'var(--bg-tertiary)',
          borderRadius: 20,
          color: 'var(--text-tertiary)',
          opacity: 0,
          animation: 'emptyStateIcon 500ms var(--ease-out) forwards, emptyStateFloat 3s ease-in-out 500ms infinite',
        }}
      >
        <BarChart3 size={48} strokeWidth={1.2} />
      </div>
      <h3 style={{
        fontSize: '1.125rem',
        fontWeight: 600,
        color: 'var(--text-primary)',
        opacity: 0,
        animation: 'staggerFadeIn 300ms var(--ease-out) 150ms forwards',
      }}>{title}</h3>
      <p style={{
        fontSize: '0.875rem',
        color: 'var(--text-tertiary)',
        maxWidth: 300,
        lineHeight: 1.5,
        opacity: 0,
        animation: 'staggerFadeIn 300ms var(--ease-out) 250ms forwards',
      }}>{description}</p>
    </div>
  );
}
