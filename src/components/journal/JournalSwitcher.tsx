'use client';

import { ChevronDown, Book } from 'lucide-react';
import { useActiveJournal } from '@/hooks/useActiveJournal';
import { useAuth } from '@/hooks/useAuth';

export default function JournalSwitcher() {
  const { user } = useAuth();
  const { activeJournalId, sharedJournals, setActiveJournal } = useActiveJournal();

  if (!user || sharedJournals.length === 0) {
    return null; // Don't show switcher if there are no shared journals
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'var(--surface-card)', border: '1px solid var(--border-default)', padding: '6px 12px', borderRadius: 8 }}>
      <Book size={16} color="var(--text-secondary)" />
      <select 
        value={activeJournalId === user.id ? 'mine' : activeJournalId || 'mine'}
        onChange={(e) => {
          const val = e.target.value;
          if (val === 'mine') {
            setActiveJournal(user.id, 'owner');
          } else {
            const j = sharedJournals.find(x => x.ownerUid === val);
            if (j) setActiveJournal(j.ownerUid, j.role);
          }
        }}
        style={{
          background: 'transparent',
          border: 'none',
          color: 'var(--text-primary)',
          fontSize: '0.875rem',
          fontWeight: 500,
          outline: 'none',
          cursor: 'pointer',
          appearance: 'none',
          paddingRight: 16
        }}
      >
        <option value="mine">My Journal</option>
        {sharedJournals.map(j => (
          <option key={j.ownerUid} value={j.ownerUid}>
            {j.ownerName}'s Journal — {j.role.charAt(0).toUpperCase() + j.role.slice(1)}
          </option>
        ))}
      </select>
      <ChevronDown size={14} color="var(--text-secondary)" style={{ marginLeft: -12, pointerEvents: 'none' }} />
    </div>
  );
}
