'use client';

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Download, Calendar, FileText, Loader2 } from 'lucide-react';
import { MONTHS } from '@/lib/constants';
import { useAuth } from '@/hooks/useAuth';
import { fetchTrades, fetchTradesForDateRange, fetchAvailableYears, getUserProfile } from '@/lib/database';
import { generateReportPDF } from '@/lib/reportGenerator';
import DatePickerPopup from '@/components/fields/DatePickerPopup';

interface ReportModalProps {
  onClose: () => void;
}

export default function ReportModal({ onClose }: ReportModalProps) {
  const { user } = useAuth();
  const now = new Date();

  const [mounted, setMounted] = useState(false);
  const [activeTab, setActiveTab] = useState<'monthly' | 'custom'>('monthly');

  useEffect(() => {
    setMounted(true);
  }, []);

  // Monthly tab state
  const [selectedMonth, setSelectedMonth] = useState<number>(now.getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState<number>(now.getFullYear());
  const [availableYears, setAvailableYears] = useState<number[]>([now.getFullYear()]);

  // Custom range tab state
  const firstDayOfMonthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
  const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

  const [startDate, setStartDate] = useState<string>(firstDayOfMonthStr);
  const [endDate, setEndDate] = useState<string>(todayStr);

  const [showStartDatePicker, setShowStartDatePicker] = useState<boolean>(false);
  const [showEndDatePicker, setShowEndDatePicker] = useState<boolean>(false);

  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Fetch available years from Firestore/Supabase
  useEffect(() => {
    if (!user) return;
    fetchAvailableYears(user.id).then((years) => {
      if (years && years.length > 0) {
        setAvailableYears(years);
        if (!years.includes(selectedYear)) {
          setSelectedYear(years[0]);
        }
      }
    });
  }, [user]);

  const handleDownloadMonthly = async () => {
    if (!user) return;
    setIsGenerating(true);
    setErrorMsg(null);
    try {
      const trades = await fetchTrades(user.id, selectedYear, selectedMonth);
      const profile = await getUserProfile(user.id);
      const userName = profile?.displayName || user.user_metadata?.full_name || user.email?.split('@')[0] || 'Unknown';
      const monthName = MONTHS[selectedMonth - 1];

      generateReportPDF({
        title: `Monthly Trading Report - ${monthName} ${selectedYear}`,
        subtitle: `Period: ${monthName} ${selectedYear}`,
        filename: `TradeLog_Report_${selectedYear}_${String(selectedMonth).padStart(2, '0')}.pdf`,
        userName,
        trades,
      });

      onClose();
    } catch (err: any) {
      console.error('Error generating monthly report:', err);
      setErrorMsg('Failed to generate report. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDownloadCustom = async () => {
    if (!user) return;
    if (!startDate || !endDate) {
      setErrorMsg('Please select both Start Date and End Date.');
      return;
    }
    if (startDate > endDate) {
      setErrorMsg('Start Date must be before or equal to End Date.');
      return;
    }

    setIsGenerating(true);
    setErrorMsg(null);
    try {
      const trades = await fetchTradesForDateRange(user.id, startDate, endDate);
      const profile = await getUserProfile(user.id);
      const userName = profile?.displayName || user.user_metadata?.full_name || user.email?.split('@')[0] || 'Unknown';

      generateReportPDF({
        title: `Trading Report (${startDate} to ${endDate})`,
        subtitle: `Period: ${startDate} to ${endDate}`,
        filename: `TradeLog_Report_${startDate}_to_${endDate}.pdf`,
        userName,
        trades,
      });

      onClose();
    } catch (err: any) {
      console.error('Error generating custom report:', err);
      setErrorMsg('Failed to generate report. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  const selectStyle: React.CSSProperties = {
    width: '100%',
    padding: '10px 14px',
    borderRadius: 8,
    border: '1px solid var(--border-default)',
    background: 'var(--bg-tertiary)',
    fontSize: '0.875rem',
    fontWeight: 500,
    color: 'var(--text-primary)',
    outline: 'none',
    cursor: 'pointer',
  };

  const inputButtonStyle: React.CSSProperties = {
    width: '100%',
    padding: '10px 14px',
    borderRadius: 8,
    border: '1px solid var(--border-default)',
    background: 'var(--bg-tertiary)',
    fontSize: '0.875rem',
    fontWeight: 500,
    color: 'var(--text-primary)',
    textAlign: 'left',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  };

  const labelStyle: React.CSSProperties = {
    fontSize: '0.75rem',
    fontWeight: 600,
    color: 'var(--text-tertiary)',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
    marginBottom: 6,
    display: 'block',
  };

  if (!mounted) return null;

  return createPortal(
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        width: '100vw',
        height: '100vh',
        background: 'var(--surface-overlay)',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
        animation: 'fadeIn 0.2s ease',
      }}
    >
      {/* Modal Card */}
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '100%',
          maxWidth: 480,
          maxHeight: '90vh',
          background: 'var(--surface-elevated)',
          border: '1px solid var(--border-default)',
          borderRadius: 16,
          boxShadow: 'var(--shadow-lg)',
          display: 'flex',
          flexDirection: 'column',
          overflowY: 'auto',
          animation: 'scaleIn 0.2s ease-out',
          position: 'relative',
        }}
      >
        {/* Modal Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '20px 24px',
            borderBottom: '1px solid var(--border-default)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div
              style={{
                width: 34,
                height: 34,
                borderRadius: 8,
                background: 'var(--accent-light)',
                color: 'var(--accent-text)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <FileText size={18} />
            </div>
            <div>
              <h2 style={{ fontSize: '1.125rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                Download Report
              </h2>
              <p style={{ fontSize: '0.8125rem', color: 'var(--text-tertiary)', marginTop: 2 }}>
                Export trading performance & journal history
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'var(--bg-tertiary)',
              border: '1px solid var(--border-default)',
              borderRadius: 8,
              cursor: 'pointer',
              color: 'var(--text-secondary)',
              display: 'flex',
              padding: 6,
            }}
          >
            <X size={16} />
          </button>
        </div>

        {/* Modal Tab Switcher */}
        <div style={{ padding: '16px 24px 0 24px' }}>
          <div
            style={{
              display: 'flex',
              background: 'var(--bg-tertiary)',
              padding: 4,
              borderRadius: 10,
              border: '1px solid var(--border-default)',
            }}
          >
            <button
              onClick={() => setActiveTab('monthly')}
              style={{
                flex: 1,
                padding: '8px 12px',
                borderRadius: 7,
                fontSize: '0.8125rem',
                fontWeight: 600,
                border: 'none',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
                background: activeTab === 'monthly' ? 'var(--surface-card)' : 'transparent',
                color: activeTab === 'monthly' ? 'var(--text-primary)' : 'var(--text-tertiary)',
                boxShadow: activeTab === 'monthly' ? 'var(--shadow-sm)' : 'none',
              }}
            >
              Monthly Report
            </button>
            <button
              onClick={() => setActiveTab('custom')}
              style={{
                flex: 1,
                padding: '8px 12px',
                borderRadius: 7,
                fontSize: '0.8125rem',
                fontWeight: 600,
                border: 'none',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
                background: activeTab === 'custom' ? 'var(--surface-card)' : 'transparent',
                color: activeTab === 'custom' ? 'var(--text-primary)' : 'var(--text-tertiary)',
                boxShadow: activeTab === 'custom' ? 'var(--shadow-sm)' : 'none',
              }}
            >
              Custom Date Range
            </button>
          </div>
        </div>

        {/* Modal Content Body */}
        <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: 20 }}>
          {errorMsg && (
            <div
              style={{
                padding: '10px 14px',
                borderRadius: 8,
                background: 'rgba(239, 68, 68, 0.1)',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                color: 'var(--danger-text)',
                fontSize: '0.8125rem',
              }}
            >
              {errorMsg}
            </div>
          )}

          {activeTab === 'monthly' ? (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              {/* Month Dropdown */}
              <div>
                <label style={labelStyle}>Month</label>
                <select
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(Number(e.target.value))}
                  style={selectStyle}
                >
                  {MONTHS.map((name, index) => (
                    <option key={name} value={index + 1}>
                      {name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Year Dropdown (populated dynamically) */}
              <div>
                <label style={labelStyle}>Year</label>
                <select
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(Number(e.target.value))}
                  style={selectStyle}
                >
                  {availableYears.map((yr) => (
                    <option key={yr} value={yr}>
                      {yr}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              {/* Start Date Picker */}
              <div style={{ position: 'relative' }}>
                <label style={labelStyle}>Start Date</label>
                <button
                  onClick={() => {
                    setShowStartDatePicker(!showStartDatePicker);
                    setShowEndDatePicker(false);
                  }}
                  style={inputButtonStyle}
                >
                  <span>{startDate || 'Select Date'}</span>
                  <Calendar size={14} style={{ color: 'var(--text-tertiary)' }} />
                </button>
                {showStartDatePicker && (
                  <DatePickerPopup
                    value={startDate}
                    onChange={(date) => {
                      setStartDate(date);
                      setShowStartDatePicker(false);
                    }}
                    onClose={() => setShowStartDatePicker(false)}
                  />
                )}
              </div>

              {/* End Date Picker */}
              <div style={{ position: 'relative' }}>
                <label style={labelStyle}>End Date</label>
                <button
                  onClick={() => {
                    setShowEndDatePicker(!showEndDatePicker);
                    setShowStartDatePicker(false);
                  }}
                  style={inputButtonStyle}
                >
                  <span>{endDate || 'Select Date'}</span>
                  <Calendar size={14} style={{ color: 'var(--text-tertiary)' }} />
                </button>
                {showEndDatePicker && (
                  <DatePickerPopup
                    value={endDate}
                    onChange={(date) => {
                      setEndDate(date);
                      setShowEndDatePicker(false);
                    }}
                    onClose={() => setShowEndDatePicker(false)}
                  />
                )}
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div
          style={{
            padding: '16px 24px',
            borderTop: '1px solid var(--border-default)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'flex-end',
            gap: 12,
            background: 'var(--surface-elevated)',
          }}
        >
          <button className="btn btn-secondary" onClick={onClose} disabled={isGenerating}>
            Cancel
          </button>
          <button
            className="btn btn-primary"
            style={{ display: 'flex', alignItems: 'center', gap: 8 }}
            onClick={activeTab === 'monthly' ? handleDownloadMonthly : handleDownloadCustom}
            disabled={isGenerating}
          >
            {isGenerating ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                <span>Generating...</span>
              </>
            ) : (
              <>
                <Download size={16} />
                <span>Download</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
