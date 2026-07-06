'use client';

import React, { useState, useEffect } from 'react';
import { Search, Printer, Sun, Moon, Scale } from 'lucide-react';
import Sidebar, { RecentRuling } from '@/components/Sidebar';
import ManualReader from '@/components/ManualReader';
import RAGConsole from '@/components/RAGConsole';
import VerdictCard from '@/components/VerdictCard';
import { mdToHtml } from '@/lib/markdown';

export default function Home() {
  // Global View States
  const [activeTab, setActiveTab] = useState<string>('glossary');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isDark, setIsDark] = useState<boolean>(true);
  const [loading, setLoading] = useState<boolean>(false);
  const [ruleContent, setRuleContent] = useState<string>('');
  
  // RAG Input Parameters
  const [ragInput, setRagInput] = useState<string>('');
  const [ragLevel, setRagLevel] = useState<string>('L2');
  const [ragIntent, setRagIntent] = useState<string>('unknown');
  const [ragRepeat, setRagRepeat] = useState<string>('first');
  const [lexicalWeight, setLexicalWeight] = useState<number>(0.6);
  const [tagWeight, setTagWeight] = useState<number>(0.4);
  
  // Results History states
  const [verdictResult, setVerdictResult] = useState<any>(null);
  const [searchCandidates, setSearchCandidates] = useState<any[]>([]);
  const [recentRulings, setRecentRulings] = useState<RecentRuling[]>([]);

  // Toggle Dark Mode Classes
  useEffect(() => {
    const html = document.documentElement;
    if (isDark) {
      html.classList.add('dark');
    } else {
      html.classList.remove('dark');
    }
  }, [isDark]);

  // Load Rule Content Dynamically
  useEffect(() => {
    if (activeTab === 'referee') return;
    
    setLoading(true);
    fetch(`/api/rules?id=${activeTab}`)
      .then(res => res.json())
      .then(data => {
        if (data.content) {
          setRuleContent(mdToHtml(data.content));
        } else {
          setRuleContent('<p style="color:var(--danger)">無法讀取手冊內容。</p>');
        }
        setLoading(false);
      })
      .catch(err => {
        console.error('Error loading rules:', err);
        setRuleContent('<p style="color:var(--danger)">發生錯誤，無法連線至 API。</p>');
        setLoading(false);
      });
  }, [activeTab]);

  // Load Search History
  useEffect(() => {
    const saved = localStorage.getItem('recent_rulings');
    if (saved) {
      try {
        setRecentRulings(JSON.parse(saved));
      } catch (e) {
        console.error(e);
      }
    }
  }, []);

  // API Trigger Verdict Recommendation
  const handleRunRag = async (overrideQuery?: string) => {
    const query = overrideQuery || ragInput;
    if (!query.trim()) return;

    setLoading(true);
    try {
      const res = await fetch('/api/verdict', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query,
          level: ragLevel,
          intent: ragIntent,
          repeat: ragRepeat,
          lexicalWeight,
          tagWeight
        })
      });
      
      const data = await res.json();
      if (data.verdict) {
        setVerdictResult(data.verdict);
        
        // Load candidate options
        const searchRes = await fetch(`/api/search?q=${encodeURIComponent(query)}&lexicalWeight=${lexicalWeight}&tagWeight=${tagWeight}`);
        const searchData = await searchRes.json();
        setSearchCandidates(searchData.results || []);

        // Save into local History logs
        const newRuling: RecentRuling = {
          id: Date.now().toString(),
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          query: query.length > 25 ? query.substring(0, 25) + '...' : query,
          level: ragLevel,
          title: data.item.title,
          penalty: data.verdict.penalty
        };

        const updatedHistory = [newRuling, ...recentRulings.slice(0, 9)];
        setRecentRulings(updatedHistory);
        localStorage.setItem('recent_rulings', JSON.stringify(updatedHistory));
      } else {
        setVerdictResult({ error: true, message: data.message || '無法取得裁決建議。' });
        setSearchCandidates([]);
      }
    } catch (e) {
      console.error(e);
      setVerdictResult({ error: true, message: '伺服器錯誤，請稍後再試。' });
      setSearchCandidates([]);
    } finally {
      setLoading(false);
    }
  };

  const handleClearRag = () => {
    setRagInput('');
    setVerdictResult(null);
    setSearchCandidates([]);
  };

  const handleFillSample = (sample: string) => {
    setRagInput(sample);
    handleRunRag(sample);
  };

  // Switch tabs and scroll-highlight rule page elements
  const handleTraceback = (source: string, pageLabel: string) => {
    setActiveTab(source);
    
    setTimeout(() => {
      const badges = document.querySelectorAll('.page-badge');
      let targetElement: Element | null = null;
      const cleanKey = pageLabel.replace('原書', '').replace(/\s/g, '');
      
      badges.forEach(b => {
        if (!targetElement && b.textContent?.replace(/\s/g, '').includes(cleanKey)) {
          targetElement = b.closest('h1, h2, h3, h4, h5, p, li') || b.parentElement;
        }
      });

      if (targetElement) {
        (targetElement as HTMLElement).scrollIntoView({ behavior: 'smooth', block: 'center' });
        (targetElement as HTMLElement).classList.remove('rag-flash');
        void (targetElement as HTMLElement).offsetWidth; // trigger reflow
        (targetElement as HTMLElement).classList.add('rag-flash');
      }
    }, 500);
  };

  // Local text highlighting search
  const handleDocSearch = (query: string) => {
    setSearchQuery(query);
    removeHighlights();
    if (!query.trim()) return;

    const contentDiv = document.getElementById('rule-viewer-body');
    if (!contentDiv) return;

    const walk = document.createTreeWalker(contentDiv, NodeFilter.SHOW_TEXT, null);
    const textNodes: Node[] = [];
    let node;
    while (node = walk.nextNode()) {
      if (node.parentElement?.tagName !== 'SCRIPT' && node.parentElement?.tagName !== 'STYLE') {
        textNodes.push(node);
      }
    }

    textNodes.forEach(node => {
      const text = node.nodeValue || '';
      const index = text.toLowerCase().indexOf(query.toLowerCase());
      
      if (index >= 0) {
        const span = document.createElement('span');
        span.className = 'highlight-search';
        
        const before = text.substring(0, index);
        const match = text.substring(index, index + query.length);
        const after = text.substring(index + query.length);
        
        span.appendChild(document.createTextNode(match));
        
        const parent = node.parentElement;
        if (parent) {
          parent.insertBefore(document.createTextNode(before), node);
          parent.insertBefore(span, node);
          parent.insertBefore(document.createTextNode(after), node);
          parent.removeChild(node);
        }
      }
    });
  };

  const removeHighlights = () => {
    document.querySelectorAll('.highlight-search').forEach(highlight => {
      const parent = highlight.parentElement;
      if (parent) {
        parent.replaceChild(document.createTextNode(highlight.textContent || ''), highlight);
        parent.normalize();
      }
    });
  };

  return (
    <div className="app-container">
      {/* Sidebar navigation controls */}
      <Sidebar 
        activeTab={activeTab} 
        setActiveTab={setActiveTab}
        isDark={isDark}
        setIsDark={setIsDark}
        recentRulings={recentRulings}
        onSelectRecentRuling={(query, level) => {
          setRagInput(query);
          setRagLevel(level);
          handleRunRag(query);
        }}
      />

      {/* Main View Area */}
      <main className="main-viewport">
        <header className="top-bar">
          <div className="search-wrapper">
            <Search className="search-icon" style={{ width: 18, height: 18 }} />
            <input 
              type="text" 
              className="search-input" 
              value={searchQuery}
              onChange={(e) => handleDocSearch(e.target.value)}
              placeholder={activeTab === 'referee' ? '請在下方 RAG 面板進行情境檢索...' : '在當前頁面中搜尋文字...'} 
              disabled={activeTab === 'referee'}
            />
          </div>
          
          <div className="controls-group">
            <button className="btn-icon" onClick={() => window.print()} title="列印手冊">
              <Printer style={{ width: 18, height: 18 }} />
            </button>
          </div>
        </header>

        <div className="content-area">
          {loading ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: '16px' }}>
              <div style={{ width: '40px', height: '40px', border: '4px solid var(--border-color)', borderTopColor: 'var(--primary)', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
              <span style={{ color: 'var(--text-muted)' }}>正在加載中...</span>
              <style jsx>{`
                @keyframes spin {
                  to { transform: rotate(360deg); }
                }
              `}</style>
            </div>
          ) : activeTab === 'referee' ? (
            /* RAG REFEREE DASHBOARD */
            <div className="doc-page">
              <h1>裁判判罰系統 <span className="page-badge badge-highlight">RAG 智能檢索</span></h1>
              
              <div className="rag-intro">
                <p style={{ marginBottom: '8px' }}>
                  <strong>運作原理：</strong>此處實現了進階 Hybrid 檢索。包含 <strong>TF-IDF 內文餘弦相似度</strong> 搭配 <strong>標籤詞匹配度</strong>，
                  並可讓您藉由微調<strong>檢索比重</strong>控制兩者的權重比重。
                </p>
                <p style={{ marginBottom: '0' }}>
                  若後台配置了 AI 密鑰，裁決引擎將自動結合大會罰則條文生成極具溝通說服力的<strong>現場裁判執行指南</strong>；若未配置則以精準程序推導呈現。
                </p>
              </div>

              {/* RAG Controls inputs & sliders */}
              <RAGConsole 
                ragInput={ragInput}
                setRagInput={setRagInput}
                ragLevel={ragLevel}
                setRagLevel={setRagLevel}
                ragIntent={ragIntent}
                setRagIntent={setRagIntent}
                ragRepeat={ragRepeat}
                setRagRepeat={setRagRepeat}
                lexicalWeight={lexicalWeight}
                setLexicalWeight={setLexicalWeight}
                tagWeight={tagWeight}
                setTagWeight={setTagWeight}
                onSubmit={() => handleRunRag()}
                onClear={handleClearRag}
                onFillSample={handleFillSample}
              />

              {/* RAG Verdict results display */}
              {verdictResult ? (
                <VerdictCard 
                  verdictResult={verdictResult}
                  searchCandidates={searchCandidates}
                  ragLevel={ragLevel}
                  onTraceback={handleTraceback}
                />
              ) : (
                <div className="rag-panel" style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-muted)' }}>
                  <Scale style={{ width: 48, height: 48, margin: '0 auto 16px', opacity: 0.3 }} />
                  <p>請在上方輸入裁判現場情境描述，並設定參數比重後按下「執行裁決」。</p>
                </div>
              )}
            </div>
          ) : (
            /* MANUAL READER PANES */
            <ManualReader ruleContent={ruleContent} />
          )}
        </div>
      </main>
    </div>
  );
}
