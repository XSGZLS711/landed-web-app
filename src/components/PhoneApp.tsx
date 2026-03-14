"use client";

import React, { useState, useEffect, useRef } from 'react';
import type { User } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/client';
import AuthScreen from './AuthScreen';
import OnboardingFlow from './OnboardingFlow';
import ResumeOverlay from './ResumeOverlay';
import ResumeStudio from './ResumeStudio';
import JobDetailOverlay from './JobDetailOverlay';
import type { UserProfile, Education, WorkExperience } from '@/types/profile';
import type { ResumeData } from '@/types/resume';

const DEFAULT_PROFILE: UserProfile = {
  fullName: '', phone: '',
  skills: [], experience: 0,
  locations: [], types: ['Full-time'], minSalary: 0,
  education: [], workExperience: [],
  baseResume: '', onboardingDone: false,
};

const ALL_SKILLS = [
  'React', 'TypeScript', 'Node.js', 'Python', 'AWS', 'Docker',
  'Kubernetes', 'GraphQL', 'SQL', 'Go', 'Rust', 'Swift',
  'Kotlin', 'Figma', 'System Design', 'Tailwind CSS',
];
const ALL_LOCATIONS = ['New York', 'San Francisco', 'Austin', 'Tokyo', 'Remote'];
const ALL_TYPES = ['Full-time', 'Part-time', 'Contract'];

function uid() { return Math.random().toString(36).slice(2); }

