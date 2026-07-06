import { NextRequest, NextResponse } from 'next/server';
import { computeVerdict, buildVerdictPrompt } from '@/lib/verdict';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      query = '',
      level = 'L2',
      intent = 'unknown',
      repeat = 'first',
      lexicalWeight = 0.6,
      tagWeight = 0.4,
    } = body;

    if (!query.trim()) {
      return NextResponse.json({ error: 'Query is empty' }, { status: 400 });
    }

    const result = computeVerdict({
      query,
      level,
      intent,
      repeat,
      lexicalWeight,
      tagWeight,
    });

    if (!result) {
      return NextResponse.json({
        verdict: null,
        message: '找不到相符的罰則條款，請換個說法。',
      });
    }

    const geminiKey = process.env.GEMINI_API_KEY;
    if (geminiKey) {
      try {
        const prompt = buildVerdictPrompt(
          { query, level, intent, repeat, lexicalWeight, tagWeight },
          result.item,
          result.verdict.penalty,
          result.verdict.reasons
        );

        const response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiKey}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [{ parts: [{ text: prompt }] }],
            }),
          }
        );

        if (response.ok) {
          const resJson = await response.json();
          result.verdict.aiExplanation =
            resJson.candidates?.[0]?.content?.parts?.[0]?.text || null;
        }
      } catch (e) {
        console.error('Failed to generate AI explanation:', e);
      }
    }

    return NextResponse.json({
      item: result.item,
      score: result.score,
      verdict: result.verdict,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
