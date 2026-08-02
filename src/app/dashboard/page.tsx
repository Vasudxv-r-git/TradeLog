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
          onDeleteColumn={handleDeleteColumn}
          sectionOrder={sectionOrder}
          onUpdateSectionOrder={handleUpdateSectionOrder}
        />
      </TradesProvider>
    </div>
  );
}
