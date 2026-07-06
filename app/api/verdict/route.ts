import { NextRequest, NextResponse } from 'next/server';
import { KNOWLEDGE_BASE, PENALTY_META, Infraction } from '@/lib/db';

// Helper: Run the same search locally
function tokenize(text: string): string[] {
  if (!text) return [];
  const clean = text.toLowerCase().replace(/[\s\p{P}\p{S}]/gu, '');
  const tokens: string[] = [];
  (text.toLowerCase().match(/[a-z0-9]+/g) || []).forEach(w => tokens.push(w));
  const cjk = clean.replace(/[a-z0-9]/g, '');
  for (let i = 0; i < cjk.length; i++) {
    tokens.push(cjk[i]);
    if (i < cjk.length - 1) tokens.push(cjk[i] + cjk[i + 1]);
  }
  return tokens;
}

function searchTopInfraction(query: string, lexicalWeight: number, tagWeight: number): { item: Infraction; score: number } | null {
  const qTokens = tokenize(query);
  if (!qTokens.length) return null;
  
  const qtf: Record<string, number> = {};
  qTokens.forEach(t => { qtf[t] = (qtf[t] || 0) + 1; });
  
  const df: Record<string, number> = {};
  const docTfs: Record<string, Record<string, number>> = {};
  const docNorms: Record<string, number> = {};
  
  KNOWLEDGE_BASE.forEach(item => {
    const content = [
      item.title, item.title,
      item.keywords.join(' '), item.keywords.join(' '), item.keywords.join(' '),
      item.cat,
      item.definition,
      item.examples.join(' ')
    ].join(' ');
    const tokens = tokenize(content);
    const tf: Record<string, number> = {};
    tokens.forEach(t => { tf[t] = (tf[t] || 0) + 1; });
    docTfs[item.id] = tf;
    Object.keys(tf).forEach(t => { df[t] = (df[t] || 0) + 1; });
  });
  
  const N = KNOWLEDGE_BASE.length;
  const idf: Record<string, number> = {};
  Object.keys(df).forEach(t => {
    idf[t] = Math.log((N + 1) / (df[t] + 0.5)) + 1;
  });
  
  KNOWLEDGE_BASE.forEach(item => {
    const tf = docTfs[item.id];
    let sumSq = 0;
    Object.keys(tf).forEach(t => {
      const w = (1 + Math.log(tf[t])) * (idf[t] || 1);
      sumSq += w * w;
    });
    docNorms[item.id] = Math.sqrt(sumSq) || 1;
  });
  
  let qSumSq = 0;
  const qvec: Record<string, number> = {};
  Object.keys(qtf).forEach(t => {
    const w = (1 + Math.log(qtf[t])) * (idf[t] || 1);
    qvec[t] = w;
    qSumSq += w * w;
  });
  const qNorm = Math.sqrt(qSumSq) || 1;
  
  let bestItem: Infraction | null = null;
  let bestScore = -1;
  
  KNOWLEDGE_BASE.forEach(item => {
    let dot = 0;
    const tf = docTfs[item.id];
    Object.keys(qvec).forEach(t => {
      if (tf[t]) {
        const w = (1 + Math.log(tf[t])) * (idf[t] || 1);
        dot += qvec[t] * w;
      }
    });
    const cosScore = dot / (qNorm * docNorms[item.id]);
    
    let tagMatchCount = 0;
    item.keywords.forEach(k => {
      if (k.length >= 2 && query.toLowerCase().includes(k.toLowerCase())) {
        tagMatchCount += 1;
      }
    });
    const tagScore = tagMatchCount > 0 ? Math.min(1.0, tagMatchCount * 0.25) : 0.0;
    const finalScore = (cosScore * lexicalWeight) + (tagScore * tagWeight);
    
    if (finalScore > bestScore) {
      bestScore = finalScore;
      bestItem = item;
    }
  });
  
  return bestItem && bestScore > 0.01 ? { item: bestItem, score: bestScore } : null;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      query = '',
      level = 'L2', // 'L1' | 'L2' | 'L3'
      intent = 'unknown', // 'intentional' | 'unintentional' | 'unknown'
      repeat = 'first', // 'first' | 'repeat'
      lexicalWeight = 0.6,
      tagWeight = 0.4
    } = body;
    
    if (!query.trim()) {
      return NextResponse.json({ error: 'Query is empty' }, { status: 400 });
    }
    
    const match = searchTopInfraction(query, lexicalWeight, tagWeight);
    if (!match) {
      return NextResponse.json({
        verdict: null,
        message: '找不到相符的罰則條款，請換個說法。'
      });
    }
    
    const { item, score } = match;
    const reasons: string[] = [];
    let finalPenalty = 'caution';
    let escalatedTo: string | null = null;
    
    // Core decision engine logic
    if (item.cheating) {
      reasons.push('本條屬「作弊 (Cheating)」，一律判處最高處分失格 (DQ)，不論大會級別。');
      finalPenalty = 'dq';
    } else if (intent === 'intentional' && item.intentionalRef) {
      const ref = KNOWLEDGE_BASE.find(k => k.id === item.intentionalRef);
      reasons.push(`判定為「故意」，行為升級為作弊行為：「${ref ? ref.title : '作弊'}」（${ref ? ref.page : ''}）→ 處以失格 (DQ)。`);
      finalPenalty = 'dq';
      escalatedTo = item.intentionalRef;
    } else {
      let chain = (item.penalty[level as keyof typeof item.penalty] || item.penalty.L2).slice();
      
      if (intent === 'intentional' && item.severeAppend) {
        reasons.push('判定為故意或情節嚴重，適用最重處置。');
        chain = [...chain, item.severeAppend];
      }
      
      // Determine baseline penalty by tournament level
      let idx = 0;
      if (level === 'L1') {
        idx = 0;
        reasons.push('依 Level 1 判罰基準（娛樂店賽，以宣導教育為主），基準判罰取最輕項目。');
      } else if (level === 'L3') {
        idx = chain.length - 1;
        reasons.push('依 Level 3 判罰基準（全國總決賽級，嚴格執法），基準判罰取最重項目。');
      } else {
        idx = Math.min(1, chain.length - 1);
        reasons.push('依 Level 2 判罰基準（中大型預選賽，兼顧競技與公平），基準判罰取適中項目。');
      }
      
      let baseline = chain[idx] || 'caution';
      reasons.push(`判定基準判罰為「${PENALTY_META[baseline]?.label || baseline}」。`);
      finalPenalty = baseline;
      
      // Handle recurrence
      if (repeat === 'repeat') {
        if (finalPenalty === 'caution') {
          finalPenalty = 'warning';
          reasons.push('同大會累積 2 次以上「注意」 → 升級為「警告 (Warning)」。');
        } else if (finalPenalty === 'warning') {
          finalPenalty = 'matchloss';
          reasons.push('同大會累積 2 次以上「警告」 → 升級為「對局負 (Match Loss)」。');
        } else {
          reasons.push('累犯情形：此違規已屬重度（局負或以上），維持原判並從嚴記錄。');
        }
      }
      
      if (intent === 'unintentional' && level === 'L1') {
        reasons.push('Level 1 非故意違規：建議以宣導大會規則與教育玩家為主，儘量引導玩家完成對戰而非判負。');
      }
    }
    
    // AI Reasoning Generator
    let aiExplanation = '';
    const geminiKey = process.env.GEMINI_API_KEY;
    
    if (geminiKey) {
      try {
        const prompt = `你是一位專業的武士道 (Bushiroad) TCG 裁判長。
請根據以下輸入，為現場裁判寫一份繁體中文的「判罰裁決書與玩家溝通建議」。

大會級別: ${level === 'L1' ? 'Level 1 (娛樂店賽)' : level === 'L3' ? 'Level 3 (全國大賽)' : 'Level 2 (中大型賽事)'}
現場情境: "${query}"
判定條款: "${item.title}" (${item.cat}, 原書頁碼: ${item.page})
官方定義: "${item.definition}"
最終判罰: "${PENALTY_META[finalPenalty]?.label || finalPenalty}"
判定推導邏輯:
${reasons.map(r => `- ${r}`).join('\n')}

請在你的回覆中包含：
1. 【裁決結論】簡單說明判定為何種違規以及最終判處的罰則。
2. 【規則依據】引用上述官方條款定義，解釋為何本情境符合此條款。
3. 【現場處置建議】告訴裁判此時該如何調整遊戲狀態（如回溯、更換卡套、重新洗牌等）。
4. 【玩家溝通指南】如何以理智、客氣但堅定的態度口頭告知玩家，避免現場發生爭執。

不要使用任何虛假或無依據的規則，僅限引用我給你的條款內容。字數在 300-500 字左右，排版美觀。`;

        const response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiKey}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [{ parts: [{ text: prompt }] }]
            })
          }
        );
        
        if (response.ok) {
          const resJson = await response.json();
          aiExplanation = resJson.candidates?.[0]?.content?.parts?.[0]?.text || '';
        }
      } catch (e) {
        console.error('Failed to generate AI explanation:', e);
      }
    }
    
    return NextResponse.json({
      item,
      score,
      verdict: {
        penalty: finalPenalty,
        reasons,
        escalatedTo,
        aiExplanation: aiExplanation || null
      }
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
