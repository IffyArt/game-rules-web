import { KNOWLEDGE_BASE, PENALTY_META, Infraction } from '@/lib/db';
import { searchTopInfraction, SearchOptions } from '@/lib/search';

export interface VerdictParams {
  query: string;
  level?: 'L1' | 'L2' | 'L3';
  intent?: 'intentional' | 'unintentional' | 'unknown';
  repeat?: 'first' | 'repeat';
  lexicalWeight?: number;
  tagWeight?: number;
}

export interface VerdictResult {
  penalty: string;
  reasons: string[];
  escalatedTo: string | null;
  aiExplanation: string | null;
}

export interface VerdictResponse {
  item: Infraction;
  score: number;
  verdict: VerdictResult;
}

export function computeVerdict(params: VerdictParams): VerdictResponse | null {
  const {
    query,
    level = 'L2',
    intent = 'unknown',
    repeat = 'first',
    lexicalWeight = 0.6,
    tagWeight = 0.4,
  } = params;

  const match = searchTopInfraction(query, { lexicalWeight, tagWeight, minScore: 0.01 });
  if (!match) return null;

  const { item, scores } = match;
  const reasons: string[] = [];
  let finalPenalty = 'caution';
  let escalatedTo: string | null = null;

  if (item.cheating) {
    reasons.push('本條屬「作弊 (Cheating)」，一律判處最高處分失格 (DQ)，不論大會級別。');
    finalPenalty = 'dq';
  } else if (intent === 'intentional' && item.intentionalRef) {
    const ref = KNOWLEDGE_BASE.find((k) => k.id === item.intentionalRef);
    reasons.push(
      `判定為「故意」，行為升級為作弊行為：「${ref ? ref.title : '作弊'}」（${ref ? ref.page : ''}）→ 處以失格 (DQ)。`
    );
    finalPenalty = 'dq';
    escalatedTo = item.intentionalRef;
  } else {
    const chain = (item.penalty[level] || item.penalty.L2).slice();

    if (intent === 'intentional' && item.severeAppend) {
      reasons.push('判定為故意或情節嚴重，適用最重處置。');
    }

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

    const baseline = chain[idx] || 'caution';
    reasons.push(`判定基準判罰為「${PENALTY_META[baseline]?.label || baseline}」。`);
    finalPenalty = baseline;

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
      reasons.push(
        'Level 1 非故意違規：建議以宣導大會規則與教育玩家為主，儘量引導玩家完成對戰而非判負。'
      );
    }
  }

  return {
    item,
    score: scores.final,
    verdict: {
      penalty: finalPenalty,
      reasons,
      escalatedTo,
      aiExplanation: null,
    },
  };
}

export function buildVerdictPrompt(
  params: VerdictParams,
  item: Infraction,
  finalPenalty: string,
  reasons: string[]
): string {
  const { query, level = 'L2' } = params;
  const levelLabel =
    level === 'L1' ? 'Level 1 (娛樂店賽)' : level === 'L3' ? 'Level 3 (全國大賽)' : 'Level 2 (中大型賽事)';

  return `你是一位專業的武士道 (Bushiroad) TCG 裁判長。
請根據以下輸入，為現場裁判寫一份繁體中文的「判罰裁決書與玩家溝通建議」。

大會級別: ${levelLabel}
現場情境: "${query}"
判定條款: "${item.title}" (${item.cat}, 原書頁碼: ${item.page})
官方定義: "${item.definition}"
最終判罰: "${PENALTY_META[finalPenalty]?.label || finalPenalty}"
判定推導邏輯:
${reasons.map((r) => `- ${r}`).join('\n')}

請在你的回覆中包含：
1. 【裁決結論】簡單說明判定為何種違規以及最終判處的罰則。
2. 【規則依據】引用上述官方條款定義，解釋為何本情境符合此條款。
3. 【現場處置建議】告訴裁判此時該如何調整遊戲狀態（如回溯、更換卡套、重新洗牌等）。
4. 【玩家溝通指南】如何以理智、客氣但堅定的態度口頭告知玩家，避免現場發生爭執。

不要使用任何虛假或無依據的規則，僅限引用我給你的條款內容。字數在 300-500 字左右，排版美觀。`;
}
