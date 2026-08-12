

--- FILE: src/app/dashboard/layout.tsx ---
'use client';

import { AuthProvider } from '@/hooks/useAuth';
import { ThemeProvider } from '@/hooks/useTheme';
import AuthGate from '@/components/auth/AuthGate';
import Header from '@/components/layout/Header';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthProvider>
      <ThemeProvider>
        <AuthGate>
            <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
              <Header />
              <main style={{ flex: 1, padding: '24px', maxWidth: '1600px', width: '100%', margin: '0 auto' }}>
                {children}
              </main>
            </div>
        </AuthGate>
      </ThemeProvider>
    </AuthProvider>
  );
}


--- FILE: src/app/dashboard/page.tsx ---
'use client';

import { useState, useEffect, useCallback } from 'react';
import { Plus, Users } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useMonthYear } from '@/hooks/useMonthYear';
import { TradesProvider, useTrades } from '@/hooks/useTrades';
import { Trade, CustomColumn, CustomPair } from '@/types';
import { getUserProfile, addCustomPair, addCustomColumn, addTrade, updateTrade as updateTradeInDb, removeCustomColumn, updateCustomColumn } from '@/lib/database';
import MonthYearSelector from '@/components/overview/MonthYearSelector';
import TradeGrid from '@/components/journal/TradeGrid';
import MonthlyOverview from '@/components/overview/MonthlyOverview';
import PnLChart from '@/components/overview/PnLChart';
import TradePanel from '@/components/journal/NewTradePanel';
import { removeCustomPair } from '@/lib/database';

function DashboardContent({
  year,
  month,
  customColumns,
  customPairs,
  hiddenColumns,
  onAddColumn,
  onUpdateColumn,
  onAddPair,
  onDeletePair,
  onDeleteColumn,
  sectionOrder,
  onUpdateSectionOrder,
}: {
  year: number;
  month: number;
  customColumns: CustomColumn[];
  customPairs: CustomPair[];
  hiddenColumns: Set<string>;
  onAddColumn: (col: CustomColumn) => void;
  onUpdateColumn: (col: CustomColumn) => void;
  onAddPair: (pair: CustomPair) => void;
  onDeletePair: (pairSymbol: string) => void;
  onDeleteColumn: (colKey: string) => void;
  sectionOrder: string[];
  onUpdateSectionOrder: (order: string[]) => void;
}) {
  const { user } = useAuth();
  const { trades, refreshTrades } = useTrades();
  const [showNewTrade, setShowNewTrade] = useState(false);
  const [editingTrade, setEditingTrade] = useState<Trade | null>(null);

  // Create new trade
  const handleSaveNewTrade = async (newTrade: Partial<Trade>) => {
    if (!user) return;
    const fullTrade = { ...newTrade, images: newTrade.images || [] };
    await addTrade(user.id, year, month, fullTrade as any);
    setShowNewTrade(false);
    refreshTrades();
  };

  // Update existing trade
  const handleSaveEditedTrade = async (updatedTrade: Partial<Trade>) => {
    if (!user || !editingTrade) return;
    await updateTradeInDb(user.id, year, month, editingTrade.id, updatedTrade);
    setEditingTrade(null);
    refreshTrades();
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
      {/* 1. Monthly Overview (Pinned at Top) */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        <MonthlyOverview trades={trades} year={year} month={month} />
        {trades.length > 0 && <PnLChart trades={trades} />}
      </div>

      {/* 2. New Trade Button */}
      <div>
        <button className="btn btn-primary" onClick={() => setShowNewTrade(true)}>
          <Plus size={16} /><span>New Trade</span>
        </button>
      </div>

      {/* 3. Trades Grid (Single Source of Truth — read-only cells) */}
      <TradeGrid
        customColumns={customColumns}
        hiddenColumns={hiddenColumns}
        sectionOrder={sectionOrder}
        onEditTrade={(trade) => setEditingTrade(trade)}
      />

      {/* 4. New Trade Panel */}
      {showNewTrade && (
        <TradePanel
          customColumns={customColumns}
          customPairs={customPairs}
          hiddenColumns={hiddenColumns}
          sectionOrder={sectionOrder}
          onUpdateSectionOrder={onUpdateSectionOrder}
          onAddPair={onAddPair}
          onDeletePair={onDeletePair}
          onAddCustomColumn={onAddColumn}
          onUpdateCustomColumn={onUpdateColumn}
          onDeleteCustomColumn={onDeleteColumn}
          onSave={handleSaveNewTrade}
          onClose={() => setShowNewTrade(false)}
        />
      )}

      {/* 5. Edit Trade Panel */}
      {editingTrade && (
        <TradePanel
          customColumns={customColumns}
          customPairs={customPairs}
          hiddenColumns={hiddenColumns}
          sectionOrder={sectionOrder}
          onUpdateSectionOrder={onUpdateSectionOrder}
          onAddPair={onAddPair}
          onDeletePair={onDeletePair}
          onAddCustomColumn={onAddColumn}
          onUpdateCustomColumn={onUpdateColumn}
          onDeleteCustomColumn={onDeleteColumn}
          onSave={handleSaveEditedTrade}
          onClose={() => setEditingTrade(null)}
          editingTrade={editingTrade}
        />
      )}
    </div>
  );
}

export default function DashboardPage() {
  const { user } = useAuth();
  const { year, month, setYear, setMonth } = useMonthYear();
  const [customColumns, setCustomColumns] = useState<CustomColumn[]>([]);
  const [customPairs, setCustomPairs] = useState<CustomPair[]>([]);
  const [hiddenColumns, setHiddenColumns] = useState<Set<string>>(new Set());
  
  const DEFAULT_SECTION_ORDER = ['date', 'pair', 'directionOutcome', 'financials', 'entryModel', 'images', 'remarks', 'customColumns'];
  const [sectionOrder, setSectionOrder] = useState<string[]>(DEFAULT_SECTION_ORDER);

  useEffect(() => {
    if (!user) return;
    getUserProfile(user.id).then((profile) => {
      if (profile) {
        setCustomColumns(profile.customColumns || []);
        setCustomPairs(profile.customPairs || []);
      }
    });
    const savedCols = localStorage.getItem('tradelog_hidden_columns');
    if (savedCols) {
      try { setHiddenColumns(new Set(JSON.parse(savedCols))); } catch {}
    }
    
    const savedOrder = localStorage.getItem('tradelog_section_order') || localStorage.getItem('newTradePanelSectionOrder');
    if (savedOrder) {
      try {
        const parsed = JSON.parse(savedOrder);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setSectionOrder(Array.from(new Set([...parsed, ...DEFAULT_SECTION_ORDER])));
        }
      } catch {}
    }
  }, [user]);

  const handleUpdateSectionOrder = useCallback((newOrder: string[]) => {
    setSectionOrder(newOrder);
    localStorage.setItem('tradelog_section_order', JSON.stringify(newOrder));
  }, []);

  const handleAddColumn = useCallback(
    async (column: CustomColumn) => {
      if (!user) return;
      await addCustomColumn(user.id, column);
      setCustomColumns((prev) => [...prev, column]);
      setHiddenColumns((prev) => {
        const next = new Set(prev);
        next.delete(column.key);
        localStorage.setItem('tradelog_hidden_columns', JSON.stringify([...next]));
        return next;
      });
    },
    [user]
  );

  const handleUpdateColumn = useCallback(
    async (column: CustomColumn) => {
      if (!user) return;
      await updateCustomColumn(user.id, column);
      setCustomColumns((prev) => prev.map((c) => (c.key === column.key ? column : c)));
    },
    [user]
  );

  const handleAddPair = useCallback(
    async (pair: CustomPair) => {
      if (!user) return;
      await addCustomPair(user.id, pair);
      setCustomPairs((prev) => [...prev, pair]);
    },
    [user]
  );

  const handleDeletePair = useCallback(
    async (pairSymbol: string) => {
      const isCustom = customPairs.some((p) => p.symbol === pairSymbol);
      if (isCustom && user) {
        await removeCustomPair(user.id, pairSymbol);
        setCustomPairs((prev) => prev.filter((p) => p.symbol !== pairSymbol));
      }
    },
    [user, customPairs]
  );

  const handleDeleteColumn = useCallback(
    async (columnKey: string) => {
      const isCustom = customColumns.some((c) => c.key === columnKey);
      if (isCustom && user) {
        await removeCustomColumn(user.id, columnKey);
        setCustomColumns((prev) => prev.filter((c) => c.key !== columnKey));
      }
      setHiddenColumns((prev) => {
        const next = new Set(prev);
        next.add(columnKey);
        localStorage.setItem('tradelog_hidden_columns', JSON.stringify([...next]));
        return next;
      });
    },
    [user, customColumns]
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24, animation: 'fadeIn 0.3s ease-out' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <MonthYearSelector
            year={year}
            month={month}
            onYearChange={setYear}
            onMonthChange={setMonth}
          />
        </div>
      </div>



      <TradesProvider year={year} month={month}>
        <DashboardContent
          year={year}
          month={month}
          customColumns={customColumns}
          customPairs={customPairs}
          hiddenColumns={hiddenColumns}
          onAddColumn={handleAddColumn}
          onUpdateColumn={handleUpdateColumn}
          onAddPair={handleAddPair}
          onDeletePair={handleDeletePair}
          onDeleteColumn={handleDeleteColumn}
          sectionOrder={sectionOrder}
          onUpdateSectionOrder={handleUpdateSectionOrder}
        />
      </TradesProvider>
    </div>
  );
}


--- FILE: src/app/globals.css ---
:root {
  /* Colors - Light Theme */
  --bg-primary: #f8fafc;
  --bg-secondary: #f1f5f9;
  --bg-tertiary: #e2e8f0;
  --bg-hover: #e2e8f0;
  
  --surface-card: #ffffff;
  --surface-elevated: #ffffff;
  --surface-overlay: rgba(15, 23, 42, 0.4);
  
  --border-default: #e2e8f0;
  --border-hover: #cbd5e1;
  
  --text-primary: #0f1729;
  --text-secondary: #475569;
  --text-tertiary: #94a3b8;
  
  --accent: #4f46e5;
  --accent-hover: #4338ca;
  --accent-light: #e0e7ff;
  --accent-text: #4f46e5;
  
  --success: #10b981;
  --success-bg: #d1fae5;
  --success-text: #059669;
  
  --danger: #ef4444;
  --danger-bg: #fee2e2;
  --danger-text: #dc2626;

  --grid-header-bg: #f8fafc;
  --grid-row-hover: #f1f5f9;
  --grid-row-alt: #ffffff;
  --grid-border: #e2e8f0;

  /* Shadows */
  --shadow-sm: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
  --shadow-md: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
  --shadow-lg: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
  --shadow-xl: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);

  /* ─── Motion Design System ─── */
  /* Strong custom curves — built-in CSS easings are too weak for intentional motion */
  --ease-out: cubic-bezier(0.23, 1, 0.32, 1);
  --ease-in-out: cubic-bezier(0.77, 0, 0.175, 1);
  --ease-drawer: cubic-bezier(0.32, 0.72, 0, 1);

  /* Duration tokens */
  --duration-fast: 150ms;
  --duration-normal: 250ms;
  --duration-slow: 400ms;
}

[data-theme='dark'] {
  --bg-primary: #09090b;
  --bg-secondary: #121214;
  --bg-tertiary: #18181b;
  --bg-hover: #27272a;
  
  --surface-card: #121214;
  --surface-elevated: #18181b;
  --surface-overlay: rgba(0, 0, 0, 0.7);
  
  --border-default: #27272a;
  --border-hover: #3f3f46;
  
  --text-primary: #fafafa;
  --text-secondary: #a1a1aa;
  --text-tertiary: #71717a;
  
  --accent: #6366f1;
  --accent-hover: #818cf8;
  --accent-light: rgba(99, 102, 241, 0.15);
  --accent-text: #818cf8;
  
  --success: #10b981;
  --success-bg: rgba(16, 185, 129, 0.15);
  --success-text: #34d399;
  
  --danger: #ef4444;
  --danger-bg: rgba(239, 68, 68, 0.15);
  --danger-text: #f87171;

  --grid-header-bg: #121214;
  --grid-row-hover: #1c1c1f;
  --grid-row-alt: #161618;
  --grid-border: #27272a;
}

* {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
  background-color: var(--bg-primary);
  color: var(--text-primary);
  line-height: 1.5;
}

a {
  color: inherit;
  text-decoration: none;
}

/* ─── Animations (keyframes) ─── */

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

@keyframes scaleIn {
  from { opacity: 0; transform: scale(0.96); }
  to { opacity: 1; transform: scale(1); }
}

@keyframes slideDown {
  from { opacity: 0; transform: scale(0.97) translateY(-4px); }
  to { opacity: 1; transform: scale(1) translateY(0); }
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

@keyframes rowInsert {
  from { opacity: 0; transform: translateY(6px); }
  to { opacity: 1; transform: translateY(0); }
}

@keyframes slideInRight {
  from { transform: translateX(100%); }
  to { transform: translateX(0); }
}

@keyframes staggerFadeIn {
  from { opacity: 0; transform: translateY(8px); }
  to { opacity: 1; transform: translateY(0); }
}

@keyframes emptyStateIcon {
  from { opacity: 0; transform: scale(0.8); }
  to { opacity: 1; transform: scale(1); }
}

@keyframes emptyStateFloat {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-6px); }
}

@keyframes subtlePulse {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.03); }
}

@keyframes skeletonShimmer {
  from { opacity: 0.5; }
  to { opacity: 1; }
}

.animate-spin {
  animation: spin 1s linear infinite;
}

/* ─── Buttons ─── */

.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 10px 16px;
  border-radius: 8px;
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  border: none;
  transition:
    transform 160ms var(--ease-out),
    background-color 200ms ease,
    border-color 200ms ease,
    box-shadow 200ms ease,
    opacity 200ms ease;
}

.btn:active {
  transform: scale(0.97);
}

.btn-sm {
  padding: 6px 12px;
  font-size: 0.8125rem;
  border-radius: 6px;
}

.btn-primary {
  background: var(--accent);
  color: white;
}

.btn-primary:hover {
  background: var(--accent-hover);
}

.btn-primary:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.btn-primary:disabled:active {
  transform: none;
}

.btn-secondary {
  background: var(--bg-tertiary);
  color: var(--text-primary);
  border: 1px solid var(--border-default);
}

.btn-secondary:hover {
  background: var(--bg-hover);
  border-color: var(--border-hover);
}

