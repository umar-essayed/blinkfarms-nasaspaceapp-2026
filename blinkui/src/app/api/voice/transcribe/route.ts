import { NextResponse } from 'next/server';

const GROQ_API_KEY = process.env.GROQ_API_KEY || '';

// Clean common Whisper audio hallucinations on silence / ambient background noise
function cleanWhisperHallucinations(rawText: string): string {
  if (!rawText) return '';
  let cleaned = rawText
    .replace(/\[\s*(موسيقى|موسيقي|music|ضحك|laughter|تصفيق|applause|صوت|noise)\s*\]/gi, '')
    .replace(/\(\s*(موسيقى|موسيقي|music|ضحك|laughter|تصفيق|applause|صوت|noise)\s*\)/gi, '')
    .trim();

  // If after stripping tags, it's just silence or music tags
  if (/^(\s*موسيقى\s*|\s*موسيقي\s*|\s*music\s*|\s*توقف\s*|\s*صمت\s*|\.+)$/i.test(cleaned)) {
    return '';
  }
  return cleaned;
}

export async function POST(request: Request) {
  try {
    if (!GROQ_API_KEY) {
      return NextResponse.json(
        { error: 'Groq API key is not configured.' },
        { status: 500 }
      );
    }

    const formData = await request.formData();
    const file = formData.get('file');

    if (!file || !(file instanceof Blob)) {
      return NextResponse.json(
        { error: 'Audio file is required in form-data.' },
        { status: 400 }
      );
    }

    const language = formData.get('language') as string | null;

    // Try candidate models: whisper-large-v3-turbo then whisper-large-v3
    const candidateModels = ['whisper-large-v3-turbo', 'whisper-large-v3'];
    let finalTranscribedText = '';

    for (const model of candidateModels) {
      try {
        const groqFormData = new FormData();
        groqFormData.append('file', file, 'recording.webm');
        groqFormData.append('model', model);
        groqFormData.append('response_format', 'json');
        groqFormData.append('temperature', '0.1');
        if (language) {
          groqFormData.append('language', language);
        }

        const groqRes = await fetch('https://api.groq.com/openai/v1/audio/transcriptions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${GROQ_API_KEY}`,
          },
          body: groqFormData,
        });

        if (groqRes.ok) {
          const data = await groqRes.json();
          finalTranscribedText = cleanWhisperHallucinations(data.text || '');
          break;
        } else {
          console.warn(`Groq Whisper ${model} failed:`, await groqRes.text());
        }
      } catch (err) {
        console.warn(`Whisper ${model} network error:`, err);
      }
    }

    return NextResponse.json({
      success: true,
      text: finalTranscribedText,
    });
  } catch (error: any) {
    console.error('Voice transcription error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal voice transcription error' },
      { status: 500 }
    );
  }
}
