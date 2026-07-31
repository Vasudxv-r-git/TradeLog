'use client';

import { AuthProvider } from '@/hooks/useAuth';
import { ThemeProvider } from '@/hooks/useTheme';
import AuthGate from '@/components/auth/AuthGate';
import Header from '@/components/layout/Header';
import { ActiveJournalProvider } from '@/hooks/useActiveJournal';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthProvider>
      <ThemeProvider>
        <AuthGate>
          <ActiveJournalProvider>
            <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
              <Header />
              <main style={{ flex: 1, padding: '24px', maxWidth: '1600px', width: '100%', margin: '0 auto' }}>
                {children}
              </main>
            </div>
          </ActiveJournalProvider>
        </AuthGate>
      </ThemeProvider>
    </AuthProvider>
  );
}