.btn-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 6px;
  border-radius: 6px;
  background: transparent;
  color: var(--text-secondary);
  border: none;
  cursor: pointer;
  transition:
    transform 160ms var(--ease-out),
    background-color 200ms ease,
    color 200ms ease;
}

.btn-icon:active {
  transform: scale(0.92);
}

.btn-icon:hover {
  background: var(--bg-hover);
  color: var(--text-primary);
}

/* ─── Skeleton loader ─── */

.skeleton {
  background: var(--bg-tertiary);
  animation: skeletonShimmer 0.8s ease-in-out infinite alternate;
}

/* ─── Scrollbars ─── */

::-webkit-scrollbar {
  width: 8px;
  height: 8px;
}
::-webkit-scrollbar-track {
  background: transparent;
}
::-webkit-scrollbar-thumb {
  background: var(--border-default);
  border-radius: 4px;
}
::-webkit-scrollbar-thumb:hover {
  background: var(--border-hover);
}

/* ─── Tooltips ─── */

[data-tooltip] {
  position: relative;
}
[data-tooltip]::after {
  content: attr(data-tooltip);
  position: absolute;
  top: calc(100% + 6px);
  left: 50%;
  transform: translateX(-50%) scale(0.97);
  transform-origin: top center;
  background: var(--surface-card);
  color: var(--text-primary);
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 0.75rem;
  white-space: nowrap;
  border: 1px solid var(--border-default);
  box-shadow: var(--shadow-sm);
  z-index: 1000;
  pointer-events: none;
  opacity: 0;
  visibility: hidden;
  transition:
    opacity 125ms var(--ease-out),
    transform 125ms var(--ease-out),
    visibility 125ms var(--ease-out);
}
[data-tooltip]:hover::after {
  opacity: 1;
  visibility: visible;
  transform: translateX(-50%) scale(1);
}

/* ─── Accessibility: Reduced Motion ─── */

@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 200ms !important;
  }

  /* Keep opacity transitions for comprehension, remove transform-based motion */
  .btn:active,
  .btn-icon:active {
    transform: none !important;
  }

  [data-tooltip]::after {
    transform: translateX(-50%) !important;
  }
}

/* ─── Hover gating for touch devices ─── */

@media not all and (hover: hover) and (pointer: fine) {
  [data-tooltip]:hover::after {
    opacity: 0;
    visibility: hidden;
  }
}


--- FILE: src/app/layout.tsx ---
import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "TradeLog — Personal Trading Journal",
  description: "Track your trades, analyze P&L, and improve your trading performance with TradeLog.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" data-theme="dark" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link rel="icon" type="image/x-icon" href="/favicon.ico" />
        <link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png" />
        <link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png" />
        <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png" />
      </head>
      <body>
        {children}
      </body>
    </html>
  );
}


--- FILE: src/app/login/page.tsx ---
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


--- FILE: src/app/page.tsx ---
'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { AuthProvider, useAuth } from '@/hooks/useAuth';
import { ThemeProvider } from '@/hooks/useTheme';

function HomeRedirect() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading) {
      if (user) {
        router.push('/dashboard');
      } else {
        router.push('/login');
      }
    }
  }, [user, loading, router]);

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '100vh',
      background: 'var(--bg-primary)',
    }}>
      <div style={{
        width: '40px',
        height: '40px',
        border: '3px solid var(--border-default)',
        borderTopColor: 'var(--accent)',
        borderRadius: '50%',
        animation: 'spin 0.8s linear infinite',
      }} />
    </div>
  );
}

export default function Home() {
  return (
    <AuthProvider>
      <ThemeProvider>
        <HomeRedirect />
      </ThemeProvider>
    </AuthProvider>
  );
}


--- FILE: src/components/auth/AuthGate.tsx ---
'use client';

import { ReactNode, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useRouter } from 'next/navigation';

export default function AuthGate({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: 'var(--bg-primary)' }}>
        <div style={{ width: 40, height: 40, border: '3px solid var(--border-default)', borderTopColor: 'var(--accent)', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
      </div>
    );
  }

  if (!user) return null;
  return <>{children}</>;
}


--- FILE: src/components/auth/LoginButton.tsx ---
'use client';

import { useAuth } from '@/hooks/useAuth';

export default function LoginButton() {
  const { signIn } = useAuth();

  return (
    <button onClick={signIn} style={{ display: 'inline-flex', alignItems: 'center', gap: 12, padding: '12px 28px', background: 'var(--surface-card)', color: 'var(--text-primary)', border: '1px solid var(--border-default)', borderRadius: 12, fontSize: '0.9375rem', fontWeight: 500, cursor: 'pointer', transition: 'transform 160ms var(--ease-out), background-color 200ms ease, border-color 200ms ease, box-shadow 200ms ease', boxShadow: 'var(--shadow-sm)' }}>
      <svg viewBox="0 0 24 24" width="20" height="20">
        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/>
        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
      </svg>
      <span>Sign in with Google</span>
    </button>
  );
}


--- FILE: src/components/fields/DatePickerField.tsx ---
'use client';

import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown, Calendar } from 'lucide-react';
import { WEEKDAYS, MONTHS } from '@/lib/constants';

interface DatePickerFieldProps {
  value: string;
  onChange: (date: string, day: string) => void;
  placeholder?: string;
  style?: React.CSSProperties;
  showIcon?: boolean;
}

export default function DatePickerField({ value, onChange, placeholder = 'Select Date', style, showIcon = false }: DatePickerFieldProps) {
  const [open, setOpen] = useState(false);
  const [coords, setCoords] = useState({ top: 0, left: 0, width: 0 });
  const ref = useRef<HTMLDivElement>(null);
  const popupRef = useRef<HTMLDivElement>(null);

  const now = new Date();
  
  // Helper to parse 'YYYY-MM-DD' into local date
  const parseLocalDate = (dateStr: string) => {
    if (!dateStr) return null;
    const parts = dateStr.split('-');
    if (parts.length !== 3) return new Date(dateStr); // Fallback
    return new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
  };

  const initial = value ? (parseLocalDate(value) || now) : now;
  const [viewYear, setViewYear] = useState(initial.getFullYear());
  const [viewMonth, setViewMonth] = useState(initial.getMonth());
  const [yearDropdownOpen, setYearDropdownOpen] = useState(false);
  const [monthDropdownOpen, setMonthDropdownOpen] = useState(false);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        ref.current && !ref.current.contains(e.target as Node) &&
        (!popupRef.current || !popupRef.current.contains(e.target as Node))
      ) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleToggle = () => {
    if (!open && ref.current) {
      const rect = ref.current.getBoundingClientRect();
      setCoords({
        top: rect.bottom + window.scrollY + 4,
        left: rect.left + window.scrollX,
        width: Math.max(rect.width, 260) // ensure min-width
      });
      // Reset view to currently selected date when opening
      const current = value ? (parseLocalDate(value) || now) : now;
      setViewYear(current.getFullYear());
      setViewMonth(current.getMonth());
    }
    setOpen(!open);
    setYearDropdownOpen(false);
    setMonthDropdownOpen(false);
  };

  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const firstDay = new Date(viewYear, viewMonth, 1).getDay();
  const selectedDate = value ? parseLocalDate(value) : null;
  const isSelected = (day: number) => selectedDate && selectedDate.getFullYear() === viewYear && selectedDate.getMonth() === viewMonth && selectedDate.getDate() === day;
  const isToday = (day: number) => now.getFullYear() === viewYear && now.getMonth() === viewMonth && now.getDate() === day;
  const yearRange = Array.from({ length: 15 }, (_, i) => now.getFullYear() - 5 + i);

  const handleSelectDate = (day: number) => {
    const date = new Date(viewYear, viewMonth, day);
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    const localDateString = `${y}-${m}-${d}`;
    
    const dayName = WEEKDAYS[date.getDay()];
    onChange(localDateString, dayName);
    setOpen(false);
  };

  const dropdownStyle: React.CSSProperties = { position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0, background: 'var(--surface-elevated)', border: '1px solid var(--border-default)', borderRadius: 8, boxShadow: 'var(--shadow-md)', padding: 4, maxHeight: 200, overflowY: 'auto', zIndex: 310, animation: 'slideDown 0.15s ease-out' };
  const selectorBtnStyle: React.CSSProperties = { display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', padding: '6px 10px', background: 'var(--bg-tertiary)', border: '1px solid var(--border-default)', borderRadius: 6, fontSize: '0.8125rem', fontWeight: 500, color: 'var(--text-primary)', cursor: 'pointer' };

  return (
    <div style={{ position: 'relative', width: '100%' }} ref={ref}>
      <button 
        type="button"
        onClick={handleToggle} 
        style={{ 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: showIcon ? 'space-between' : 'flex-start',
          width: '100%', 
          padding: '10px 14px', 
          borderRadius: 10, 
          border: '1px solid var(--border-default)', 
          background: 'var(--bg-tertiary)', 
          fontSize: '0.875rem', 
          color: value ? 'var(--text-primary)' : 'var(--text-tertiary)', 
          transition: 'border-color 0.15s ease',
          cursor: 'pointer',
          ...style 
        }}
      >
        <span>{value || placeholder}</span>
        {showIcon && <Calendar size={14} style={{ color: 'var(--text-tertiary)' }} />}
      </button>

      {open && typeof document !== 'undefined' && createPortal(
        <div ref={popupRef} style={{ position: 'absolute', top: coords.top, left: coords.left, zIndex: 9999, background: 'var(--surface-elevated)', border: '1px solid var(--border-default)', borderRadius: 12, boxShadow: 'var(--shadow-lg)', padding: 12, width: coords.width, minWidth: 260, animation: 'scaleIn 0.2s ease-out', transformOrigin: 'top left' }}>
          <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
            <div style={{ position: 'relative', flex: 1 }}>
              <button type="button" style={selectorBtnStyle} onClick={(e) => { e.stopPropagation(); setMonthDropdownOpen(!monthDropdownOpen); setYearDropdownOpen(false); }}>
                {MONTHS[viewMonth]} <ChevronDown size={12} style={{ transform: monthDropdownOpen ? 'rotate(180deg)' : 'rotate(0)' }} />
              </button>
              {monthDropdownOpen && (
                <div style={dropdownStyle}>
                  {MONTHS.map((name, i) => (
                    <button type="button" key={name} onClick={(e) => { e.stopPropagation(); setViewMonth(i); setMonthDropdownOpen(false); }} style={{ display: 'block', width: '100%', padding: '5px 10px', textAlign: 'left', fontSize: '0.8125rem', color: i === viewMonth ? 'var(--accent-text)' : 'var(--text-secondary)', background: i === viewMonth ? 'var(--accent-light)' : 'transparent', borderRadius: 4, cursor: 'pointer', border: 'none', fontWeight: i === viewMonth ? 600 : 400 }}>{name}</button>
                  ))}
                </div>
              )}
            </div>
            <div style={{ position: 'relative', flex: 1 }}>
              <button type="button" style={selectorBtnStyle} onClick={(e) => { e.stopPropagation(); setYearDropdownOpen(!yearDropdownOpen); setMonthDropdownOpen(false); }}>
                {viewYear} <ChevronDown size={12} style={{ transform: yearDropdownOpen ? 'rotate(180deg)' : 'rotate(0)' }} />
              </button>
              {yearDropdownOpen && (
                <div style={dropdownStyle}>
                  {yearRange.map((y) => (
                    <button type="button" key={y} onClick={(e) => { e.stopPropagation(); setViewYear(y); setYearDropdownOpen(false); }} style={{ display: 'block', width: '100%', padding: '5px 10px', textAlign: 'left', fontSize: '0.8125rem', color: y === viewYear ? 'var(--accent-text)' : 'var(--text-secondary)', background: y === viewYear ? 'var(--accent-light)' : 'transparent', borderRadius: 4, cursor: 'pointer', border: 'none', fontWeight: y === viewYear ? 600 : 400 }}>{y}</button>
                  ))}
                </div>
              )}
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 2, marginBottom: 4 }}>
            {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map((d) => (
              <span key={d} style={{ textAlign: 'center', fontSize: '0.6875rem', fontWeight: 600, color: 'var(--text-tertiary)', padding: '4px 0' }}>{d}</span>
            ))}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 2 }}>
            {Array.from({ length: firstDay }, (_, i) => (<div key={`e${i}`} style={{ aspectRatio: '1' }} />))}
            {Array.from({ length: daysInMonth }, (_, i) => {
              const day = i + 1;
              return (
                <button type="button" key={day} onClick={(e) => { e.stopPropagation(); handleSelectDate(day); }} style={{ aspectRatio: '1', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.8125rem', color: isSelected(day) ? 'white' : isToday(day) ? 'var(--accent-text)' : 'var(--text-secondary)', background: isSelected(day) ? 'var(--accent)' : 'transparent', border: isToday(day) && !isSelected(day) ? '1px solid var(--accent)' : 'none', borderRadius: 6, cursor: 'pointer', fontWeight: isSelected(day) || isToday(day) ? 600 : 400 }}>{day}</button>
              );
            })}
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}


--- FILE: src/components/fields/EditableSelectField.tsx ---
'use client';

import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown, Plus, Check, X } from 'lucide-react';

import ConfirmModal from '@/components/ui/ConfirmModal';

interface EditableSelectFieldProps {
  value: string;
  options: string[];
  placeholder?: string;
  onChange: (value: string) => void;
  onAddOption: (option: string) => void;
  onDeleteOption?: (option: string) => void;
}

