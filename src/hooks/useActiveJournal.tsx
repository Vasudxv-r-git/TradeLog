'use client';

import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { SharedJournal, Role } from '@/types';
import { useAuth } from './useAuth';
import { fetchSharedJournals } from '@/lib/database';

interface ActiveJournalContextValue {
  activeJournalId: string | null;
  activeRole: Role;
  sharedJournals: SharedJournal[];
  setActiveJournal: (journalId: string | null, role?: Role) => void;
  refreshSharedJournals: () => Promise<void>;
}

const ActiveJournalContext = createContext<ActiveJournalContextValue>({
  activeJournalId: null,
  activeRole: 'owner',
  sharedJournals: [],
  setActiveJournal: () => {},
  refreshSharedJournals: async () => {},
});

export function ActiveJournalProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  
  // activeJournalId === null means the user's own journal.
  // We store the ownerUid of the shared journal when active.
  const [activeJournalId, setActiveJournalIdState] = useState<string | null>(null);
  const [activeRole, setActiveRole] = useState<Role>('owner');
  const [sharedJournals, setSharedJournals] = useState<SharedJournal[]>([]);

  const refreshSharedJournals = useCallback(async () => {
    if (user?.email) {
      const journals = await fetchSharedJournals(user.email);
      setSharedJournals(journals);
      
      // If the currently active journal is no longer in the list (e.g. revoked), reset to owner
      if (activeJournalId !== null && !journals.some(j => j.ownerUid === activeJournalId)) {
        setActiveJournalIdState(null);
        setActiveRole('owner');
      }
    } else {
      setSharedJournals([]);
      setActiveJournalIdState(null);
      setActiveRole('owner');
    }
  }, [user, activeJournalId]);

  useEffect(() => {
    refreshSharedJournals();
  }, [refreshSharedJournals]);

  const setActiveJournal = useCallback((journalId: string | null, role: Role = 'owner') => {
    setActiveJournalIdState(journalId);
    setActiveRole(role);
  }, []);

  return (
    <ActiveJournalContext.Provider 
      value={{
        activeJournalId: activeJournalId ?? user?.id ?? null,
        activeRole,
        sharedJournals,
        setActiveJournal,
        refreshSharedJournals
      }}
    >
      {children}
    </ActiveJournalContext.Provider>
  );
}

export function useActiveJournal() {
  const context = useContext(ActiveJournalContext);
  if (!context) {
    throw new Error('useActiveJournal must be used within ActiveJournalProvider');
  }
  return context;
}
