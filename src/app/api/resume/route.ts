import { NextResponse } from 'next/server';
import { ChatGoogleGenerativeAI } from '@langchain/google-genai';
import { getResumeSemanticScore } from '@/lib/embeddings';

const ALL_SKILLS = [
  'React', 'TypeScript', 'Node.js', 'Python', 'AWS', 'Docker',
  'Kubernetes', 'GraphQL', 'SQL', 'Go', 'Rust', 'Swift',
  'Kotlin', 'Figma', 'System Design', 'Tailwind CSS',
];

export async function POST(req: Request) {
  const { resumeText, profileSkills = [] } = await req.json();

  if (!resumeText || resumeText.trim().length < 50) {
    return NextResponse.json({ error: 'Resume too short' }, { status: 400 });
  }

  const resumeLower = resumeText.toLowerCase();

  // ── 1. Keyword coverage ─────────────────────────────────
  const strongSkills = ALL_SKILLS.filter(s => resumeLower.includes(s.toLowerCase()));
  const missingSkills = (profileSkills as string[]).filter(
    (s: string) => !resumeLower.includes(s.toLowerCase())
  );
  const keywordScore = Math.round((strongSkills.length / ALL_SKILLS.length) * 100);

  // ── 2. Semantic score ────────────────────────────────────
  const semanticScore = await getResumeSemanticScore(resumeText);

  // ── 3. Altitude score (combined) ────────────────────────
  const altitudeScore = semanticScore !== null
    ? Math.round(semanticScore * 0.6 + keywordScore * 0.4)
    : keywordScore;

  // ── 4. AI tips (Gemini) ──────────────────────────────────
  let aiTips: string[] = [];
  const apiKey = process.env.GOOGLE_API_KEY;
  if (apiKey && apiKey !== 'your-google-api-key') {
    try {
      const llm = new ChatGoogleGenerativeAI({ model: 'gemini-2.0-flash', apiKey });
      const prompt = `You are a professional resume coach. Analyze this resume and give exactly 3 short, specific, actionable improvement tips.
Each tip must be one sentence. Focus on concrete changes (e.g., "Add quantified metrics to your experience bullets" not "improve your resume").
Missing skills the user wants to highlight: ${missingSkills.join(', ') || 'none'}.
Return ONLY a JSON array of 3 strings, no other text.

Resume:
${resumeText.slice(0, 2000)}`;

      const response = await llm.invoke(prompt);
      const content = response.content as string;
      const match = content.match(/\[[\s\S]*\]/);
      if (match) aiTips = JSON.parse(match[0]);
    } catch (err) {
      console.error('[resume] AI tips error:', err);
    }
  }

  if (aiTips.length === 0) {
    aiTips = [
      'Add quantified metrics to each experience bullet (e.g., "improved performance by 40%").',
      'Include a concise skills section with your top technical keywords.',
      'Tailor your summary to match the specific role you are applying for.',
    ];
  }

  return NextResponse.json({
    altitudeScore,
    semanticScore,
    keywordScore,
    strongSkills,
    missingSkills,
    aiTips,
  });
}
