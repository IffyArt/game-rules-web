import React from 'react';
import { Gavel, AlertCircle, Sparkles, CornerUpLeft } from 'lucide-react';
import { PENALTY_META } from '@/lib/db';

interface VerdictCardProps {
  verdictResult: any;
  searchCandidates: any[];
  ragLevel: string;
  onTraceback: (source: string, pageLabel: string) => void;
}

export default function VerdictCard({
  verdictResult,
  searchCandidates,
  ragLevel,
  onTraceback
}: VerdictCardProps) {
  if (!verdictResult) return null;

  if (verdictResult.error) {
    return (
      <div className="rag-panel" style={{ textAlign: 'center', color: 'var(--danger)' }}>
        <AlertCircle style={{ width: 44, height: 44, margin: '0 auto 12px', display: 'block' }} />
        <p>{verdictResult.message}</p>
      </div>
    );
  }

  const primaryCandidate = searchCandidates[0];
  const maxScore = primaryCandidate?.scores?.final || 1.0;

  return (
    <div>
      {/* Primary Verdict Card */}
      <div className="verdict-card">
        <div className={`verdict-head ${PENALTY_META[verdictResult.penalty]?.cls || 'pen-caution'}`}>
          <div className={`verdict-penalty ${PENALTY_META[verdictResult.penalty]?.cls || 'pen-caution'}`}>
            <Gavel style={{ width: 28, height: 28 }} />
            {PENALTY_META[verdictResult.penalty]?.label || verdictResult.penalty}
          </div>
          <div className="verdict-conf">
            最相符條款信心 <strong>{Math.min(99, Math.round(maxScore * 60 + 39))}%</strong>
          </div>
        </div>
        
        <div className="verdict-body">
          <div className="verdict-title">{primaryCandidate?.item?.title}</div>
          <div className="verdict-cat">
            <span>類別: {primaryCandidate?.item?.cat}</span>
            <span>•</span>
            <span>原書: {primaryCandidate?.item?.page}</span>
          </div>
          
          <p style={{ fontSize: '0.95rem', marginBottom: '16px', borderBottom: '1px solid var(--border-color)', paddingBottom: '16px' }}>
            <strong>官方定義:</strong> {primaryCandidate?.item?.definition}
          </p>
          
          <div className="verdict-reason">
            <strong>判罰推導步驟:</strong>
            <ul>
              {verdictResult.reasons?.map((r: string, idx: number) => (
                <li key={idx}>{r}</li>
              ))}
            </ul>
          </div>
          
          {primaryCandidate?.item?.note && (
            <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '16px', display: 'flex', gap: '6px', alignItems: 'center' }}>
              <AlertCircle style={{ width: 14, height: 14, flexShrink: 0 }} />
              <span>條款備註: {primaryCandidate.item.note}</span>
            </div>
          )}
          
          <div>
            <h5 style={{ fontSize: '0.85rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '8px' }}>
              官方文獻違規實例:
            </h5>
            <ul className="verdict-examples">
              {primaryCandidate?.item?.examples?.map((e: string, idx: number) => (
                <li key={idx} style={{ fontSize: '0.9rem', opacity: 0.9 }}>{e}</li>
              ))}
            </ul>
          </div>

          {/* AI Explanation Box */}
          {verdictResult.aiExplanation && (
            <div className="verdict-ai-box">
              <div className="verdict-ai-title">
                <Sparkles style={{ width: 16, height: 16 }} />
                AI 裁判長裁量與溝通建議
              </div>
              <div className="verdict-ai-content">
                {verdictResult.aiExplanation}
              </div>
            </div>
          )}
          
          <div className="verdict-actions">
            <button 
              className="rag-btn secondary" 
              onClick={() => onTraceback(primaryCandidate.item.source, primaryCandidate.item.page)}
            >
              <CornerUpLeft style={{ width: 16, height: 16 }} />
              對照手冊條文 (回推至原文)
            </button>
          </div>
        </div>
      </div>

      {/* Secondary candidates */}
      {searchCandidates.length > 1 && (
        <div style={{ marginTop: '32px' }}>
          <h4 style={{ marginBottom: '16px', fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
            其他可能相關的參考條款:
          </h4>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {searchCandidates.slice(1, 6).map((c, idx) => {
              let candPen = c.item.cheating ? 'dq' : (c.item.penalty[ragLevel as keyof typeof c.item.penalty] || c.item.penalty.L2)[0];
              return (
                <div 
                  key={idx} 
                  className="verdict-card" 
                  style={{ margin: 0, padding: '16px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px' }}
                  onClick={() => onTraceback(c.item.source, c.item.page)}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flex: 1 }}>
                    <div style={{ textAlign: 'center', width: '60px' }}>
                      <div style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--primary)' }}>
                        {Math.round((c.scores.final / maxScore) * 100)}%
                      </div>
                      <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>匹配度</div>
                    </div>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--text-main)' }}>{c.item.title}</div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{c.item.cat} • {c.item.page}</div>
                    </div>
                  </div>
                  <span className={`pen-tag ${PENALTY_META[candPen]?.cls || 'pen-caution'}`}>
                    {PENALTY_META[candPen]?.label || candPen}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
