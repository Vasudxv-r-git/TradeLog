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
  const mainTitle = options.userName ? `TradeLog Report by ${options.userName}` : 'TradeLog Report';
  doc.text(mainTitle, 14, 13);

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
    t.tradeNumber || String(idx + 1),
    t.date || '—',
    t.day || '—',
    t.pair || '—',
    t.direction || '—',
    t.outcome || '—',
    t.reward !== null && t.reward !== undefined ? formatCurrency(t.reward) : '—',
    t.commission !== null && t.commission !== undefined ? formatCurrency(t.commission) : '—',
    t.entryModel || '—',
    t.remarks || '—',
  ]);

  autoTable(doc, {
    startY,
    head: [
      [
        '#',
        'Date',
        'Day',
        'Pair',
        'Dir',
        'Outcome',
        'Reward',
        'Comm',
        'Entry Model',
        'Remarks',
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
      fontSize: 7.5,
      cellPadding: 2,
      valign: 'middle',
    },
    columnStyles: {
      0: { halign: 'center', cellWidth: 8 },
      1: { cellWidth: 22 },
      2: { cellWidth: 14 },
      3: { cellWidth: 20 },
      4: { halign: 'center', cellWidth: 14 },
      5: { halign: 'center', cellWidth: 18 },
      6: { halign: 'right', cellWidth: 20 },
      7: { halign: 'right', cellWidth: 18 },
      8: { cellWidth: 24 },
      9: { cellWidth: 'auto' },
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
