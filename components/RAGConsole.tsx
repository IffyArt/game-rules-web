import React from 'react';
import { MessageSquare, Gavel } from 'lucide-react';

interface RAGConsoleProps {
  ragInput: string;
  setRagInput: (val: string) => void;
  ragLevel: string;
  setRagLevel: (val: string) => void;
  ragIntent: string;
  setRagIntent: (val: string) => void;
  ragRepeat: string;
  setRagRepeat: (val: string) => void;
  lexicalWeight: number;
  setLexicalWeight: (val: number) => void;
  tagWeight: number;
  setTagWeight: (val: number) => void;
  onSubmit: () => void;
  onClear: () => void;
  onFillSample: (sample: string) => void;
}

export default function RAGConsole({
  ragInput,
  setRagInput,
  ragLevel,
  setRagLevel,
  ragIntent,
  setRagIntent,
  ragRepeat,
  setRagRepeat,
  lexicalWeight,
  setLexicalWeight,
  tagWeight,
  setTagWeight,
  onSubmit,
  onClear,
  onFillSample
}: RAGConsoleProps) {
  const RAG_SAMPLES = [
    '選手在第二輪對戰開始 3 分鐘後才入座',
    '對手發現這名玩家卡套右上角有一致折痕，疑似辨識特定卡牌',
    '玩家一次摸牌多摸了一張進手牌，已混入無法區分',
    '選手每個動作思考極久，經催促仍拖延比賽時間',
    '玩家對對手大聲辱罵並用力摔牌',
    '對戰中接聽電話並收發訊息'
  ];

  const handleLexicalChange = (val: number) => {
    setLexicalWeight(val);
    setTagWeight(parseFloat((1.0 - val).toFixed(2)));
  };

  const handleTagChange = (val: number) => {
    setTagWeight(val);
    setLexicalWeight(parseFloat((1.0 - val).toFixed(2)));
  };

  return (
    <div className="rag-panel">
      <label className="rag-label" htmlFor="rag-input-box">
        <MessageSquare style={{ width: 18, height: 18 }} />
        輸入現場狀況描述 (繁體中文自然語言)
      </label>
      <textarea 
        id="rag-input-box" 
        className="rag-textarea" 
        value={ragInput}
        onChange={(e) => setRagInput(e.target.value)}
        placeholder="例如：在預賽第三輪開局 3 分鐘後，玩家遲遲沒有入座。或者：對手質疑某玩家卡套右上角有故意刮痕痕跡，懷疑做記號抽特定卡牌..."
      />

      {/* Weights Sliders */}
      <div className="rag-sliders">
        <div className="slider-group">
          <div className="slider-header">
            <span>Lexical Weight (內文相似度)</span>
            <span>{(lexicalWeight * 100).toFixed(0)}%</span>
          </div>
          <input 
            type="range" 
            min="0" 
            max="1" 
            step="0.05" 
            className="slider-input" 
            value={lexicalWeight} 
            onChange={(e) => handleLexicalChange(parseFloat(e.target.value))}
          />
        </div>
        <div className="slider-group">
          <div className="slider-header">
            <span>Tag Weight (關鍵字匹配度)</span>
            <span>{(tagWeight * 100).toFixed(0)}%</span>
          </div>
          <input 
            type="range" 
            min="0" 
            max="1" 
            step="0.05" 
            className="slider-input" 
            value={tagWeight} 
            onChange={(e) => handleTagChange(parseFloat(e.target.value))}
          />
        </div>
      </div>

      {/* Scenario dropdown selectors */}
      <div className="rag-controls">
        <div className="rag-field">
          <label>大會級別</label>
          <select className="rag-select" value={ragLevel} onChange={(e) => setRagLevel(e.target.value)}>
            <option value="L1">Level 1 (娛樂店賽 - 教育為主)</option>
            <option value="L2">Level 2 (中大型預選賽 - 適中)</option>
            <option value="L3">Level 3 (全國總決賽 - 嚴格適用)</option>
          </select>
        </div>
        <div className="rag-field">
          <label>故意判定</label>
          <select className="rag-select" value={ragIntent} onChange={(e) => setRagIntent(e.target.value)}>
            <option value="unknown">未定 / 現場調查中</option>
            <option value="unintentional">非故意 (純屬過失)</option>
            <option value="intentional">故意行為 / 企圖謀取優勢</option>
          </select>
        </div>
        <div className="rag-field">
          <label>累犯次數</label>
          <select className="rag-select" value={ragRepeat} onChange={(e) => setRagRepeat(e.target.value)}>
            <option value="first">初犯</option>
            <option value="repeat">同大會第二次或以上重複違規</option>
          </select>
        </div>
        
        <div style={{ display: 'flex', gap: '8px' }}>
          <button className="rag-btn" onClick={onSubmit}>
            <Gavel style={{ width: 16, height: 16 }} /> 執行裁決
          </button>
          <button className="rag-btn secondary" onClick={onClear}>
            清除
          </button>
        </div>
      </div>

      <div className="rag-examples">
        <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', alignSelf: 'center' }}>範例情境快捷鈕：</span>
        {RAG_SAMPLES.map((s, idx) => (
          <span key={idx} className="rag-chip" onClick={() => onFillSample(s)}>
            {s}
          </span>
        ))}
      </div>
    </div>
  );
}
