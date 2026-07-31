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
