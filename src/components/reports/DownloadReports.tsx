'use client';

import { useState } from 'react';
import { Download, FileText, Table, FileSpreadsheet, Calendar, Check, AlertCircle } from 'lucide-react';
import { useTrades } from '@/hooks/useTrades';
import { generatePDF } from '@/lib/reports/generatePDF';
import { generateExcel } from '@/lib/reports/generateExcel';
import { generateCSV } from '@/lib/reports/generateCSV';

export default function DownloadReports() {
  const { trades } = useTrades();
  const [isGenerating, setIsGenerating] = useState(false);
  const [statusMsg, setStatusMsg] = useState<{ text: string, type: 'success' | 'error' } | null>(null);

  // Custom Date Range State
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const handleGenerate = async (type: 'Weekly' | 'Monthly' | 'Custom', format: 'PDF' | 'Excel' | 'CSV') => {
    setIsGenerating(true);
    setStatusMsg(null);

    try {
      // 1. Filter trades based on report type
      let filteredTrades = [...trades];
      let dateRangeString = 'All Time';

      const now = new Date();
      
      if (type === 'Weekly') {
        const lastWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        filteredTrades = trades.filter(t => {
          if (!t.date) return false;
          const tDate = new Date(t.date);
          return tDate >= lastWeek && tDate <= now;
        });
        dateRangeString = `Last 7 Days (${lastWeek.toISOString().split('T')[0]} to ${now.toISOString().split('T')[0]})`;
      } 
      else if (type === 'Monthly') {
        // Our trades are already filtered by the active month in the context
        dateRangeString = 'Current Selected Month';
      } 
      else if (type === 'Custom') {
        if (!startDate || !endDate) {
          throw new Error('Please select both start and end dates.');
        }
        const start = new Date(startDate);
        const end = new Date(endDate);
        filteredTrades = trades.filter(t => {
          if (!t.date) return false;
          const tDate = new Date(t.date);
          return tDate >= start && tDate <= end;
        });
        dateRangeString = `${startDate} to ${endDate}`;
      }

      if (filteredTrades.length === 0) {
        throw new Error('No trades found for this period.');
      }

      const title = `${type} Trading Report`;

      // 2. Generate Report
      // Use setTimeout to allow UI to render the loading state
      await new Promise(resolve => setTimeout(resolve, 50)); 
      
      if (format === 'PDF') {
        generatePDF(filteredTrades, title, dateRangeString);
      } else if (format === 'Excel') {
        generateExcel(filteredTrades, title);
      } else if (format === 'CSV') {
        generateCSV(filteredTrades, title);
      }

      setStatusMsg({ text: `Successfully downloaded ${format} report!`, type: 'success' });
    } catch (err: any) {
      console.error(err);
      setStatusMsg({ text: err.message || 'Failed to generate report', type: 'error' });
    } finally {
      setIsGenerating(false);
      // Clear status message after 3 seconds
      setTimeout(() => setStatusMsg(null), 3000);
    }
  };

  return (
    <div className="dashboard-card" style={{ padding: '24px', borderRadius: '12px', border: '1px solid var(--border)', background: 'var(--card-bg)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
        <div style={{ padding: '8px', background: 'var(--primary)', color: 'white', borderRadius: '8px' }}>
          <Download size={20} />
        </div>
        <div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 600, margin: 0, color: 'var(--text-main)' }}>Download Reports</h2>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', margin: 0 }}>Generate professional PDF, Excel, and CSV reports</p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px' }}>
        
        {/* Weekly Report */}
        <div style={{ padding: '20px', border: '1px solid var(--border)', borderRadius: '8px', background: 'var(--bg-main)' }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '8px', color: 'var(--text-main)' }}>Weekly Report</h3>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: '16px' }}>Last 7 days of trading performance.</p>
          
          <div style={{ display: 'flex', gap: '8px' }}>
            <button 
              disabled={isGenerating}
              onClick={() => handleGenerate('Weekly', 'PDF')}
              className="btn" 
              style={{ flex: 1, padding: '8px', display: 'flex', justifyContent: 'center', gap: '6px', fontSize: '0.875rem', border: '1px solid var(--border)', background: 'var(--card-bg)' }}>
              <FileText size={16} /> PDF
            </button>
            <button 
              disabled={isGenerating}
              onClick={() => handleGenerate('Weekly', 'Excel')}
              className="btn" 
              style={{ flex: 1, padding: '8px', display: 'flex', justifyContent: 'center', gap: '6px', fontSize: '0.875rem', border: '1px solid var(--border)', background: 'var(--card-bg)' }}>
              <FileSpreadsheet size={16} /> Excel
            </button>
            <button 
              disabled={isGenerating}
              onClick={() => handleGenerate('Weekly', 'CSV')}
              className="btn" 
              style={{ flex: 1, padding: '8px', display: 'flex', justifyContent: 'center', gap: '6px', fontSize: '0.875rem', border: '1px solid var(--border)', background: 'var(--card-bg)' }}>
              <Table size={16} /> CSV
            </button>
          </div>
        </div>

        {/* Monthly Report */}
        <div style={{ padding: '20px', border: '1px solid var(--border)', borderRadius: '8px', background: 'var(--bg-main)' }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '8px', color: 'var(--text-main)' }}>Monthly Report</h3>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: '16px' }}>Full overview of the current selected month.</p>
          
          <div style={{ display: 'flex', gap: '8px' }}>
            <button 
              disabled={isGenerating}
              onClick={() => handleGenerate('Monthly', 'PDF')}
              className="btn" 
              style={{ flex: 1, padding: '8px', display: 'flex', justifyContent: 'center', gap: '6px', fontSize: '0.875rem', border: '1px solid var(--border)', background: 'var(--card-bg)' }}>
              <FileText size={16} /> PDF
            </button>
            <button 
              disabled={isGenerating}
              onClick={() => handleGenerate('Monthly', 'Excel')}
              className="btn" 
              style={{ flex: 1, padding: '8px', display: 'flex', justifyContent: 'center', gap: '6px', fontSize: '0.875rem', border: '1px solid var(--border)', background: 'var(--card-bg)' }}>
              <FileSpreadsheet size={16} /> Excel
            </button>
            <button 
              disabled={isGenerating}
              onClick={() => handleGenerate('Monthly', 'CSV')}
              className="btn" 
              style={{ flex: 1, padding: '8px', display: 'flex', justifyContent: 'center', gap: '6px', fontSize: '0.875rem', border: '1px solid var(--border)', background: 'var(--card-bg)' }}>
              <Table size={16} /> CSV
            </button>
          </div>
        </div>

        {/* Custom Report */}
        <div style={{ padding: '20px', border: '1px solid var(--border)', borderRadius: '8px', background: 'var(--bg-main)' }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '8px', color: 'var(--text-main)' }}>Custom Report</h3>
          <div style={{ display: 'flex', gap: '12px', marginBottom: '16px' }}>
            <div style={{ flex: 1 }}>
              <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '4px' }}>Start Date</label>
              <div style={{ position: 'relative' }}>
                <Calendar size={14} style={{ position: 'absolute', left: '8px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                <input 
                  type="date" 
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  style={{ width: '100%', padding: '6px 8px 6px 28px', fontSize: '0.875rem', borderRadius: '4px', border: '1px solid var(--border)', background: 'var(--card-bg)', color: 'var(--text-main)' }} 
                />
              </div>
            </div>
            <div style={{ flex: 1 }}>
              <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '4px' }}>End Date</label>
              <div style={{ position: 'relative' }}>
                <Calendar size={14} style={{ position: 'absolute', left: '8px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                <input 
                  type="date" 
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  style={{ width: '100%', padding: '6px 8px 6px 28px', fontSize: '0.875rem', borderRadius: '4px', border: '1px solid var(--border)', background: 'var(--card-bg)', color: 'var(--text-main)' }} 
                />
              </div>
            </div>
          </div>
          
          <div style={{ display: 'flex', gap: '8px' }}>
            <button 
              disabled={isGenerating || !startDate || !endDate}
              onClick={() => handleGenerate('Custom', 'PDF')}
              className="btn" 
              style={{ flex: 1, padding: '8px', display: 'flex', justifyContent: 'center', gap: '6px', fontSize: '0.875rem', border: '1px solid var(--border)', background: 'var(--card-bg)', opacity: (!startDate || !endDate) ? 0.5 : 1 }}>
              <FileText size={16} /> PDF
            </button>
            <button 
              disabled={isGenerating || !startDate || !endDate}
              onClick={() => handleGenerate('Custom', 'Excel')}
              className="btn" 
              style={{ flex: 1, padding: '8px', display: 'flex', justifyContent: 'center', gap: '6px', fontSize: '0.875rem', border: '1px solid var(--border)', background: 'var(--card-bg)', opacity: (!startDate || !endDate) ? 0.5 : 1 }}>
              <FileSpreadsheet size={16} /> Excel
            </button>
            <button 
              disabled={isGenerating || !startDate || !endDate}
              onClick={() => handleGenerate('Custom', 'CSV')}
              className="btn" 
              style={{ flex: 1, padding: '8px', display: 'flex', justifyContent: 'center', gap: '6px', fontSize: '0.875rem', border: '1px solid var(--border)', background: 'var(--card-bg)', opacity: (!startDate || !endDate) ? 0.5 : 1 }}>
              <Table size={16} /> CSV
            </button>
          </div>
        </div>
      </div>

      {/* Status Message */}
      {statusMsg && (
        <div style={{ 
          marginTop: '20px', 
          padding: '12px', 
          borderRadius: '8px', 
          display: 'flex', 
          alignItems: 'center', 
          gap: '8px',
          background: statusMsg.type === 'success' ? 'rgba(39, 174, 96, 0.1)' : 'rgba(231, 76, 60, 0.1)',
          color: statusMsg.type === 'success' ? '#27ae60' : '#e74c3c',
          border: `1px solid ${statusMsg.type === 'success' ? 'rgba(39, 174, 96, 0.2)' : 'rgba(231, 76, 60, 0.2)'}`
        }}>
          {statusMsg.type === 'success' ? <Check size={18} /> : <AlertCircle size={18} />}
          <span style={{ fontSize: '0.875rem', fontWeight: 500 }}>{statusMsg.text}</span>
        </div>
      )}
    </div>
  );
}
