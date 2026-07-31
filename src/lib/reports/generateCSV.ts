import { Trade } from '@/types';

export function generateCSV(trades: Trade[], title: string) {
  if (trades.length === 0) {
    alert('No trades available for this report.');
    return;
  }

  // Define the headers based on the Trade interface
  const headers = [
    'Trade Number',
    'Date',
    'Day',
    'Pair',
    'Direction',
    'Outcome',
    'Reward',
    'Commission',
    'Entry Model',
    'Remarks'
  ];

  // Extract all unique custom field keys across all trades
  const customFieldKeys = new Set<string>();
  trades.forEach(t => {
    if (t.customFields) {
      Object.keys(t.customFields).forEach(key => customFieldKeys.add(key));
    }
  });

  const customFieldsArray = Array.from(customFieldKeys);
  const allHeaders = [...headers, ...customFieldsArray];

  // Create the CSV rows
  const rows = trades.map(t => {
    const rowData = [
      t.tradeNumber || '',
      t.date || '',
      t.day || '',
      t.pair || '',
      t.direction || '',
      t.outcome || '',
      t.reward !== null ? t.reward : '',
      t.commission !== null ? t.commission : '',
      t.entryModel || '',
      `"${(t.remarks || '').replace(/"/g, '""')}"` // Escape quotes for CSV
    ];

    // Add custom fields in the exact order of customFieldsArray
    customFieldsArray.forEach(key => {
      const val = t.customFields?.[key];
      rowData.push(val !== undefined && val !== null ? val.toString() : '');
    });

    return rowData.join(',');
  });

  // Combine headers and rows
  const csvContent = [allHeaders.join(','), ...rows].join('\n');

  // Trigger download
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', `${title.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
