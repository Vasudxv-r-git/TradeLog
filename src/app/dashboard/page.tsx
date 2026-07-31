'use client';

import { useState, useEffect, useCallback } from 'react';
import { Plus, Users } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useActiveJournal } from '@/hooks/useActiveJournal';
import { useMonthYear } from '@/hooks/useMonthYear';
import { TradesProvider, useTrades } from '@/hooks/useTrades';
import { Trade, CustomColumn, CustomPair } from '@/types';
import { getUserProfile, addCustomPair, addCustomColumn, addTrade, updateTrade as updateTradeInDb, removeCustomColumn } from '@/lib/database';
import MonthYearSelector from '@/components/overview/MonthYearSelector';
import TradeGrid from '@/components/journal/TradeGrid';
import MonthlyOverview from '@/components/overview/MonthlyOverview';
import PnLChart from '@/components/overview/PnLChart';
import DownloadReports from '@/components/reports/DownloadReports';
import TradePanel from '@/components/journal/NewTradePanel';
import JournalSwitcher from '@/components/journal/JournalSwitcher';
import { removeCustomPair } from '@/lib/database';

function DashboardContent({
  year,
  month,
  customColumns,
  customPairs,
  hiddenColumns,
  hiddenPairs,
  onAddColumn,
  onAddPair,
  onDeleteColumn,
  onDeletePair,
}: {
  year: number;
  month: number;
  customColumns: CustomColumn[];
  customPairs: CustomPair[];
  hiddenColumns: Set<string>;
  hiddenPairs: Set<string>;
  onAddColumn: (col: CustomColumn) => void;
  onAddPair: (pair: CustomPair) => void;
  onDeleteColumn: (colKey: string) => void;
  onDeletePair: (pairSymbol: string) => void;
}) {
  const { user } = useAuth();
  const { activeJournalId, activeRole } = useActiveJournal();
  const { trades, refreshTrades } = useTrades();
  const [showNewTrade, setShowNewTrade] = useState(false);
  const [editingTrade, setEditingTrade] = useState<Trade | null>(null);

  // Create new trade
  const handleSaveNewTrade = async (newTrade: Partial<Trade>) => {
    if (!activeJournalId || activeRole === 'viewer') return;
    const fullTrade = { ...newTrade, images: newTrade.images || [] };
    await addTrade(activeJournalId, year, month, fullTrade as any);
    setShowNewTrade(false);
    refreshTrades();
  };

  // Update existing trade
  const handleSaveEditedTrade = async (updatedTrade: Partial<Trade>) => {
    if (!activeJournalId || !editingTrade || activeRole === 'viewer') return;
    await updateTradeInDb(activeJournalId, year, month, editingTrade.id, updatedTrade);
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

      {/* 2. Download Reports Section */}
      <DownloadReports />

      {/* 3. New Trade Button */}
      {activeRole !== 'viewer' && (
        <div>
          <button className="btn btn-primary" onClick={() => setShowNewTrade(true)}>
            <Plus size={16} /><span>New Trade</span>
          </button>
        </div>
      )}

      {/* 3. Trades Grid (Single Source of Truth — read-only cells) */}
      <TradeGrid
        customColumns={customColumns}
        customPairs={customPairs}
        hiddenColumns={hiddenColumns}
        onAddCustomColumn={onAddColumn}
        onAddCustomPair={onAddPair}
        onDeleteColumn={onDeleteColumn}
        onEditTrade={(trade) => setEditingTrade(trade)}
      />

      {/* 4. New Trade Panel */}
      {showNewTrade && (
        <TradePanel
          customColumns={customColumns}
          customPairs={customPairs}
          hiddenColumns={hiddenColumns}
          hiddenPairs={hiddenPairs}
          onAddPair={onAddPair}
          onDeletePair={onDeletePair}
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
          hiddenPairs={hiddenPairs}
          onAddPair={onAddPair}
          onDeletePair={onDeletePair}
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
  const { activeJournalId, activeRole } = useActiveJournal();
  const { year, month, setYear, setMonth } = useMonthYear();
  const [customColumns, setCustomColumns] = useState<CustomColumn[]>([]);
  const [customPairs, setCustomPairs] = useState<CustomPair[]>([]);
  const [hiddenColumns, setHiddenColumns] = useState<Set<string>>(new Set());
  const [hiddenPairs, setHiddenPairs] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!activeJournalId) return;
    getUserProfile(activeJournalId).then((profile) => {
      if (profile) {
        setCustomColumns(profile.customColumns || []);
        setCustomPairs(profile.customPairs || []);
      }
    });
    const savedCols = localStorage.getItem('tradelog_hidden_columns');
    if (savedCols) {
      try { setHiddenColumns(new Set(JSON.parse(savedCols))); } catch {}
    }
    const savedPairs = localStorage.getItem('tradelog_hidden_pairs');
    if (savedPairs) {
      try { setHiddenPairs(new Set(JSON.parse(savedPairs))); } catch {}
    }
  }, [activeJournalId]);

  const handleAddColumn = useCallback(
    async (column: CustomColumn) => {
      if (!activeJournalId || activeRole !== 'owner') return;
      await addCustomColumn(activeJournalId, column);
      setCustomColumns((prev) => [...prev, column]);
      setHiddenColumns((prev) => {
        const next = new Set(prev);
        next.delete(column.key);
        localStorage.setItem('tradelog_hidden_columns', JSON.stringify([...next]));
        return next;
      });
    },
    [activeJournalId, activeRole]
  );

  const handleAddPair = useCallback(
    async (pair: CustomPair) => {
      if (!activeJournalId || activeRole !== 'owner') return;
      await addCustomPair(activeJournalId, pair);
      setCustomPairs((prev) => [...prev, pair]);
      setHiddenPairs((prev) => {
        const next = new Set(prev);
        next.delete(pair.symbol);
        localStorage.setItem('tradelog_hidden_pairs', JSON.stringify([...next]));
        return next;
      });
    },
    [activeJournalId, activeRole]
  );

  const handleDeleteColumn = useCallback(
    async (columnKey: string) => {
      if (activeRole !== 'owner') return;
      const isCustom = customColumns.some((c) => c.key === columnKey);
      if (isCustom && activeJournalId) {
        await removeCustomColumn(activeJournalId, columnKey);
        setCustomColumns((prev) => prev.filter((c) => c.key !== columnKey));
      }
      setHiddenColumns((prev) => {
        const next = new Set(prev);
        next.add(columnKey);
        localStorage.setItem('tradelog_hidden_columns', JSON.stringify([...next]));
        return next;
      });
    },
    [activeJournalId, activeRole, customColumns]
  );

  const handleDeletePair = useCallback(
    async (pairSymbol: string) => {
      if (activeRole !== 'owner') return;
      const isCustom = customPairs.some((p) => p.symbol === pairSymbol);
      if (isCustom && activeJournalId) {
        await removeCustomPair(activeJournalId, pairSymbol);
        setCustomPairs((prev) => prev.filter((p) => p.symbol !== pairSymbol));
      }
      setHiddenPairs((prev) => {
        const next = new Set(prev);
        next.add(pairSymbol);
        localStorage.setItem('tradelog_hidden_pairs', JSON.stringify([...next]));
        return next;
      });
    },
    [activeJournalId, activeRole, customPairs]
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
          <JournalSwitcher />
        </div>
      </div>



      <TradesProvider year={year} month={month}>
        <DashboardContent
          year={year}
          month={month}
          customColumns={customColumns}
          customPairs={customPairs}
          hiddenColumns={hiddenColumns}
          hiddenPairs={hiddenPairs}
          onAddColumn={handleAddColumn}
          onAddPair={handleAddPair}
          onDeleteColumn={handleDeleteColumn}
          onDeletePair={handleDeletePair}
        />
      </TradesProvider>
    </div>
  );
}
