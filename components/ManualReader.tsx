import React from 'react';

interface ManualReaderProps {
  ruleContent: string;
}

export default function ManualReader({ ruleContent }: ManualReaderProps) {
  return (
    <div className="doc-page">
      <div 
        id="rule-viewer-body"
        className="markdown-body" 
        dangerouslySetInnerHTML={{ __html: ruleContent }} 
      />
    </div>
  );
}
