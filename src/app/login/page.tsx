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
          <div style={{
            width: 56,
            height: 56,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'linear-gradient(135deg, var(--accent), var(--accent-hover))',
            color: 'white',
            borderRadius: 16,
            boxShadow: '0 8px 16px rgba(99, 129, 248, 0.25)',
            opacity: 0,
            animation: 'staggerFadeIn 400ms var(--ease-out) 100ms forwards',
          }}>
            <BarChart3 size={28} />
          </div>
          <h1 style={{
            fontSize: '1.75rem',
            fontWeight: 700,
            color: 'var(--text-primary)',
            letterSpacing: '-0.5px',
            opacity: 0,
            animation: 'staggerFadeIn 400ms var(--ease-out) 180ms forwards',
          }}>TradeLog</h1>
          <p style={{
            fontSize: '0.9375rem',
            color: 'var(--text-secondary)',
            opacity: 0,
            animation: 'staggerFadeIn 400ms var(--ease-out) 260ms forwards',
          }}>Your personal trading journal</p>
        </div>

        <div style={{
          width: '100%',
          height: 1,
          background: 'var(--border-default)',
          opacity: 0,
          animation: 'staggerFadeIn 300ms var(--ease-out) 340ms forwards',
        }} />

        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 16,
          width: '100%',
          opacity: 0,
          animation: 'staggerFadeIn 400ms var(--ease-out) 400ms forwards',
        }}>
          <p style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Get started</p>
          <LoginButton />
        </div>

        <p style={{
          fontSize: '0.8125rem',
          color: 'var(--text-tertiary)',
          opacity: 0,
          animation: 'staggerFadeIn 300ms var(--ease-out) 480ms forwards',
        }}>
          Track trades · Analyze P&L · Improve performance
        </p>
      </div>

      {/* Ambient gradient blobs — subtle, slow motion for first impression */}
      <div style={{ position: 'absolute', top: '-20%', right: '-10%', width: '50vw', height: '50vw', background: 'radial-gradient(circle, var(--accent) 0%, transparent 70%)', opacity: 0.05, borderRadius: '50%', filter: 'blur(60px)', animation: 'subtlePulse 8s ease-in-out infinite' }} />
      <div style={{ position: 'absolute', bottom: '-20%', left: '-10%', width: '40vw', height: '40vw', background: 'radial-gradient(circle, var(--success) 0%, transparent 70%)', opacity: 0.03, borderRadius: '50%', filter: 'blur(60px)', animation: 'subtlePulse 8s ease-in-out 4s infinite' }} />
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
