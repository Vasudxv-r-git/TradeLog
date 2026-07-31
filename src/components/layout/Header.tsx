'use client';

import { useState } from 'react';
import { BarChart3, LogOut, Users } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import ThemeToggle from '@/components/ui/ThemeToggle';

export default function Header() {
  const { user, signOut } = useAuth();

  return (
    <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 24px', background: 'var(--surface-card)', borderBottom: '1px solid var(--border-default)', position: 'sticky', top: 0, zIndex: 100, backdropFilter: 'blur(12px)', transition: 'background-color 0.25s ease' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{ width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg, var(--accent), var(--accent-hover))', color: 'white', borderRadius: 9 }}>
          <BarChart3 size={20} />
        </div>
        <h1 style={{ fontSize: '1.125rem', fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.3px' }}>TradeLog</h1>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <ThemeToggle />
        {user && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, paddingLeft: 12, borderLeft: '1px solid var(--border-default)' }}>
            {user.user_metadata?.avatar_url && (
              <img src={user.user_metadata.avatar_url} alt={user.user_metadata?.full_name || 'User'} referrerPolicy="no-referrer" style={{ width: 32, height: 32, borderRadius: '50%', border: '2px solid var(--border-default)' }} />
            )}
            <span style={{ fontSize: '0.875rem', fontWeight: 500, color: 'var(--text-secondary)' }}>{user.user_metadata?.full_name || user.email?.split('@')[0]}</span>
            <button onClick={signOut} title="Sign out" style={{ padding: 6, borderRadius: 6, color: 'var(--text-tertiary)', cursor: 'pointer', background: 'none', border: 'none', display: 'flex' }}>
              <LogOut size={16} />
            </button>
          </div>
        )}
      </div>

    </header>
  );
}