export default function PhoneApp() {
  const supabase = createClient();

  const [user, setUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [profile, setProfile] = useState<UserProfile>(DEFAULT_PROFILE);

  const [activeTab, setActiveTab] = useState<'swipe' | 'resume' | 'flights' | 'profile'>('swipe');
  const [jobs, setJobs] = useState<any[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [flights, setFlights] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [swipeDir, setSwipeDir] = useState<'left' | 'right' | null>(null);
  const hasFetched = useRef(false);

  // Resume overlay state (for Land action)
  const [resumeOverlay, setResumeOverlay] = useState<{
    job: any; pdfBase64: string; resumeData: ResumeData | null;
  } | null>(null);

  // Small progress bar while tailoring
  const [tailoring, setTailoring] = useState<{ job: any } | null>(null);

  // Stored resumeData for use in Land tailoring
  const [currentResumeData, setCurrentResumeData] = useState<ResumeData | null>(null);
  const [savedPdfBase64, setSavedPdfBase64] = useState<string | null>(null);

  // Job detail overlay
  const [jobDetail, setJobDetail] = useState<{ job: any; pdfBase64?: string } | null>(null);

  // Profile editing state
  const [editingEdu, setEditingEdu] = useState<string | null>(null);
  const [editingWork, setEditingWork] = useState<string | null>(null);

  // ── Auth ────────────────────────────────────────────────
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setAuthReady(true);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => {
      setUser(session?.user ?? null);
    });
    return () => subscription.unsubscribe();
  }, []);

  // ── Load profile from Supabase ──────────────────────────
  useEffect(() => {
    if (!user) return;
    hasFetched.current = false;
    supabase.from('profiles').select('*').eq('id', user.id).single().then(({ data, error }) => {
      if (error && error.code !== 'PGRST116') console.error('[loadProfile]', error);
      if (data) {
        const loaded: UserProfile = {
          fullName: data.full_name ?? '',
          phone: data.phone ?? '',
          skills: data.skills ?? [],
          experience: data.experience ?? 0,
          locations: data.locations ?? [],
          types: data.types ?? ['Full-time'],
          minSalary: data.min_salary ?? 0,
          education: data.education ?? [],
          workExperience: data.work_experience ?? [],
          baseResume: data.base_resume ?? '',
          onboardingDone: data.onboarding_done ?? false,
        };
        setProfile(loaded);
        if (data.flights) setFlights(data.flights);
        if (data.resume_data) setCurrentResumeData(data.resume_data);
        if (data.resume_pdf) setSavedPdfBase64(data.resume_pdf);
        if (loaded.onboardingDone && loaded.skills.length > 0 && !hasFetched.current) {
          hasFetched.current = true;
          fetchRecommendations(loaded);
        }
      }
    });
  }, [user]);

  // ── Save profile to Supabase ────────────────────────────
  const saveProfile = async (newProfile: UserProfile) => {
    setProfile(newProfile);
    if (!user) return;
    const { error } = await supabase.from('profiles').upsert({
      id: user.id,
      full_name: newProfile.fullName,
      phone: newProfile.phone,
      skills: newProfile.skills,
      experience: newProfile.experience,
      locations: newProfile.locations,
      types: newProfile.types,
      min_salary: newProfile.minSalary,
      education: newProfile.education,
      work_experience: newProfile.workExperience,
      base_resume: newProfile.baseResume,
      onboarding_done: newProfile.onboardingDone,
      updated_at: new Date().toISOString(),
    });
    if (error) {
      console.error('[saveProfile]', error);
      setSaveError(error.message);
    }
  };

  // ── Save resume to Supabase ─────────────────────────────
  const saveResume = async (data: ResumeData, pdf: string) => {
    setCurrentResumeData(data);
    setSavedPdfBase64(pdf);
    if (!user) return;
    await supabase.from('profiles').upsert({
      id: user.id,
      resume_data: data,
      resume_pdf: pdf,
      updated_at: new Date().toISOString(),
    });
  };

  // ── Save flights to Supabase ────────────────────────────
  const saveFlights = async (newFlights: any[]) => {
    if (!user) return;
    await supabase.from('profiles').upsert({
      id: user.id,
      flights: newFlights,
      updated_at: new Date().toISOString(),
    });
  };

  // ── Recommendations ─────────────────────────────────────
  const fetchRecommendations = async (p: UserProfile) => {
    if (p.skills.length === 0) return;
    setLoading(true);
    try {
      const res = await fetch('/api/recommend', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ profile: p }),
      });
      setJobs(await res.json());
      setCurrentIndex(0);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  // ── Land action → tailor resume ─────────────────────────
  const handleLand = async () => {
    const job = jobs[currentIndex];
    if (!job || swipeDir) return;
    setSwipeDir('right');
    setTailoring({ job });
    try {
      const res = await fetch('/api/resume/tailor', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resumeData: currentResumeData, job }),
      });
      const { resumeData: tailored, pdfBase64 } = await res.json();
      setTailoring(null);
      setResumeOverlay({ job, pdfBase64: pdfBase64 || '', resumeData: tailored });
    } catch {
      setTailoring(null);
    }
  };

  const handleMiss = () => {
    if (swipeDir) return;
    setSwipeDir('left');
  };

  const handleSwipeEnd = () => {
    setCurrentIndex(i => Math.min(i + 1, jobs.length));
    setSwipeDir(null);
  };

  const handleOverlaySave = (_: string) => {
    const job = resumeOverlay?.job;
    if (job && !flights.find(f => f.id === job.id)) {
      const updated = [...flights, { ...job, pdfBase64: resumeOverlay?.pdfBase64 || '', status: 'Airborne', appliedDate: new Date().toLocaleDateString() }];
      setFlights(updated);
      saveFlights(updated);
    }
    setResumeOverlay(null);
  };

  const handleOverlayDiscard = () => {
    const job = resumeOverlay?.job;
    if (job && !flights.find(f => f.id === job.id)) {
      const updated = [...flights, { ...job, pdfBase64: resumeOverlay?.pdfBase64 || '', status: 'Airborne', appliedDate: new Date().toLocaleDateString() }];
      setFlights(updated);
      saveFlights(updated);
    }
    setResumeOverlay(null);
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    setProfile(DEFAULT_PROFILE);
    setJobs([]); setFlights([]);
    hasFetched.current = false;
  };

  const toggle = (arr: string[], item: string) =>
    arr.includes(item) ? arr.filter(x => x !== item) : [...arr, item];

  const currentJob = jobs[currentIndex];
  const remaining = Math.max(0, jobs.length - currentIndex);

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '8px 10px', borderRadius: '8px',
    border: '1px solid #e2e8f0', fontSize: '11px', outline: 'none',
    background: '#f8fafc', color: '#0f172a', boxSizing: 'border-box',
  };

  // ── Render ──────────────────────────────────────────────
  if (!authReady) {
    return (
      <div className="phone" id="phone">
        <div className="sbar"><span>9:41</span><span style={{ letterSpacing: '2px' }}>···</span></div>
        <div style={{ display: 'flex', flex: 1, alignItems: 'center', justifyContent: 'center', color: '#94a3b8', fontSize: '20px' }}>✈</div>
      </div>
    );
  }

  return (
    <div className="phone" id="phone">
      <div className="sbar"><span>9:41</span><span style={{ letterSpacing: '2px' }}>···</span></div>

      {/* Not logged in */}
      {!user ? (
        <AuthScreen onSuccess={() => {}} />
      ) : !profile.onboardingDone ? (
        /* Onboarding */
        <>
          {saveError && (
            <div style={{ position: 'absolute', top: 60, left: 16, right: 16, zIndex: 200, background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '10px', padding: '10px 14px', fontSize: '11px', color: '#dc2626' }}>
              ⚠ Save failed: {saveError}
            </div>
          )}
          <OnboardingFlow
            initialProfile={profile}
            onComplete={async (completed) => {
              setSaveError('');
              await saveProfile(completed);
              fetchRecommendations(completed);
            }}
          />
        </>
      ) : (
        /* Main App */
        <>
          {/* Job detail overlay */}
          {jobDetail && (
            <JobDetailOverlay
              job={jobDetail.job}
              profileSkills={profile.skills}
              pdfBase64={jobDetail.pdfBase64}
              onClose={() => setJobDetail(null)}
            />
          )}

          {/* Resume overlay (Land action) */}
          {resumeOverlay && (
            <ResumeOverlay
              job={resumeOverlay.job}
              resumeText=""
              pdfBase64={resumeOverlay.pdfBase64}
              onSave={handleOverlaySave}
              onDiscard={handleOverlayDiscard}
            />
          )}

          {/* Tailoring — centered modal + dimmed backdrop */}
          {tailoring && (
            <div style={{
              position: 'absolute', inset: 0, zIndex: 90,
              background: 'rgba(10, 18, 40, 0.55)',
              backdropFilter: 'blur(5px)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              borderRadius: 'inherit',
              animation: 'overlayFadeIn 0.22s ease both',
            }}>
              <div style={{
                background: 'white', borderRadius: '22px',
                padding: '22px 24px', width: '230px',
                boxShadow: '0 24px 64px rgba(0,0,0,0.35)',
                animation: 'cardPopIn 0.32s cubic-bezier(0.34, 1.2, 0.64, 1) both',
              }}>
                {/* Company row */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px' }}>
                  <div style={{
                    width: '38px', height: '38px', borderRadius: '11px', flexShrink: 0,
                    background: tailoring.job.logoBg, color: tailoring.job.logoCol,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '16px', fontWeight: 800,
                    boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
                  }}>
                    {tailoring.job.logoTxt}
                  </div>
                  <div>
                    <div style={{ fontSize: '12px', fontWeight: 700, color: '#0f172a' }}>{tailoring.job.company}</div>
                    <div style={{ fontSize: '10px', color: '#94a3b8', marginTop: '1px' }}>{tailoring.job.role}</div>
                  </div>
                </div>

                {/* Label */}
                <div style={{ fontSize: '11px', color: '#2563eb', fontWeight: 600, marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ animation: 'pulse 1.2s ease-in-out infinite', display: 'inline-block' }}>✦</span>
                  Tailoring your resume…
                </div>

                {/* Progress bar */}
                <div style={{ height: '5px', background: '#e2e8f0', borderRadius: '5px', overflow: 'hidden' }}>
                  <div style={{
                    height: '100%', borderRadius: '5px',
                    background: 'linear-gradient(90deg, #1a60ee, #60a5fa)',
                    animation: 'tailorProgress 10s cubic-bezier(0.1, 0.4, 0.6, 1) forwards',
                  }} />
                </div>
                <div style={{ fontSize: '9px', color: '#cbd5e1', marginTop: '6px', textAlign: 'right' }}>AI-powered · ~10s</div>
              </div>
            </div>
          )}

          {/* Nav bar */}
          <div className="nbar">
            <div className="app-logo">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                <path d="M21 16v-2l-8-5V3.5a1.5 1.5 0 0 0-3 0V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z" fill="#2563eb" />
              </svg>
              Landed
            </div>
            <div className="boarding-badge" onClick={() => setActiveTab('profile')}>
              {profile.fullName || 'Profile'}
            </div>
          </div>

          {/* ── SWIPE TAB ── */}
          <div className={`screen ${activeTab === 'swipe' ? 'active' : ''}`}>
            <div className="card-area">
              <div className="bg-card b3" /><div className="bg-card b2" />
              {loading ? (
                <div className="job-card" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '10px', background: 'linear-gradient(135deg, #f0f6ff, #e8f0fe)' }}>
                  <div style={{ fontSize: '30px', animation: 'spin 2s linear infinite' }}>✈</div>
                  <div style={{ color: '#2563eb', fontSize: '12px', fontWeight: 600 }}>Finding your matches…</div>
                  <div style={{ color: '#94a3b8', fontSize: '10px' }}>Powered by AI</div>
                </div>
              ) : currentJob ? (
                <div
                  className="job-card"
                  id="topCard"
                  onClick={() => !swipeDir && setJobDetail({ job: currentJob })}
                  onAnimationEnd={swipeDir ? handleSwipeEnd : undefined}
                  style={{
                    cursor: 'pointer',
                    pointerEvents: swipeDir ? 'none' : 'auto',
                    animation: swipeDir === 'left'
                      ? 'swipeLeft 0.36s cubic-bezier(0.4, 0, 0.8, 0.6) forwards'
                      : swipeDir === 'right'
                      ? 'swipeRight 0.36s cubic-bezier(0.4, 0, 0.8, 0.6) forwards'
                      : undefined,
                  }}
                >
                  <div className="card-hero" style={{ background: currentJob.gradient }} />
                  <div className="card-body">
                    <div className="co-row">
                      <div className="co-badge" style={{ background: currentJob.logoBg, color: currentJob.logoCol }}>{currentJob.logoTxt}</div>
                      <div>
                        <div className="co-name">{currentJob.company}</div>
                        <div className="role-title">{currentJob.role}</div>
                      </div>
                    </div>
                    <div className="flight-pill" style={{ marginTop: '8px' }}>
                      <span>{currentJob.semanticScore}% match</span>
                    </div>
                    <div className="chips" style={{ marginTop: '6px', flexWrap: 'wrap', gap: '4px' }}>
                      <div className="chip">{currentJob.location}</div>
                      <div className="chip">{currentJob.salary}</div>
                      <div className="chip">{currentJob.type}</div>
                    </div>
                    {currentJob.skills?.length > 0 && (
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '3px', marginTop: '8px' }}>
                        {currentJob.skills.slice(0, 5).map((s: string) => {
                          const matched = profile.skills.includes(s);
                          return (
                            <span key={s} style={{
                              fontSize: '9px', padding: '2px 6px', borderRadius: '4px',
                              background: matched ? '#dbeafe' : '#f1f5f9',
                              color: matched ? '#1d4ed8' : '#94a3b8',
                              border: `1px solid ${matched ? '#93c5fd' : 'transparent'}`,
                            }}>{s}</span>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="job-card" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '10px', padding: '20px' }}>
                  <div style={{ fontSize: '28px', opacity: 0.4 }}>✈</div>
                  <div style={{ color: '#64748b', fontSize: '12px', textAlign: 'center', lineHeight: 1.6 }}>
                    {profile.skills.length === 0 ? 'Add skills in your profile to find matches' : "You've reviewed all your matches!"}
                  </div>
                </div>
              )}
            </div>
            {remaining > 0 && !loading && (
              <div style={{ textAlign: 'center', fontSize: '10px', color: '#94a3b8', marginBottom: '2px' }}>
                {remaining} job{remaining !== 1 ? 's' : ''} remaining
              </div>
            )}
            <div className="actions">
              <button className="abtn miss" onClick={handleMiss}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#dd5555" strokeWidth="2" strokeLinecap="round">
                  <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
              <button className="abtn land" onClick={handleLand}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                  <path d="M21 16v-2l-8-5V3.5a1.5 1.5 0 0 0-3 0V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z" fill="#2563eb" />
                </svg>
              </button>
            </div>
          </div>

          {/* ── RESUME TAB ── */}
          <div className={`screen ${activeTab === 'resume' ? 'active' : ''}`}>
            <ResumeStudio
              profile={profile}
              onResumeDataChange={(data) => setCurrentResumeData(data)}
              initialResumeData={currentResumeData}
              initialPdfBase64={savedPdfBase64}
              onResumeSave={saveResume}
            />
          </div>

          {/* ── FLIGHTS TAB ── */}
          <div className={`screen ${activeTab === 'flights' ? 'active' : ''}`}>
            <div className="flights-scroll">
              {flights.length === 0 ? (
                <div style={{ textAlign: 'center', color: '#94a3b8', fontSize: '12px', padding: '50px 20px', lineHeight: 1.8 }}>
                  <div style={{ fontSize: '28px', marginBottom: '8px', opacity: 0.4 }}>✈</div>
                  No active flights yet.<br />
                  <span style={{ fontSize: '11px' }}>Land on a job to start tracking!</span>
                </div>
              ) : (
                <>
                  <div className="flight-header">
                    <div className="flight-stats">
                      <div className="fstat"><div className="fstat-num">{flights.length}</div><div className="fstat-lbl">Applied</div></div>
                      <div className="fstat"><div className="fstat-num">{flights.filter(f => f.status === 'On Approach').length}</div><div className="fstat-lbl">Interviews</div></div>
                      <div className="fstat"><div className="fstat-num">{flights.filter(f => f.status === 'Landed').length}</div><div className="fstat-lbl">Offers</div></div>
                    </div>
                  </div>
                  <div className="flights-group-label">✈ Active flights</div>
                  {flights.map(job => (
                    <div key={job.id} className="flight-row" onClick={() => setJobDetail({ job, pdfBase64: job.pdfBase64 })} style={{ cursor: 'pointer' }}>
                      <div className="fl-logo" style={{ background: job.logoBg, color: job.logoCol }}>{job.logoTxt}</div>
                      <div className="fl-info">
                        <div className="fl-co">{job.company}</div>
                        <div className="fl-role">{job.role}</div>
                        <div className="fl-date">{job.appliedDate}</div>
                      </div>
                      <div className={`fl-badge ${job.status === 'Airborne' ? 'airborne' : 'approach'}`}>{job.status}</div>
                    </div>
                  ))}
                </>
              )}
            </div>
          </div>

          {/* ── PROFILE TAB ── */}
          <div className={`screen ${activeTab === 'profile' ? 'active' : ''}`}>
            <div className="profile-scroll">

              {/* Account */}
              <div className="profile-section" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ fontSize: '11px', color: '#94a3b8' }}>Signed in as</div>
                  <div style={{ fontSize: '12px', fontWeight: 600, color: '#0f172a', marginTop: '2px' }}>{user.email}</div>
                </div>
                <button onClick={handleSignOut} style={{ fontSize: '11px', color: '#ef4444', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px', padding: '5px 10px', cursor: 'pointer', fontWeight: 600 }}>
                  Sign out
                </button>
              </div>

              {/* Personal Info */}
              <div className="profile-section">
                <div className="profile-section-title">Personal Info</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '7px' }}>
                  <input style={inputStyle} placeholder="Full Name"
                    defaultValue={profile.fullName}
                    onBlur={e => { if (e.target.value !== profile.fullName) saveProfile({ ...profile, fullName: e.target.value }); }} />
                  <input style={inputStyle} placeholder="Phone (optional)"
                    defaultValue={profile.phone}
                    onBlur={e => { if (e.target.value !== profile.phone) saveProfile({ ...profile, phone: e.target.value }); }} />
                </div>
              </div>

              {/* Education */}
              <div className="profile-section">
                <div className="profile-section-title">Education</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {profile.education.map(edu => (
                    <div key={edu.id}>
                      {editingEdu === edu.id ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', background: '#f8fafc', borderRadius: '10px', padding: '10px', border: '1px solid #e2e8f0' }}>
                          <input style={inputStyle} placeholder="School" defaultValue={edu.school}
                            onBlur={e => saveProfile({ ...profile, education: profile.education.map(x => x.id === edu.id ? { ...x, school: e.target.value } : x) })} />
                          <input style={inputStyle} placeholder="Degree" defaultValue={edu.degree}
                            onBlur={e => saveProfile({ ...profile, education: profile.education.map(x => x.id === edu.id ? { ...x, degree: e.target.value } : x) })} />
                          <input style={inputStyle} placeholder="Field of Study" defaultValue={edu.field}
                            onBlur={e => saveProfile({ ...profile, education: profile.education.map(x => x.id === edu.id ? { ...x, field: e.target.value } : x) })} />
                          <input style={inputStyle} placeholder="Year" defaultValue={edu.year}
                            onBlur={e => saveProfile({ ...profile, education: profile.education.map(x => x.id === edu.id ? { ...x, year: e.target.value } : x) })} />
                          <button onClick={() => setEditingEdu(null)} style={{ fontSize: '11px', color: '#2563eb', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left', fontWeight: 600 }}>Done</button>
                        </div>
                      ) : (
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', padding: '6px 0', borderBottom: '1px solid #f1f5f9' }}>
                          <div>
                            <div style={{ fontSize: '11px', fontWeight: 600, color: '#334155' }}>{edu.school || 'School'}</div>
                            <div style={{ fontSize: '10px', color: '#94a3b8' }}>{[edu.degree, edu.field, edu.year].filter(Boolean).join(' · ')}</div>
                          </div>
                          <div style={{ display: 'flex', gap: '8px' }}>
                            <button onClick={() => setEditingEdu(edu.id)} style={{ background: 'none', border: 'none', color: '#2563eb', fontSize: '10px', cursor: 'pointer' }}>Edit</button>
                            <button onClick={() => saveProfile({ ...profile, education: profile.education.filter(x => x.id !== edu.id) })} style={{ background: 'none', border: 'none', color: '#ef4444', fontSize: '10px', cursor: 'pointer' }}>Remove</button>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                  <button
                    onClick={() => {
                      const newEdu: Education = { id: uid(), school: '', degree: '', field: '', year: '' };
                      const updated = { ...profile, education: [...profile.education, newEdu] };
                      saveProfile(updated);
                      setEditingEdu(newEdu.id);
                    }}
                    style={{ fontSize: '11px', color: '#2563eb', background: 'rgba(37,99,235,0.06)', border: '1px dashed #93c5fd', borderRadius: '8px', padding: '6px', cursor: 'pointer', fontWeight: 600 }}
                  >
                    + Add Education
                  </button>
                </div>
              </div>

              {/* Work Experience */}
              <div className="profile-section">
                <div className="profile-section-title">Work Experience</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {profile.workExperience.map(w => (
                    <div key={w.id}>
                      {editingWork === w.id ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', background: '#f8fafc', borderRadius: '10px', padding: '10px', border: '1px solid #e2e8f0' }}>
                          <input style={inputStyle} placeholder="Company" defaultValue={w.company}
                            onBlur={e => saveProfile({ ...profile, workExperience: profile.workExperience.map(x => x.id === w.id ? { ...x, company: e.target.value } : x) })} />
                          <input style={inputStyle} placeholder="Role / Title" defaultValue={w.role}
                            onBlur={e => saveProfile({ ...profile, workExperience: profile.workExperience.map(x => x.id === w.id ? { ...x, role: e.target.value } : x) })} />
                          <div style={{ display: 'flex', gap: '6px' }}>
                            <input style={{ ...inputStyle, flex: 1 }} placeholder="Start (2021-03)" defaultValue={w.startDate}
                              onBlur={e => saveProfile({ ...profile, workExperience: profile.workExperience.map(x => x.id === w.id ? { ...x, startDate: e.target.value } : x) })} />
                            <input style={{ ...inputStyle, flex: 1 }} placeholder="End" defaultValue={w.current ? '' : w.endDate} disabled={w.current}
                              onBlur={e => saveProfile({ ...profile, workExperience: profile.workExperience.map(x => x.id === w.id ? { ...x, endDate: e.target.value } : x) })} />
                          </div>
                          <label style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '10px', color: '#64748b', cursor: 'pointer' }}>
                            <input type="checkbox" checked={w.current}
                              onChange={e => saveProfile({ ...profile, workExperience: profile.workExperience.map(x => x.id === w.id ? { ...x, current: e.target.checked } : x) })} />
                            Currently here
                          </label>
                          <textarea style={{ ...inputStyle, height: '60px', resize: 'none', lineHeight: 1.5 } as React.CSSProperties}
                            placeholder="Key responsibilities..." defaultValue={w.description}
                            onBlur={e => saveProfile({ ...profile, workExperience: profile.workExperience.map(x => x.id === w.id ? { ...x, description: e.target.value } : x) })} />
                          <button onClick={() => setEditingWork(null)} style={{ fontSize: '11px', color: '#2563eb', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left', fontWeight: 600 }}>Done</button>
                        </div>
                      ) : (
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', padding: '6px 0', borderBottom: '1px solid #f1f5f9' }}>
                          <div>
                            <div style={{ fontSize: '11px', fontWeight: 600, color: '#334155' }}>{w.role || 'Role'} @ {w.company || 'Company'}</div>
                            <div style={{ fontSize: '10px', color: '#94a3b8' }}>{w.startDate} – {w.current ? 'Present' : w.endDate}</div>
                          </div>
                          <div style={{ display: 'flex', gap: '8px' }}>
                            <button onClick={() => setEditingWork(w.id)} style={{ background: 'none', border: 'none', color: '#2563eb', fontSize: '10px', cursor: 'pointer' }}>Edit</button>
                            <button onClick={() => saveProfile({ ...profile, workExperience: profile.workExperience.filter(x => x.id !== w.id) })} style={{ background: 'none', border: 'none', color: '#ef4444', fontSize: '10px', cursor: 'pointer' }}>Remove</button>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                  <button
                    onClick={() => {
                      const newW: WorkExperience = { id: uid(), company: '', role: '', startDate: '', endDate: '', current: false, description: '' };
                      const updated = { ...profile, workExperience: [...profile.workExperience, newW] };
                      saveProfile(updated);
                      setEditingWork(newW.id);
                    }}
                    style={{ fontSize: '11px', color: '#2563eb', background: 'rgba(37,99,235,0.06)', border: '1px dashed #93c5fd', borderRadius: '8px', padding: '6px', cursor: 'pointer', fontWeight: 600 }}
                  >
                    + Add Experience
                  </button>
                </div>
              </div>

              {/* Skills */}
              <div className="profile-section">
                <div className="profile-section-title">Skills</div>
                <div className="profile-chips">
                  {ALL_SKILLS.map(s => (
                    <div key={s} className={`profile-chip ${profile.skills.includes(s) ? 'active' : ''}`}
                      onClick={() => saveProfile({ ...profile, skills: toggle(profile.skills, s) })}>
                      {s}
                    </div>
                  ))}
                </div>
              </div>

              {/* Preferences */}
              <div className="profile-section">
                <div className="profile-section-title">Preferences</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <div>
                    <div style={{ fontSize: '9px', color: '#94a3b8', marginBottom: '5px' }}>LOCATIONS</div>
                    <div className="profile-chips">
                      {ALL_LOCATIONS.map(l => (
                        <div key={l} className={`profile-chip ${profile.locations.includes(l) ? 'active' : ''}`}
                          onClick={() => saveProfile({ ...profile, locations: toggle(profile.locations, l) })}>
                          {l}
                        </div>
                      ))}
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: '9px', color: '#94a3b8', marginBottom: '5px' }}>JOB TYPE</div>
                    <div className="profile-chips">
                      {ALL_TYPES.map(t => (
                        <div key={t} className={`profile-chip ${profile.types.includes(t) ? 'active' : ''}`}
                          onClick={() => saveProfile({ ...profile, types: toggle(profile.types, t) })}>
                          {t}
                        </div>
                      ))}
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: '9px', color: '#94a3b8', marginBottom: '4px' }}>
                      MIN SALARY: {profile.minSalary === 0 ? 'Any' : `$${profile.minSalary}k`}
                    </div>
                    <input type="range" min={0} max={200} step={10} value={profile.minSalary}
                      onChange={e => saveProfile({ ...profile, minSalary: Number(e.target.value) })}
                      style={{ width: '100%', accentColor: '#2563eb' }} />
                  </div>
                </div>
              </div>

              {/* Find Matches */}
              <button
                onClick={() => { fetchRecommendations(profile); setActiveTab('swipe'); }}
                disabled={profile.skills.length === 0}
                style={{
                  width: '100%', background: profile.skills.length === 0 ? '#e2e8f0' : 'linear-gradient(135deg, #1a60ee, #2890ff)',
                  color: profile.skills.length === 0 ? '#94a3b8' : 'white', border: 'none',
                  borderRadius: '12px', padding: '11px', fontSize: '13px', fontWeight: 600,
                  cursor: profile.skills.length === 0 ? 'not-allowed' : 'pointer',
                  boxShadow: profile.skills.length > 0 ? '0 4px 20px rgba(30,96,238,0.3)' : 'none',
                }}
              >
                ✈ Find My Matches
              </button>
            </div>
          </div>

          {/* Bottom nav */}
          <div className="bnav">
            {(['swipe', 'resume', 'flights', 'profile'] as const).map(tab => (
              <div key={tab} className={`bni ${activeTab === tab ? 'on' : ''}`} onClick={() => setActiveTab(tab)} style={{ position: 'relative' }}>
                {tab === 'swipe' && <svg width="15" height="15" viewBox="0 0 24 24" fill="none"><path d="M21 16v-2l-8-5V3.5a1.5 1.5 0 0 0-3 0V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z" fill="currentColor" /></svg>}
                {tab === 'resume' && <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /></svg>}
                {tab === 'flights' && <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><rect x="3" y="4" width="18" height="18" rx="2" /><line x1="3" y1="10" x2="21" y2="10" /></svg>}
                {tab === 'profile' && <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><circle cx="12" cy="8" r="4" /><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" /></svg>}
                <span>{tab}</span>
                {tab === 'flights' && flights.length > 0 && (
                  <span style={{ position: 'absolute', top: '-2px', right: '-4px', background: '#2563eb', color: 'white', fontSize: '7px', borderRadius: '50%', width: '12px', height: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700 }}>
                    {flights.length}
                  </span>
                )}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
