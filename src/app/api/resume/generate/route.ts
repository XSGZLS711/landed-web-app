import { NextResponse } from 'next/server';
import { ChatGoogleGenerativeAI } from '@langchain/google-genai';
import { generatePdf } from '@/lib/generate-pdf';
import type { UserProfile } from '@/types/profile';
import type { ResumeData } from '@/types/resume';

const SYSTEM_PROMPT = `You are a professional resume writer. Output ONLY valid JSON matching this exact structure, no markdown fences:
{
  "name": "",
  "email": "",
  "phone": "",
  "location": "",
  "summary": "",
  "experience": [{ "company": "", "role": "", "dates": "", "bullets": [""] }],
  "education": [{ "school": "", "degree": "", "year": "" }],
  "skills": [""]
}`;

export async function POST(req: Request) {
  const apiKey = process.env.GOOGLE_API_KEY;
  if (!apiKey) return NextResponse.json({ error: 'No API key' }, { status: 500 });

  const { profile, uploadedText } = await req.json() as { profile: UserProfile; uploadedText?: string };

  const eduText = profile.education?.length
    ? profile.education.map(e => `${e.degree} in ${e.field}, ${e.school} (${e.year})`).join('\n')
    : '';
  const workText = profile.workExperience?.length
    ? profile.workExperience.map(w =>
        `${w.role} at ${w.company} (${w.startDate}–${w.current ? 'Present' : w.endDate}): ${w.description}`
      ).join('\n')
    : '';

  const userPrompt = `Create a professional resume for:
Name: ${profile.fullName || 'Candidate'}
Email: (from auth)
Phone: ${profile.phone || ''}
Skills: ${profile.skills.join(', ')}
Experience years: ${profile.experience}
Education:
${eduText || 'Not provided'}
Work Experience:
${workText || 'Not provided'}
${uploadedText ? `\nAdditional context from uploaded resume:\n${uploadedText.slice(0, 3000)}` : ''}

Write strong action-verb bullet points. Be specific and quantify where possible.`;

  try {
    const llm = new ChatGoogleGenerativeAI({ model: 'gemini-2.0-flash', apiKey });
    const response = await llm.invoke([
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: userPrompt },
    ]);

    let jsonStr = response.content as string;
    jsonStr = jsonStr.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    const resumeData: ResumeData = JSON.parse(jsonStr);

    const pdfBuffer = await generatePdf(resumeData);
    const pdfBase64 = pdfBuffer.toString('base64');

    return NextResponse.json({ resumeData, pdfBase64 });
  } catch (err) {
    console.error('[resume/generate]', err);
    return NextResponse.json({ error: 'Failed to generate resume' }, { status: 500 });
  }
}
