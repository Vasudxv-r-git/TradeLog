import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { Trade } from '@/types';
import { calculateReportStats } from './statistics';

export function generatePDF(trades: Trade[], title: string, dateRangeString: string) {
  if (trades.length === 0) {
    alert('No trades available for this report.');
    return;
  }

  const stats = calculateReportStats(trades);

  // Initialize jsPDF
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.width;

  // Colors
  const primaryColor = [41, 128, 185]; // Blue
  const successColor = [39, 174, 96]; // Green
  const dangerColor = [192, 57, 43]; // Red
  const textColor = [51, 51, 51]; // Dark Gray

  // --- Header ---
  doc.setFontSize(22);
  doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.text('Trading Journal Report', 14, 22);

  doc.setFontSize(16);
  doc.setTextColor(textColor[0], textColor[1], textColor[2]);
  doc.text(title, 14, 32);

  doc.setFontSize(11);
  doc.setTextColor(100, 100, 100);
  doc.text(`Date Range: ${dateRangeString}`, 14, 40);
  doc.text(`Generated on: ${new Date().toLocaleDateString()}`, 14, 46);

  doc.setLineWidth(0.5);
  doc.setDrawColor(200, 200, 200);
  doc.line(14, 52, pageWidth - 14, 52);

  // --- Performance Summary ---
  doc.setFontSize(14);
  doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.text('Performance Summary', 14, 62);

  const startY = 70;
  doc.setFontSize(11);
  doc.setTextColor(textColor[0], textColor[1], textColor[2]);

  // Col 1
  doc.text(`Total Trades: ${stats.totalTrades}`, 14, startY);
  doc.text(`Win Rate: ${stats.winRate.toFixed(1)}%`, 14, startY + 8);
  doc.text(`Profit Factor: ${stats.profitFactor.toFixed(2)}`, 14, startY + 16);
  doc.text(`Expectancy: ${stats.expectancy.toFixed(2)}`, 14, startY + 24);

  // Col 2
  const col2X = 80;
  doc.text(`Total Profit: ${stats.totalProfit.toFixed(2)}`, col2X, startY);
  doc.text(`Total Loss: ${stats.totalLoss.toFixed(2)}`, col2X, startY + 8);

  doc.setFont(doc.getFont().fontName, 'bold');
  const isNetPositive = stats.netPnL >= 0;
  doc.setTextColor(isNetPositive ? successColor[0] : dangerColor[0], isNetPositive ? successColor[1] : dangerColor[1], isNetPositive ? successColor[2] : dangerColor[2]);
  doc.text(`Net P/L: ${stats.netPnL.toFixed(2)}`, col2X, startY + 16);
  doc.setFont(doc.getFont().fontName, 'normal');
  doc.setTextColor(textColor[0], textColor[1], textColor[2]);

  doc.text(`Avg R/R: ${stats.avgRR.toFixed(2)}`, col2X, startY + 24);

  // Col 3
  const col3X = 145;
  doc.text(`Avg Profit: ${stats.avgProfit.toFixed(2)}`, col3X, startY);
  doc.text(`Avg Loss: ${stats.avgLoss.toFixed(2)}`, col3X, startY + 8);
  doc.text(`Best Trade: ${stats.bestTrade.toFixed(2)}`, col3X, startY + 16);
  doc.text(`Worst Trade: ${stats.worstTrade.toFixed(2)}`, col3X, startY + 24);


  // --- Trade Log Table ---
  const tableData = trades.map(t => [
    t.date || '-',
    t.pair || '-',
    t.direction || '-',
    t.outcome || '-',
    t.reward !== null ? t.reward.toString() : '-',
    t.entryModel || '-'
  ]);

  (doc as any).autoTable({
    startY: startY + 36,
    head: [['Date', 'Instrument', 'Dir', 'Outcome', 'P/L', 'Setup']],
    body: tableData,
    theme: 'striped',
    headStyles: { fillColor: primaryColor },
    styles: { fontSize: 9 },
    didParseCell: function (data: any) {
      if (data.section === 'body' && data.column.index === 3) { // Outcome column
        if (data.cell.raw === 'Profit') {
          data.cell.styles.textColor = successColor;
          data.cell.styles.fontStyle = 'bold';
        } else if (data.cell.raw === 'Loss') {
          data.cell.styles.textColor = dangerColor;
          data.cell.styles.fontStyle = 'bold';
        }
      }
    }
  });

  // --- Footer ---
  const pageCount = (doc as any).internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(9);
    doc.setTextColor(150, 150, 150);
    doc.text(
      `Page ${i} of ${pageCount}`,
      pageWidth / 2,
      doc.internal.pageSize.height - 10,
      { align: 'center' }
    );
  }

  // Download
  const fileName = `${title.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`;
  doc.save(fileName);
}
