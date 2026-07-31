import { Trade } from '@/types';

export interface ReportStats {
  totalTrades: number;
  winningTrades: number;
  losingTrades: number;
  breakevenTrades: number;
  winRate: number;
  totalProfit: number;
  totalLoss: number;
  netPnL: number;
  profitFactor: number;
  avgProfit: number;
  avgLoss: number;
  avgRR: number;
  bestTrade: number;
  worstTrade: number;
  largestWinningDay: number;
  largestLosingDay: number;
  expectancy: number;
  maxWinStreak: number;
  maxLossStreak: number;
  tradingDays: number;
  winningDays: number;
  losingDays: number;
  breakevenDays: number;
}

export function calculateReportStats(trades: Trade[]): ReportStats {
  if (!trades || trades.length === 0) {
    return {
      totalTrades: 0, winningTrades: 0, losingTrades: 0, breakevenTrades: 0,
      winRate: 0, totalProfit: 0, totalLoss: 0, netPnL: 0, profitFactor: 0,
      avgProfit: 0, avgLoss: 0, avgRR: 0, bestTrade: 0, worstTrade: 0,
      largestWinningDay: 0, largestLosingDay: 0, expectancy: 0,
      maxWinStreak: 0, maxLossStreak: 0, tradingDays: 0, winningDays: 0,
      losingDays: 0, breakevenDays: 0
    };
  }

  const finishedTrades = trades.filter(t => t.outcome === 'Profit' || t.outcome === 'Loss' || t.outcome === ''); // Assuming blank is breakeven/pending, but let's just count ones with rewards.
  
  let winningTrades = 0;
  let losingTrades = 0;
  let breakevenTrades = 0;
  let totalProfit = 0;
  let totalLoss = 0;
  let bestTrade = 0;
  let worstTrade = 0;
  let totalRR = 0;

  let currentWinStreak = 0;
  let currentLossStreak = 0;
  let maxWinStreak = 0;
  let maxLossStreak = 0;

  const dailyPnL: Record<string, number> = {};

  finishedTrades.forEach(t => {
    const pnl = (t.reward || 0) - (t.commission || 0);
    
    // Group by date for daily stats
    if (t.date) {
      if (!dailyPnL[t.date]) dailyPnL[t.date] = 0;
      dailyPnL[t.date] += pnl;
    }

    if (t.outcome === 'Profit' || pnl > 0) {
      winningTrades++;
      totalProfit += pnl;
      if (pnl > bestTrade) bestTrade = pnl;
      
      currentWinStreak++;
      if (currentWinStreak > maxWinStreak) maxWinStreak = currentWinStreak;
      currentLossStreak = 0;
      
    } else if (t.outcome === 'Loss' || pnl < 0) {
      losingTrades++;
      totalLoss += Math.abs(pnl);
      if (pnl < worstTrade) worstTrade = pnl;
      
      currentLossStreak++;
      if (currentLossStreak > maxLossStreak) maxLossStreak = currentLossStreak;
      currentWinStreak = 0;
      
    } else {
      breakevenTrades++;
      currentWinStreak = 0;
      currentLossStreak = 0;
    }

    // Attempt to calculate RR from custom fields if available, otherwise just use standard R if recorded
    if (t.customFields && t.customFields['Risk Reward']) {
       totalRR += Number(t.customFields['Risk Reward']) || 0;
    }
  });

  const totalTrades = winningTrades + losingTrades + breakevenTrades;
  const winRate = totalTrades > 0 ? (winningTrades / totalTrades) * 100 : 0;
  const avgProfit = winningTrades > 0 ? totalProfit / winningTrades : 0;
  const avgLoss = losingTrades > 0 ? totalLoss / losingTrades : 0;
  const profitFactor = totalLoss > 0 ? totalProfit / totalLoss : totalProfit > 0 ? 999 : 0;
  const netPnL = totalProfit - totalLoss;
  const avgRR = totalTrades > 0 ? totalRR / totalTrades : 0;
  
  // Expectancy = (Win Rate * Avg Profit) - (Loss Rate * Avg Loss)
  const winRateDec = winningTrades / (winningTrades + losingTrades || 1);
  const lossRateDec = losingTrades / (winningTrades + losingTrades || 1);
  const expectancy = (winRateDec * avgProfit) - (lossRateDec * avgLoss);

  // Daily calculations
  let largestWinningDay = 0;
  let largestLosingDay = 0;
  let winningDays = 0;
  let losingDays = 0;
  let breakevenDays = 0;

  const dates = Object.keys(dailyPnL);
  const tradingDays = dates.length;

  dates.forEach(date => {
    const pnl = dailyPnL[date];
    if (pnl > 0) {
      winningDays++;
      if (pnl > largestWinningDay) largestWinningDay = pnl;
    } else if (pnl < 0) {
      losingDays++;
      if (pnl < largestLosingDay) largestLosingDay = pnl;
    } else {
      breakevenDays++;
    }
  });

  return {
    totalTrades,
    winningTrades,
    losingTrades,
    breakevenTrades,
    winRate,
    totalProfit,
    totalLoss,
    netPnL,
    profitFactor,
    avgProfit,
    avgLoss,
    avgRR,
    bestTrade,
    worstTrade,
    largestWinningDay,
    largestLosingDay,
    expectancy,
    maxWinStreak,
    maxLossStreak,
    tradingDays,
    winningDays,
    losingDays,
    breakevenDays
  };
}