export default function EditableSelectField({ value, options, placeholder = 'Select', onChange, onAddOption, onDeleteOption }: EditableSelectFieldProps) {
  const [open, setOpen] = useState(false);
  const [coords, setCoords] = useState({ top: 0, left: 0, width: 0 });
  const [isAdding, setIsAdding] = useState(false);
  const [newOption, setNewOption] = useState('');
  const [optionToDelete, setOptionToDelete] = useState<string | null>(null);
  const ref = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        ref.current && !ref.current.contains(e.target as Node) &&
        (!menuRef.current || !menuRef.current.contains(e.target as Node))
      ) {
        setOpen(false);
        setIsAdding(false);
        setNewOption('');
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (isAdding && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isAdding]);

  const handleToggle = () => {
    if (!isAdding) {
      if (!open && ref.current) {
        const rect = ref.current.getBoundingClientRect();
        setCoords({
          top: rect.bottom + window.scrollY + 4,
          left: rect.left + window.scrollX,
          width: rect.width
        });
      }
      setOpen(!open);
    }
  };

  const handleAdd = () => {
    const trimmed = newOption.trim();
    if (trimmed && !options.includes(trimmed)) {
      onAddOption(trimmed);
      onChange(trimmed); // Select the newly added option immediately
      setOpen(false);
    }
    setIsAdding(false);
    setNewOption('');
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAdd();
    } else if (e.key === 'Escape') {
      setIsAdding(false);
      setNewOption('');
    }
  };

  return (
    <div style={{ position: 'relative', width: '100%' }} ref={ref}>
      <button
        type="button"
        onClick={handleToggle}
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%',
          padding: '4px 8px', background: 'transparent', border: 'none',
          fontSize: '0.8125rem', cursor: 'pointer', borderRadius: 4, transition: 'background 0.15s ease',
          color: value ? 'var(--text-primary)' : 'var(--text-tertiary)',
          fontWeight: value ? 500 : 400
        }}
      >
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {value || placeholder}
        </span>
        <ChevronDown size={14} style={{ color: 'var(--text-tertiary)', transition: 'transform 0.2s ease', transform: open ? 'rotate(180deg)' : 'rotate(0)', flexShrink: 0 }} />
      </button>

      {open && typeof document !== 'undefined' && createPortal(
        <div ref={menuRef} style={{ position: 'absolute', top: coords.top, left: coords.left, width: coords.width, background: 'var(--surface-elevated)', border: '1px solid var(--border-default)', borderRadius: 8, boxShadow: 'var(--shadow-md)', padding: 4, zIndex: 9999, animation: 'scaleIn 0.15s ease-out', transformOrigin: 'top center', maxHeight: 250, overflowY: 'auto' }}>
          {options.length === 0 && !isAdding && (
            <div style={{ padding: '8px 10px', fontSize: '0.8125rem', color: 'var(--text-tertiary)', fontStyle: 'italic', textAlign: 'center' }}>
              No options available
            </div>
          )}
          
          {options.map((opt) => (
            <div key={opt} style={{ display: 'flex', alignItems: 'center', position: 'relative' }}>
              <button
                type="button"
                onClick={() => { onChange(opt); setOpen(false); }}
                style={{
                  flex: 1, padding: '8px 10px', paddingRight: onDeleteOption ? '32px' : '10px', textAlign: 'left',
                  fontSize: '0.8125rem', color: 'var(--text-secondary)', borderRadius: 4,
                  cursor: 'pointer', border: 'none', background: opt === value ? 'var(--accent-light)' : 'transparent',
                  fontWeight: opt === value ? 500 : 400, transition: 'all 0.1s ease',
                  wordBreak: 'break-word'
                }}
              >
                {opt}
              </button>
              {onDeleteOption && (
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); setOptionToDelete(opt); }}
                  style={{
                    position: 'absolute', right: '4px', top: '50%', transform: 'translateY(-50%)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    background: 'transparent', border: 'none', color: 'var(--text-tertiary)',
                    padding: '4px', borderRadius: 4, cursor: 'pointer'
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--danger-text)'; e.currentTarget.style.background = 'var(--danger-bg)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--text-tertiary)'; e.currentTarget.style.background = 'transparent'; }}
                  title="Delete Option"
                >
                  <X size={14} />
                </button>
              )}
            </div>
          ))}

          <div style={{ borderTop: '1px solid var(--border-default)', marginTop: 4, paddingTop: 4 }}>
            {!isAdding ? (
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); setIsAdding(true); }}
                style={{
                  display: 'flex', alignItems: 'center', gap: 6, width: '100%', padding: '8px 10px',
                  textAlign: 'left', fontSize: '0.8125rem', color: 'var(--primary-color)', borderRadius: 4,
                  cursor: 'pointer', border: 'none', background: 'transparent', fontWeight: 500, transition: 'background 0.1s ease'
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = 'var(--accent-light)'}
                onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
              >
                <Plus size={14} /> Add Option
              </button>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '4px' }}>
                <input
                  ref={inputRef}
                  type="text"
                  placeholder="New option name..."
                  value={newOption}
                  onChange={(e) => setNewOption(e.target.value)}
                  onKeyDown={handleKeyDown}
                  style={{
                    flex: 1, padding: '6px 8px', fontSize: '0.8125rem', borderRadius: 4,
                    border: '1px solid var(--border-default)', background: 'var(--bg-primary)', color: 'var(--text-primary)', outline: 'none'
                  }}
                  onClick={(e) => e.stopPropagation()}
                />
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); handleAdd(); }}
                  style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--primary-color)', color: 'white', border: 'none', borderRadius: 4, padding: '6px', cursor: 'pointer' }}
                  title="Save"
                >
                  <Check size={14} />
                </button>
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); setIsAdding(false); setNewOption(''); }}
                  style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-tertiary)', color: 'var(--text-secondary)', border: '1px solid var(--border-default)', borderRadius: 4, padding: '5px', cursor: 'pointer' }}
                  title="Cancel"
                >
                  <X size={14} />
                </button>
              </div>
            )}
          </div>
        </div>,
        document.body
      )}

      {optionToDelete && (
        <ConfirmModal
          title={`Delete ${optionToDelete}?`}
          onConfirm={() => {
            if (onDeleteOption) onDeleteOption(optionToDelete);
            setOptionToDelete(null);
          }}
          onCancel={() => setOptionToDelete(null)}
        />
      )}
    </div>
  );
}


--- FILE: src/components/fields/ImageUpload.tsx ---
'use client';

import { useState } from 'react';
import { Link as LinkIcon, X } from 'lucide-react';
import { ImageEntry } from '@/types';

interface ImageUploadProps {
  value: ImageEntry[];
  onChange: (images: ImageEntry[]) => void;
}

export default function ImageUpload({ value, onChange }: ImageUploadProps) {
  const [showInput, setShowInput] = useState(false);
  const [urlInput, setUrlInput] = useState('');

  const handleAddUrl = () => {
    if (urlInput.trim()) {
      onChange([...value, { type: 'url', url: urlInput.trim() }]);
      setUrlInput('');
      setShowInput(false);
    }
  };

  const handleRemove = (index: number) => {
    onChange(value.filter((_, i) => i !== index));
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      {value.length > 0 && (
        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
          {value.map((img, i) => (
            <div key={i} style={{ position: 'relative', width: 32, height: 32, borderRadius: 4, overflow: 'hidden', border: '1px solid var(--border-default)', background: 'var(--bg-tertiary)' }} title={img.url}>
              <img src={img.url} alt="Trade link preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={(e) => { (e.target as HTMLImageElement).src = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="%2394a3b8" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path></svg>'; }} />
              <button onClick={() => handleRemove(i)} style={{ position: 'absolute', top: -2, right: -2, width: 16, height: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--danger-text)', color: 'white', borderRadius: '50%', cursor: 'pointer', border: 'none' }}>
                <X size={10} />
              </button>
            </div>
          ))}
        </div>
      )}

      <div style={{ display: 'flex', gap: 4 }}>
        <button onClick={() => setShowInput(!showInput)} title="Add image URL" style={{ width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 4, color: 'var(--text-tertiary)', cursor: 'pointer', border: 'none', background: 'transparent' }}>
          <LinkIcon size={13} />
        </button>
      </div>

      {showInput && (
        <div style={{ display: 'flex', gap: 4 }}>
          <input placeholder="Paste image URL" value={urlInput} onChange={(e) => setUrlInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleAddUrl()} autoFocus style={{ flex: 1, padding: '3px 6px', fontSize: '0.75rem', borderRadius: 4, border: '1px solid var(--border-default)', background: 'transparent', color: 'var(--text-primary)' }} />
          <button className="btn btn-primary btn-sm" onClick={handleAddUrl}>Add</button>
        </div>
      )}
    </div>
  );
}


--- FILE: src/components/fields/SelectField.tsx ---
'use client';

import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown } from 'lucide-react';

interface SelectFieldProps {
  value: string;
  options: { label: string; value: string; color?: string }[];
  placeholder?: string;
  onChange: (value: string) => void;
}

export default function SelectField({ value, options, placeholder = 'Select', onChange }: SelectFieldProps) {
  const [open, setOpen] = useState(false);
  const [coords, setCoords] = useState({ top: 0, left: 0, width: 0 });
  const ref = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        ref.current && !ref.current.contains(e.target as Node) &&
        (!menuRef.current || !menuRef.current.contains(e.target as Node))
      ) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleToggle = () => {
    if (!open && ref.current) {
      const rect = ref.current.getBoundingClientRect();
      setCoords({
        top: rect.bottom + window.scrollY + 4,
        left: rect.left + window.scrollX,
        width: rect.width
      });
    }
    setOpen(!open);
  };

  const selected = options.find((o) => o.value === value);

  return (
    <div style={{ position: 'relative', width: '100%' }} ref={ref}>
      <button onClick={handleToggle} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', padding: '4px 8px', background: 'transparent', border: 'none', fontSize: '0.8125rem', cursor: 'pointer', borderRadius: 4, transition: 'background 0.15s ease', color: selected?.color || (selected ? 'var(--text-primary)' : 'var(--text-tertiary)'), fontWeight: selected ? 500 : 400 }}>
        <span>{selected?.label || placeholder}</span>
        <ChevronDown size={12} style={{ color: 'var(--text-tertiary)', transition: 'transform 0.2s ease', transform: open ? 'rotate(180deg)' : 'rotate(0)', flexShrink: 0 }} />
      </button>
      {open && typeof document !== 'undefined' && createPortal(
        <div ref={menuRef} style={{ position: 'absolute', top: coords.top, left: coords.left, width: coords.width, minWidth: 130, background: 'var(--surface-elevated)', border: '1px solid var(--border-default)', borderRadius: 8, boxShadow: 'var(--shadow-md)', padding: 4, zIndex: 9999, animation: 'scaleIn 0.15s ease-out', transformOrigin: 'top center' }}>
          {options.map((opt) => (
            <button key={opt.value} onClick={() => { onChange(opt.value); setOpen(false); }} style={{ display: 'block', width: '100%', padding: '6px 10px', textAlign: 'left', fontSize: '0.8125rem', color: opt.color || 'var(--text-secondary)', borderRadius: 4, cursor: 'pointer', border: 'none', background: opt.value === value ? 'var(--accent-light)' : 'transparent', fontWeight: 500, transition: 'all 0.1s ease' }}>{opt.label}</button>
          ))}
        </div>,
        document.body
      )}
    </div>
  );
}


--- FILE: src/components/journal/AddColumnModal.tsx ---
'use client';

import { useState } from 'react';
import { X } from 'lucide-react';
import { CustomColumn } from '@/types';

interface AddColumnModalProps {
  onAdd: (column: CustomColumn) => void;
  onClose: () => void;
}

export default function AddColumnModal({ onAdd, onClose }: AddColumnModalProps) {
  const [name, setName] = useState('');
  const [type, setType] = useState<'text' | 'number' | 'dropdown'>('text');

  const handleSubmit = () => {
    if (!name.trim()) return;
    const key = `custom_${name.trim().toLowerCase().replace(/\s+/g, '_')}_${Date.now()}`;
    const column: CustomColumn = { key, name: name.trim(), type, ...(type === 'dropdown' ? { options: [] } : {}) };
    onAdd(column);
  };

  const inputStyle: React.CSSProperties = { padding: '8px 12px', fontSize: '0.875rem', borderRadius: 8, background: 'var(--bg-tertiary)', border: '1px solid var(--border-default)', color: 'var(--text-primary)', width: '100%' };

  return (
    <div onClick={(e) => e.target === e.currentTarget && onClose()} style={{ position: 'fixed', inset: 0, background: 'var(--surface-overlay)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 500, animation: 'fadeIn 0.15s ease-out' }}>
      <div style={{ background: 'var(--surface-card)', border: '1px solid var(--border-default)', borderRadius: 16, boxShadow: 'var(--shadow-xl)', width: '100%', maxWidth: 420, animation: 'scaleIn 0.2s ease-out' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 24px 0' }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-primary)' }}>Add Custom Column</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', display: 'flex' }}><X size={18} /></button>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, padding: '20px 24px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <label style={{ fontSize: '0.8125rem', fontWeight: 500, color: 'var(--text-secondary)' }}>Column Name</label>
            <input style={inputStyle} placeholder="e.g., Timeframe" value={name} onChange={(e) => setName(e.target.value)} autoFocus />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <label style={{ fontSize: '0.8125rem', fontWeight: 500, color: 'var(--text-secondary)' }}>Type</label>
            <select style={inputStyle} value={type} onChange={(e) => setType(e.target.value as any)}>
              <option value="text">Text</option>
              <option value="number">Number</option>
              <option value="dropdown">Dropdown</option>
            </select>
          </div>
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, padding: '0 24px 20px' }}>
          <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={handleSubmit} disabled={!name.trim()}>Add Column</button>
        </div>
      </div>
    </div>
  );
}


--- FILE: src/components/journal/DeleteColumnModal.tsx ---
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


--- FILE: src/components/journal/NewTradePanel.tsx ---
'use client';

