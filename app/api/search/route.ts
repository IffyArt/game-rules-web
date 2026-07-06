import { NextRequest, NextResponse } from 'next/server';
import { KNOWLEDGE_BASE } from '@/lib/db';

// Helper: CJK character bigram tokenizer + alphanumeric word extraction
function tokenize(text: string): string[] {
  if (!text) return [];
  const clean = text.toLowerCase().replace(/[\s\p{P}\p{S}]/gu, '');
  const tokens: string[] = [];
  
  // Extract alphanumeric sequences (words/numbers)
  (text.toLowerCase().match(/[a-z0-9]+/g) || []).forEach(w => tokens.push(w));
  
  // Extract CJK characters (single characters & bigrams)
  const cjk = clean.replace(/[a-z0-9]/g, '');
  for (let i = 0; i < cjk.length; i++) {
    tokens.push(cjk[i]);
    if (i < cjk.length - 1) {
      tokens.push(cjk[i] + cjk[i + 1]);
    }
  }
  return tokens;
}

// Build index statistics in-memory
const N = KNOWLEDGE_BASE.length;
const df: Record<string, number> = {};
const docTfs: Record<string, Record<string, number>> = {};
const docNorms: Record<string, number> = {};

KNOWLEDGE_BASE.forEach(item => {
  // keywords get 3x weight, title gets 2x weight
  const content = [
    item.title, item.title,
    item.keywords.join(' '), item.keywords.join(' '), item.keywords.join(' '),
    item.cat,
    item.definition,
    item.examples.join(' ')
  ].join(' ');
  
  const tokens = tokenize(content);
  const tf: Record<string, number> = {};
  tokens.forEach(t => {
    tf[t] = (tf[t] || 0) + 1;
  });
  
  docTfs[item.id] = tf;
  
  Object.keys(tf).forEach(t => {
    df[t] = (df[t] || 0) + 1;
  });
});

const idf: Record<string, number> = {};
Object.keys(df).forEach(t => {
  idf[t] = Math.log((N + 1) / (df[t] + 0.5)) + 1;
});

// Calculate doc vector norms
KNOWLEDGE_BASE.forEach(item => {
  const tf = docTfs[item.id];
  let sumSq = 0;
  Object.keys(tf).forEach(t => {
    const w = (1 + Math.log(tf[t])) * (idf[t] || 1);
    sumSq += w * w;
  });
  docNorms[item.id] = Math.sqrt(sumSq) || 1;
});

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const query = searchParams.get('q') || '';
    const lexicalWeight = parseFloat(searchParams.get('lexicalWeight') || '0.6');
    const tagWeight = parseFloat(searchParams.get('tagWeight') || '0.4');
    
    if (!query.trim()) {
      return NextResponse.json({ results: [] });
    }
    
    // Calculate query vector
    const qTokens = tokenize(query);
    if (!qTokens.length) {
      return NextResponse.json({ results: [] });
    }
    
    const qtf: Record<string, number> = {};
    qTokens.forEach(t => {
      qtf[t] = (qtf[t] || 0) + 1;
    });
    
    const qvec: Record<string, number> = {};
    let qSumSq = 0;
    Object.keys(qtf).forEach(t => {
      const w = (1 + Math.log(qtf[t])) * (idf[t] || 1);
      qvec[t] = w;
      qSumSq += w * w;
    });
    const qNorm = Math.sqrt(qSumSq) || 1;
    
    // Compute scores
    const scored = KNOWLEDGE_BASE.map(item => {
      // 1. Lexical Similarity (Cosine similarity)
      let dot = 0;
      const tf = docTfs[item.id];
      Object.keys(qvec).forEach(t => {
        if (tf[t]) {
          const w = (1 + Math.log(tf[t])) * (idf[t] || 1);
          dot += qvec[t] * w;
        }
      });
      const cosScore = dot / (qNorm * docNorms[item.id]);
      
      // 2. Tag Matcher (exact matching of keyword tags)
      let tagMatchCount = 0;
      item.keywords.forEach(k => {
        if (k.length >= 2 && query.toLowerCase().includes(k.toLowerCase())) {
          tagMatchCount += 1;
        }
      });
      const tagScore = tagMatchCount > 0 ? Math.min(1.0, tagMatchCount * 0.25) : 0.0;
      
      // 3. Combined Weighted Score
      const finalScore = (cosScore * lexicalWeight) + (tagScore * tagWeight);
      
      return {
        item,
        scores: {
          lexical: cosScore,
          tag: tagScore,
          final: finalScore
        }
      };
    });
    
    // Filter and sort
    const results = scored
      .filter(r => r.scores.final > 0.02)
      .sort((a, b) => b.scores.final - a.scores.final);
      
    return NextResponse.json({ results });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
