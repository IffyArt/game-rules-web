import { describe, it, expect } from 'vitest';
import { searchInfractions, searchTopInfraction } from '@/lib/search';
import { computeVerdict } from '@/lib/verdict';
import { MANUAL_SECTIONS } from '@/lib/db';
import fs from 'fs';
import path from 'path';

describe('RAG search engine', () => {
  it('finds decklist-related infractions', () => {
    const results = searchInfractions('選手沒有在期限內提交牌表');
    expect(results.length).toBeGreaterThan(0);
    expect(results[0].item.id).toBe('decklist-late');
  });

  it('finds cheating-related infractions via keywords', () => {
    const results = searchInfractions('偷看對手手牌');
    expect(results.length).toBeGreaterThan(0);
    expect(results.some((r) => r.item.id === 'saw-cards')).toBe(true);
  });

  it('returns empty for blank query', () => {
    expect(searchInfractions('   ')).toEqual([]);
    expect(searchTopInfraction('')).toBeNull();
  });

  it('respects lexical vs tag weight balance', () => {
    const lexicalHeavy = searchTopInfraction('多抽了一張牌', { lexicalWeight: 0.9, tagWeight: 0.1 });
    const tagHeavy = searchTopInfraction('多抽了一張牌', { lexicalWeight: 0.1, tagWeight: 0.9 });
    expect(lexicalHeavy?.item).toBeDefined();
    expect(tagHeavy?.item).toBeDefined();
  });
});

describe('Verdict engine', () => {
  it('returns DQ for cheating infractions regardless of level', () => {
    const result = computeVerdict({
      query: '被禁賽的人偷偷報名參賽',
      level: 'L1',
    });
    expect(result).not.toBeNull();
    expect(result?.verdict.penalty).toBe('dq');
    expect(result?.item.cheating).toBe(true);
  });

  it('escalates repeat cautions to warning', () => {
    const result = computeVerdict({
      query: '選手沒有攜帶遊戲必需的骰子',
      level: 'L1',
      repeat: 'repeat',
    });
    expect(result?.verdict.penalty).toBe('warning');
  });

  it('applies L3 stricter baseline than L1', () => {
    const l1 = computeVerdict({ query: '牌組比規定多了一張卡', level: 'L1' });
    const l3 = computeVerdict({ query: '牌組比規定多了一張卡', level: 'L3' });
    expect(l1?.verdict.penalty).toBe('warning');
    expect(l3?.verdict.penalty).toBe('gameloss');
  });

  it('returns low-confidence match for gibberish queries', () => {
    const result = computeVerdict({ query: 'qqqqwwwwxxxxzzzz' });
    expect(result).toBeNull();
  });
});

describe('Manual sections', () => {
  it('all manual markdown files exist in public/', () => {
    MANUAL_SECTIONS.forEach((section) => {
      const filePath = path.join(process.cwd(), 'public', section.file);
      expect(fs.existsSync(filePath), `Missing: ${section.file}`).toBe(true);
    });
  });
});
