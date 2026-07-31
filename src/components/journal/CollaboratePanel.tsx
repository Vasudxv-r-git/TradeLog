'use client';

import { useState, useEffect } from 'react';
import { X, UserPlus, Users, Trash2 } from 'lucide-react';
import { Collaborator, Role } from '@/types';
import { useAuth } from '@/hooks/useAuth';
import { useActiveJournal } from '@/hooks/useActiveJournal';
import { fetchCollaborators, addCollaborator, updateCollaboratorRole, removeCollaborator } from '@/lib/database';

interface CollaboratePanelProps {
  onClose: () => void;
}

export default function CollaboratePanel({ onClose }: CollaboratePanelProps) {
  const { user } = useAuth();
  const { activeJournalId, activeRole } = useActiveJournal();
  const [collaborators, setCollaborators] = useState<Collaborator[]>([]);
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<Exclude<Role, 'owner'>>('viewer');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (activeJournalId) {
      loadCollaborators();
    }
  }, [activeJournalId]);

  const loadCollaborators = async () => {
    if (!activeJournalId) return;
    setLoading(true);
    const data = await fetchCollaborators(activeJournalId);
    setCollaborators(data);
    setLoading(false);
  };

  const handleInvite = async () => {
    if (!email.trim() || !activeJournalId || activeRole !== 'owner') return;
    const success = await addCollaborator(activeJournalId, email.trim(), role as Role);
    if (success) {
      setEmail('');
      await loadCollaborators();
    }
  };

  const handleUpdateRole = async (id: string, newRole: Exclude<Role, 'owner'>) => {
    if (activeRole !== 'owner') return;
    await updateCollaboratorRole(id, newRole as Role);
    await loadCollaborators();
  };

  const handleRemove = async (id: string) => {
    if (activeRole !== 'owner') return;
    await removeCollaborator(id);
    await loadCollaborators();
  };

  const inputStyle: React.CSSProperties = { padding: '10px 14px', fontSize: '0.875rem', borderRadius: 10, background: 'var(--bg-tertiary)', border: '1px solid var(--border-default)', color: 'var(--text-primary)', width: '100%' };
  const labelStyle: React.CSSProperties = { fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 6, display: 'block' };

  return (
    <>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'var(--surface-overlay)', zIndex: 400, animation: 'fadeIn 0.2s ease' }} />
      <div style={{ position: 'fixed', top: 0, right: 0, bottom: 0, width: '100%', maxWidth: 480, background: 'var(--surface-elevated)', zIndex: 410, display: 'flex', flexDirection: 'column', boxShadow: '-10px 0 40px rgba(0,0,0,0.15)', animation: 'slideInRight 0.3s cubic-bezier(0.16, 1, 0.3, 1)' }}>
        
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '24px 32px', borderBottom: '1px solid var(--border-default)' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Users size={20} color="var(--brand-primary)" />
              <h2 style={{ fontSize: '1.375rem', fontWeight: 700, color: 'var(--text-primary)' }}>Collaborate</h2>
            </div>
            <p style={{ fontSize: '0.8125rem', color: 'var(--text-tertiary)', marginTop: 4 }}>
              {activeRole === 'owner' ? 'Invite others to access this journal' : 'People who have access to this journal'}
            </p>
          </div>
          <button onClick={onClose} style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border-default)', borderRadius: 8, cursor: 'pointer', color: 'var(--text-secondary)', display: 'flex', padding: 8 }}>
            <X size={18} />
          </button>
        </div>
        
        {/* Body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '28px 32px', display: 'flex', flexDirection: 'column', gap: 24 }}>
          
          {/* Invite Section (Owner Only) */}
          {activeRole === 'owner' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div style={{ display: 'flex', gap: 12, alignItems: 'flex-end' }}>
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                  <label style={labelStyle}>Invite via Email</label>
                  <input type="email" style={inputStyle} placeholder="colleague@example.com" value={email} onChange={(e) => setEmail(e.target.value)} />
                </div>
                <div style={{ width: 120, display: 'flex', flexDirection: 'column' }}>
                  <label style={labelStyle}>Role</label>
                  <select style={inputStyle} value={role} onChange={(e) => setRole(e.target.value as any)}>
                    <option value="viewer">Viewer</option>
                    <option value="editor">Editor</option>
                  </select>
                </div>
              </div>
              <button className="btn btn-primary" onClick={handleInvite} disabled={!email.trim()} style={{ width: '100%', padding: '12px' }}>
                <UserPlus size={16} />
                Send Invite
              </button>
              <div style={{ height: 1, background: 'var(--border-default)', margin: '4px 0' }} />
            </div>
          )}

          {/* Collaborators List */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <h4 style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-primary)' }}>
              {activeRole === 'owner' ? 'Invited Collaborators' : 'Journal Access List'}
            </h4>
            
            {loading ? (
              <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Loading...</p>
            ) : collaborators.length === 0 ? (
              <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>No collaborators yet.</p>
            ) : (
              collaborators.map((c) => (
                <div key={c.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px', background: 'var(--bg-tertiary)', borderRadius: 10, border: '1px solid var(--border-default)' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    <span style={{ fontSize: '0.875rem', fontWeight: 500, color: 'var(--text-primary)' }}>{c.email}</span>
                    <span style={{ fontSize: '0.75rem', color: c.status === 'pending' ? '#eab308' : '#22c55e', textTransform: 'capitalize', fontWeight: 500 }}>
                      {c.status}
                    </span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    {activeRole === 'owner' ? (
                      <>
                        <select 
                          style={{ ...inputStyle, padding: '6px 10px', width: 'auto', background: 'var(--surface-card)' }} 
                          value={c.role} 
                          onChange={(e) => handleUpdateRole(c.id, e.target.value as any)}
                        >
                          <option value="viewer">Viewer</option>
                          <option value="editor">Editor</option>
                        </select>
                        <button onClick={() => handleRemove(c.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--semantic-error)', display: 'flex', padding: 6, borderRadius: 6 }} title="Remove">
                          <Trash2 size={16} />
                        </button>
                      </>
                    ) : (
                      <span style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', textTransform: 'capitalize', padding: '4px 8px', background: 'var(--surface-card)', borderRadius: 6, border: '1px solid var(--border-default)' }}>
                        {c.role}
                      </span>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

      </div>
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes slideInRight {
          from { transform: translateX(100%); }
          to { transform: translateX(0); }
        }
      `}} />
    </>
  );
}
