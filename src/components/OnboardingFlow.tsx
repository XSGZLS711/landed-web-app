"use client";

import React, { useState } from 'react';
import type { UserProfile, Education, WorkExperience } from '@/types/profile';

const ALL_SKILLS = [
  'React', 'TypeScript', 'Node.js', 'Python', 'AWS', 'Docker',
  'Kubernetes', 'GraphQL', 'SQL', 'Go', 'Rust', 'Swift',
  'Kotlin', 'Figma', 'System Design', 'Tailwind CSS',
];
const ALL_LOCATIONS = ['New York', 'San Francisco', 'Austin', 'Tokyo', 'Remote'];
const ALL_TYPES = ['Full-time', 'Part-time', 'Contract'];

interface Props {
  initialProfile: UserProfile;
  onComplete: (profile: UserProfile) => void;
}

function uid() { return Math.random().toString(36).slice(2); }

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '9px 12px', borderRadius: '10px',
  border: '1px solid #e2e8f0', fontSize: '12px', outline: 'none',
  background: '#f8fafc', color: '#0f172a', boxSizing: 'border-box',
};

const labelStyle: React.CSSProperties = {
  fontSize: '10px', fontWeight: 600, color: '#64748b',
  textTransform: 'uppercase', letterSpacing: '0.06em',
  marginBottom: '4px', display: 'block',
};

