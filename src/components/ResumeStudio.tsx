"use client";

import React, { useState, useRef, useEffect } from 'react';
import type { UserProfile } from '@/types/profile';
import type { ResumeData, ChatMessage } from '@/types/resume';

interface Props {
  profile: UserProfile;
  onResumeDataChange: (data: ResumeData) => void;
  initialResumeData?: ResumeData | null;
  initialPdfBase64?: string | null;
  onResumeSave?: (data: ResumeData, pdfBase64: string) => void;
}

function base64ToBlobUrl(base64: string): string {
  const bytes = atob(base64);
  const arr = new Uint8Array(bytes.length);
  for (let i = 0; i < bytes.length; i++) arr[i] = bytes.charCodeAt(i);
  return URL.createObjectURL(new Blob([arr], { type: 'application/pdf' }));
}

export default function ResumeStudio({ profile, onResumeDataChange, initialResumeData, initialPdfBase64, onResumeSave }: Props) {
  const [resumeData, setResumeData] = useState<ResumeData | null>(initialResumeData ?? null);
  const [pdfUrl, setPdfUrl] = useState<string | null>(initialPdfBase64 ? base64ToBlobUrl(initialPdfBase64) : null);
  const [pdfBase64, setPdfBase64] = useState<string | null>(initialPdfBase64 ?? null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [chatLoading, setChatLoading] = useState(false);
  const [uploadedText, setUploadedText] = useState('');
  const [status, setStatus] = useState('');

  const fileInputRef = useRef<HTMLInputElement>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Sync when parent loads saved resume from Supabase
  useEffect(() => {
    if (initialResumeData && !resumeData) {
      setResumeData(initialResumeData);
      onResumeDataChange(initialResumeData);
    }
  }, [initialResumeData]);

  useEffect(() => {
    if (initialPdfBase64 && !pdfBase64) {
      if (pdfUrl) URL.revokeObjectURL(pdfUrl);
      setPdfUrl(base64ToBlobUrl(initialPdfBase64));
      setPdfBase64(initialPdfBase64);
    }
  }, [initialPdfBase64]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Clean up blob URLs on unmount
  useEffect(() => {
    return () => { if (pdfUrl) URL.revokeObjectURL(pdfUrl); };
  }, [pdfUrl]);

  const applyPdf = (data: ResumeData, base64: string) => {
    if (pdfUrl) URL.revokeObjectURL(pdfUrl);
    const url = base64ToBlobUrl(base64);
    setResumeData(data);
    setPdfUrl(url);
    setPdfBase64(base64);
    onResumeDataChange(data);
    onResumeSave?.(data, base64);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setStatus(`Reading ${file.name}…`);
    const form = new FormData();
    form.append('file', file);
    try {
      const res = await fetch('/api/resume/extract', { method: 'POST', body: form });
      const { text, error } = await res.json();
      if (error) { setStatus('Error: ' + error); return; }
      setUploadedText(text);
      setStatus(`✓ ${file.name} ready — click Generate to build your resume`);
    } catch {
      setStatus('Failed to read file');
    }
  };

  const handleGenerate = async () => {
    setLoading(true);
    setStatus('Generating your resume…');
    try {
      const res = await fetch('/api/resume/generate', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ profile, uploadedText }),
      });
      const { resumeData: data, pdfBase64: b64, error } = await res.json();
      if (error) { setStatus('Error: ' + error); return; }
      applyPdf(data, b64);
      setMessages([{ role: 'assistant', content: 'Resume generated! You can ask me to make any changes.' }]);
      setStatus('');
    } catch {
      setStatus('Failed to generate resume');
    } finally {
      setLoading(false);
    }
  };

  const handleChat = async () => {
    if (!input.trim() || !resumeData || chatLoading) return;
    const userMsg = input.trim();
    setInput('');
    const newMessages: ChatMessage[] = [...messages, { role: 'user', content: userMsg }];
    setMessages(newMessages);
    setChatLoading(true);
    try {
      const res = await fetch('/api/resume/chat', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resumeData, messages, userMessage: userMsg }),
      });
      const { resumeData: updated, pdfBase64: b64, reply, error } = await res.json();
      if (error) {
        setMessages(prev => [...prev, { role: 'assistant', content: 'Sorry, something went wrong. Please try again.' }]);
        return;
      }
      applyPdf(updated, b64);
      setMessages(prev => [...prev, { role: 'assistant', content: reply }]);
    } catch {
      setMessages(prev => [...prev, { role: 'assistant', content: 'Connection error. Please try again.' }]);
    } finally {
      setChatLoading(false);
    }
  };

  const handleDownload = () => {
    if (!pdfBase64) return;
    const a = document.createElement('a');
    a.href = 'data:application/pdf;base64,' + pdfBase64;
    a.download = `${resumeData?.name || 'resume'}.pdf`;
    a.click();
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div className="resume-scroll" style={{ flex: 1 }}>

        {/* Upload + Generate */}
        <div className="r-card">
          <div className="r-label">Resume Studio</div>
          <div style={{ display: 'flex', gap: '6px', marginBottom: '8px' }}>
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.docx,.txt"
              style={{ display: 'none' }}
              onChange={handleFileUpload}
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              style={{
                flex: 1, padding: '8px', borderRadius: '9px', fontSize: '11px', fontWeight: 600,
                border: '1px solid #e2e8f0', background: uploadedText ? '#f0fdf4' : 'white',
                color: uploadedText ? '#16a34a' : '#64748b', cursor: 'pointer',
              }}
            >
              {uploadedText ? '✓ File uploaded' : '↑ Upload Resume'}
            </button>
            <button
              onClick={handleGenerate}
              disabled={loading || profile.skills.length === 0}
              style={{
                flex: 2, padding: '8px', borderRadius: '9px', fontSize: '11px', fontWeight: 700,
                border: 'none', cursor: loading || profile.skills.length === 0 ? 'not-allowed' : 'pointer',
                background: loading || profile.skills.length === 0 ? '#e2e8f0' : 'linear-gradient(135deg, #1a60ee, #2890ff)',
                color: loading || profile.skills.length === 0 ? '#94a3b8' : 'white',
              }}
            >
              {loading ? '✦ Generating…' : resumeData ? '↺ Regenerate' : '✦ Generate'}
            </button>
          </div>
          {status && (
            <div style={{ fontSize: '10px', color: '#64748b', textAlign: 'center' }}>{status}</div>
          )}
          {profile.skills.length === 0 && (
            <div style={{ fontSize: '10px', color: '#94a3b8', textAlign: 'center', marginTop: '4px' }}>
              Complete your profile first to generate a resume
            </div>
          )}
        </div>

        {/* PDF Preview */}
        {pdfUrl && (
          <div className="r-card" style={{ padding: '10px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <div className="r-label" style={{ margin: 0 }}>Preview</div>
              <button
                onClick={handleDownload}
                style={{
                  fontSize: '10px', fontWeight: 600, padding: '4px 10px', borderRadius: '8px',
                  border: '1px solid #93c5fd', background: 'rgba(37,99,235,0.08)',
                  color: '#2563eb', cursor: 'pointer',
                }}
              >
                ↓ Download PDF
              </button>
            </div>
            <div style={{ borderRadius: '8px', overflow: 'hidden', border: '1px solid #e2e8f0', background: '#f8fafc' }}>
              <iframe
                src={pdfUrl + '#toolbar=0&navpanes=0&scrollbar=1&view=FitH'}
                style={{ width: '100%', height: '340px', border: 'none', display: 'block' }}
                title="Resume Preview"
              />
            </div>
          </div>
        )}

        {/* Chat */}
        {resumeData && (
          <div className="r-card">
            <div className="r-label" style={{ marginBottom: '8px' }}>✦ Chat to Refine</div>
            <div style={{
              display: 'flex', flexDirection: 'column', gap: '7px',
              maxHeight: '180px', overflowY: 'auto', marginBottom: '8px', scrollbarWidth: 'none',
            }}>
              {messages.map((m, i) => (
                <div key={i} style={{
                  display: 'flex', justifyContent: m.role === 'user' ? 'flex-end' : 'flex-start',
                }}>
                  <div style={{
                    maxWidth: '85%', padding: '7px 10px', borderRadius: m.role === 'user' ? '12px 12px 2px 12px' : '12px 12px 12px 2px',
                    background: m.role === 'user' ? 'linear-gradient(135deg, #1a60ee, #2890ff)' : '#f1f5f9',
                    color: m.role === 'user' ? 'white' : '#334155',
                    fontSize: '10.5px', lineHeight: 1.5,
                  }}>
                    {m.content}
                  </div>
                </div>
              ))}
              {chatLoading && (
                <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
                  <div style={{ padding: '7px 10px', borderRadius: '12px 12px 12px 2px', background: '#f1f5f9', fontSize: '10.5px', color: '#94a3b8' }}>
                    Updating resume…
                  </div>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>
            <div style={{ display: 'flex', gap: '6px' }}>
              <input
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleChat(); } }}
                placeholder="e.g. make the summary shorter…"
                style={{
                  flex: 1, padding: '8px 10px', borderRadius: '10px', border: '1px solid #e2e8f0',
                  fontSize: '11px', outline: 'none', background: '#f8fafc', color: '#0f172a',
                }}
              />
              <button
                onClick={handleChat}
                disabled={!input.trim() || chatLoading}
                style={{
                  width: '34px', height: '34px', borderRadius: '10px', border: 'none',
                  background: !input.trim() || chatLoading ? '#e2e8f0' : 'linear-gradient(135deg, #1a60ee, #2890ff)',
                  color: !input.trim() || chatLoading ? '#94a3b8' : 'white',
                  cursor: !input.trim() || chatLoading ? 'not-allowed' : 'pointer',
                  fontSize: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                }}
              >
                →
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
