import { NextResponse } from 'next/server';
import { ChatGoogleGenerativeAI } from '@langchain/google-genai';
import { generatePdf } from '@/lib/generate-pdf';
import type { ResumeData } from '@/types/resume';

export async function POST(req: Request) {
  const apiKey = process.env.GOOGLE_API_KEY;
  if (!apiKey) return NextResponse.json({ error: 'No API key' }, { status: 500 });

  const { resumeData, job } = await req.json() as { resumeData: ResumeData; job: any };

  if (!resumeData || !job) {
    return NextResponse.json({ error: 'Missing resumeData or job' }, { status: 400 });
  }

  const systemPrompt = `You are a professional resume writer specializing in tailoring resumes for specific job postings.
Output ONLY valid JSON (same structure as input, no markdown fences).`;

  const userPrompt = `Tailor this resume for the following job:

JOB: ${job.role} at ${job.company}
Location: ${job.location} | Type: ${job.type}
Required Skills: ${(job.skills || []).join(', ')}
Description: ${job.description}

CURRENT RESUME:
${JSON.stringify(resumeData, null, 2)}

Instructions:
- Rewrite the summary to directly address this role and company
- Reorder experience bullets to highlight the most relevant skills
- Weave in keywords from the job description naturally
- Do NOT fabricate anything not in the original resume`;

  try {
    const llm = new ChatGoogleGenerativeAI({ model: 'gemini-2.0-flash', apiKey });
    const response = await llm.invoke([
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ]);

    let jsonStr = (response.content as string).replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    const tailoredData: ResumeData = JSON.parse(jsonStr);

    const pdfBuffer = await generatePdf(tailoredData);
    const pdfBase64 = pdfBuffer.toString('base64');

    return NextResponse.json({ resumeData: tailoredData, pdfBase64 });
  } catch (err) {
    console.error('[resume/tailor]', err);
    return NextResponse.json({ error: 'Failed to tailor resume' }, { status: 500 });
  }
}
