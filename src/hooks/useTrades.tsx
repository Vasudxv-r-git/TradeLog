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

import { useActiveJournal } from './useActiveJournal';

interface TradesProviderProps {
  children: ReactNode;
  year: number;
  month: number;
}

export function TradesProvider({ children, year, month }: TradesProviderProps) {
  const { user } = useAuth();
  const { activeJournalId, activeRole } = useActiveJournal();
  const [trades, setTrades] = useState<Trade[]>([]);
  const [loading, setLoading] = useState(true);

  const loadTrades = useCallback(async () => {
    if (!activeJournalId) {
      setTrades([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const data = await fetchTrades(activeJournalId, year, month);
      setTrades(data);
    } catch (error) {
      console.error('Failed to load trades:', error);
    } finally {
      setLoading(false);
    }
  }, [activeJournalId, year, month]);

  useEffect(() => {
    loadTrades();
  }, [loadTrades]);

  const addTrade = useCallback(async () => {
    if (!activeJournalId || activeRole === 'viewer') return null;
    const empty = createEmptyTrade();
    const id = await addTradeToDb(activeJournalId, year, month, empty);
    if (id) {
      await loadTrades(); // Refresh the list
    }
    return id;
  }, [activeJournalId, activeRole, year, month, loadTrades]);

  const updateTrade = useCallback(
    async (tradeId: string, updates: Partial<Trade>) => {
      if (!activeJournalId || activeRole === 'viewer') return;
      // Optimistic update
      setTrades((prev) =>
        prev.map((t) => (t.id === tradeId ? { ...t, ...updates } : t))
      );
      await updateTradeInDb(activeJournalId, year, month, tradeId, updates);
    },
    [activeJournalId, activeRole, year, month]
  );

  const deleteTrade = useCallback(
    async (tradeId: string) => {
      if (!activeJournalId || activeRole === 'viewer') return;
      await deleteTradeFromDb(activeJournalId, year, month, tradeId);
      setTrades((prev) => prev.filter((t) => t.id !== tradeId));
    },
    [activeJournalId, activeRole, year, month]
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
