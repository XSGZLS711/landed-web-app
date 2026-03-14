"use client";

import React, { useState } from 'react';

interface Props {
  job: any;
  profileSkills?: string[];
  pdfBase64?: string;
  onClose: () => void;
}

function base64ToBlobUrl(base64: string): string {
  const bytes = atob(base64);
  const arr = new Uint8Array(bytes.length);
  for (let i = 0; i < bytes.length; i++) arr[i] = bytes.charCodeAt(i);
  return URL.createObjectURL(new Blob([arr], { type: 'application/pdf' }));
}

export default function JobDetailOverlay({ job, profileSkills = [], pdfBase64, onClose }: Props) {
  const [tab, setTab] = useState<'info' | 'resume'>('info');
  const pdfUrl = pdfBase64 ? base64ToBlobUrl(pdfBase64) : null;

  return (
    <div className="overlay-enter" style={{
      position: 'absolute', inset: 0, zIndex: 300,
      background: 'white', display: 'flex', flexDirection: 'column',
      borderRadius: 'inherit', overflow: 'hidden',
    }}>
      {/* Hero */}
      <div style={{ height: '90px', background: job.gradient, flexShrink: 0, position: 'relative' }}>
        <button
          onClick={onClose}
          style={{
            position: 'absolute', top: '12px', left: '14px',
            background: 'rgba(0,0,0,0.35)', border: 'none', borderRadius: '50%',
            width: '28px', height: '28px', color: 'white', fontSize: '16px',
            cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >
          ‹
        </button>
        {job.status && (
          <div style={{
            position: 'absolute', top: '12px', right: '14px',
            background: job.status === 'Airborne' ? 'rgba(37,99,235,0.85)' : 'rgba(22,163,74,0.85)',
            color: 'white', fontSize: '9px', fontWeight: 700,
            padding: '3px 8px', borderRadius: '10px',
          }}>
            {job.status}
          </div>
        )}
      </div>

      {/* Company info */}
      <div style={{ padding: '0 16px', marginTop: '-20px', flexShrink: 0 }}>
        <div style={{
          width: '44px', height: '44px', borderRadius: '12px',
          background: job.logoBg, color: job.logoCol,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '18px', fontWeight: 800, border: '3px solid white',
          boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
        }}>
          {job.logoTxt}
        </div>
        <div style={{ marginTop: '8px' }}>
          <div style={{ fontSize: '17px', fontWeight: 800, color: '#0f172a' }}>{job.company}</div>
          <div style={{ fontSize: '13px', color: '#475569', marginTop: '1px' }}>{job.role}</div>
        </div>

        {/* Pills */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px', marginTop: '10px' }}>
          {job.location && (
            <span style={{ fontSize: '10px', padding: '3px 8px', borderRadius: '6px', background: '#f1f5f9', color: '#475569' }}>
              📍 {job.location}
            </span>
          )}
          {job.salary && (
            <span style={{ fontSize: '10px', padding: '3px 8px', borderRadius: '6px', background: '#f1f5f9', color: '#475569' }}>
              💰 {job.salary}
            </span>
          )}
          {job.type && (
            <span style={{ fontSize: '10px', padding: '3px 8px', borderRadius: '6px', background: '#f1f5f9', color: '#475569' }}>
              🕐 {job.type}
            </span>
          )}
          {job.semanticScore != null && (
            <span style={{ fontSize: '10px', padding: '3px 8px', borderRadius: '6px', background: '#dbeafe', color: '#1d4ed8', fontWeight: 700 }}>
              {job.semanticScore}% match
            </span>
          )}
          {job.appliedDate && (
            <span style={{ fontSize: '10px', padding: '3px 8px', borderRadius: '6px', background: '#f0fdf4', color: '#16a34a' }}>
              Applied {job.appliedDate}
            </span>
          )}
        </div>
      </div>

      {/* Tabs — only show Resume tab if we have a PDF */}
      {pdfBase64 && (
        <div style={{ display: 'flex', padding: '12px 16px 0', gap: '4px', flexShrink: 0 }}>
          {(['info', 'resume'] as const).map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              style={{
                flex: 1, padding: '7px', borderRadius: '8px', fontSize: '11px', fontWeight: 600,
                border: 'none', cursor: 'pointer',
                background: tab === t ? 'linear-gradient(135deg, #1a60ee, #2890ff)' : '#f1f5f9',
                color: tab === t ? 'white' : '#64748b',
              }}
            >
              {t === 'info' ? 'Job Info' : '✈ My Resume'}
            </button>
          ))}
        </div>
      )}

      {/* Content */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '12px 16px 20px', scrollbarWidth: 'none' }}>

        {tab === 'info' && (
          <>
            {/* Skills */}
            {job.skills?.length > 0 && (
              <div style={{ marginBottom: '14px' }}>
                <div style={{ fontSize: '9px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '6px' }}>
                  Required Skills
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px' }}>
                  {job.skills.map((s: string) => {
                    const matched = profileSkills.includes(s);
                    return (
                      <span key={s} style={{
                        fontSize: '10px', padding: '3px 8px', borderRadius: '6px',
                        background: matched ? '#dbeafe' : '#f1f5f9',
                        color: matched ? '#1d4ed8' : '#64748b',
                        border: `1px solid ${matched ? '#93c5fd' : 'transparent'}`,
                        fontWeight: matched ? 600 : 400,
                      }}>
                        {matched ? '✓ ' : ''}{s}
                      </span>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Description */}
            {job.description && (
              <div>
                <div style={{ fontSize: '9px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '6px' }}>
                  About the Role
                </div>
                <p style={{ fontSize: '11px', color: '#475569', lineHeight: 1.7, margin: 0 }}>
                  {job.description}
                </p>
              </div>
            )}
          </>
        )}

        {tab === 'resume' && pdfUrl && (
          <div style={{ borderRadius: '10px', overflow: 'hidden', border: '1px solid #e2e8f0' }}>
            <iframe
              src={pdfUrl + '#toolbar=0&navpanes=0&scrollbar=1&view=FitH'}
              style={{ width: '100%', height: '420px', border: 'none', display: 'block' }}
              title="Submitted Resume"
            />
          </div>
        )}
      </div>
    </div>
  );
}
