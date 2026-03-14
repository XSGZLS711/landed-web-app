"use client";

import React, { useEffect, useState } from 'react';

interface Props {
  job: { company: string; role: string };
  resumeText: string;
  pdfBase64?: string;
  onSave: (resumeText: string) => void;
  onDiscard: () => void;
}

function base64ToBlobUrl(base64: string): string {
  const bytes = atob(base64);
  const arr = new Uint8Array(bytes.length);
  for (let i = 0; i < bytes.length; i++) arr[i] = bytes.charCodeAt(i);
  return URL.createObjectURL(new Blob([arr], { type: 'application/pdf' }));
}

export default function ResumeOverlay({ job, pdfBase64, onSave, onDiscard }: Props) {
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);

  useEffect(() => {
    if (pdfBase64) {
      const url = base64ToBlobUrl(pdfBase64);
      setPdfUrl(url);
      return () => URL.revokeObjectURL(url);
    }
  }, [pdfBase64]);

  const handleDownload = () => {
    if (!pdfBase64) return;
    const a = document.createElement('a');
    a.href = 'data:application/pdf;base64,' + pdfBase64;
    a.download = `resume-${job.company.toLowerCase().replace(/\s+/g, '-')}.pdf`;
    a.click();
  };

  return (
    <div className="overlay-scale-enter" style={{
      position: 'absolute', inset: 0, zIndex: 100,
      background: '#ffffff',
      display: 'flex', flexDirection: 'column', overflow: 'hidden',
    }}>
      {/* Header */}
      <div style={{
        padding: '14px 18px 12px', flexShrink: 0,
        background: 'linear-gradient(135deg, #1a60ee, #2890ff)',
      }}>
        <div style={{ fontSize: '9px', color: 'rgba(255,255,255,0.7)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '3px' }}>
          ✈ Tailored Resume
        </div>
        <div style={{ fontSize: '14px', fontWeight: 700, color: 'white' }}>{job.role}</div>
        <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.8)', marginTop: '1px' }}>{job.company}</div>
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflow: 'hidden', position: 'relative' }}>
        {pdfUrl ? (
          <iframe
            src={pdfUrl + '#toolbar=0&navpanes=0&scrollbar=1'}
            style={{ width: '100%', height: '100%', border: 'none', display: 'block' }}
            title="Tailored Resume"
          />
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#94a3b8', fontSize: '12px' }}>
            Preview unavailable
          </div>
        )}
      </div>

      {/* Actions */}
      <div style={{
        padding: '10px 18px 16px', display: 'flex', gap: '8px',
        flexShrink: 0, borderTop: '1px solid rgba(0,0,0,0.06)', background: 'white',
      }}>
          <button onClick={onDiscard} style={{
            flex: 1, padding: '10px', borderRadius: '10px',
            border: '1px solid #e2e8f0', background: 'white',
            fontSize: '12px', fontWeight: 600, color: '#64748b', cursor: 'pointer',
          }}>
            Close
          </button>
          {pdfBase64 && (
            <button onClick={handleDownload} style={{
              flex: 1, padding: '10px', borderRadius: '10px',
              border: '1px solid #93c5fd', background: 'rgba(37,99,235,0.08)',
              fontSize: '12px', fontWeight: 600, color: '#2563eb', cursor: 'pointer',
            }}>
              ↓ Download
            </button>
          )}
          <button onClick={() => onSave('')} style={{
            flex: 2, padding: '10px', borderRadius: '10px', border: 'none',
            background: 'linear-gradient(135deg, #1a60ee, #2890ff)',
            color: 'white', fontSize: '12px', fontWeight: 700, cursor: 'pointer',
            boxShadow: '0 4px 16px rgba(30,96,238,0.3)',
          }}>
            Save & Apply ✈
          </button>
        </div>
    </div>
  );
}
