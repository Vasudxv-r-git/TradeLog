import * as XLSX from 'xlsx';
import { Trade } from '@/types';
import { calculateReportStats } from './statistics';

export function generateExcel(trades: Trade[], title: string) {
  if (trades.length === 0) {
    alert('No trades available for this report.');
    return;
  }

  // 1. Calculate Stats
  const stats = calculateReportStats(trades);

  // 2. Create the Summary Sheet Data
  const summaryData = [
    [title],
    ['Generated on', new Date().toLocaleDateString()],
    [],
    ['--- Performance Summary ---'],
    ['Total Trades', stats.totalTrades],
    ['Winning Trades', stats.winningTrades],
    ['Losing Trades', stats.losingTrades],
    ['Breakeven Trades', stats.breakevenTrades],
    ['Win Rate', `${stats.winRate.toFixed(2)}%`],
    ['Total Profit', stats.totalProfit],
    ['Total Loss', stats.totalLoss],
    ['Net P/L', stats.netPnL],
    ['Profit Factor', stats.profitFactor.toFixed(2)],
    ['Expectancy', stats.expectancy.toFixed(2)],
    ['Avg Profit', stats.avgProfit.toFixed(2)],
    ['Avg Loss', stats.avgLoss.toFixed(2)],
    ['Avg Risk/Reward', stats.avgRR.toFixed(2)],
    ['Best Trade', stats.bestTrade],
    ['Worst Trade', stats.worstTrade],
    [],
    ['--- Streaks & Days ---'],
    ['Max Win Streak', stats.maxWinStreak],
    ['Max Loss Streak', stats.maxLossStreak],
    ['Trading Days', stats.tradingDays],
    ['Winning Days', stats.winningDays],
    ['Losing Days', stats.losingDays],
    ['Breakeven Days', stats.breakevenDays],
    ['Largest Winning Day', stats.largestWinningDay],
    ['Largest Losing Day', stats.largestLosingDay],
  ];

  const wsSummary = XLSX.utils.aoa_to_sheet(summaryData);
  
  // Format the title cell
  wsSummary['A1'] = { v: title, t: 's', s: { font: { bold: true, sz: 14 } } };

  // 3. Create the Raw Trades Sheet Data
  const customFieldKeys = new Set<string>();
  trades.forEach(t => {
    if (t.customFields) {
      Object.keys(t.customFields).forEach(key => customFieldKeys.add(key));
    }
  });
  const customFieldsArray = Array.from(customFieldKeys);
  
  const headers = [
    'Trade Number', 'Date', 'Day', 'Pair', 'Direction', 'Outcome', 
    'Reward', 'Commission', 'Entry Model', 'Remarks', ...customFieldsArray
  ];

  const tradesData = trades.map(t => {
    const row: any[] = [
      t.tradeNumber || '',
      t.date || '',
      t.day || '',
      t.pair || '',
      t.direction || '',
      t.outcome || '',
      t.reward !== null ? t.reward : '',
      t.commission !== null ? t.commission : '',
      t.entryModel || '',
      t.remarks || ''
    ];

    customFieldsArray.forEach(key => {
      const val = t.customFields?.[key];
      row.push(val !== undefined && val !== null ? val : '');
    });

    return row;
  });

  const wsTrades = XLSX.utils.aoa_to_sheet([headers, ...tradesData]);

  // 4. Create Workbook and Append Sheets
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, wsSummary, 'Summary');
  XLSX.utils.book_append_sheet(wb, wsTrades, 'Trades Data');

  // 5. Download
  const fileName = `${title.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.xlsx`;
  XLSX.writeFile(wb, fileName);
}