import { useState, useEffect } from 'react';
import { X, GripVertical, Settings2, RotateCcw, Check, Columns3 } from 'lucide-react';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
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
          date: '', day: '', pair: '', direction: '', outcome: '',
          reward: null, commission: null, entryModel: '', images: [], remarks: '', customFields: {}
        }
  );
  // showDatePicker removed
  const [showAddColumn, setShowAddColumn] = useState(false);
  const [showDeleteColumn, setShowDeleteColumn] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [panelMounted, setPanelMounted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

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

    handleUpdate({ outcome: newOutcome, reward: updatedReward });
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

  const sectionContents: Record<string, React.ReactNode> = {
    date: isVisible('date') ? (
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <div style={{ position: 'relative' }}>
          <label style={labelStyle}>Date</label>
          <DatePickerField 
            value={trade.date || ''} 
            onChange={(date, day) => handleUpdate({ date, day })} 
            placeholder="Pick date" 
          />
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
              <SelectField value={trade.direction || ''} options={directionOptions} placeholder="Direction" onChange={(v) => handleUpdate({ direction: v })} />
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
              activeOrder.map((key) => (
                <div key={key}>
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
            <button className="btn btn-secondary" style={{ flex: 1, padding: '12px 16px' }} onClick={onClose} disabled={isSubmitting}>Cancel</button>
            <button className="btn btn-primary" style={{ flex: 1, padding: '12px 16px' }} onClick={handleSaveClick} disabled={isSubmitting}>
              {isEditing ? (isSubmitting ? 'Saving...' : 'Save Changes') : (isSubmitting ? 'Saving...' : 'Save Trade')}
            </button>
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


--- FILE: src/components/journal/TradeGrid.tsx ---
'use client';

import { useState, useEffect, useRef } from 'react';
import { Settings2, Filter, EyeOff, LayoutGrid } from 'lucide-react';
import ConfirmModal from '@/components/ui/ConfirmModal';
import { useTrades } from '@/hooks/useTrades';
import { DEFAULT_COLUMNS } from '@/lib/constants';
import { Trade, CustomColumn, CustomPair, ColumnDef } from '@/types';
import TradeRow from './TradeRow';
import EmptyState from '@/components/layout/EmptyState';
import { Pencil, Check, RotateCcw } from 'lucide-react';

interface TradeGridProps {
  customColumns: CustomColumn[];
  hiddenColumns: Set<string>;
  sectionOrder: string[];
  onEditTrade: (trade: Trade) => void;
}

export default function TradeGrid({ customColumns, hiddenColumns, sectionOrder, onEditTrade }: TradeGridProps) {
  const { trades, loading, deleteTrade } = useTrades();
  const [removingIds, setRemovingIds] = useState<Set<string>>(new Set());
  const [confirmDeleteTrade, setConfirmDeleteTrade] = useState<string | null>(null);

  const [isEditMode, setIsEditMode] = useState(false);
  const [colWidths, setColWidths] = useState<Record<string, number>>({});
  const [resizingCol, setResizingCol] = useState<string | null>(null);
  
  const resizeState = useRef({ startX: 0, startWidth: 0, colKey: '' });

  useEffect(() => {
    const saved = localStorage.getItem('tradeGridColWidths');
    if (saved) {
      try { /* eslint-disable-next-line react-hooks/set-state-in-effect */
        setColWidths(JSON.parse(saved)); } catch (e) { console.error(e); }
    }
  }, []);

  const handleResizeStart = (e: React.MouseEvent | React.TouchEvent, colKey: string, currentWidth: string) => {
    e.preventDefault();
    setResizingCol(colKey);
    const clientX = 'touches' in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX;
    const widthNum = colWidths[colKey] || parseInt(currentWidth.replace('px', '') || '100');
    resizeState.current = { startX: clientX, startWidth: widthNum, colKey };
  };

  useEffect(() => {
    if (!resizingCol) return;

    const handleMove = (e: MouseEvent | TouchEvent) => {
      const clientX = 'touches' in e ? (e as TouchEvent).touches[0].clientX : (e as MouseEvent).clientX;
      const { startX, startWidth, colKey } = resizeState.current;
      const delta = clientX - startX;
      let newWidth = startWidth + delta;
      if (newWidth < 50) newWidth = 50;
      
      setColWidths(prev => ({ ...prev, [colKey]: newWidth }));
    };

    const handleUp = () => {
      setResizingCol(null);
    };

    document.addEventListener('mousemove', handleMove);
    document.addEventListener('mouseup', handleUp);
    document.addEventListener('touchmove', handleMove, { passive: false });
    document.addEventListener('touchend', handleUp);

    return () => {
      document.removeEventListener('mousemove', handleMove);
      document.removeEventListener('mouseup', handleUp);
      document.removeEventListener('touchmove', handleMove);
      document.removeEventListener('touchend', handleUp);
    };
  }, [resizingCol]);

  const toggleEditMode = () => {
    if (isEditMode) {
      localStorage.setItem('tradeGridColWidths', JSON.stringify(colWidths));
    }
    setIsEditMode(!isEditMode);
  };

  const handleResetWidths = () => {
    setColWidths({});
    localStorage.removeItem('tradeGridColWidths');
  };

  // Map NewTradePanel section keys to TradeGrid column keys
  const SECTION_TO_COLUMNS: Record<string, string[]> = {
    date: ['date', 'day'],
    pair: ['pair'],
    directionOutcome: ['direction', 'outcome'],
    financials: ['reward', 'commission'],
    entryModel: ['entryModel'],
    images: ['images'],
    remarks: ['remarks'],
    // customColumns is handled dynamically below
  };

  const orderedColKeys = sectionOrder.flatMap(section => 
    section === 'customColumns' 
      ? customColumns.map(c => c.key)
      : (SECTION_TO_COLUMNS[section] || [section])
  );

  const baseColumns: ColumnDef[] = [
    ...DEFAULT_COLUMNS,
    ...customColumns.map((cc) => ({ key: cc.key, label: cc.name, type: cc.type as ColumnDef['type'], width: '140px', options: cc.options })),
  ].filter((col) => !hiddenColumns.has(col.key));

  const allColumns: ColumnDef[] = baseColumns
    .sort((a, b) => {
      if (a.key === 'tradeNumber') return -1;
      if (b.key === 'tradeNumber') return 1;

      const indexA = orderedColKeys.indexOf(a.key);
      const indexB = orderedColKeys.indexOf(b.key);
      
      // If both are missing from orderedColKeys, keep original order
      if (indexA === -1 && indexB === -1) return 0;
      // If a is missing, push it to the end
      if (indexA === -1) return 1;
      // If b is missing, push it to the end
      if (indexB === -1) return -1;
      
      return indexA - indexB;
    })
    .map((col) => ({
      ...col,
      width: colWidths[col.key] ? `${colWidths[col.key]}px` : col.width
    }));

  const handleDeleteRow = async (tradeId: string) => {
    setRemovingIds((prev) => new Set(prev).add(tradeId));
    setTimeout(async () => {
      await deleteTrade(tradeId);
      setRemovingIds((prev) => { const next = new Set(prev); next.delete(tradeId); return next; });
    }, 200);
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: '16px 0' }}>
        {[...Array(5)].map((_, i) => (<div key={i} className="skeleton" style={{ height: 44, borderRadius: 6, opacity: 0, animation: `staggerFadeIn 300ms var(--ease-out) ${i * 60}ms forwards` }} />))}
      </div>
    );
  }

  const headerCellStyle: React.CSSProperties = { padding: '10px 12px', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.3px', borderRight: '1px solid var(--grid-border)', userSelect: 'none', position: 'relative' };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h3 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-primary)' }}>Trades</h3>
        <div style={{ display: 'flex', gap: 8 }}>
          {isEditMode && (
            <button className="btn btn-secondary btn-sm" onClick={handleResetWidths}>
              <RotateCcw size={14} /><span>Reset</span>
            </button>
          )}
          <button
            className="btn btn-secondary btn-sm"
            style={{ background: isEditMode ? 'var(--primary-color)' : '', color: isEditMode ? '#fff' : '', borderColor: isEditMode ? 'var(--primary-color)' : '' }}
            onClick={toggleEditMode}
          >
            {isEditMode ? <><Check size={14} /><span>Done</span></> : <><Pencil size={14} /><span>Edit</span></>}
          </button>
        </div>
      </div>

      {trades.length === 0 ? <EmptyState /> : (
        <div style={{ overflowX: 'auto', border: '1px solid var(--grid-border)', borderRadius: 10, background: 'var(--surface-card)' }}>
          <div style={{ minWidth: 'max-content' }}>
            <div style={{ display: 'flex', alignItems: 'center', background: 'var(--grid-header-bg)', borderBottom: '1px solid var(--grid-border)', position: 'sticky', top: 0, zIndex: 10 }}>
              <div style={{ width: 40, minWidth: 40, padding: '10px 8px', textAlign: 'center', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-tertiary)' }}>#</div>
              {allColumns.map((col) => (
                <div
                  key={col.key}
                  style={{ ...headerCellStyle, width: col.width, minWidth: col.width, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}
                >
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{col.label}</span>
                  {isEditMode && (
                    <div
                      onMouseDown={(e) => handleResizeStart(e, col.key, col.width as string)}
                      onTouchStart={(e) => handleResizeStart(e, col.key, col.width as string)}
                      style={{
                        position: 'absolute',
                        right: 0,
                        top: 0,
                        bottom: 0,
                        width: 10,
                        cursor: 'col-resize',
                        background: resizingCol === col.key ? 'var(--primary-color)' : 'var(--grid-border)',
                        opacity: resizingCol === col.key ? 1 : 0.3,
                        zIndex: 100,
                        transform: 'translateX(5px)',
                      }}
                      onMouseEnter={(e) => { if (!resizingCol) e.currentTarget.style.opacity = '0.8'; }}
                      onMouseLeave={(e) => { if (!resizingCol) e.currentTarget.style.opacity = '0.3'; }}
                    />
                  )}
                </div>
              ))}
              <div style={{ width: 70, minWidth: 70, padding: '10px 8px', textAlign: 'center', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-tertiary)', position: 'sticky', right: 0, background: 'var(--grid-header-bg)', borderLeft: '1px solid var(--grid-border)', zIndex: 11 }}>Actions</div>
            </div>
            {trades.map((trade, index) => (
              <TradeRow
                key={trade.id}
                trade={trade}
                index={index}
                columns={allColumns}
                onEdit={() => onEditTrade(trade)}
                onDelete={() => setConfirmDeleteTrade(trade.id)}
                removing={removingIds.has(trade.id)}
              />
            ))}
          </div>
        </div>
      )}

      {/* Delete trade confirmation */}
      {confirmDeleteTrade && (
        <ConfirmModal
          title="Delete Trade?"
          onConfirm={() => { handleDeleteRow(confirmDeleteTrade); setConfirmDeleteTrade(null); }}
          onCancel={() => setConfirmDeleteTrade(null)}
        />
      )}
    </div>
  );
}


--- FILE: src/components/journal/TradeRow.tsx ---
'use client';

import { useState } from 'react';
import { Trash2, Pencil } from 'lucide-react';
import { Trade, ColumnDef, CustomPair } from '@/types';

interface TradeRowProps {
  trade: Trade;
  index: number;
  columns: ColumnDef[];
  onEdit: () => void;
  onDelete: () => void;
  removing: boolean;
}

export default function TradeRow({ trade, index, columns, onEdit, onDelete, removing }: TradeRowProps) {
  const [hovered, setHovered] = useState(false);

  const cellStyle: React.CSSProperties = {
    display: 'flex', alignItems: 'center', borderRight: '1px solid var(--grid-border)', minHeight: 44,
    padding: '4px 10px', fontSize: '0.8125rem', color: 'var(--text-primary)',
  };

  // Cap stagger at 10 rows to avoid long waits on large datasets
  const staggerDelay = Math.min(index, 10) * 30;

  const renderCellValue = (col: ColumnDef) => {
    switch (col.key) {
      case 'tradeNumber': return <span style={{ fontWeight: 500 }}>{index + 1}</span>;
      case 'date': return trade.date || '—';
      case 'day': return trade.day || '—';
      case 'pair': return trade.pair || '—';
      case 'direction':
        return (
          <span style={{ color: trade.direction === 'Long' ? 'var(--success-text)' : trade.direction === 'Short' ? 'var(--danger-text)' : 'var(--text-tertiary)', fontWeight: 500 }}>
            {trade.direction || '—'}
          </span>
        );
      case 'outcome':
        return (
          <span style={{ color: trade.outcome === 'Profit' ? 'var(--success-text)' : trade.outcome === 'Loss' ? 'var(--danger-text)' : 'var(--text-tertiary)', fontWeight: 500 }}>
            {trade.outcome || '—'}
          </span>
        );
      case 'reward':
        return trade.reward !== null && trade.reward !== undefined
          ? <span style={{ color: trade.reward >= 0 ? 'var(--success-text)' : 'var(--danger-text)', fontWeight: 500 }}>${trade.reward}</span>
          : <span style={{ color: 'var(--text-tertiary)' }}>—</span>;
      case 'commission':
        return trade.commission !== null && trade.commission !== undefined
          ? <span style={{ color: 'var(--danger-text)', fontWeight: 500 }}>-${Math.abs(trade.commission)}</span>
          : <span style={{ color: 'var(--text-tertiary)' }}>—</span>;
      case 'entryModel': return trade.entryModel || '—';
      case 'images': {
        const imgs = trade.images || [];
        if (imgs.length === 0) return <span style={{ color: 'var(--text-tertiary)' }}>—</span>;
        return (
          <div style={{ display: 'flex', gap: 4 }}>
            {imgs.map((img, i) => (
              <a key={i} href={img.url} target="_blank" rel="noopener noreferrer" style={{ width: 28, height: 28, borderRadius: 4, overflow: 'hidden', border: '1px solid var(--border-default)', display: 'block', flexShrink: 0 }}>
                <img src={img.url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              </a>
            ))}
          </div>
        );
      }
      case 'remarks':
        return trade.remarks
          ? <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '100%', display: 'block' }} title={trade.remarks}>{trade.remarks}</span>
          : <span style={{ color: 'var(--text-tertiary)' }}>—</span>;
      default: {
        // Custom fields
        const val = trade.customFields?.[col.key];
        return val || <span style={{ color: 'var(--text-tertiary)' }}>—</span>;
      }
    }
  };

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: 'flex', alignItems: 'stretch', borderBottom: '1px solid var(--grid-border)',
        transition: 'background-color 150ms ease, opacity 200ms var(--ease-out), transform 200ms var(--ease-out)',
        opacity: removing ? 0 : undefined,
        transform: removing ? 'translateX(-20px)' : 'none',
        animation: `rowInsert 250ms var(--ease-out) ${staggerDelay}ms both`,
        background: hovered ? 'var(--grid-row-hover)' : (index % 2 === 1 ? 'var(--grid-row-alt)' : 'transparent'),
      }}
    >
      {/* Row number */}
      <div style={{ width: 40, minWidth: 40, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', fontWeight: 500, color: 'var(--text-tertiary)', borderRight: '1px solid var(--grid-border)' }}>
        {index + 1}
      </div>

      {/* Data cells (read-only) */}
      {columns.map((col) => (
        <div key={col.key} style={{ ...cellStyle, width: col.width, minWidth: col.width }}>
          {renderCellValue(col)}
        </div>
      ))}

      {/* Actions */}
      <div style={{ width: 70, minWidth: 70, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4, position: 'sticky', right: 0, background: hovered ? 'var(--grid-row-hover)' : (index % 2 === 1 ? 'var(--grid-row-alt)' : 'var(--surface-card)'), borderLeft: '1px solid var(--grid-border)', zIndex: 1 }}>
          <button onClick={onEdit} title="Edit trade" style={{ opacity: hovered ? 1 : 0, color: 'var(--accent-text)', padding: 4, borderRadius: 4, cursor: 'pointer', background: 'none', border: 'none', transition: 'opacity 150ms ease, transform 160ms var(--ease-out)', display: 'flex' }}>
            <Pencil size={14} />
          </button>
          <button onClick={onDelete} title="Delete trade" style={{ opacity: hovered ? 1 : 0, color: 'var(--text-tertiary)', padding: 4, borderRadius: 4, cursor: 'pointer', background: 'none', border: 'none', transition: 'opacity 150ms ease, transform 160ms var(--ease-out)', display: 'flex' }}>
            <Trash2 size={14} />
          </button>
      </div>
    </div>
  );
}


--- FILE: src/components/layout/EmptyState.tsx ---
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


--- FILE: src/components/layout/Header.tsx ---
'use client';

import { useState } from 'react';
import { BarChart3, Download, LogOut } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import ThemeToggle from '@/components/ui/ThemeToggle';
import ReportModal from '@/components/reports/ReportModal';

export default function Header() {
  const { user, signOut } = useAuth();
  const [showReportModal, setShowReportModal] = useState(false);

  return (
    <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 24px', background: 'var(--surface-card)', borderBottom: '1px solid var(--border-default)', position: 'sticky', top: 0, zIndex: 100, backdropFilter: 'blur(12px)', transition: 'background-color 250ms ease' }}>
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
            {(user.user_metadata?.avatar_url || user.user_metadata?.picture) && (
              <img src={user.user_metadata?.avatar_url || user.user_metadata?.picture} alt={user.user_metadata?.full_name || 'User'} referrerPolicy="no-referrer" style={{ width: 32, height: 32, borderRadius: '50%', border: '2px solid var(--border-default)' }} />
            )}
            <span style={{ fontSize: '0.875rem', fontWeight: 500, color: 'var(--text-secondary)' }}>{user.user_metadata?.full_name || user.email?.split('@')[0]}</span>
            <button onClick={signOut} title="Sign out" style={{ padding: 6, borderRadius: 6, color: 'var(--text-tertiary)', cursor: 'pointer', background: 'none', border: 'none', display: 'flex', transition: 'transform 160ms var(--ease-out), color 200ms ease' }}>
              <LogOut size={16} />
            </button>
          </div>
        )}
        <button
          onClick={() => setShowReportModal(true)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            padding: '7px 14px',
            fontSize: '0.8125rem',
            fontWeight: 600,
            borderRadius: 8,
            border: '1px solid var(--accent)',
            background: 'var(--accent)',
            color: '#ffffff',
            cursor: 'pointer',
            transition: 'transform 160ms var(--ease-out), background-color 200ms ease, box-shadow 200ms ease',
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
          }}
        >
          <Download size={15} />
          <span>Download Report</span>
        </button>
      </div>

      {showReportModal && <ReportModal onClose={() => setShowReportModal(false)} />}
    </header>
  );
}


