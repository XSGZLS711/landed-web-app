import { NextResponse } from 'next/server';
import jobs from '@/data/jobs.json';
import { getSemanticScores } from '@/lib/embeddings';
import type { UserProfile } from '@/types/profile';

function parseSalary(salaryStr: string): number {
  const match = salaryStr?.match(/\$?(\d+)k/i);
  return match ? parseInt(match[1]) : 0;
}

function jobExperienceLevel(role: string): 'entry' | 'mid' | 'senior' {
  const lower = role.toLowerCase();
  if (lower.includes('intern') || lower.includes('junior') || lower.includes('jr')) return 'entry';
  if (lower.includes('senior') || lower.includes('sr') || lower.includes('lead') || lower.includes('staff') || lower.includes('principal')) return 'senior';
  return 'mid';
}

function userExperienceLevel(years: number): 'entry' | 'mid' | 'senior' {
  if (years <= 1) return 'entry';
  if (years <= 4) return 'mid';
  return 'senior';
}

export async function POST(req: Request) {
  const body = await req.json();

  // Support both old format ({ userSkills }) and new format ({ profile })
  let profile: UserProfile;
  if (body.profile) {
    profile = body.profile;
  } else if (body.userSkills) {
    profile = { skills: body.userSkills, experience: 0, locations: [], types: [], minSalary: 0 };
  } else {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  if (!Array.isArray(profile.skills)) {
    return NextResponse.json({ error: 'Invalid skills' }, { status: 400 });
  }

  const userLevel = userExperienceLevel(profile.experience);
  const normalizedUserSkills = profile.skills.map(s => s.toLowerCase());

  const semanticScores = await getSemanticScores(profile);
  const useSemantics = semanticScores !== null;

  const scoredJobs = (jobs as any[]).map(job => {
    let score = 0;

    const jobSkills: string[] = (job.skills || []).map((s: string) => s.toLowerCase());
    const matchedSkills = jobSkills.filter(s => normalizedUserSkills.includes(s));
    const unionSize = new Set([...jobSkills, ...normalizedUserSkills]).size;
    const jaccardRatio = unionSize > 0 ? matchedSkills.length / unionSize : 0;

    const normalizedLocs = profile.locations.map(l => l.toLowerCase());
    const jobLoc = (job.location || '').toLowerCase();
    const locationMatches = profile.locations.length === 0
      ? null
      : normalizedLocs.includes(jobLoc) || normalizedLocs.includes('remote');

    const normalizedTypes = profile.types.map(t => t.toLowerCase());
    const typeMatches = profile.types.length === 0
      ? null
      : normalizedTypes.includes((job.type || '').toLowerCase());

    const jobSalary = parseSalary(job.salary || '');
    const salaryRatio = profile.minSalary === 0 || jobSalary === 0
      ? null
      : Math.min(1, jobSalary / profile.minSalary);

    const jobLevel = jobExperienceLevel(job.role || '');
    const levelMatch = jobLevel === userLevel;

    if (useSemantics) {
      // ── Semantic mode ──────────────────────────────────────
      const semScore = semanticScores!.get(job.id) ?? 50;
      score += (semScore / 100) * 60;                              // 0–60 pts

      score += jaccardRatio * 20;                                  // 0–20 pts

      if (locationMatches === null) score += 5;                    // 0–10 pts
      else score += locationMatches ? 10 : 0;

      if (typeMatches === null) score += 3.5;                      // 0–7 pts
      else score += typeMatches ? 7 : 0;

      if (salaryRatio === null) score += 4;                        // 0–8 pts
      else score += salaryRatio * 8;

      if (levelMatch) score += 5;                                  // 0–5 pts
    } else {
      // ── Rule-only fallback ─────────────────────────────────
      score += jaccardRatio * 40;                                  // 0–40 pts

      if (locationMatches === null) score += 12.5;                 // 0–25 pts
      else score += locationMatches ? 25 : 0;

      if (typeMatches === null) score += 10;                       // 0–20 pts
      else score += typeMatches ? 20 : 0;

      if (salaryRatio === null) score += 7.5;                      // 0–15 pts
      else score += salaryRatio * 15;

      if (levelMatch) score += 5;                                  // 0–5 pts
    }

    const finalScore = Math.round(Math.min(100, Math.max(0, score)));
    return {
      ...job,
      semanticScore: finalScore,
      matchedSkills: matchedSkills.map(s =>
        (job.skills || []).find((js: string) => js.toLowerCase() === s) ?? s
      ),
    };
  });

  const recommended = scoredJobs
    .sort((a, b) => b.semanticScore - a.semanticScore)
    .slice(0, 10);

  return NextResponse.json(recommended);
}
