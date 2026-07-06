import { KNOWLEDGE_BASE, Infraction } from '@/lib/db';

export interface SearchScores {
  lexical: number;
  tag: number;
  final: number;
}

export interface SearchResult {
  item: Infraction;
  scores: SearchScores;
}

export interface SearchOptions {
  lexicalWeight?: number;
  tagWeight?: number;
  minScore?: number;
  limit?: number;
}

const DEFAULT_LEXICAL_WEIGHT = 0.6;
const DEFAULT_TAG_WEIGHT = 0.4;
const DEFAULT_MIN_SCORE = 0.02;

export function tokenize(text: string): string[] {
  if (!text) return [];
  const clean = text.toLowerCase().replace(/[\s\p{P}\p{S}]/gu, '');
  const tokens: string[] = [];

  (text.toLowerCase().match(/[a-z0-9]+/g) || []).forEach((w) => tokens.push(w));

  const cjk = clean.replace(/[a-z0-9]/g, '');
  for (let i = 0; i < cjk.length; i++) {
    tokens.push(cjk[i]);
    if (i < cjk.length - 1) {
      tokens.push(cjk[i] + cjk[i + 1]);
    }
  }

  return tokens;
}

function buildDocumentContent(item: Infraction): string {
  return [
    item.title,
    item.title,
    item.keywords.join(' '),
    item.keywords.join(' '),
    item.keywords.join(' '),
    item.cat,
    item.definition,
    item.examples.join(' '),
  ].join(' ');
}

interface SearchIndex {
  N: number;
  df: Record<string, number>;
  docTfs: Record<string, Record<string, number>>;
  docNorms: Record<string, number>;
  idf: Record<string, number>;
}

function buildSearchIndex(): SearchIndex {
  const N = KNOWLEDGE_BASE.length;
  const df: Record<string, number> = {};
  const docTfs: Record<string, Record<string, number>> = {};

  KNOWLEDGE_BASE.forEach((item) => {
    const tokens = tokenize(buildDocumentContent(item));
    const tf: Record<string, number> = {};
    tokens.forEach((t) => {
      tf[t] = (tf[t] || 0) + 1;
    });
    docTfs[item.id] = tf;
    Object.keys(tf).forEach((t) => {
      df[t] = (df[t] || 0) + 1;
    });
  });

  const idf: Record<string, number> = {};
  Object.keys(df).forEach((t) => {
    idf[t] = Math.log((N + 1) / (df[t] + 0.5)) + 1;
  });

  const docNorms: Record<string, number> = {};
  KNOWLEDGE_BASE.forEach((item) => {
    const tf = docTfs[item.id];
    let sumSq = 0;
    Object.keys(tf).forEach((t) => {
      const w = (1 + Math.log(tf[t])) * (idf[t] || 1);
      sumSq += w * w;
    });
    docNorms[item.id] = Math.sqrt(sumSq) || 1;
  });

  return { N, df, docTfs, docNorms, idf };
}

const SEARCH_INDEX = buildSearchIndex();

function buildQueryVector(query: string): { qvec: Record<string, number>; qNorm: number } | null {
  const qTokens = tokenize(query);
  if (!qTokens.length) return null;

  const qtf: Record<string, number> = {};
  qTokens.forEach((t) => {
    qtf[t] = (qtf[t] || 0) + 1;
  });

  const qvec: Record<string, number> = {};
  let qSumSq = 0;
  Object.keys(qtf).forEach((t) => {
    const w = (1 + Math.log(qtf[t])) * (SEARCH_INDEX.idf[t] || 1);
    qvec[t] = w;
    qSumSq += w * w;
  });

  return { qvec, qNorm: Math.sqrt(qSumSq) || 1 };
}

function computeTagScore(query: string, item: Infraction): number {
  let tagMatchCount = 0;
  item.keywords.forEach((k) => {
    if (k.length >= 2 && query.toLowerCase().includes(k.toLowerCase())) {
      tagMatchCount += 1;
    }
  });
  return tagMatchCount > 0 ? Math.min(1.0, tagMatchCount * 0.25) : 0.0;
}

function scoreItem(
  query: string,
  item: Infraction,
  qvec: Record<string, number>,
  qNorm: number,
  lexicalWeight: number,
  tagWeight: number
): SearchScores {
  let dot = 0;
  const tf = SEARCH_INDEX.docTfs[item.id];
  Object.keys(qvec).forEach((t) => {
    if (tf[t]) {
      const w = (1 + Math.log(tf[t])) * (SEARCH_INDEX.idf[t] || 1);
      dot += qvec[t] * w;
    }
  });

  const lexical = dot / (qNorm * SEARCH_INDEX.docNorms[item.id]);
  const tag = computeTagScore(query, item);
  const final = lexical * lexicalWeight + tag * tagWeight;

  return { lexical, tag, final };
}

export function searchInfractions(query: string, options: SearchOptions = {}): SearchResult[] {
  const lexicalWeight = options.lexicalWeight ?? DEFAULT_LEXICAL_WEIGHT;
  const tagWeight = options.tagWeight ?? DEFAULT_TAG_WEIGHT;
  const minScore = options.minScore ?? DEFAULT_MIN_SCORE;
  const limit = options.limit;

  const queryVector = buildQueryVector(query);
  if (!queryVector) return [];

  const { qvec, qNorm } = queryVector;

  const results = KNOWLEDGE_BASE.map((item) => ({
    item,
    scores: scoreItem(query, item, qvec, qNorm, lexicalWeight, tagWeight),
  }))
    .filter((r) => r.scores.final > minScore)
    .sort((a, b) => b.scores.final - a.scores.final);

  return limit ? results.slice(0, limit) : results;
}

export function searchTopInfraction(
  query: string,
  options: SearchOptions = {}
): SearchResult | null {
  const minScore = options.minScore ?? 0.01;
  const results = searchInfractions(query, { ...options, minScore, limit: 1 });
  return results[0] ?? null;
}
