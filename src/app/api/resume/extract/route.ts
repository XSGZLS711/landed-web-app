import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  const formData = await req.formData();
  const file = formData.get('file') as File | null;

  if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 });

  const buffer = Buffer.from(await file.arrayBuffer());
  const name = file.name.toLowerCase();
  let text = '';

  try {
    if (name.endsWith('.txt')) {
      text = buffer.toString('utf-8');
    } else if (name.endsWith('.pdf')) {
      const pdfParse = (await import('pdf-parse')).default;
      const result = await pdfParse(buffer);
      text = result.text;
    } else if (name.endsWith('.docx')) {
      const mammoth = await import('mammoth');
      const result = await mammoth.extractRawText({ buffer });
      text = result.value;
    } else {
      return NextResponse.json({ error: 'Unsupported file format. Use PDF, DOCX, or TXT.' }, { status: 400 });
    }
  } catch (err) {
    console.error('[extract]', err);
    return NextResponse.json({ error: 'Failed to read file' }, { status: 500 });
  }

  return NextResponse.json({ text: text.trim() });
}
