// Rule and Infraction database for TCG RAG application

export interface Penalty {
  L1: string[];
  L2: string[];
  L3: string[];
}

export interface Infraction {
  id: string;
  cat: string;
  title: string;
  page: string;
  source: string;
  keywords: string[];
  definition: string;
  examples: string[];
  penalty: Penalty;
  note?: string;
  intentionalRef?: string;
  severeAppend?: string;
  cheating?: boolean;
}

export const PENALTY_META: Record<string, { label: string; cls: string; rank: number }> = {
  caution: { label: '注意 Caution', cls: 'pen-caution', rank: 1 },
  warning: { label: '警告 Warning', cls: 'pen-warning', rank: 2 },
  gameloss: { label: '局負 Game Loss', cls: 'pen-loss', rank: 3 },
  matchloss: { label: '對局負 Match Loss', cls: 'pen-loss', rank: 4 },
  dq: { label: '失格 DQ', cls: 'pen-dq', rank: 5 }
};

export const KNOWLEDGE_BASE: Infraction[] = [
  // ---- 牌組與配件相關違規 ----
  {
    id: 'decklist-late',
    cat: '一般違規 · 牌組與配件',
    title: '未在期限內提交牌表',
    page: '原書第 29 頁',
    source: 'part4',
    keywords: ['牌表', 'decklist', '未提交', '沒交', '逾期', '超過期限', '登記', '牌組登記表', '遲交'],
    definition: '玩家未在規定期限內提交牌表（Decklist）。',
    examples: ['選手在牌表提交截止後才想補交牌表。', '報到時未繳交牌組登記表。'],
    penalty: { L1: ['matchloss'], L2: ['matchloss'], L3: ['matchloss'] },
    note: '若能即時修正並獲得裁判許可，可降為 Warning。'
  },
  {
    id: 'decklist-error',
    cat: '一般違規 · 牌組與配件',
    title: '牌表填寫錯誤',
    page: '原書第 29 頁',
    source: 'part4',
    keywords: ['牌表', '填寫錯誤', '寫錯', '張數寫錯', '卡名寫錯', 'decklist', '登記錯誤', '漏填'],
    definition: '牌表內容填寫錯誤（卡名、張數等與實際不符或漏填）。',
    examples: ['牌表上某張卡的張數與實際牌組不一致。', '牌表漏填了一張卡。'],
    penalty: { L1: ['warning'], L2: ['warning'], L3: ['warning'] },
    note: '判處 Warning 並須立即修正。'
  },
  {
    id: 'illegal-deck',
    cat: '一般違規 · 牌組與配件',
    title: '牌組非法（張數/內容不符）',
    page: '原書第 30 頁',
    source: 'part4',
    keywords: ['牌組非法', '張數不符', '混入', '多一張', '少一張', '不符構築', '構築限制', '違規卡', '超額', '禁卡'],
    definition: '實際牌組張數不符、混入其他卡牌、不符合構築限制。',
    examples: ['牌組比規定多了一張卡。', '牌組內混入了不該出現的卡牌。', '牌組不符合該賽事的構築限制。'],
    penalty: { L1: ['warning'], L2: ['warning', 'gameloss'], L3: ['gameloss'] },
    note: 'Level 2 以上可視情況判處 Game Loss。'
  },
  {
    id: 'missing-items',
    cat: '一般違規 · 牌組與配件',
    title: '缺少必備道具',
    page: '原書第 30 頁',
    source: 'part4',
    keywords: ['缺少道具', '沒帶', '沒有骰子', '指示物', '缺道具', '必備道具', '忘記帶', '計數器', 'token'],
    definition: '未攜帶骰子、指示物等遊戲必備道具，經口頭警告後仍未改善。',
    examples: ['選手沒有攜帶遊戲必需的骰子。', '缺少必要的指示物且無法補足。'],
    penalty: { L1: ['caution'], L2: ['caution', 'warning'], L3: ['warning'] },
    note: '經口頭警告後仍未改善才判罰。'
  },
  {
    id: 'marked-sleeves',
    cat: '一般違規 · 牌組與配件',
    title: '標記卡 / 標記卡套（Marked）',
    page: '原書第 30-31 頁',
    source: 'part4',
    keywords: ['標記', 'marked', '卡套', '折角', '折痕', '刮痕', '髒污', '磨損', '壓痕', '可辨識', '區分卡背', '記號'],
    definition: '卡套上有折角、髒污或刮痕導致可被區分卡牌。',
    examples: ['卡套有無規律的磨損導致某些卡可被辨識。', '卡套有規律的折痕，疑似用來辨識特定卡牌。'],
    penalty: { L1: ['warning'], L2: ['warning', 'gameloss', 'matchloss'], L3: ['gameloss', 'matchloss'] },
    intentionalRef: 'cheat-marking',
    note: '無規律磨損→Warning 並更換；有規律磨損（非故意）→Game/Match Loss 並強制更換；若判定為故意→升級為作弊 DQ。'
  },
  // ---- 遊戲狀態非法 ----
  {
    id: 'wrong-info',
    cat: '一般違規 · 遊戲狀態',
    title: '傳遞錯誤資訊',
    page: '原書第 31 頁',
    source: 'part4',
    keywords: ['錯誤資訊', '報錯', '生命值報錯', '數值錯誤', '公開資訊', '告知錯誤', '傳達錯誤', '說錯血量'],
    definition: '向對手提供錯誤的生命值、戰場數值或公開區域資訊，導致遊戲混亂（非故意）。',
    examples: ['不小心告訴對手錯誤的生命值。', '報錯了場上某個公開數值。'],
    penalty: { L1: ['caution'], L2: ['caution', 'warning'], L3: ['warning'] },
    intentionalRef: 'cheat-fraud',
    note: '若為故意提供虛假遊戲狀態，則屬詐欺行為 (Fraud) → DQ。'
  },
  {
    id: 'game-state',
    cat: '一般違規 · 遊戲狀態',
    title: '遊戲狀態混亂（無法回溯）',
    page: '原書第 31-32 頁',
    source: 'part4',
    keywords: ['遊戲狀態混亂', '操作失誤', '無法回溯', '程序錯誤', '場面亂了', '擺錯', '狀態錯誤', '回溯'],
    definition: '因玩家程序操作失誤，導致遊戲狀態無法簡單回溯。',
    examples: ['一連串操作失誤導致場面無法還原。', '程序搞錯導致遊戲狀態難以回溯。'],
    penalty: { L1: ['caution'], L2: ['caution', 'warning', 'gameloss'], L3: ['warning', 'gameloss'] },
    note: '輕度（易回溯）→Caution；中重度（無法回溯、破壞公正）→Warning 或 Game Loss。'
  },
  {
    id: 'missed-trigger',
    cat: '一般違規 · 遊戲狀態',
    title: '漏掉自動能力（Missed Trigger）',
    page: '原書第 32 頁',
    source: 'part4',
    keywords: ['漏效果', '漏觸發', 'missed trigger', '自動能力', '漏掉', '忘記發動', '必發', '漏發'],
    definition: '遺漏了必發的自動能力（漏效果）。',
    examples: ['玩家忘記結算一個必定發動的自動能力。', '漏掉了場上單位的自動觸發效果。'],
    penalty: { L1: ['caution'], L2: ['caution', 'warning'], L3: ['warning'] },
    note: '若對手發現卻故意不指出以獲取優勢，對手亦將面臨判罰。'
  },
  // ---- 卡牌位置與窺視 ----
  {
    id: 'saw-cards',
    cat: '一般違規 · 卡牌位置與窺視',
    title: '看到不應看見的卡牌',
    page: '原書第 33 頁',
    source: 'part4',
    keywords: ['偷看', '窺視', '看到', '翻開', '非公開卡', '洗牌時看到', '切牌看到', '瞄到', '牌底'],
    definition: '在洗牌、切牌或檢索過程中，意外翻開或窺視了非公開卡牌（非故意）。',
    examples: ['洗牌時不小心翻開看到自己的牌底。', '切對手牌時瞄到了非公開的卡。'],
    penalty: { L1: ['caution'], L2: ['caution', 'warning'], L3: ['warning'] },
    note: '將窺視的卡牌洗回牌組。'
  },
  {
    id: 'draw-extra',
    cat: '一般違規 · 卡牌位置與窺視',
    title: '多抽牌（Drawing Extra Cards）',
    page: '原書第 34 頁',
    source: 'part4',
    keywords: ['多抽', '多抽牌', '抽多', 'extra cards', '抽太多', '摸多', '超過張數', '多摸一張'],
    definition: '摸取了超過效果規定數量的牌並放入手牌。',
    examples: ['一次摸牌多摸了一張進手牌。', '效果只能抽 1 張卻抽了 2 張。'],
    penalty: { L1: ['warning'], L2: ['warning', 'gameloss'], L3: ['gameloss'] },
    note: '可明確判定多抽哪幾張→移出洗回；混入手牌無法區分→Warning（由對手隨機抽回）或高競技局 Game Loss。'
  },
  {
    id: 'insufficient-shuffle',
    cat: '一般違規 · 卡牌位置與窺視',
    title: '洗牌不足',
    page: '原書第 37 頁',
    source: 'part4',
    keywords: ['洗牌不足', '沒洗', '洗不夠', '未隨機化', '隨機化不足', '沒洗牌'],
    definition: '未實施有效洗牌即開始對局。',
    examples: ['牌組沒有充分洗牌就開局。', '隨機化不足即開始對戰。'],
    penalty: { L1: ['caution'], L2: ['caution', 'warning'], L3: ['warning'] },
    intentionalRef: 'cheat-card-move',
    note: '若為故意洗假牌/堆牌，屬非法移動卡牌 → DQ。'
  },
  // ---- 賽事進程阻礙 ----
  {
    id: 'tardiness-minor',
    cat: '一般違規 · 賽事進程',
    title: '遲到 5 分鐘以內',
    page: '原書第 36 頁',
    source: 'part4',
    keywords: ['遲到', '晚到', '沒入座', '入座', '慢入座', '遲入席', '幾分鐘才到', '開賽後才到', '未就座'],
    definition: '輪次開始後遲到，但在 5 分鐘以內入座。',
    examples: ['對戰開始後 3 分鐘才入座。', '鈴響後 4 分鐘才坐到位子上。'],
    penalty: { L1: ['warning'], L2: ['warning'], L3: ['warning'] },
    note: '遲到 5 分鐘以內判處 Warning。'
  },
  {
    id: 'tardiness-major',
    cat: '一般違規 · 賽事進程',
    title: '遲到超過 5 分鐘',
    page: '原書第 36 頁',
    source: 'part4',
    keywords: ['遲到', '超過5分鐘', '很晚到', '嚴重遲到', '缺席', '沒來', '未出席', '逾時未到'],
    definition: '輪次開始後遲到超過 5 分鐘。',
    examples: ['對戰開始超過 5 分鐘仍未入座。', '鈴響後 8 分鐘才出現。'],
    penalty: { L1: ['matchloss'], L2: ['matchloss'], L3: ['matchloss'] },
    note: '直接判處 Match Loss，未向裁判長聲明前視為自動退賽。'
  },
  {
    id: 'slow-play',
    cat: '一般違規 · 賽事進程',
    title: '慢玩（Slow Play）',
    page: '原書第 40 頁',
    source: 'part4',
    keywords: ['慢玩', '拖時間', '思考太久', '洗牌太慢', '拖延', '消耗時間', '太慢', '動作慢', '拖'],
    definition: '非故意地消耗過多對戰時間（思考過長、洗牌過慢）。',
    examples: ['選手每個動作都思考極久導致比賽拖延。', '洗牌動作過慢，經催促仍未改善。'],
    penalty: { L1: ['warning'], L2: ['warning', 'gameloss'], L3: ['warning', 'gameloss'] },
    note: '裁判催促後仍未改善判 Warning，情節嚴重可升級 Game Loss。'
  },
  {
    id: 'excessive-shuffle',
    cat: '一般違規 · 賽事進程',
    title: '過度切牌（Excessive Hand Shuffling）',
    page: '原書第 41 頁',
    source: 'part4',
    keywords: ['過度切牌', '切手牌', '噪音', '洗手牌', '動作過大', '切牌太多', '干擾對手', '聲音大'],
    definition: '頻繁切手牌發出極大噪音，或動作過大干擾對手思考。',
    examples: ['不斷大聲切手牌干擾對手。', '切牌動作過大影響鄰桌。'],
    penalty: { L1: ['caution'], L2: ['caution', 'warning'], L3: ['warning'] },
    note: '裁判勸阻後仍未改正才判罰。'
  },
  // ---- 行為與禮儀 ----
  {
    id: 'unsporting',
    cat: '一般違規 · 行為與禮儀',
    title: '非紳士行為（Unsporting Conduct）',
    page: '原書第 35-36 頁',
    source: 'part4',
    keywords: ['非紳士', '辱罵', '摔牌', '挑釁', '態度惡劣', '罵人', '無禮', '嗆聲', '暴力', '咆哮', '情緒失控'],
    definition: '態度惡劣、辱罵、摔牌、以無禮動作挑釁對手。',
    examples: ['選手對對手辱罵。', '用力摔牌並挑釁對手。', '嚴重言語攻擊對手。'],
    penalty: { L1: ['warning'], L2: ['warning'], L3: ['warning'] },
    severeAppend: 'dq',
    note: '輕微/中度判 Warning，重度（嚴重挑釁、暴力）判處 DQ。'
  },
  {
    id: 'eating',
    cat: '一般違規 · 行為與禮儀',
    title: '對戰中飲食',
    page: '原書第 38 頁',
    source: 'part4',
    keywords: ['飲食', '吃東西', '進食', '吃', '喝', '食物', '在桌上吃'],
    definition: '除非大會許可水分補給，原則上禁止在對戰桌上吃東西。',
    examples: ['選手在對戰桌上吃零食。', '未經許可在對戰中進食。'],
    penalty: { L1: ['caution'], L2: ['caution', 'warning'], L3: ['warning'] }
  },
  {
    id: 'electronics',
    cat: '一般違規 · 行為與禮儀',
    title: '違規使用聯網電子設備',
    page: '原書第 38 頁',
    source: 'part4',
    keywords: ['手機', '電子設備', '接電話', '簡訊', 'app', '聯網', '智慧手錶', '用手機', '講電話', '查手機'],
    definition: '對戰中接聽電話、收發簡訊、或使用非特許的輔助 App。',
    examples: ['對戰中接聽電話。', '比賽中用手機收發訊息。'],
    penalty: { L1: ['warning'], L2: ['warning'], L3: ['warning'] },
    severeAppend: 'dq',
    note: '情節嚴重（藉此作弊）者判定為 Cheating → DQ。'
  },
  {
    id: 'note-taking',
    cat: '一般違規 · 行為與禮儀',
    title: '對局中記筆記',
    page: '原書第 39 頁',
    source: 'part4',
    keywords: ['記筆記', '寫筆記', '記錄', '抄', '寫下', '記卡', '做筆記', '書寫'],
    definition: '對戰中書寫、記錄任何卡牌資訊。',
    examples: ['選手在對局中偷偷記下對手打出的卡。', '對戰中書寫記錄場面資訊。'],
    penalty: { L1: ['warning'], L2: ['warning'], L3: ['warning'] },
    note: '（註：《Buddyfight》記錄生命值變動屬例外許可）。'
  },
  // ---- 作弊（一律 DQ）----
  {
    id: 'cheat-fraud',
    cat: '作弊 Cheating',
    title: '詐欺行為（Fraud）',
    page: '原書第 42 頁',
    source: 'part4',
    keywords: ['詐欺', '作假', '假賽', '串通', '打假賽', '故意報錯', '隱瞞', '篡改', '虛假', '收買', '賄賂', '私分獎品', '操縱結果', '故意記錯分'],
    definition: '故意篡改、串通（打假賽）、欺詐與大會有關的資訊，或藉此謀利。',
    examples: ['故意向對手或裁判提供虛假遊戲狀態（故意報錯生命值、隱瞞手牌數量、故意記錯分數）。', '透過收買、賄賂、私分獎品操縱比賽結果。'],
    penalty: { L1: ['dq'], L2: ['dq'], L3: ['dq'] },
    cheating: true,
    note: '作弊一律 DQ，不論大會級別。'
  },
  {
    id: 'cheat-card-move',
    cat: '作弊 Cheating',
    title: '非法移動卡牌（Illegal Card Movement）',
    page: '原書第 43 頁',
    source: 'part4',
    keywords: ['出千', '洗假牌', '堆牌', '偷牌', '偷回手牌', '故意洗假', '故意堆', '非法移動', '偷偷放入手牌', '控室偷牌', '故意不隨機化'],
    definition: '違反遊戲規則、以物理手段移動卡牌試圖謀利。',
    examples: ['故意未進行充分隨機化（洗假牌/堆牌）。', '趁對手不注意將置卡區/控制區/控室的卡偷偷放入手牌。', '故意使遊戲狀態無法修正或無法繼續。'],
    penalty: { L1: ['dq'], L2: ['dq'], L3: ['dq'] },
    cheating: true,
    note: '作弊一律 DQ。'
  },
  {
    id: 'cheat-marking',
    cat: '作弊 Cheating',
    title: '故意標記（Intentional Marking）',
    page: '原書第 43 頁',
    source: 'part4',
    keywords: ['故意標記', '故意折', '折卡套', '壓痕', '記號', '辨識特定卡', '做記號', '偷偷標記', '折角辨識'],
    definition: '故意折疊、標記卡套或卡牌，以便在不公開狀態下識別特定卡牌。',
    examples: ['在卡套角上折出隱秘壓痕以辨識特定卡。', '故意在卡牌上做記號。'],
    penalty: { L1: ['dq'], L2: ['dq'], L3: ['dq'] },
    cheating: true,
    note: '作弊一律 DQ。'
  },
  {
    id: 'cheat-deck-mod',
    cat: '作弊 Cheating',
    title: '不當 / 非法修改牌組',
    page: '原書第 43 頁',
    source: 'part4',
    keywords: ['修改牌組', '換牌', '偷換', '中途改牌', '非法修改', '賽中改牌', '抽換卡'],
    definition: '在不允許更改牌組的大會期間，故意修改牌組內容。',
    examples: ['禁止換牌的賽事中途偷偷抽換卡片。', '賽事期間故意修改牌組內容。'],
    penalty: { L1: ['dq'], L2: ['dq'], L3: ['dq'] },
    cheating: true,
    note: '作弊一律 DQ。'
  },
  {
    id: 'cheat-coaching',
    cat: '作弊 Cheating',
    title: '非法外界協助（Coaching）',
    page: '原書第 43 頁',
    source: 'part4',
    keywords: ['外界協助', 'coaching', '場外指導', '旁觀者提示', '隊友指導', '通報資訊', '場邊教學', '偷偷指導'],
    definition: '對戰中故意接受旁觀者或隊友的戰術指導；或旁觀者故意通報未公開資訊。',
    examples: ['對戰中接受隊友的戰術指導。', '旁觀者向玩家通報對手未公開的資訊。'],
    penalty: { L1: ['warning', 'dq'], L2: ['matchloss', 'dq'], L3: ['matchloss', 'dq'] },
    cheating: true,
    note: 'Level 1：警告~DQ；Level 2+：Match Loss~DQ。'
  },
  {
    id: 'cheat-dice',
    cat: '作弊 Cheating',
    title: '操縱骰子',
    page: '原書第 43 頁',
    source: 'part4',
    keywords: ['操縱骰子', '作弊骰', '控骰', '假擲', '擲骰作弊', '動手腳骰子', '出老千骰'],
    definition: '故意使用不正當手段擲骰子以獲得想要的點數。',
    examples: ['用手法控制骰子點數。', '故意操縱骰子朝上的值。'],
    penalty: { L1: ['dq'], L2: ['dq'], L3: ['dq'] },
    cheating: true,
    note: '作弊一律 DQ。'
  },
  {
    id: 'cheat-ineligible',
    cat: '作弊 Cheating',
    title: '無資格參賽',
    page: '原書第 44 頁',
    source: 'part4',
    keywords: ['無資格', '禁賽', '冒名', '混入', '沒資格', '偷跑報名', '違規參賽', '被禁賽還參加'],
    definition: '被禁賽者、無入場資格者故意報名或混入賽場參賽。',
    examples: ['被禁賽的人偷偷報名參賽。', '無入場資格者混入賽場。'],
    penalty: { L1: ['dq'], L2: ['dq'], L3: ['dq'] },
    cheating: true,
    note: '作弊一律 DQ。'
  },
  {
    id: 'cheat-other',
    cat: '作弊 Cheating',
    title: '其他不正行為（Other Cheating）',
    page: '原書第 44-45 頁',
    source: 'part4',
    keywords: ['其他作弊', '不正行為', '等同作弊', '其他不正', '裁判認定作弊'],
    definition: '除上述項目外，裁判判定等同於不正行為（作弊）者。',
    examples: ['未列舉但被裁判認定等同作弊的行為。'],
    penalty: { L1: ['dq'], L2: ['dq'], L3: ['dq'] },
    cheating: true,
    note: '罰則具體適用應參考本指引其他規定判斷。'
  }
];

export const MANUAL_SECTIONS = [
  { id: 'glossary', title: '專業術語對照表', file: 'floor_rules_glossary.md' },
  { id: 'part1', title: '第一部：大會角色職責與大會級別', file: 'floor_rules_part1_roles_logistics.md' },
  { id: 'part2', title: '第二部：卡牌、洗牌、配件與基本對戰規則', file: 'floor_rules_part2_gameplay_accessories.md' },
  { id: 'part3', title: '第三部：賽制配對與小分排名計算', file: 'floor_rules_part3_formats_pairings.md' },
  { id: 'part4', title: '第四部：判罰制度、常見違規與作弊定義', file: 'floor_rules_part4_penalties.md' },
  { id: 'appendix', title: '附則 A：各遊戲超時勝負判定方法', file: 'floor_rules_appendix_timeout.md' }
];
