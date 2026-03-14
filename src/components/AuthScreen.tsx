"use client";

import React, { useState } from 'react';
import { createClient } from '@/lib/supabase/client';

interface Props {
  onSuccess: () => void;
}

export default function AuthScreen({ onSuccess }: Props) {
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const supabase = createClient();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setMessage('');

    if (mode === 'login') {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        setError(error.message);
      } else {
        onSuccess();
      }
    } else {
      const { error } = await supabase.auth.signUp({ email, password });
      if (error) {
        setError(error.message);
      } else {
        setMessage('Check your email to confirm your account.');
      }
    }

    setLoading(false);
  };

  const handleGoogle = async () => {
    setLoading(true);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/api/auth/callback` },
    });
    if (error) {
      setError(error.message);
      setLoading(false);
    }
  };

  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '10px 12px',
    borderRadius: '10px',
    border: '1px solid #e2e8f0',
    fontSize: '13px',
    outline: 'none',
    boxSizing: 'border-box',
    background: '#f8fafc',
    color: '#0f172a',
  };

  return (
    <div style={{ padding: '24px 20px', display: 'flex', flexDirection: 'column', height: '100%', justifyContent: 'center' }}>
      {/* Logo */}
      <div style={{ textAlign: 'center', marginBottom: '28px' }}>
        <svg width="36" height="36" viewBox="0 0 24 24" fill="none" style={{ margin: '0 auto 8px', display: 'block' }}>
          <path d="M21 16v-2l-8-5V3.5a1.5 1.5 0 0 0-3 0V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z" fill="#2563eb" />
        </svg>
        <div style={{ fontSize: '18px', fontWeight: 700, color: '#0f172a' }}>Landed</div>
        <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '4px' }}>
          {mode === 'login' ? 'Welcome back' : 'Create your account'}
        </div>
      </div>

      {/* Google button */}
      <button
        onClick={handleGoogle}
        disabled={loading}
        style={{
          width: '100%',
          padding: '10px',
          borderRadius: '10px',
          border: '1px solid #e2e8f0',
          background: 'white',
          fontSize: '12px',
          fontWeight: 600,
          color: '#0f172a',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '8px',
          marginBottom: '14px',
        }}
      >
        <svg width="16" height="16" viewBox="0 0 24 24">
          <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
          <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
          <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
          <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
        </svg>
        Continue with Google
      </button>

      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
        <div style={{ flex: 1, height: '1px', background: '#e2e8f0' }} />
        <span style={{ fontSize: '10px', color: '#94a3b8' }}>or</span>
        <div style={{ flex: 1, height: '1px', background: '#e2e8f0' }} />
      </div>

      {/* Email / password form */}
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          required
          style={inputStyle}
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={e => setPassword(e.target.value)}
          required
          style={inputStyle}
        />

        {error && (
          <div style={{ fontSize: '11px', color: '#ef4444', textAlign: 'center' }}>{error}</div>
        )}
        {message && (
          <div style={{ fontSize: '11px', color: '#22c55e', textAlign: 'center' }}>{message}</div>
        )}

        <button
          type="submit"
          disabled={loading}
          style={{
            width: '100%',
            padding: '11px',
            borderRadius: '10px',
            border: 'none',
            background: loading ? '#e2e8f0' : 'linear-gradient(135deg, #1a60ee, #2890ff)',
            color: loading ? '#94a3b8' : 'white',
            fontSize: '13px',
            fontWeight: 600,
            cursor: loading ? 'not-allowed' : 'pointer',
            boxShadow: loading ? 'none' : '0 4px 20px rgba(30,96,238,0.3)',
          }}
        >
          {loading ? '...' : mode === 'login' ? 'Sign In' : 'Create Account'}
        </button>
      </form>

      <div style={{ textAlign: 'center', marginTop: '14px', fontSize: '11px', color: '#94a3b8' }}>
        {mode === 'login' ? "Don't have an account? " : 'Already have an account? '}
        <span
          onClick={() => { setMode(mode === 'login' ? 'signup' : 'login'); setError(''); setMessage(''); }}
          style={{ color: '#2563eb', fontWeight: 600, cursor: 'pointer' }}
        >
          {mode === 'login' ? 'Sign up' : 'Sign in'}
        </span>
      </div>
    </div>
  );
}
