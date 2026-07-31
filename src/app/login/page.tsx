'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { BarChart3 } from 'lucide-react';
import { AuthProvider, useAuth } from '@/hooks/useAuth';
import { ThemeProvider } from '@/hooks/useTheme';
import LoginButton from '@/components/auth/LoginButton';

function LoginContent() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && user) {
      router.push('/dashboard');
    }
  }, [user, loading, router]);

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-primary)', position: 'relative', overflow: 'hidden' }}>
      <div style={{ width: '100%', maxWidth: 400, background: 'var(--surface-card)', border: '1px solid var(--border-default)', borderRadius: 24, padding: 40, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 32, boxShadow: 'var(--shadow-xl)', zIndex: 10, animation: 'scaleIn 0.4s cubic-bezier(0.16, 1, 0.3, 1)' }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
          <div style={{ width: 56, height: 56, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg, var(--accent), var(--accent-hover))', color: 'white', borderRadius: 16, boxShadow: '0 8px 16px rgba(99, 129, 248, 0.25)' }}>
            <BarChart3 size={28} />
          </div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.5px' }}>TradeLog</h1>
          <p style={{ fontSize: '0.9375rem', color: 'var(--text-secondary)' }}>Your personal trading journal</p>
        </div>

        <div style={{ width: '100%', height: 1, background: 'var(--border-default)' }} />

        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16, width: '100%' }}>
          <p style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Get started</p>
          <LoginButton />
        </div>

        <p style={{ fontSize: '0.8125rem', color: 'var(--text-tertiary)' }}>
          Track trades · Analyze P&L · Improve performance
        </p>
      </div>

      <div style={{ position: 'absolute', top: '-20%', right: '-10%', width: '50vw', height: '50vw', background: 'radial-gradient(circle, var(--accent) 0%, transparent 70%)', opacity: 0.05, borderRadius: '50%', filter: 'blur(60px)' }} />
      <div style={{ position: 'absolute', bottom: '-20%', left: '-10%', width: '40vw', height: '40vw', background: 'radial-gradient(circle, var(--success) 0%, transparent 70%)', opacity: 0.03, borderRadius: '50%', filter: 'blur(60px)' }} />
    </div>
  );
}

export default function LoginPage() {
  return (
    <AuthProvider>
      <ThemeProvider>
        <LoginContent />
      </ThemeProvider>
    </AuthProvider>
  );
}
