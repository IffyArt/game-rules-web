import { NextRequest, NextResponse } from 'next/server';
import { searchInfractions } from '@/lib/search';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const query = searchParams.get('q') || '';
    const lexicalWeight = parseFloat(searchParams.get('lexicalWeight') || '0.6');
    const tagWeight = parseFloat(searchParams.get('tagWeight') || '0.4');

    if (!query.trim()) {
      return NextResponse.json({ results: [] });
    }

    const results = searchInfractions(query, { lexicalWeight, tagWeight });

    return NextResponse.json({ results });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
