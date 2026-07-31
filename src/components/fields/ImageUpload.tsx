'use client';

import { useState } from 'react';
import { Link as LinkIcon, X } from 'lucide-react';
import { ImageEntry } from '@/types';

interface ImageUploadProps {
  value: ImageEntry[];
  onChange: (images: ImageEntry[]) => void;
}

export default function ImageUpload({ value, onChange }: ImageUploadProps) {
  const [showInput, setShowInput] = useState(false);
  const [urlInput, setUrlInput] = useState('');

  const handleAddUrl = () => {
    if (urlInput.trim()) {
      onChange([...value, { type: 'url', url: urlInput.trim() }]);
      setUrlInput('');
      setShowInput(false);
    }
  };

  const handleRemove = (index: number) => {
    onChange(value.filter((_, i) => i !== index));
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      {value.length > 0 && (
        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
          {value.map((img, i) => (
            <div key={i} style={{ position: 'relative', width: 32, height: 32, borderRadius: 4, overflow: 'hidden', border: '1px solid var(--border-default)', background: 'var(--bg-tertiary)' }} title={img.url}>
              <img src={img.url} alt="Trade link preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={(e) => { (e.target as HTMLImageElement).src = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="%2394a3b8" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path></svg>'; }} />
              <button onClick={() => handleRemove(i)} style={{ position: 'absolute', top: -2, right: -2, width: 16, height: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--danger-text)', color: 'white', borderRadius: '50%', cursor: 'pointer', border: 'none' }}>
                <X size={10} />
              </button>
            </div>
          ))}
        </div>
      )}

      <div style={{ display: 'flex', gap: 4 }}>
        <button onClick={() => setShowInput(!showInput)} title="Add image URL" style={{ width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 4, color: 'var(--text-tertiary)', cursor: 'pointer', border: 'none', background: 'transparent' }}>
          <LinkIcon size={13} />
        </button>
      </div>

      {showInput && (
        <div style={{ display: 'flex', gap: 4 }}>
          <input placeholder="Paste image URL" value={urlInput} onChange={(e) => setUrlInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleAddUrl()} autoFocus style={{ flex: 1, padding: '3px 6px', fontSize: '0.75rem', borderRadius: 4, border: '1px solid var(--border-default)', background: 'transparent', color: 'var(--text-primary)' }} />
          <button className="btn btn-primary btn-sm" onClick={handleAddUrl}>Add</button>
        </div>
      )}
    </div>
  );
}
