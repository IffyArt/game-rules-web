import React from 'react';
import { BookOpen, Users, Layers, BarChart2, Scale, Clock, Gavel, History, Sun, Moon } from 'lucide-react';

interface RecentRuling {
  id: string;
  timestamp: string;
  query: string;
  level: string;
  title: string;
  penalty: string;
}

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  isDark: boolean;
  setIsDark: (dark: boolean) => void;
  recentRulings: RecentRuling[];
  onSelectRecentRuling: (query: string, level: string) => void;
}

export default function Sidebar({
  activeTab,
  setActiveTab,
  isDark,
  setIsDark,
  recentRulings,
  onSelectRecentRuling
}: SidebarProps) {
  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <div className="sidebar-logo">
          <Scale style={{ width: 22, height: 22 }} />
        </div>
        <div>
          <div className="sidebar-title">武士道 TCG</div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>大會規則裁判手冊 v1.2.11</div>
        </div>
      </div>

      <nav className="sidebar-menu">
        <a className={`menu-item ${activeTab === 'glossary' ? 'active' : ''}`} onClick={() => setActiveTab('glossary')}>
          <BookOpen style={{ width: 18, height: 18 }} /> 專業術語對照表
        </a>
        <a className={`menu-item ${activeTab === 'part1' ? 'active' : ''}`} onClick={() => setActiveTab('part1')}>
          <Users style={{ width: 18, height: 18 }} /> 角色職責與級別
        </a>
        <a className={`menu-item ${activeTab === 'part2' ? 'active' : ''}`} onClick={() => setActiveTab('part2')}>
          <Layers style={{ width: 18, height: 18 }} /> 配件與洗牌規則
        </a>
        <a className={`menu-item ${activeTab === 'part3' ? 'active' : ''}`} onClick={() => setActiveTab('part3')}>
          <BarChart2 style={{ width: 18, height: 18 }} /> 賽制與小分計算法
        </a>
        <a className={`menu-item ${activeTab === 'part4' ? 'active' : ''}`} onClick={() => setActiveTab('part4')}>
          <Scale style={{ width: 18, height: 18 }} /> 判罰制度與作弊
        </a>
        <a className={`menu-item ${activeTab === 'appendix' ? 'active' : ''}`} onClick={() => setActiveTab('appendix')}>
          <Clock style={{ width: 18, height: 18 }} /> 附則：超時勝負
        </a>
        
        <div style={{ margin: '14px 0 8px 10px', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          AI 裁判智能工具
        </div>
        
        <a className={`menu-item ${activeTab === 'referee' ? 'active' : ''}`} onClick={() => setActiveTab('referee')}>
          <Gavel style={{ width: 18, height: 18 }} /> 裁判判罰系統 (RAG)
        </a>
      </nav>

      {/* Sidebar History Panel */}
      {recentRulings.length > 0 && activeTab === 'referee' && (
        <div style={{ padding: '16px', borderTop: '1px solid var(--border-color)', maxHeight: '200px', overflowY: 'auto' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '10px' }}>
            <History style={{ width: 14, height: 14 }} /> 歷史判罰紀錄
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {recentRulings.map((r) => (
              <div 
                key={r.id} 
                onClick={() => onSelectRecentRuling(r.query, r.level)}
                style={{ fontSize: '0.75rem', padding: '8px', borderRadius: '4px', border: '1px solid var(--border-color)', background: 'var(--bg-main)', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
              >
                <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginRight: '6px', color: 'var(--text-main)' }}>
                  {r.query}
                </div>
                <span className={`pen-tag ${r.penalty === 'caution' ? 'pen-caution' : r.penalty === 'warning' ? 'pen-warning' : r.penalty === 'dq' ? 'pen-dq' : 'pen-loss'}`} style={{ fontSize: '0.6rem', padding: '2px 6px' }}>
                  {r.penalty === 'caution' ? '注意' : r.penalty === 'warning' ? '警告' : r.penalty === 'dq' ? '失格' : '局負'}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="sidebar-footer">
        <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>專業中文大會版</span>
        <button className="btn-icon" onClick={() => setIsDark(!isDark)} title="切換主題">
          {isDark ? <Sun style={{ width: 18, height: 18 }} /> : <Moon style={{ width: 18, height: 18 }} />}
        </button>
      </div>
    </aside>
  );
}
export type { RecentRuling };
