import { NextResponse } from 'next/server';
import { ChatGoogleGenerativeAI } from '@langchain/google-genai';
import { generatePdf } from '@/lib/generate-pdf';
import type { ResumeData, ChatMessage } from '@/types/resume';

export async function POST(req: Request) {
  const apiKey = process.env.GOOGLE_API_KEY;
  if (!apiKey) return NextResponse.json({ error: 'No API key' }, { status: 500 });

  const { resumeData, messages, userMessage } = await req.json() as {
    resumeData: ResumeData;
    messages: ChatMessage[];
    userMessage: string;
  };

  const systemPrompt = `You are a professional resume editor. The user wants to modify their resume.
Current resume JSON:
${JSON.stringify(resumeData, null, 2)}

Apply the user's requested changes and return ONLY the updated JSON (same structure, no markdown fences).
If the change is minor, still return the complete JSON.
After the JSON, on a new line starting with "REPLY:", write a brief friendly confirmation of what you changed.`;

  const conversationMessages = [
    { role: 'system' as const, content: systemPrompt },
    ...messages.map(m => ({ role: m.role as 'user' | 'assistant', content: m.content })),
    { role: 'user' as const, content: userMessage },
  ];

  try {
    const llm = new ChatGoogleGenerativeAI({ model: 'gemini-2.0-flash', apiKey });
    const response = await llm.invoke(conversationMessages);
    const raw = (response.content as string).trim();

    // Split JSON and reply
    const replyMatch = raw.match(/\nREPLY:([\s\S]*)$/);
    const reply = replyMatch ? replyMatch[1].trim() : 'Resume updated!';
    let jsonStr = replyMatch ? raw.slice(0, replyMatch.index) : raw;
    jsonStr = jsonStr.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();

    const updatedData: ResumeData = JSON.parse(jsonStr);
    const pdfBuffer = await generatePdf(updatedData);
    const pdfBase64 = pdfBuffer.toString('base64');

    return NextResponse.json({ resumeData: updatedData, pdfBase64, reply });
  } catch (err) {
    console.error('[resume/chat]', err);
    return NextResponse.json({ error: 'Failed to update resume' }, { status: 500 });
  }
}