export default function OnboardingFlow({ initialProfile, onComplete }: Props) {
  const [step, setStep] = useState(1);
  const [profile, setProfile] = useState<UserProfile>(initialProfile);

  const update = (patch: Partial<UserProfile>) => setProfile(p => ({ ...p, ...patch }));
  const toggle = (arr: string[], item: string) =>
    arr.includes(item) ? arr.filter(x => x !== item) : [...arr, item];

  const updateEdu = (id: string, patch: Partial<Education>) =>
    update({ education: profile.education.map(e => e.id === id ? { ...e, ...patch } : e) });
  const removeEdu = (id: string) =>
    update({ education: profile.education.filter(e => e.id !== id) });
  const addEdu = () =>
    update({ education: [...profile.education, { id: uid(), school: '', degree: '', field: '', year: '' }] });

  const updateWork = (id: string, patch: Partial<WorkExperience>) =>
    update({ workExperience: profile.workExperience.map(w => w.id === id ? { ...w, ...patch } : w) });
  const removeWork = (id: string) =>
    update({ workExperience: profile.workExperience.filter(w => w.id !== id) });
  const addWork = () =>
    update({ workExperience: [...profile.workExperience, { id: uid(), company: '', role: '', startDate: '', endDate: '', current: false, description: '' }] });

  const steps = [
    { title: 'Basic Info', subtitle: 'Tell us who you are' },
    { title: 'Education', subtitle: 'Your academic background' },
    { title: 'Work Experience', subtitle: 'Your career history' },
    { title: 'Skills & Preferences', subtitle: 'What you know and want' },
  ];

  const current = steps[step - 1];
  const isLast = step === steps.length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      {/* Progress bar */}
      <div style={{ padding: '10px 18px 0', flexShrink: 0 }}>
        <div style={{ height: '3px', background: '#e2e8f0', borderRadius: '3px', overflow: 'hidden' }}>
          <div style={{
            height: '100%', background: 'linear-gradient(90deg, #1a60ee, #2890ff)',
            borderRadius: '3px', width: `${(step / steps.length) * 100}%`, transition: 'width 0.3s ease',
          }} />
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '6px' }}>
          <div>
            <div style={{ fontSize: '14px', fontWeight: 700, color: '#0f172a' }}>{current.title}</div>
            <div style={{ fontSize: '10px', color: '#94a3b8', marginTop: '1px' }}>{current.subtitle}</div>
          </div>
          <div style={{ fontSize: '10px', color: '#94a3b8', alignSelf: 'flex-start', marginTop: '2px' }}>
            {step} / {steps.length}
          </div>
        </div>
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '14px 18px', scrollbarWidth: 'none' }}>

        {/* Step 1: Basic Info */}
        {step === 1 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div>
              <label style={labelStyle}>Full Name</label>
              <input style={inputStyle} placeholder="Jane Smith"
                value={profile.fullName}
                onChange={e => update({ fullName: e.target.value })} />
            </div>
            <div>
              <label style={labelStyle}>Phone (optional)</label>
              <input style={inputStyle} placeholder="+1 555 000 0000"
                value={profile.phone}
                onChange={e => update({ phone: e.target.value })} />
            </div>
          </div>
        )}

        {/* Step 2: Education */}
        {step === 2 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {profile.education.map((edu, i) => (
              <div key={edu.id} style={{ background: '#f8fafc', borderRadius: '12px', padding: '10px', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', gap: '7px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2px' }}>
                  <span style={{ fontSize: '11px', fontWeight: 600, color: '#334155' }}>Education {i + 1}</span>
                  <button onClick={() => removeEdu(edu.id)} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: '14px', lineHeight: 1 }}>×</button>
                </div>
                <input style={inputStyle} placeholder="School / University"
                  value={edu.school} onChange={e => updateEdu(edu.id, { school: e.target.value })} />
                <input style={inputStyle} placeholder="Degree (e.g. Bachelor of Science)"
                  value={edu.degree} onChange={e => updateEdu(edu.id, { degree: e.target.value })} />
                <input style={inputStyle} placeholder="Field of Study (e.g. Computer Science)"
                  value={edu.field} onChange={e => updateEdu(edu.id, { field: e.target.value })} />
                <input style={inputStyle} placeholder="Graduation Year"
                  value={edu.year} onChange={e => updateEdu(edu.id, { year: e.target.value })} />
              </div>
            ))}
            <button onClick={addEdu} style={{
              border: '1px dashed #93c5fd', borderRadius: '10px', background: 'rgba(37,99,235,0.04)',
              color: '#2563eb', fontSize: '12px', fontWeight: 600, padding: '9px', cursor: 'pointer',
            }}>
              + Add Education
            </button>
          </div>
        )}

        {/* Step 3: Work Experience */}
        {step === 3 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {profile.workExperience.map((w, i) => (
              <div key={w.id} style={{ background: '#f8fafc', borderRadius: '12px', padding: '10px', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', gap: '7px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2px' }}>
                  <span style={{ fontSize: '11px', fontWeight: 600, color: '#334155' }}>Experience {i + 1}</span>
                  <button onClick={() => removeWork(w.id)} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: '14px', lineHeight: 1 }}>×</button>
                </div>
                <input style={inputStyle} placeholder="Company"
                  value={w.company} onChange={e => updateWork(w.id, { company: e.target.value })} />
                <input style={inputStyle} placeholder="Role / Title"
                  value={w.role} onChange={e => updateWork(w.id, { role: e.target.value })} />
                <div style={{ display: 'flex', gap: '6px' }}>
                  <input style={{ ...inputStyle, flex: 1 }} placeholder="Start (2021-03)"
                    value={w.startDate} onChange={e => updateWork(w.id, { startDate: e.target.value })} />
                  <input style={{ ...inputStyle, flex: 1 }} placeholder="End" value={w.current ? '' : w.endDate}
                    disabled={w.current} onChange={e => updateWork(w.id, { endDate: e.target.value })} />
                </div>
                <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: '#64748b', cursor: 'pointer' }}>
                  <input type="checkbox" checked={w.current}
                    onChange={e => updateWork(w.id, { current: e.target.checked, endDate: '' })} />
                  Currently working here
                </label>
                <textarea
                  style={{ ...inputStyle, height: '64px', resize: 'none', lineHeight: 1.5 } as React.CSSProperties}
                  placeholder="Key responsibilities and achievements..."
                  value={w.description}
                  onChange={e => updateWork(w.id, { description: e.target.value })}
                />
              </div>
            ))}
            <button onClick={addWork} style={{
              border: '1px dashed #93c5fd', borderRadius: '10px', background: 'rgba(37,99,235,0.04)',
              color: '#2563eb', fontSize: '12px', fontWeight: 600, padding: '9px', cursor: 'pointer',
            }}>
              + Add Experience
            </button>
          </div>
        )}

        {/* Step 4: Skills & Preferences */}
        {step === 4 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div>
              <label style={labelStyle}>Skills</label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px' }}>
                {ALL_SKILLS.map(s => (
                  <div key={s} onClick={() => update({ skills: toggle(profile.skills, s) })}
                    className={`profile-chip ${profile.skills.includes(s) ? 'active' : ''}`}>
                    {s}
                  </div>
                ))}
              </div>
            </div>
            <div>
              <label style={labelStyle}>Preferred Locations</label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px' }}>
                {ALL_LOCATIONS.map(l => (
                  <div key={l} onClick={() => update({ locations: toggle(profile.locations, l) })}
                    className={`profile-chip ${profile.locations.includes(l) ? 'active' : ''}`}>
                    {l}
                  </div>
                ))}
              </div>
            </div>
            <div>
              <label style={labelStyle}>Job Type</label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px' }}>
                {ALL_TYPES.map(t => (
                  <div key={t} onClick={() => update({ types: toggle(profile.types, t) })}
                    className={`profile-chip ${profile.types.includes(t) ? 'active' : ''}`}>
                    {t}
                  </div>
                ))}
              </div>
            </div>
            <div>
              <label style={labelStyle}>Min Salary: {profile.minSalary === 0 ? 'Any' : `$${profile.minSalary}k`}</label>
              <input type="range" min={0} max={200} step={10} value={profile.minSalary}
                onChange={e => update({ minSalary: Number(e.target.value) })}
                style={{ width: '100%', accentColor: '#2563eb' }} />
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '9px', color: '#94a3b8' }}>
                <span>Any</span><span>$200k</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Navigation */}
      <div style={{ padding: '10px 18px 14px', display: 'flex', gap: '8px', flexShrink: 0, borderTop: '1px solid rgba(0,0,0,0.05)' }}>
        {step > 1 && (
          <button onClick={() => setStep(s => s - 1)} style={{
            flex: 1, padding: '10px', borderRadius: '10px', border: '1px solid #e2e8f0',
            background: 'white', fontSize: '12px', fontWeight: 600, color: '#64748b', cursor: 'pointer',
          }}>
            Back
          </button>
        )}
        <button
          onClick={() => isLast ? onComplete({ ...profile, onboardingDone: true }) : setStep(s => s + 1)}
          style={{
            flex: 2, padding: '10px', borderRadius: '10px', border: 'none',
            background: 'linear-gradient(135deg, #1a60ee, #2890ff)',
            color: 'white', fontSize: '12px', fontWeight: 700, cursor: 'pointer',
            boxShadow: '0 4px 16px rgba(30,96,238,0.3)',
          }}
        >
          {isLast ? '✈ Start Swiping' : 'Next →'}
        </button>
      </div>
    </div>
  );
}
