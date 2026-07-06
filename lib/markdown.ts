/**
 * A lightweight, dependency-free Markdown-to-HTML parser for rendering rule documents.
 * Handles headings, tables, alerts, lists, bold text, blockquotes, and custom badges.
 */
export function mdToHtml(md: string): string {
  if (!md) return '';

  const lines = md.split('\n');
  let html = '';
  let inList = false;
  let inTable = false;
  let inCodeBlock = false;
  let codeBlockLang = '';
  let codeBlockLines: string[] = [];
  let tableHeaders: string[] = [];
  let tableRows: string[][] = [];

  for (let i = 0; i < lines.length; i++) {
    let line = lines[i];

    // 0. Handle fenced code blocks (including mermaid)
    if (line.trim().startsWith('```')) {
      if (!inCodeBlock) {
        inCodeBlock = true;
        codeBlockLang = line.trim().slice(3).trim();
        codeBlockLines = [];
        continue;
      }

      const codeContent = codeBlockLines.join('\n');
      if (codeBlockLang === 'mermaid') {
        html += `<div class="mermaid-block" data-mermaid="${escapeAttr(codeContent)}"><pre class="code-block mermaid">${escapeHtml(codeContent)}</pre><p class="mermaid-note">（流程圖：請參考官方 PDF 原文）</p></div>`;
      } else {
        html += `<pre class="code-block${codeBlockLang ? ` lang-${codeBlockLang}` : ''}">${escapeHtml(codeContent)}</pre>`;
      }
      inCodeBlock = false;
      codeBlockLang = '';
      codeBlockLines = [];
      continue;
    }

    if (inCodeBlock) {
      codeBlockLines.push(line);
      continue;
    }

    line = line.trim();

    // 1. Handle Table Parsing
    if (line.startsWith('|')) {
      if (!inTable) {
        inTable = true;
        tableHeaders = line.split('|').map(x => x.trim()).filter((_, idx, arr) => idx > 0 && idx < arr.length - 1);
        continue;
      }
      
      // Skip separator row (e.g., |---|---|)
      if (line.includes('---')) {
        continue;
      }

      const cols = line.split('|').map(x => x.trim()).filter((_, idx, arr) => idx > 0 && idx < arr.length - 1);
      tableRows.push(cols);
      continue;
    } else {
      if (inTable) {
        // Render completed table
        html += '<table><thead><tr>';
        tableHeaders.forEach(h => {
          html += `<th>${renderInline(h)}</th>`;
        });
        html += '</tr></thead><tbody>';
        tableRows.forEach(row => {
          html += '<tr>';
          row.forEach(cell => {
            html += `<td>${renderInline(cell)}</td>`;
          });
          html += '</tr>';
        });
        html += '</tbody></table>';
        inTable = false;
        tableHeaders = [];
        tableRows = [];
      }
    }

    // 2. Handle List Parsing
    if (line.startsWith('- ') || line.startsWith('* ')) {
      if (!inList) {
        inList = true;
        html += '<ul>';
      }
      html += `<li>${renderInline(line.substring(2))}</li>`;
      continue;
    } else {
      if (inList) {
        html += '</ul>';
        inList = false;
      }
    }

    // 3. Skip empty lines
    if (!line) {
      continue;
    }

    // 4. Headings
    if (line.startsWith('# ')) {
      html += `<h1>${renderInline(line.substring(2))}</h1>`;
    } else if (line.startsWith('## ')) {
      html += `<h2>${renderInline(line.substring(3))}</h2>`;
    } else if (line.startsWith('### ')) {
      html += `<h3>${renderInline(line.substring(4))}</h3>`;
    } else if (line.startsWith('#### ')) {
      html += `<h4>${renderInline(line.substring(5))}</h4>`;
    } else if (line.startsWith('##### ')) {
      html += `<h5>${renderInline(line.substring(6))}</h5>`;
    } else if (line.startsWith('###### ')) {
      html += `<h6>${renderInline(line.substring(7))}</h6>`;
    }
    // 5. Blockquotes / Alerts
    else if (line.startsWith('> ')) {
      let content = line.substring(2);
      let alertClass = '';
      let alertTitle = '';

      if (content.startsWith('[!NOTE]')) {
        alertClass = 'alert alert-note';
        alertTitle = '提示 NOTE';
        content = content.replace('[!NOTE]', '').trim();
      } else if (content.startsWith('[!WARNING]')) {
        alertClass = 'alert alert-warning';
        alertTitle = '警告 WARNING';
        content = content.replace('[!WARNING]', '').trim();
      } else if (content.startsWith('[!IMPORTANT]')) {
        alertClass = 'alert alert-important';
        alertTitle = '重要 IMPORTANT';
        content = content.replace('[!IMPORTANT]', '').trim();
      } else if (content.startsWith('[!CAUTION]')) {
        alertClass = 'alert alert-danger';
        alertTitle = '注意 CAUTION';
        content = content.replace('[!CAUTION]', '').trim();
      }

      if (alertClass) {
        html += `<div class="${alertClass}"><div class="alert-title">${alertTitle}</div><p>${renderInline(content)}</p></div>`;
      } else {
        html += `<blockquote><p>${renderInline(content)}</p></blockquote>`;
      }
    }
    // 6. Horizontal Rules
    else if (line === '---' || line === '***') {
      html += '<hr />';
    }
    // 7. Regular paragraphs
    else {
      html += `<p>${renderInline(line)}</p>`;
    }
  }

  // Close lists or tables that extend to the end of content
  if (inList) html += '</ul>';
  if (inTable) {
    html += '<table><thead><tr>';
    tableHeaders.forEach(h => { html += `<th>${renderInline(h)}</th>`; });
    html += '</tr></thead><tbody>';
    tableRows.forEach(row => {
      html += '<tr>';
      row.forEach(cell => { html += `<td>${renderInline(cell)}</td>`; });
      html += '</tr>';
    });
    html += '</tbody></table>';
  }

  return html;
}

// Inline formatting (bold, links, code, custom badges)
function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function escapeAttr(text: string): string {
  return escapeHtml(text).replace(/"/g, '&quot;');
}

function renderInline(text: string): string {
  return escapeHtml(text)
    // Bold markdown (**text**)
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    // Underline/Italic (*text*)
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    // Badges like `[原書第 X 頁]` or `[原書第 X-Y 頁]` or in backticks
    .replace(/`原書(第\s*[\d\-~]+\s*頁)`/g, '<span class="page-badge">原書$1</span>')
    .replace(/\[原書(第\s*[\d\-~]+\s*頁)\]/g, '<span class="page-badge">原書$1</span>')
    .replace(/`(.*?)`/g, '<code>$1</code>')
    // Links [text](url)
    .replace(/\[(.*?)\]\((.*?)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>');
}