--- FILE: src/components/overview/MonthlyOverview.tsx ---
'use client';

import { useMemo } from 'react';
import { Trade } from '@/types';
import { MONTHS } from '@/lib/constants';

interface MonthlyOverviewProps {
  trades: Trade[];
  year: number;
  month: number;
}

export default function MonthlyOverview({ trades, year, month }: MonthlyOverviewProps) {
  const stats = useMemo(() => {
    const totalPnL = trades.reduce((sum, t) => sum + (t.reward || 0), 0);
    const totalCommission = trades.reduce((sum, t) => sum + (t.commission || 0), 0);
    const netPnL = totalPnL + totalCommission;
    const tradeCount = trades.length;
    const wins = trades.filter((t) => t.outcome === 'Profit').length;
    const winRate = tradeCount > 0 ? Math.round((wins / tradeCount) * 100) : 0;
    return { totalPnL, totalCommission, netPnL, tradeCount, winRate };
  }, [trades]);

  if (trades.length === 0) return null;

  const cards = [
    { label: 'Total P&L', value: `$${stats.totalPnL.toFixed(2)}`, color: stats.totalPnL >= 0 ? 'var(--success-text)' : 'var(--danger-text)' },
    { label: 'Commission', value: `$${Math.abs(stats.totalCommission).toFixed(2)}`, color: 'var(--danger-text)' },
    { label: 'Net P&L', value: `$${stats.netPnL.toFixed(2)}`, color: stats.netPnL >= 0 ? 'var(--success-text)' : 'var(--danger-text)' },
    { label: 'Trades', value: String(stats.tradeCount), color: 'var(--text-primary)' },
    { label: 'Win Rate', value: `${stats.winRate}%`, color: stats.winRate >= 50 ? 'var(--success-text)' : 'var(--danger-text)' },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <h3 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-primary)', opacity: 0, animation: 'staggerFadeIn 300ms var(--ease-out) forwards' }}>{MONTHS[month - 1]} {year} Overview</h3>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 12 }}>
        {cards.map((card, index) => (
          <div
            key={card.label}
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 4,
              padding: 16,
              background: 'var(--surface-card)',
              border: '1px solid var(--border-default)',
              borderRadius: 10,
              transition: 'transform 200ms var(--ease-out), box-shadow 200ms var(--ease-out)',
              cursor: 'default',
              opacity: 0,
              animation: `staggerFadeIn 300ms var(--ease-out) ${(index + 1) * 50}ms forwards`,
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-2px)';
              e.currentTarget.style.boxShadow = 'var(--shadow-md)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = 'none';
            }}
          >
            <span style={{ fontSize: '0.75rem', fontWeight: 500, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{card.label}</span>
            <span style={{ fontSize: '1.25rem', fontWeight: 700, color: card.color }}>{card.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}


--- FILE: src/components/overview/MonthYearSelector.tsx ---
'use client';

import { useState, useRef, useEffect } from 'react';
import { ChevronDown } from 'lucide-react';
import { MONTHS } from '@/lib/constants';

interface MonthYearSelectorProps {
  year: number;
  month: number;
  onYearChange: (year: number) => void;
  onMonthChange: (month: number) => void;
}

export default function MonthYearSelector({ year, month, onYearChange, onMonthChange }: MonthYearSelectorProps) {
  const [monthOpen, setMonthOpen] = useState(false);
  const monthRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (monthRef.current && !monthRef.current.contains(e.target as Node)) setMonthOpen(false);
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const arrowBtnStyle: React.CSSProperties = {
    width: 28,
    height: 28,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 6,
    fontSize: '1.125rem',
    color: 'var(--text-secondary)',
    cursor: 'pointer',
    background: 'none',
    border: 'none',
    transition: 'transform 160ms var(--ease-out), background-color 150ms ease',
  };

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 4, background: 'var(--bg-tertiary)', border: '1px solid var(--border-default)', borderRadius: 8, padding: 4 }}>
        <button onClick={() => onYearChange(year - 1)} style={arrowBtnStyle}>‹</button>
        <span style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-primary)', minWidth: 44, textAlign: 'center' }}>{year}</span>
        <button onClick={() => onYearChange(year + 1)} style={arrowBtnStyle}>›</button>
      </div>

      <div style={{ position: 'relative' }} ref={monthRef}>
        <button onClick={() => setMonthOpen(!monthOpen)} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 14px', background: 'var(--bg-tertiary)', border: '1px solid var(--border-default)', borderRadius: 8, fontSize: '0.875rem', fontWeight: 500, color: 'var(--text-primary)', cursor: 'pointer', transition: 'transform 160ms var(--ease-out), background-color 150ms ease, border-color 150ms ease' }}>
          <span>{MONTHS[month - 1]}</span>
          <ChevronDown size={14} style={{ transition: 'transform 200ms var(--ease-out)', transform: monthOpen ? 'rotate(180deg)' : 'rotate(0)' }} />
        </button>
        {monthOpen && (
          <div style={{ position: 'absolute', top: 'calc(100% + 6px)', left: 0, background: 'var(--surface-elevated)', border: '1px solid var(--border-default)', borderRadius: 10, boxShadow: 'var(--shadow-lg)', padding: 4, display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 2, minWidth: 240, zIndex: 200, transformOrigin: 'top left', animation: 'slideDown 200ms var(--ease-out)' }}>
            {MONTHS.map((name, i) => (
              <button key={name} onClick={() => { onMonthChange(i + 1); setMonthOpen(false); }} style={{ padding: '8px 12px', borderRadius: 6, fontSize: '0.8125rem', fontWeight: i + 1 === month ? 600 : 400, color: i + 1 === month ? 'var(--accent-text)' : 'var(--text-secondary)', background: i + 1 === month ? 'var(--accent-light)' : 'transparent', textAlign: 'center', cursor: 'pointer', border: 'none', transition: 'transform 160ms var(--ease-out), background-color 150ms ease, color 150ms ease' }}>{name}</button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}


--- FILE: src/components/overview/PnLChart.tsx ---
'use client';

import { useMemo } from 'react';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';
import { Trade } from '@/types';
import { useTheme } from '@/hooks/useTheme';

interface PnLChartProps {
  trades: Trade[];
}

export default function PnLChart({ trades }: PnLChartProps) {
  const { theme } = useTheme();

  const chartData = useMemo(() => {
    
    return trades
      .filter((t) => t.reward !== null && t.reward !== undefined)
      .map((t, i) => {
        const reward = t.reward || 0;
        cumulative += reward;
        return { name: t.date || `Trade ${i + 1}`, reward, cumulative, pair: t.pair };
      });
  }, [trades]);

  if (chartData.length === 0) return null;

  const finalCumulative = chartData[chartData.length - 1]?.cumulative || 0;
  const isPositive = finalCumulative >= 0;

  const lineColor = isPositive
    ? (theme === 'dark' ? '#34d399' : '#10b981')
    : (theme === 'dark' ? '#f87171' : '#ef4444');
  const gradientId = 'pnlGradient';
  const textColor = theme === 'dark' ? '#71717a' : '#94a3b8';
  const gridColor = theme === 'dark' ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)';
  const tooltipBg = theme === 'dark' ? '#18181b' : '#ffffff';
  const tooltipBorder = theme === 'dark' ? '#27272a' : '#e2e8f0';

  return (
    <div style={{ background: 'var(--surface-card)', border: '1px solid var(--border-default)', borderRadius: 12, padding: '20px 20px 12px', opacity: 0, animation: 'staggerFadeIn 400ms var(--ease-out) 200ms forwards' }}>
      <h3 style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 16 }}>Cumulative P&L</h3>
      <ResponsiveContainer width="100%" height={260}>
        <AreaChart data={chartData} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={lineColor} stopOpacity={0.3} />
              <stop offset="95%" stopColor={lineColor} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke={gridColor} vertical={false} />
          <XAxis
            dataKey="name"
            tick={{ fill: textColor, fontSize: 11 }}
            tickLine={false}
            axisLine={{ stroke: gridColor }}
          />
          <YAxis
            tick={{ fill: textColor, fontSize: 11 }}
            tickLine={false}
            axisLine={false}
            tickFormatter={(v: number) => `$${v}`}
          />
          <Tooltip
            contentStyle={{
              background: tooltipBg,
              border: `1px solid ${tooltipBorder}`,
              borderRadius: '10px',
              fontSize: '12px',
              boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
              padding: '10px 14px',
            }}
            labelStyle={{ fontWeight: 600, marginBottom: 4, color: theme === 'dark' ? '#fafafa' : '#0f1729' }}
            formatter={(value: any, name: any) => {
              const label = name === 'cumulative' ? 'Cumulative P&L' : name;
              return [`$${Number(value).toFixed(2)}`, label];
            }}
            cursor={{ stroke: lineColor, strokeWidth: 1, strokeDasharray: '4 4' }}
          />
          <Area
            type="monotone"
            dataKey="cumulative"
            name="cumulative"
            stroke={lineColor}
            strokeWidth={2.5}
            fill={`url(#${gradientId})`}
            dot={false}
            activeDot={{ r: 5, fill: lineColor, stroke: theme === 'dark' ? '#18181b' : '#ffffff', strokeWidth: 2 }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}


--- FILE: src/components/reports/ReportModal.tsx ---
'use client';

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Download, Calendar, FileText, Loader2 } from 'lucide-react';
import { MONTHS } from '@/lib/constants';
import { useAuth } from '@/hooks/useAuth';
import { fetchTrades, fetchTradesForDateRange, fetchAvailableYears, getUserProfile } from '@/lib/database';
import { generateReportPDF } from '@/lib/reportGenerator';
import DatePickerField from '@/components/fields/DatePickerField';

interface ReportModalProps {
  onClose: () => void;
}

export default function ReportModal({ onClose }: ReportModalProps) {
  const { user } = useAuth();
  const now = new Date();

  const [mounted, setMounted] = useState(false);
  const [activeTab, setActiveTab] = useState<'monthly' | 'custom'>('monthly');

  useEffect(() => {
    /* eslint-disable-next-line react-hooks/set-state-in-effect */
    setMounted(true);
  }, []);

  // Monthly tab state
  const [selectedMonth, setSelectedMonth] = useState<number>(now.getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState<number>(now.getFullYear());
  const [availableYears, setAvailableYears] = useState<number[]>([now.getFullYear()]);

  // Custom range tab state
  const firstDayOfMonthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
  const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

  const [startDate, setStartDate] = useState<string>(firstDayOfMonthStr);
  const [endDate, setEndDate] = useState<string>(todayStr);

  // Date picker state removed

  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Fetch available years from Firestore/Supabase
  useEffect(() => {
    if (!user) return;
    fetchAvailableYears(user.id).then((years) => {
      if (years && years.length > 0) {
        setAvailableYears(years);
        if (!years.includes(selectedYear)) {
          setSelectedYear(years[0]);
        }
      }
    });
  }, [user]);

  const handleDownloadMonthly = async () => {
    if (!user) return;
    setIsGenerating(true);
    setErrorMsg(null);
    try {
      const trades = await fetchTrades(user.id, selectedYear, selectedMonth);
      const profile = await getUserProfile(user.id);
      const userName = profile?.displayName || user.user_metadata?.full_name || user.email?.split('@')[0] || 'Unknown';
      const monthName = MONTHS[selectedMonth - 1];

      generateReportPDF({
        title: `Monthly Trading Report - ${monthName} ${selectedYear}`,
        subtitle: `Period: ${monthName} ${selectedYear}`,
        filename: `TradeLog_Report_${selectedYear}_${String(selectedMonth).padStart(2, '0')}.pdf`,
        userName,
        trades,
      });

      onClose();
    } catch (err: any) {
      console.error('Error generating monthly report:', err);
      setErrorMsg('Failed to generate report. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDownloadCustom = async () => {
    if (!user) return;
    if (!startDate || !endDate) {
      setErrorMsg('Please select both Start Date and End Date.');
      return;
    }
    if (startDate > endDate) {
      setErrorMsg('Start Date must be before or equal to End Date.');
      return;
    }

    setIsGenerating(true);
    setErrorMsg(null);
    try {
      const trades = await fetchTradesForDateRange(user.id, startDate, endDate);
      const profile = await getUserProfile(user.id);
      const userName = profile?.displayName || user.user_metadata?.full_name || user.email?.split('@')[0] || 'Unknown';

      generateReportPDF({
        title: `Trading Report (${startDate} to ${endDate})`,
        subtitle: `Period: ${startDate} to ${endDate}`,
        filename: `TradeLog_Report_${startDate}_to_${endDate}.pdf`,
        userName,
        trades,
      });

      onClose();
    } catch (err: any) {
      console.error('Error generating custom report:', err);
      setErrorMsg('Failed to generate report. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  const selectStyle: React.CSSProperties = {
    width: '100%',
    padding: '10px 14px',
    borderRadius: 8,
    border: '1px solid var(--border-default)',
    background: 'var(--bg-tertiary)',
    fontSize: '0.875rem',
    fontWeight: 500,
    color: 'var(--text-primary)',
    outline: 'none',
    cursor: 'pointer',
  };

  
  const labelStyle: React.CSSProperties = {
    fontSize: '0.75rem',
    fontWeight: 600,
    color: 'var(--text-tertiary)',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
    marginBottom: 6,
    display: 'block',
  };

  if (!mounted) return null;

  return createPortal(
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        width: '100vw',
        height: '100vh',
        background: 'var(--surface-overlay)',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
        opacity: mounted ? 1 : 0,
        transition: 'opacity 250ms var(--ease-out)',
      }}
    >
      {/* Modal Card */}
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '100%',
          maxWidth: 480,
          maxHeight: '90vh',
          background: 'var(--surface-elevated)',
          border: '1px solid var(--border-default)',
          borderRadius: 16,
          boxShadow: 'var(--shadow-lg)',
          display: 'flex',
          flexDirection: 'column',
          overflowY: 'auto',
          position: 'relative',
          opacity: mounted ? 1 : 0,
          transform: mounted ? 'scale(1)' : 'scale(0.96)',
          transition: 'opacity 250ms var(--ease-out), transform 250ms var(--ease-out)',
        }}
      >
        {/* Modal Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '20px 24px',
            borderBottom: '1px solid var(--border-default)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div
              style={{
                width: 34,
                height: 34,
                borderRadius: 8,
                background: 'var(--accent-light)',
                color: 'var(--accent-text)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <FileText size={18} />
            </div>
            <div>
              <h2 style={{ fontSize: '1.125rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                Download Report
              </h2>
              <p style={{ fontSize: '0.8125rem', color: 'var(--text-tertiary)', marginTop: 2 }}>
                Export trading performance & journal history
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'var(--bg-tertiary)',
              border: '1px solid var(--border-default)',
              borderRadius: 8,
              cursor: 'pointer',
              color: 'var(--text-secondary)',
              display: 'flex',
              padding: 6,
            }}
          >
            <X size={16} />
          </button>
        </div>

        {/* Modal Tab Switcher */}
        <div style={{ padding: '16px 24px 0 24px' }}>
          <div
            style={{
              display: 'flex',
              background: 'var(--bg-tertiary)',
              padding: 4,
              borderRadius: 10,
              border: '1px solid var(--border-default)',
            }}
          >
            <button
              onClick={() => setActiveTab('monthly')}
              style={{
                flex: 1,
                padding: '8px 12px',
                borderRadius: 7,
                fontSize: '0.8125rem',
                fontWeight: 600,
                border: 'none',
                cursor: 'pointer',
                transition: 'background-color 150ms ease, color 150ms ease, box-shadow 150ms ease',
                background: activeTab === 'monthly' ? 'var(--surface-card)' : 'transparent',
                color: activeTab === 'monthly' ? 'var(--text-primary)' : 'var(--text-tertiary)',
                boxShadow: activeTab === 'monthly' ? 'var(--shadow-sm)' : 'none',
              }}
            >
              Monthly Report
            </button>
            <button
              onClick={() => setActiveTab('custom')}
              style={{
                flex: 1,
                padding: '8px 12px',
                borderRadius: 7,
                fontSize: '0.8125rem',
                fontWeight: 600,
                border: 'none',
                cursor: 'pointer',
                transition: 'background-color 150ms ease, color 150ms ease, box-shadow 150ms ease',
                background: activeTab === 'custom' ? 'var(--surface-card)' : 'transparent',
                color: activeTab === 'custom' ? 'var(--text-primary)' : 'var(--text-tertiary)',
                boxShadow: activeTab === 'custom' ? 'var(--shadow-sm)' : 'none',
              }}
            >
              Custom Date Range
            </button>
          </div>
        </div>

        {/* Modal Content Body */}
        <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: 20 }}>
          {errorMsg && (
            <div
              style={{
                padding: '10px 14px',
                borderRadius: 8,
                background: 'rgba(239, 68, 68, 0.1)',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                color: 'var(--danger-text)',
                fontSize: '0.8125rem',
              }}
            >
              {errorMsg}
            </div>
          )}

          {activeTab === 'monthly' ? (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              {/* Month Dropdown */}
              <div>
                <label style={labelStyle}>Month</label>
                <select
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(Number(e.target.value))}
                  style={selectStyle}
                >
                  {MONTHS.map((name, index) => (
                    <option key={name} value={index + 1}>
                      {name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Year Dropdown (populated dynamically) */}
              <div>
                <label style={labelStyle}>Year</label>
                <select
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(Number(e.target.value))}
                  style={selectStyle}
                >
                  {availableYears.map((yr) => (
                    <option key={yr} value={yr}>
                      {yr}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              {/* Start Date Picker */}
              <div style={{ position: 'relative' }}>
                <label style={labelStyle}>Start Date</label>
                <DatePickerField
                  value={startDate}
                  onChange={(date) => setStartDate(date)}
                  showIcon={true}
                />
              </div>

              {/* End Date Picker */}
              <div style={{ position: 'relative' }}>
                <label style={labelStyle}>End Date</label>
                <DatePickerField
                  value={endDate}
                  onChange={(date) => setEndDate(date)}
                  showIcon={true}
                />
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div
          style={{
            padding: '16px 24px',
            borderTop: '1px solid var(--border-default)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'flex-end',
            gap: 12,
            background: 'var(--surface-elevated)',
          }}
        >
          <button className="btn btn-secondary" onClick={onClose} disabled={isGenerating}>
            Cancel
          </button>
          <button
            className="btn btn-primary"
            style={{ display: 'flex', alignItems: 'center', gap: 8 }}
            onClick={activeTab === 'monthly' ? handleDownloadMonthly : handleDownloadCustom}
            disabled={isGenerating}
          >
            {isGenerating ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                <span>Generating...</span>
              </>
            ) : (
              <>
                <Download size={16} />
                <span>Download</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}


--- FILE: src/components/ui/ConfirmModal.tsx ---
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


--- FILE: src/components/ui/ThemeToggle.tsx ---
'use client';

import { Sun, Moon } from 'lucide-react';
import { useTheme } from '@/hooks/useTheme';

export default function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();

  return (
    <button
      onClick={toggleTheme}
      aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
      style={{ width: 36, height: 36, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-tertiary)', border: '1px solid var(--border-default)', cursor: 'pointer', transition: 'transform 160ms var(--ease-out), background-color 200ms ease, border-color 200ms ease', color: 'var(--text-secondary)' }}
    >
      {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
    </button>
  );
}


--- FILE: src/hooks/useAuth.tsx ---
'use client';

import { useState, useEffect, useCallback, createContext, useContext, ReactNode } from 'react';
import { User } from '@supabase/supabase-js';
import { getSupabase } from '@/lib/supabase';
import { createOrUpdateUserProfile } from '@/lib/database';

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  signIn: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  loading: true,
  signIn: async () => {},
  signOut: async () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = getSupabase();
    
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setUser(session?.user ?? null);
      setLoading(false);

      // Create/update user profile in public.users on sign in
      if (session?.user) {
        const u = session.user;
        await createOrUpdateUserProfile(u.id, {
          uid: u.id,
          displayName: u.user_metadata?.full_name || u.email?.split('@')[0] || '',
          email: u.email || '',
          photoURL: u.user_metadata?.avatar_url || '',
        });
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const signIn = useCallback(async () => {
    const supabase = getSupabase();
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/dashboard`
      }
    });
  }, []);

  const signOut = useCallback(async () => {
    const supabase = getSupabase();
    await supabase.auth.signOut();
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}


--- FILE: src/hooks/useMonthYear.ts ---
'use client';

import { useState, useCallback } from 'react';
import { MonthYear } from '@/types';

export function useMonthYear() {
  const now = new Date();
  const [monthYear, setMonthYear] = useState<MonthYear>({
    year: now.getFullYear(),
    month: now.getMonth() + 1,
  });

  const setYear = useCallback((year: number) => {
    setMonthYear((prev) => ({ ...prev, year }));
  }, []);

  const setMonth = useCallback((month: number) => {
    setMonthYear((prev) => ({ ...prev, month }));
  }, []);

  return { ...monthYear, setYear, setMonth };
}


--- FILE: src/hooks/useTheme.tsx ---
'use client';

import { useState, useEffect, useCallback, createContext, useContext, ReactNode } from 'react';

type Theme = 'light' | 'dark';

interface ThemeContextValue {
  theme: Theme;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextValue>({
  theme: 'dark',
  toggleTheme: () => {},
});

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<Theme>('dark');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const saved = localStorage.getItem('tradelog-theme') as Theme | null;
    if (saved) {
      setTheme(saved);
      document.documentElement.setAttribute('data-theme', saved);
    } else {
      document.documentElement.setAttribute('data-theme', 'dark');
    }
  }, []);

  const toggleTheme = useCallback(() => {
    setTheme((prev) => {
      const next = prev === 'dark' ? 'light' : 'dark';
      localStorage.setItem('tradelog-theme', next);
      document.documentElement.setAttribute('data-theme', next);
      return next;
    });
  }, []);

  // Prevent flash of unstyled content
  if (!mounted) {
    return <>{children}</>;
  }

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}


--- FILE: src/hooks/useTrades.tsx ---
'use client';

import { useState, useEffect, useCallback, createContext, useContext, ReactNode } from 'react';
import { Trade } from '@/types';
import {
  fetchTrades,
  addTrade as addTradeToDb,
  updateTrade as updateTradeInDb,
  deleteTrade as deleteTradeFromDb,
} from '@/lib/database';
import { createEmptyTrade } from '@/lib/constants';
import { useAuth } from './useAuth';

interface TradesContextValue {
  trades: Trade[];
  loading: boolean;
  addTrade: () => Promise<string | null>;
  updateTrade: (tradeId: string, updates: Partial<Trade>) => Promise<void>;
  deleteTrade: (tradeId: string) => Promise<void>;
  refreshTrades: () => Promise<void>;
}

const TradesContext = createContext<TradesContextValue>({
  trades: [],
  loading: true,
  addTrade: async () => null,
  updateTrade: async () => {},
  deleteTrade: async () => {},
  refreshTrades: async () => {},
});


interface TradesProviderProps {
  children: ReactNode;
  year: number;
  month: number;
}

export function TradesProvider({ children, year, month }: TradesProviderProps) {
  const { user } = useAuth();
  const [trades, setTrades] = useState<Trade[]>([]);
  const [loading, setLoading] = useState(true);

  const loadTrades = useCallback(async () => {
    if (!user) {
      setTrades([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const data = await fetchTrades(user.id, year, month);
      setTrades(data);
    } catch (error) {
      console.error('Failed to load trades:', error);
    } finally {
      setLoading(false);
    }
  }, [user, year, month]);

  useEffect(() => {
    /* eslint-disable-next-line react-hooks/set-state-in-effect */
    loadTrades();
  }, [loadTrades]);

  const addTrade = useCallback(async () => {
    if (!user) return null;
    const empty = createEmptyTrade();
    const id = await addTradeToDb(user.id, year, month, empty);
    if (id) {
      await /* eslint-disable-next-line react-hooks/set-state-in-effect */
    loadTrades(); // Refresh the list
    }
    return id;
  }, [user, year, month, loadTrades]);

  const updateTrade = useCallback(
    async (tradeId: string, updates: Partial<Trade>) => {
      if (!user) return;
      // Optimistic update
      setTrades((prev) => {
        const next = prev.map((t) => (t.id === tradeId ? { ...t, ...updates } : t));
        return next.sort((a, b) => {
          if (a.date !== b.date) return (a.date || '').localeCompare(b.date || '');
          const aTime = a.createdAt ? new Date(a.createdAt).getTime() : 0;
          const bTime = b.createdAt ? new Date(b.createdAt).getTime() : 0;
          return aTime - bTime;
        });
      });
      await updateTradeInDb(user.id, year, month, tradeId, updates);
    },
    [user, year, month]
  );

  const deleteTrade = useCallback(
    async (tradeId: string) => {
      if (!user) return;
      await deleteTradeFromDb(user.id, year, month, tradeId);
      setTrades((prev) => prev.filter((t) => t.id !== tradeId));
    },
    [user, year, month]
  );

  return (
    <TradesContext.Provider value={{ trades, loading, addTrade, updateTrade, deleteTrade, refreshTrades: loadTrades }}>
      {children}
    </TradesContext.Provider>
  );
}

export function useTrades() {
  const context = useContext(TradesContext);
  if (!context) {
    throw new Error('useTrades must be used within a TradesProvider');
  }
  return context;
}


--- FILE: src/lib/authService.ts ---
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { getUserByEmail, getUserProfile, createOrUpdateUserProfile, updateUserPasswordHash } from './database';
import { UserProfile } from '@/types';

// Minimum salt rounds required for bcrypt
export const BCRYPT_SALT_ROUNDS = 12;

export type HashType = 'bcrypt' | 'md5' | 'sha1' | 'plain';

/**
 * Hashes a plain text password using bcrypt with at least 12 salt rounds.
 */
export async function hashPassword(password: string): Promise<string> {
  if (!password || typeof password !== 'string') {
    throw new Error('Password must be a non-empty string.');
  }
  return bcrypt.hash(password, BCRYPT_SALT_ROUNDS);
}

/**
 * Constant-time comparison of two strings to mitigate timing attack vulnerabilities.
 * Hashes both strings with SHA-256 before timingSafeEqual to ensure fixed-length comparison.
 */
export function timingSafeEqualStrings(a: string, b: string): boolean {
  const bufA = crypto.createHash('sha256').update(a).digest();
  const bufB = crypto.createHash('sha256').update(b).digest();
  return crypto.timingSafeEqual(bufA, bufB);
}

/**
 * Identifies the hashing algorithm / format of a stored hash string.
 */
export function detectHashType(storedHash: string): HashType {
  if (!storedHash) return 'plain';
  if (storedHash.startsWith('$2a$') || storedHash.startsWith('$2b$') || storedHash.startsWith('$2y$')) {
    return 'bcrypt';
  }
  const isHex = /^[0-9a-fA-F]+$/.test(storedHash);
  if (storedHash.length === 32 && isHex) {
    return 'md5';
  }
  if (storedHash.length === 40 && isHex) {
    return 'sha1';
  }
  return 'plain';
}

/**
 * Checks if a bcrypt hash uses a salt round cost factor less than target min cost (12).
 */
export function isBcryptCostWeak(bcryptHash: string, minCost = BCRYPT_SALT_ROUNDS): boolean {
  const roundsMatch = bcryptHash.match(/^\$2[aby]\$(\d\d)\$/);
  if (!roundsMatch) return true;
  const cost = parseInt(roundsMatch[1], 10);
  return cost < minCost;
}

export interface VerificationResult {
  valid: boolean;
  isWeak: boolean;
  hashType: HashType;
}

/**
 * Verifies a plain text password against a stored hash or legacy credential representation.
 * Always performs constant-time comparisons for string equalities.
 */
export async function verifyPassword(
  password: string,
  storedHash: string
): Promise<VerificationResult> {
  if (!password || !storedHash) {
    return { valid: false, isWeak: false, hashType: 'plain' };
  }

  const hashType = detectHashType(storedHash);

  switch (hashType) {
    case 'bcrypt': {
      // bcrypt.compare executes constant-time hash comparison internally
      const valid = await bcrypt.compare(password, storedHash);
      const isWeak = valid ? isBcryptCostWeak(storedHash, BCRYPT_SALT_ROUNDS) : false;
      return { valid, isWeak, hashType };
    }

    case 'md5': {
      const computedMd5 = crypto.createHash('md5').update(password).digest('hex');
      const valid = timingSafeEqualStrings(computedMd5, storedHash);
      return { valid, isWeak: valid, hashType };
    }

    case 'sha1': {
      const computedSha1 = crypto.createHash('sha1').update(password).digest('hex');
      const valid = timingSafeEqualStrings(computedSha1, storedHash);
      return { valid, isWeak: valid, hashType };
    }

    case 'plain':
    default: {
      const valid = timingSafeEqualStrings(password, storedHash);
      return { valid, isWeak: valid, hashType: 'plain' };
    }
  }
}

/**
 * Registers a new user account with a password hashed using bcrypt (salt rounds >= 12).
 */
export async function signupUser(
  email: string,
  password: string,
  displayName?: string
): Promise<UserProfile> {
  const existingUser = await getUserByEmail(email);
  if (existingUser) {
    throw new Error('User with this email already exists.');
  }

  const hashedPassword = await hashPassword(password);
  const uid = crypto.randomUUID();

  const profile: UserProfile = {
    uid,
    displayName: displayName || email.split('@')[0],
    email,
    photoURL: '',
    passwordHash: hashedPassword,
    theme: 'dark',
    customPairs: [],
    customColumns: [],
  };

  await createOrUpdateUserProfile(uid, profile);
  return profile;
}

/**
 * Changes a user's password. Verifies old password, hashes new password with bcrypt (cost >= 12), and persists to DB.
 */
export async function changePassword(
  uid: string,
  oldPassword: string,
  newPassword: string
): Promise<{ success: boolean; error?: string }> {
  const profile = await getUserProfile(uid);
  if (!profile || !profile.passwordHash) {
    return { success: false, error: 'User profile or password record not found.' };
  }

  const verification = await verifyPassword(oldPassword, profile.passwordHash);
  if (!verification.valid) {
    return { success: false, error: 'Current password verification failed.' };
  }

  const newHash = await hashPassword(newPassword);
  const updated = await updateUserPasswordHash(uid, newHash);
  if (!updated) {
    return { success: false, error: 'Failed to save updated password hash to database.' };
  }

  return { success: true };
}

/**
 * Authenticates a user on login. If the user's password is stored as plain-text, MD5, SHA-1,
 * or low-cost bcrypt, it transparently re-hashes the password with bcrypt (salt rounds 12)
 * and updates the database record.
 */
export async function loginUserWithMigration(
  email: string,
  password: string
): Promise<{ user: UserProfile | null; migrated: boolean; error?: string }> {
  const profile = await getUserByEmail(email);
  if (!profile || !profile.passwordHash) {
    return { user: null, migrated: false, error: 'Invalid email or password.' };
  }

  const verification = await verifyPassword(password, profile.passwordHash);
  if (!verification.valid) {
    return { user: null, migrated: false, error: 'Invalid email or password.' };
  }

  let migrated = false;

  // Re-hash weak password (plain, MD5, SHA-1, or low-cost bcrypt) on successful login
  if (verification.isWeak) {
    const upgradedBcryptHash = await hashPassword(password);
    const success = await updateUserPasswordHash(profile.uid, upgradedBcryptHash);
    if (success) {
      profile.passwordHash = upgradedBcryptHash;
      migrated = true;
    }
  }

  return { user: profile, migrated };
}


--- FILE: src/lib/constants.ts ---
import { ColumnDef } from '@/types';

export const WEEKDAYS = [
  'Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'
] as const;

export const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
] as const;



export const DEFAULT_COLUMNS: ColumnDef[] = [
  { key: 'tradeNumber', label: 'No. of Trades', type: 'text', width: '120px', isDefault: true },
  { key: 'date', label: 'Date', type: 'date', width: '130px', isDefault: true },
  { key: 'day', label: 'Day', type: 'day', width: '110px', isDefault: true },
  { key: 'pair', label: 'Pairs', type: 'pair', width: '130px', isDefault: true },
  { key: 'direction', label: 'Direction', type: 'direction', width: '110px', isDefault: true },
  { key: 'outcome', label: 'Outcome', type: 'outcome', width: '110px', isDefault: true },
  { key: 'reward', label: 'Rewards ($)', type: 'numeric', width: '120px', isDefault: true },
  { key: 'commission', label: 'Commission ($)', type: 'commission', width: '140px', isDefault: true },
  { key: 'entryModel', label: 'Entry Model', type: 'text', width: '140px', isDefault: true },
  { key: 'images', label: "IMAGE'S LINK", type: 'images', width: '150px', isDefault: true },
  { key: 'remarks', label: 'Remarks', type: 'remarks', width: '200px', isDefault: true },
];

export function createEmptyTrade(): Omit<import('@/types').Trade, 'id' | 'createdAt' | 'updatedAt'> {
  return {
    date: '',
    day: '',
    pair: '',
    direction: '',
    outcome: '',
    reward: null,
    commission: null,
    entryModel: '',
    images: [],
    remarks: '',
    customFields: {},
  };
}


--- FILE: src/lib/database.ts ---
import { getSupabase } from './supabase';
import { Trade, UserProfile, CustomPair, CustomColumn } from '@/types';

// --- Helper: year_month key ---
function yearMonthKey(year: number, month: number): string {
  return `${year}-${String(month).padStart(2, '0')}`;
}

// ============================================
// TRADES CRUD
// ============================================

export async function fetchTrades(uid: string, year: number, month: number): Promise<Trade[]> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('trades')
    .select('*')
    .eq('user_id', uid)
    .eq('year_month', yearMonthKey(year, month))
    .order('date', { ascending: true })
    .order('created_at', { ascending: true });

  if (error) {
    console.error('Error fetching trades:', error);
    return [];
  }

  return (data || []).map(mapDbToTrade);
}

export async function fetchTradesForDateRange(
  uid: string,
  startDate: string,
  endDate: string
): Promise<Trade[]> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('trades')
    .select('*')
    .eq('user_id', uid)
    .gte('date', startDate)
    .lte('date', endDate)
    .order('date', { ascending: true })
    .order('created_at', { ascending: true });

  if (error) {
    console.error('Error fetching trades for date range:', error);
    return [];
  }

  return (data || []).map(mapDbToTrade);
}

export async function fetchAvailableYears(uid: string): Promise<number[]> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('trades')
    .select('year_month, date')
    .eq('user_id', uid);

  if (error || !data || data.length === 0) {
    return [new Date().getFullYear()];
  }

  const yearsSet = new Set<number>();
  data.forEach((row) => {
    if (row.year_month) {
      const y = parseInt(row.year_month.split('-')[0], 10);
      if (!isNaN(y)) yearsSet.add(y);
    }
    if (row.date) {
      const y = parseInt(row.date.split('-')[0], 10);
      if (!isNaN(y)) yearsSet.add(y);
    }
  });

  const currentYear = new Date().getFullYear();
  yearsSet.add(currentYear);

  return Array.from(yearsSet).sort((a, b) => b - a);
}

export async function addTrade(
  uid: string,
  year: number,
  month: number,
  trade: Omit<Trade, 'id' | 'createdAt' | 'updatedAt'>
): Promise<string | null> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('trades')
    .insert({
      user_id: uid,
      year_month: yearMonthKey(year, month),
      date: trade.date,
      day: trade.day,
      pair: trade.pair,
      direction: trade.direction || '',
      outcome: trade.outcome || '',

      reward: trade.reward,
      commission: trade.commission,
      entry_model: trade.entryModel,
      images: trade.images,
      remarks: trade.remarks,
      custom_fields: trade.customFields,
    })
    .select('id')
    .single();

  if (error) {
    console.error('Error adding trade:', error);
    return null;
  }

  return data?.id || null;
}

export async function updateTrade(
  uid: string,
  year: number,
  month: number,
  tradeId: string,
  updates: Partial<Trade>
): Promise<void> {
  const supabase = getSupabase();

  // Map Trade field names to DB column names
  const dbUpdates: Record<string, any> = {};
  if (updates.date !== undefined) dbUpdates.date = updates.date;
  if (updates.day !== undefined) dbUpdates.day = updates.day;
  if (updates.pair !== undefined) dbUpdates.pair = updates.pair;
  if (updates.direction !== undefined) dbUpdates.direction = updates.direction;
  if (updates.outcome !== undefined) dbUpdates.outcome = updates.outcome;

  if (updates.reward !== undefined) dbUpdates.reward = updates.reward;
  if (updates.commission !== undefined) dbUpdates.commission = updates.commission;
  if (updates.entryModel !== undefined) dbUpdates.entry_model = updates.entryModel;
  if (updates.images !== undefined) dbUpdates.images = updates.images;
  if (updates.remarks !== undefined) dbUpdates.remarks = updates.remarks;
  if (updates.customFields !== undefined) dbUpdates.custom_fields = updates.customFields;

  const { error } = await supabase
    .from('trades')
    .update(dbUpdates)
    .eq('id', tradeId)
    .eq('user_id', uid);

  if (error) {
    console.error('Error updating trade:', error);
  }
}

export async function deleteTrade(
  uid: string,
  year: number,
  month: number,
  tradeId: string
): Promise<void> {
  const supabase = getSupabase();
  const { error } = await supabase
    .from('trades')
    .delete()
    .eq('id', tradeId)
    .eq('user_id', uid);

  if (error) {
    console.error('Error deleting trade:', error);
  }
}

// ============================================
// USER PROFILE
// ============================================

export async function getUserProfile(uid: string): Promise<UserProfile | null> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('uid', uid)
    .single();

  if (error || !data) return null;

  return {
    uid: data.uid,
    displayName: data.display_name,
    email: data.email,
    photoURL: data.photo_url,
    passwordHash: data.password_hash,
    theme: data.theme,
    customPairs: data.custom_pairs || [],
    customColumns: data.custom_columns || [],
  };
}

export async function getUserByEmail(email: string): Promise<UserProfile | null> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('email', email)
    .single();

  if (error || !data) return null;

  return {
    uid: data.uid,
    displayName: data.display_name,
    email: data.email,
    photoURL: data.photo_url,
    passwordHash: data.password_hash,
    theme: data.theme,
    customPairs: data.custom_pairs || [],
    customColumns: data.custom_columns || [],
  };
}

export async function createOrUpdateUserProfile(
  uid: string,
  profile: Partial<UserProfile>
): Promise<void> {
  const supabase = getSupabase();

  const dbData: Record<string, any> = { uid };
  if (profile.displayName !== undefined) dbData.display_name = profile.displayName;
  if (profile.email !== undefined) dbData.email = profile.email;
  if (profile.photoURL !== undefined) dbData.photo_url = profile.photoURL;
  if (profile.passwordHash !== undefined) dbData.password_hash = profile.passwordHash;
  if (profile.theme !== undefined) dbData.theme = profile.theme;
  if (profile.customPairs !== undefined) dbData.custom_pairs = profile.customPairs;
  if (profile.customColumns !== undefined) dbData.custom_columns = profile.customColumns;

  const { error } = await supabase
    .from('users')
    .upsert(dbData, { onConflict: 'uid' });

  if (error) {
    console.error('Error upserting user profile:', error);
  }
}

export async function updateUserPasswordHash(
  uid: string,
  passwordHash: string
): Promise<boolean> {
  const supabase = getSupabase();
  const { error } = await supabase
    .from('users')
    .update({ password_hash: passwordHash })
    .eq('uid', uid);

  if (error) {
    console.error('Error updating password hash:', error);
    return false;
  }
  return true;
}

export async function addCustomPair(uid: string, pair: CustomPair): Promise<void> {
  const profile = await getUserProfile(uid);
  const existingPairs = profile?.customPairs || [];
  const alreadyExists = existingPairs.some(
    (p) => p.symbol === pair.symbol && p.category === pair.category
  );
  if (!alreadyExists) {
    await createOrUpdateUserProfile(uid, {
      customPairs: [...existingPairs, pair],
    });
  }
}

export async function removeCustomPair(uid: string, pairSymbol: string): Promise<void> {
  const profile = await getUserProfile(uid);
  const existingPairs = profile?.customPairs || [];
  await createOrUpdateUserProfile(uid, {
    customPairs: existingPairs.filter((p) => p.symbol !== pairSymbol),
  });
}

export async function addCustomColumn(uid: string, column: CustomColumn): Promise<void> {
  const profile = await getUserProfile(uid);
  const existing = profile?.customColumns || [];
  const alreadyExists = existing.some((c) => c.key === column.key);
  if (!alreadyExists) {
    await createOrUpdateUserProfile(uid, {
      customColumns: [...existing, column],
    });
  }
}

export async function updateCustomColumn(uid: string, column: CustomColumn): Promise<void> {
  const profile = await getUserProfile(uid);
  const existing = profile?.customColumns || [];
  await createOrUpdateUserProfile(uid, {
    customColumns: existing.map((c) => (c.key === column.key ? column : c)),
  });
}

export async function removeCustomColumn(uid: string, columnKey: string): Promise<void> {
  const profile = await getUserProfile(uid);
  const existing = profile?.customColumns || [];
  await createOrUpdateUserProfile(uid, {
    customColumns: existing.filter((c) => c.key !== columnKey),
  });
}

// ============================================
// STORAGE (Supabase Storage)
// ============================================

export async function uploadImage(
  uid: string,
  file: File
): Promise<string | null> {
  const supabase = getSupabase();
  const filePath = `${uid}/${Date.now()}_${file.name}`;

  const { error } = await supabase.storage
    .from('trade-images')
    .upload(filePath, file);

  if (error) {
    console.error('Error uploading image:', error);
    return null;
  }

  const { data: urlData } = supabase.storage
    .from('trade-images')
    .getPublicUrl(filePath);

  return urlData.publicUrl;
}



// ============================================
// HELPERS
// ============================================

function mapDbToTrade(row: any): Trade {
  return {
    id: row.id,
    date: row.date || '',
    day: row.day || '',
    pair: row.pair || '',
    direction: row.direction || '',
    outcome: row.outcome || '',

    reward: row.reward,
    commission: row.commission,
    entryModel: row.entry_model || '',
    images: row.images || [],
    remarks: row.remarks || '',
    customFields: row.custom_fields || {},
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}


--- FILE: src/lib/reportGenerator.ts ---
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Trade } from '@/types';
import { MONTHS } from './constants';

interface GenerateReportOptions {
  title: string;
  subtitle: string;
  filename: string;
  userName?: string;
  trades: Trade[];
}

/**
 * Creates an offscreen canvas and draws a clean cumulative P&L line/area chart.
 * Returns a base64 PNG data URL to embed in jsPDF.
 */
function createChartDataUrl(trades: Trade[]): string | null {
  if (typeof window === 'undefined' || trades.length === 0) return null;

  // Filter trades with reward values
  let cumulative = 0;
  const points: { label: string; cumulative: number }[] = [];

  trades.forEach((t, i) => {
    const reward = t.reward || 0;
    cumulative += reward;
    points.push({
      label: t.date ? t.date.slice(5) : `#${i + 1}`,
      cumulative,
    });
  });

  if (points.length === 0) return null;

  const canvas = document.createElement('canvas');
  canvas.width = 1200;
  canvas.height = 450;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  // Background
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const padding = { top: 40, right: 40, bottom: 60, left: 80 };
  const graphWidth = canvas.width - padding.left - padding.right;
  const graphHeight = canvas.height - padding.top - padding.bottom;

  const values = points.map((p) => p.cumulative);
  let minVal = Math.min(0, ...values);
  let maxVal = Math.max(0, ...values);
  if (minVal === maxVal) {
    minVal -= 10;
    maxVal += 10;
  }
  const valRange = maxVal - minVal;

  // Grid lines & Y-axis labels
  ctx.lineWidth = 1;
  ctx.strokeStyle = '#e2e8f0';
  ctx.fillStyle = '#64748b';
  ctx.font = '20px sans-serif';

  const gridSteps = 4;
  for (let i = 0; i <= gridSteps; i++) {
    const yVal = minVal + (valRange / gridSteps) * i;
    const yPos = padding.top + graphHeight - (i / gridSteps) * graphHeight;

    ctx.beginPath();
    ctx.moveTo(padding.left, yPos);
    ctx.lineTo(canvas.width - padding.right, yPos);
    ctx.stroke();

    const labelText = `$${yVal.toFixed(0)}`;
    ctx.textAlign = 'right';
    ctx.fillText(labelText, padding.left - 15, yPos + 6);
  }

  // Draw 0 line if in range
  if (minVal < 0 && maxVal > 0) {
    const zeroY = padding.top + graphHeight - ((0 - minVal) / valRange) * graphHeight;
    ctx.lineWidth = 2;
    ctx.strokeStyle = '#94a3b8';
    ctx.beginPath();
    ctx.moveTo(padding.left, zeroY);
    ctx.lineTo(canvas.width - padding.right, zeroY);
    ctx.stroke();
  }

  // Calculate coordinates
  const coords = points.map((p, i) => {
    const x =
      points.length === 1
        ? padding.left + graphWidth / 2
        : padding.left + (i / (points.length - 1)) * graphWidth;
    const y = padding.top + graphHeight - ((p.cumulative - minVal) / valRange) * graphHeight;
    return { x, y, label: p.label };
  });

  const isPositive = (points[points.length - 1]?.cumulative || 0) >= 0;
  const strokeColor = isPositive ? '#10b981' : '#ef4444';
  const fillColor = isPositive ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)';

  // Area Fill
  ctx.beginPath();
  ctx.moveTo(coords[0].x, padding.top + graphHeight - ((0 - minVal) / valRange) * graphHeight);
  coords.forEach((c) => ctx.lineTo(c.x, c.y));
  ctx.lineTo(
    coords[coords.length - 1].x,
    padding.top + graphHeight - ((0 - minVal) / valRange) * graphHeight
  );
  ctx.closePath();
  ctx.fillStyle = fillColor;
  ctx.fill();

  // Line
  ctx.beginPath();
  ctx.lineWidth = 4;
  ctx.strokeStyle = strokeColor;
  coords.forEach((c, i) => {
    if (i === 0) ctx.moveTo(c.x, c.y);
    else ctx.lineTo(c.x, c.y);
  });
  ctx.stroke();

  // Points & X Labels
  const labelInterval = Math.ceil(points.length / 10);
  coords.forEach((c, i) => {
    // Point circle
    ctx.beginPath();
    ctx.arc(c.x, c.y, 6, 0, Math.PI * 2);
    ctx.fillStyle = strokeColor;
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = '#ffffff';
    ctx.stroke();

    // X Axis Label
    if (i % labelInterval === 0 || i === coords.length - 1) {
      ctx.fillStyle = '#64748b';
      ctx.font = '18px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(c.label, c.x, canvas.height - padding.bottom + 30);
    }
  });

  return canvas.toDataURL('image/png');
}

export function generateReportPDF(options: GenerateReportOptions): void {
  const { title, subtitle, filename, trades } = options;

  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();

  // 1. Header Styling
  doc.setFillColor(15, 23, 42); // Slate 900
  doc.rect(0, 0, pageWidth, 28, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.setTextColor(255, 255, 255);
  const mainTitle = 'TradeLog Report';
  doc.text(mainTitle, 14, 13);

  if (options.userName) {
    const titleWidth = doc.getTextWidth(mainTitle);
    doc.setFontSize(12); // Smaller text size, but retains identical 'helvetica', 'bold', and white color
    doc.text(`by ${options.userName}`, 14 + titleWidth + 3, 13);
  }

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(148, 163, 184); // Slate 400
  doc.text(subtitle, 14, 20);

  const generatedDateStr = `Generated: ${new Date().toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })}`;
  doc.text(generatedDateStr, pageWidth - 14, 20, { align: 'right' });

  // 2. Summary Statistics
  const totalPnL = trades.reduce((sum, t) => sum + (t.reward || 0), 0);
  const totalCommission = trades.reduce((sum, t) => sum + (t.commission || 0), 0);
  const netPnL = totalPnL + totalCommission;
  const tradeCount = trades.length;
  const wins = trades.filter((t) => t.outcome === 'Profit').length;
  const winRate = tradeCount > 0 ? Math.round((wins / tradeCount) * 100) : 0;

  const formatCurrency = (val: number) => {
    const formatted = Math.abs(val).toFixed(2);
    return val < 0 ? `-$${formatted}` : `$${formatted}`;
  };

  const statCards = [
    { label: 'Total P&L', value: formatCurrency(totalPnL), isPositive: totalPnL >= 0 },
    { label: 'Commission', value: formatCurrency(totalCommission), isPositive: false },
    { label: 'Net P&L', value: formatCurrency(netPnL), isPositive: netPnL >= 0 },
    { label: 'Total Trades', value: String(tradeCount), isNeutral: true },
    { label: 'Win Rate', value: `${winRate}%`, isPositive: winRate >= 50 },
  ];

  let startY = 38;
  const cardWidth = (pageWidth - 28 - 4 * 4) / 5; // 5 cards with 4mm gap
  const cardHeight = 18;

  statCards.forEach((card, index) => {
    const xPos = 14 + index * (cardWidth + 4);

    // Card background
    doc.setFillColor(248, 250, 252); // Slate 50
    doc.setDrawColor(226, 232, 240); // Slate 200
    doc.roundedRect(xPos, startY, cardWidth, cardHeight, 2, 2, 'FD');

    // Label
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    doc.setTextColor(100, 116, 139);
    doc.text(card.label.toUpperCase(), xPos + 3, startY + 5.5);

    // Value
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    if (card.isNeutral) {
      doc.setTextColor(15, 23, 42);
    } else if (card.isPositive) {
      doc.setTextColor(16, 185, 129); // Green
    } else {
      doc.setTextColor(239, 68, 68); // Red
    }
    doc.text(card.value, xPos + 3, startY + 13.5);
  });

  startY += cardHeight + 10;

  // 3. P&L Visual Chart
  if (trades.length > 0) {
    const chartImg = createChartDataUrl(trades);
    if (chartImg) {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.setTextColor(15, 23, 42);
      doc.text('Performance Chart (Cumulative P&L)', 14, startY);

      startY += 4;
      const chartWidth = pageWidth - 28;
      const chartHeight = 50;

      doc.addImage(chartImg, 'PNG', 14, startY, chartWidth, chartHeight);
      startY += chartHeight + 10;
    }
  }

  // 4. Individual Trades Table
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(15, 23, 42);
  doc.text(`Trade Details (${trades.length})`, 14, startY);

  startY += 4;

  const tableBody = trades.map((t, idx) => [
    String(idx + 1),
    t.date || '—',
    t.day || '—',
    t.pair || '—',
    t.direction || '—',
    t.outcome || '—',
    t.reward !== null && t.reward !== undefined ? formatCurrency(t.reward) : '—',
    t.commission !== null && t.commission !== undefined ? formatCurrency(t.commission) : '—',
    t.entryModel || '—',
  ]);

  autoTable(doc, {
    startY,
    head: [
      [
        '#',
        'Date',
        'Day',
        'Pair',
        'Direction',
        'Outcome',
        'Reward',
        'Commission',
        'Entry Model',
      ],
    ],
    body: tableBody,
    theme: 'grid',
    headStyles: {
      fillColor: [15, 23, 42],
      textColor: [255, 255, 255],
      fontSize: 8,
      fontStyle: 'bold',
      halign: 'center',
    },
    styles: {
      fontSize: 7, // Slightly reduced to help prevent wrapping
      cellPadding: 1.5, // Reduced padding to maximize available cell width
      valign: 'middle',
      overflow: 'ellipsize', // STRICTLY enforces single-line rendering for all text
    },
    columnStyles: {
      0: { halign: 'center', cellWidth: 10 },
      1: { cellWidth: 20 }, // Date
      2: { cellWidth: 22 }, // Day
      3: { cellWidth: 22 }, // Pair
      4: { halign: 'center', cellWidth: 18 }, // Direction
      5: { halign: 'center', cellWidth: 18 }, // Outcome
      6: { halign: 'right', cellWidth: 22 }, // Reward
      7: { halign: 'right', cellWidth: 22 }, // Commission
      8: { cellWidth: 'auto' }, // Entry Model
    },
    didParseCell: (data) => {
      // Colorize Reward and Outcome
      if (data.section === 'body') {
        const rowData = trades[data.row.index];
        if (data.column.index === 5) {
          // Outcome
          if (rowData?.outcome === 'Profit') {
            data.cell.styles.textColor = [16, 185, 129];
            data.cell.styles.fontStyle = 'bold';
          } else if (rowData?.outcome === 'Loss') {
            data.cell.styles.textColor = [239, 68, 68];
            data.cell.styles.fontStyle = 'bold';
          }
        }
        if (data.column.index === 6) {
          // Reward
          if (rowData?.reward !== null && rowData?.reward !== undefined) {
            if (rowData.reward >= 0) {
              data.cell.styles.textColor = [16, 185, 129];
            } else {
              data.cell.styles.textColor = [239, 68, 68];
            }
          }
        }
        if (data.column.index === 7) {
          // Commission
          data.cell.styles.textColor = [239, 68, 68];
        }
      }
    },
  });

  // Save the PDF
  doc.save(filename);
}


--- FILE: src/lib/supabase.ts ---
import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('CRITICAL: Missing Supabase environment variables in configuration.');
}

let supabase: SupabaseClient;

export function getSupabase(): SupabaseClient {
  if (!supabase) {
    supabase = createClient(supabaseUrl as string, supabaseAnonKey as string);
  }
  return supabase;
}


--- FILE: src/types/index.ts ---
export interface ImageEntry {
  type: 'file' | 'url';
  url: string;
  name?: string;
}

export interface Trade {
  id: string;
  date: string;               // ISO date string (YYYY-MM-DD)
  day: string;                // Weekday name
  pair: string;
  direction: 'Long' | 'Short' | '';
  outcome: 'Profit' | 'Loss' | '';
  reward: number | null;
  commission: number | null;
  entryModel: string;
  images: ImageEntry[];
  remarks: string;
  customFields: Record<string, string | number>;
  createdAt: string | null;   // ISO timestamp from Supabase
  updatedAt: string | null;   // ISO timestamp from Supabase
}

export interface CustomPair {
  symbol: string;
  category: string;
}

export interface CustomColumn {
  key: string;
  name: string;
  type: 'text' | 'number' | 'dropdown';
  options?: string[];
}

export interface UserProfile {
  uid: string;
  displayName: string;
  email: string;
  photoURL: string;
  theme: 'light' | 'dark';
  passwordHash?: string;
  customPairs: CustomPair[];
  customColumns: CustomColumn[];
}

export interface MonthYear {
  year: number;
  month: number; // 1-12
}

export type ColumnDef = {
  key: string;
  label: string;
  type: 'text' | 'number' | 'date' | 'day' | 'pair' | 'direction' | 'outcome' | 'numeric' | 'commission' | 'images' | 'remarks' | 'dropdown';
  width?: string;
  options?: string[];
  isDefault?: boolean;
};


