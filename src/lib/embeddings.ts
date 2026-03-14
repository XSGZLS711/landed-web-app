import { GoogleGenerativeAIEmbeddings } from '@langchain/google-genai';
import jobs from '@/data/jobs.json';
import type { UserProfile } from '@/types/profile';

const jobEmbeddingCache = new Map<string, number[]>();
let cachePopulated = false;
let cachePopulationPromise: Promise<void> | null = null;

function buildProfileText(profile: UserProfile): string {
  const parts: string[] = [];

  const name = profile.fullName ? profile.fullName : 'I';
  const title = profile.skills.length > 0 ? `${profile.skills[0]} professional` : 'professional';
  parts.push(`${name} is a ${title}` + (profile.experience > 0 ? ` with ${profile.experience} years of experience.` : '.'));

  if (profile.education && profile.education.length > 0) {
    const edu = profile.education.map(e =>
      `${e.degree} in ${e.field} from ${e.school}${e.year ? ` (${e.year})` : ''}`
    ).join('; ');
    parts.push(`Education: ${edu}.`);
  }

  if (profile.workExperience && profile.workExperience.length > 0) {
    const work = profile.workExperience.map(w =>
      `${w.role} at ${w.company}${w.description ? `: ${w.description.slice(0, 100)}` : ''}`
    ).join('; ');
    parts.push(`Work experience: ${work}.`);
  }

  if (profile.skills.length > 0) parts.push(`Technical skills: ${profile.skills.join(', ')}.`);
  if (profile.types.length > 0) parts.push(`Looking for ${profile.types.join(' or ')} positions.`);
  if (profile.locations.length > 0) parts.push(`Preferred locations: ${profile.locations.join(' or ')}.`);
  if (profile.minSalary > 0) parts.push(`Minimum salary: $${profile.minSalary}k.`);

  return parts.join(' ');
}

function buildJobText(job: Record<string, unknown>): string {
  const lines: string[] = [];
  lines.push(`Role: ${job.role} at ${job.company}`);
  lines.push(`Location: ${job.location} | Type: ${job.type} | Salary: ${job.salary}`);
  if (Array.isArray(job.skills) && job.skills.length > 0) {
    lines.push(`Skills required: ${(job.skills as string[]).join(', ')}`);
  }
  if (job.description) lines.push(`Job description: ${job.description}`);
  return lines.join('\n');
}

export function cosineSimilarity(a: number[], b: number[]): number {
  let dot = 0, normA = 0, normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  const denom = Math.sqrt(normA) * Math.sqrt(normB);
  return denom === 0 ? 0 : dot / denom;
}

async function ensureJobEmbeddingsPopulated(embedder: GoogleGenerativeAIEmbeddings): Promise<void> {
  if (cachePopulated) return;
  if (cachePopulationPromise) { await cachePopulationPromise; return; }

  cachePopulationPromise = (async () => {
    const jobList = jobs as Record<string, unknown>[];
    const uncached = jobList.filter(j => !jobEmbeddingCache.has(j.id as string));
    if (uncached.length === 0) { cachePopulated = true; return; }
    const embeddings = await embedder.embedDocuments(uncached.map(buildJobText));
    uncached.forEach((job, i) => jobEmbeddingCache.set(job.id as string, embeddings[i]));
    cachePopulated = true;
  })();

  await cachePopulationPromise;
}

function makeEmbedder(apiKey: string) {
  return new GoogleGenerativeAIEmbeddings({ model: 'gemini-embedding-001', apiKey });
}

export async function getSemanticScores(
  profile: UserProfile
): Promise<Map<string, number> | null> {
  const apiKey = process.env.GOOGLE_API_KEY;
  if (!apiKey || apiKey === 'your-google-api-key') return null;
  try {
    const embedder = makeEmbedder(apiKey);
    await ensureJobEmbeddingsPopulated(embedder);
    const profileEmbedding = await embedder.embedQuery(buildProfileText(profile));
    const scores = new Map<string, number>();
    for (const [jobId, jobEmbedding] of jobEmbeddingCache) {
      const sim = cosineSimilarity(profileEmbedding, jobEmbedding);
      scores.set(jobId, Math.round(((sim + 1) / 2) * 100));
    }
    return scores;
  } catch (err) {
    console.error('[embeddings] Falling back to rules:', err);
    return null;
  }
}

export async function getResumeSemanticScore(resumeText: string): Promise<number | null> {
  const apiKey = process.env.GOOGLE_API_KEY;
  if (!apiKey || apiKey === 'your-google-api-key') return null;
  try {
    const embedder = makeEmbedder(apiKey);
    await ensureJobEmbeddingsPopulated(embedder);
    const resumeEmbedding = await embedder.embedQuery(resumeText);
    let total = 0;
    for (const jobEmbedding of jobEmbeddingCache.values()) {
      total += cosineSimilarity(resumeEmbedding, jobEmbedding);
    }
    const avg = total / jobEmbeddingCache.size;
    return Math.round(((avg + 1) / 2) * 100);
  } catch (err) {
    console.error('[embeddings] Resume score error:', err);
    return null;
  }
}
