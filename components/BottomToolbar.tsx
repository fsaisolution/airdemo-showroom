import React from 'react';
import { 
  Sparkles, 
  MessageSquare, 
  ScanLine
} from 'lucide-react';

const BottomToolbar: React.FC<{ onNavigate: (id: string) => void }> = ({ onNavigate }) => {
  return (
    <div className="fixed bottom-8 left-1/2 -translate-x-1/2 w-full max-w-xs px-4 z-50">
      <div className="relative group">
        {/* 背景光效 */}
        <div className="absolute -inset-0.5 bg-gradient-to-r from-blue-500/20 via-purple-500/20 to-blue-500/20 rounded-[2rem] blur opacity-75 group-hover:opacity-100 transition duration-1000 group-hover:duration-200" />
        
        {/* 主容器 */}
        <div className="relative flex items-center justify-center bg-[color:var(--bg-surface-1)] rounded-full border border-[color:var(--border)] shadow-[var(--shadow-lg)] p-2 gap-3 backdrop-blur-md">
          
          <button
            onClick={() => window.open('https://gemini.google.com/app', '_blank')}
            className="w-10 h-10 flex items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-purple-600 text-white shadow-md hover:scale-105 hover:shadow-lg transition-all duration-200"
            title="Gemini AI"
          >
            <Sparkles size={20} />
          </button>
          
          <div className="w-px h-6 bg-[color:var(--border)]" />
          
          <button
            onClick={() => onNavigate('inspection')}
            className="w-10 h-10 flex items-center justify-center rounded-full bg-[color:var(--bg-surface-2)] text-[color:var(--text)] hover:bg-[color:var(--bg-subtle)] hover:text-[color:var(--primary)] transition-all duration-200 hover:scale-105 border border-[color:var(--border)]"
            title="AI 智能巡检"
          >
            <ScanLine size={20} />
          </button>

          <button
            onClick={() => onNavigate('tantan')}
            className="w-10 h-10 flex items-center justify-center rounded-full bg-[color:var(--bg-surface-2)] text-[color:var(--text)] hover:bg-[color:var(--bg-subtle)] hover:text-[color:var(--primary)] transition-all duration-200 hover:scale-105 border border-[color:var(--border)]"
            title="探探"
          >
            <MessageSquare size={20} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default BottomToolbar;
