import React, { useState, useEffect, useRef, memo, useMemo } from 'react';
import { 
  LayoutGrid, 
  MessageSquare, 
  Settings, 
  Menu, 
  X, 
  Send, 
  Sparkles, 
  ChevronRight, 
  ChevronDown, 
  Search, 
  Plus, 
  MoreHorizontal,
  Home,
  ArrowRight,
  Zap,
  Clock,
  ArrowUpRight,
  ScanLine,
  User
} from 'lucide-react';
import { Card, Tag } from '@universe-design/react';
import { StarThinkingAnimation } from '@universe-design/react-x/ai';
import { EFFICIENCY_TOOLS, PROMPT_TEMPLATES, INSPECTION_COVER_URL, GTM_COVER_URL, DEMO_LIST } from './constants';
import Catalog from './views/Catalog';
import Workspace from './views/Workspace';
import DemoFlow from './views/DemoFlow';
import AIGTMView from './views/AIGTMView';
import Efficiency from './views/Efficiency';
import Prism from './components/Prism';
import TextType from './components/TextType';
import BottomToolbar from './components/BottomToolbar';
import { Demo } from './types';

type AppId = 'home' | 'demo' | 'efficiency';
type WorkspaceViewId = 'main' | 'management' | 'equipment' | 'factory';

type Message = {
  role: 'user' | 'ai';
  text: string;
  html?: string;
};

const renderRichText = (text: string) => {
  let processedText = text;
  
  processedText = processedText.replace(/\*\*(.+?)\*\*/g, '<strong class="font-semibold text-[color:var(--text)]">$1</strong>');
  processedText = processedText.replace(/\*(.+?)\*/g, '<em class="italic text-[color:var(--text-2)]">$1</em>');
  processedText = processedText.replace(/`([^`]+)`/g, '<code class="bg-[color:var(--bg-surface-2)] px-1.5 py-0.5 rounded text-xs font-mono text-[color:var(--primary)] border border-[color:var(--border)]">$1</code>');
  
  const urlRegex = /(https?:\/\/[^\s\)]+)/g;
  processedText = processedText.replace(urlRegex, '<a href="$1" target="_blank" rel="noopener noreferrer" class="text-[color:var(--primary)] hover:text-[color:var(--primary-hover)] underline">$1</a>');
  
  processedText = processedText.replace(/^#### (.+)$/gm, '<h4 class="text-xs font-semibold text-[color:var(--text)] mt-3 mb-1">$1</h4>');
  processedText = processedText.replace(/^### (.+)$/gm, '<h3 class="text-sm font-semibold text-[color:var(--text)] mt-4 mb-2 border-l-2 border-[color:var(--primary)] pl-2">$1</h3>');
  processedText = processedText.replace(/^## (.+)$/gm, '<h2 class="text-base font-bold text-[color:var(--text)] mt-4 mb-2">$1</h2>');
  processedText = processedText.replace(/^# (.+)$/gm, '<h1 class="text-lg font-bold text-[color:var(--text)] mt-3 mb-2">$1</h1>');
  
  processedText = processedText.replace(/^> (.+)$/gm, '<blockquote class="border-l-2 border-[color:var(--primary)] pl-3 py-1 my-2 text-xs text-[color:var(--text-2)] bg-[color:var(--bg-surface-2)] rounded-r">$1</blockquote>');
  
  processedText = processedText.replace(/^- \[x\] (.+)$/gm, '<li class="flex items-start gap-2 text-xs text-[color:var(--text-2)] ml-2 mb-1"><span class="text-[color:var(--primary)]">✓</span><span>$1</span></li>');
  processedText = processedText.replace(/^- \[ \] (.+)$/gm, '<li class="flex items-start gap-2 text-xs text-[color:var(--text-2)] ml-2 mb-1"><span class="text-[color:var(--text-3)]">○</span><span>$1</span></li>');
  processedText = processedText.replace(/^- (.+)$/gm, '<li class="flex items-start gap-2 text-xs text-[color:var(--text-2)] ml-2 mb-1"><span class="text-[color:var(--primary)] mt-0.5">•</span><span>$1</span></li>');
  processedText = processedText.replace(/^(\d+)\. (.+)$/gm, '<li class="flex items-start gap-2 text-xs text-[color:var(--text-2)] ml-2 mb-1"><span class="font-medium text-[color:var(--text)] min-w-[16px]">$1.</span><span>$2</span></li>');
  
  processedText = processedText.replace(/^---$/gm, '<hr class="border-[color:var(--border)] my-3" />');
  
  processedText = processedText.replace(/\n\n+/g, '</div><div class="mb-2">');
  processedText = processedText.replace(/\n/g, '<br/>');
  
  processedText = '<div class="text-xs leading-relaxed text-[color:var(--text-2)]">' + processedText + '</div>';
  
  return processedText;
};

const AI_NAVIGATOR_URL = 'http://115.190.84.234:8081';
const AILY_CHAT_ENDPOINT = (import.meta as any).env?.VITE_AILY_CHAT_ENDPOINT || '/api/aily';

const App: React.FC = () => {
  const [selectedDemo, setSelectedDemo] = useState<Demo | null>(null);
  const [currentApp, setCurrentApp] = useState<AppId>('home');
  const [workspaceInitialView, setWorkspaceInitialView] = useState<WorkspaceViewId>('main');
  const [demoViewMode, setDemoViewMode] = useState<'flow' | 'workspace'>('flow');
  const [homeMessages, setHomeMessages] = useState<Message[]>([{ role: 'ai', text: '你好，我是首页 AI 助手。想先看探探 / 蕊蕊 / 巡检哪个？' }]);
  const [homeInput, setHomeInput] = useState('');
  const [isHomeChatCollapsed, setIsHomeChatCollapsed] = useState(true);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isHomeChatLoading, setIsHomeChatLoading] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const filteredDemos = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const query = searchQuery.trim().toLowerCase();
    return DEMO_LIST.filter(d => {
      if (d.isPlaceholder) return false;
      return (
        d.title.toLowerCase().includes(query) ||
        d.valueProp.toLowerCase().includes(query) ||
        (d.points && d.points.some(p => p.toLowerCase().includes(query))) ||
        (d.audience && d.audience.toLowerCase().includes(query)) ||
        (d.steps && d.steps.some(s => 
          s.title.toLowerCase().includes(query) || 
          (s.script && s.script.toLowerCase().includes(query)) || 
          (s.value && s.value.toLowerCase().includes(query)) ||
          (s.component && s.component.toLowerCase().includes(query)) ||
          (s.fallback && s.fallback.toLowerCase().includes(query))
        ))
      );
    });
  }, [searchQuery]);

  const filteredTools = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const query = searchQuery.trim().toLowerCase();
    return EFFICIENCY_TOOLS.filter(t => 
      t.title.toLowerCase().includes(query) || 
      t.name.toLowerCase().includes(query) || 
      (t.skills && t.skills.some(s => s.toLowerCase().includes(query))) ||
      (t.highlight && t.highlight.toLowerCase().includes(query))
    );
  }, [searchQuery]);

  const handleGoHome = () => {
    setSelectedDemo(null);
    setCurrentApp('home');
    setDemoViewMode('flow');
    setIsMobileMenuOpen(false);
  };

  const handleReset = () => {
    setSelectedDemo(null);
    setDemoViewMode('flow');
    setIsMobileMenuOpen(false);
  };

  const openEfficiencyTool = (url: string) => {
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const replyHomeAssistantFallback = (text: string) => {
    const t = text.trim();
    const lower = t.toLowerCase();
    if (!t) return '我这边没听清，可以再具体一点吗？';
    if (t.includes('探探') || lower.includes('tantan')) return '探探适合做互动式客户调研，自动生成调研总结，先把关注点收敛。';
    if (t.includes('蕊蕊') || lower.includes('ruirui')) return '蕊蕊适合做汇报复盘：金句、干系人洞察、故事线及案例推荐。';
    if (t.includes('巡检') || t.includes('智能巡检') || lower.includes('inspection')) return '可以直接点击首页里的「AI 智能巡检」卡片进入演示，我会帮你讲完闭环。';
    if (t.includes('推荐') || t.includes('怎么选')) return '你可以告诉我 行业 / 角色 / 当前最大痛点，我帮你选一条最合适的 Demo 路线。';
    return '收到。如果你愿意，也可以直接从首页卡片进入「最新 Demo」或「最新数字伙伴」。';
  };

  const sendHomeMessage = async () => {
    const text = homeInput.trim();
    if (!text || isHomeChatLoading) return;

    // 先把用户消息 push 进去
    setHomeMessages((prev) => [...prev, { role: 'user', text }]);
    setHomeInput('');
    setIsHomeChatLoading(true);

    try {
      const resp = await fetch(AILY_CHAT_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ message: text }),
      });

      if (!resp.ok) {
        throw new Error(`HTTP ${resp.status}`);
      }

      const data = await resp.json();
      const answer = typeof data?.answer === 'string' && data.answer.trim()
        ? data.answer.trim()
        : replyHomeAssistantFallback(text);

      setHomeMessages((prev) => [...prev, { role: 'ai', text: answer }]);
    } catch (error) {
      console.error('首页 Aily 对话调用失败，使用本地 fallback：', error);
      const fallback = replyHomeAssistantFallback(text);
      setHomeMessages((prev) => [...prev, { role: 'ai', text: fallback }]);
    } finally {
      setIsHomeChatLoading(false);
    }
  };

  const activeLabel = selectedDemo 
    ? selectedDemo.title 
    : currentApp === 'home' 
      ? '首页' 
      : currentApp === 'demo'
        ? 'Demo中心'
        : '数字伙伴';

  const isLightMode = currentApp === 'demo' && selectedDemo && demoViewMode === 'workspace';

  const apps: { id: AppId; name: string; icon: React.ReactNode }[] = [
    { id: 'home', name: '首页', icon: <img src="https://raw.githubusercontent.com/xjjm123123123/my_imge/main/img/ChatGPT%20Image%202025%E5%B9%B412%E6%9C%8825%E6%97%A5%2014_32_47%201.png" alt="首页" className="w-4 h-4 object-contain" loading="lazy" /> },
    { id: 'demo', name: 'Demo中心', icon: <img src="https://raw.githubusercontent.com/xjjm123123123/my_imge/main/img/ChatGPT%20Image%202025%E5%B9%B412%E6%9C%8825%E6%97%A5%2014_31_10%201.png" alt="Demo" className="w-4 h-4 object-contain" loading="lazy" /> },
    { id: 'efficiency', name: '数字伙伴', icon: <img src="https://raw.githubusercontent.com/xjjm123123123/my_imge/main/img/ChatGPT%20Image%202025%E5%B9%B412%E6%9C%8825%E6%97%A5%2014_31_37%201.png" alt="数字伙伴" className="w-4 h-4 object-contain" loading="lazy" /> }
  ];


  const handleToolbarNavigate = (id: string) => {
    if (id === 'inspection') {
      const demo = DEMO_LIST.find(d => d.id === 'inspection');
      if (demo) {
        setSelectedDemo(demo);
        setCurrentApp('demo');
        setDemoViewMode('flow');
      }
    } else if (id === 'tantan') {
      // 映射到 GTM Demo (包含探探)
      const demo = DEMO_LIST.find(d => d.id === 'gtm');
      if (demo) {
        setSelectedDemo(demo);
        setCurrentApp('demo');
        setDemoViewMode('flow');
      }
    }
  };

  return (
    <div className="h-[100dvh] w-full bg-[color:var(--bg)] overflow-hidden font-sans relative">
      {/* <div className="absolute inset-0 pointer-events-none z-0 opacity-40">
        <Prism 
          animationType="rotate" 
          timeScale={0.5} 
          height={3.5} 
          baseWidth={5.5} 
          scale={3.6} 
          hueShift={0} 
          colorFrequency={1} 
          noise={0} 
          glow={1} 
          suspendWhenOffscreen={true}
        /> 
      </div> */}
      <header className="fixed top-0 left-0 right-0 h-14 border-b border-[color:var(--border)] flex items-center justify-between px-5 lg:px-6 bg-[color:var(--bg-surface-1)] z-50 backdrop-blur-md bg-opacity-95">
        <div className="flex items-center gap-4 lg:gap-6 min-w-0 flex-1">
          <div className="flex items-center gap-3 cursor-pointer group flex-shrink-0" onClick={handleGoHome}>
            <div className="relative w-8 h-8 flex-shrink-0">
              <img 
                src="https://raw.githubusercontent.com/xjjm123123123/my_imge/main/img/Lark_Suite_logo_2022%201_%E5%89%AF%E6%9C%AC.png" 
                alt="Logo" 
                className="w-full h-full object-contain transition-transform group-hover:scale-105"
                loading="lazy"
              />
            </div>
            <div className="flex flex-col leading-tight hidden sm:flex">
              <h1 className="font-medium text-[15px] text-[color:var(--text)] tracking-tight group-hover:text-[color:var(--primary)] transition-colors">AirDemo</h1>
              <span className="text-[11px] font-medium text-[color:var(--text-3)] tracking-wide">Showroom</span>
            </div>
          </div>

          {/* 移动端汉堡菜单按钮 */}
          <button
            className="lg:hidden flex items-center justify-center w-10 h-10 rounded-lg hover:bg-[color:var(--bg-surface-2)] transition-colors ml-auto"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            aria-label="打开菜单"
          >
            {isMobileMenuOpen ? (
              <X className="w-5 h-5 text-[color:var(--text)]" />
            ) : (
              <Menu className="w-5 h-5 text-[color:var(--text)]" />
            )}
          </button>
        </div>

        <div className="hidden lg:flex items-center gap-1 flex-shrink-0">
          {selectedDemo && (
            <>
              <button 
                onClick={handleReset} 
                className="flex items-center gap-2 h-10 px-4 text-[14px] whitespace-nowrap border border-[color:var(--border)] rounded-lg hover:bg-[color:var(--danger-subtle)] hover:text-[color:var(--danger)] hover:border-[color:var(--danger)] transition-all duration-150"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
                <span>退出演示</span>
              </button>
              <div className="w-px h-5 bg-[color:var(--border)] mx-2"></div>
            </>
          )}
          
          <div className="flex items-center gap-1">
            <div className="flex items-center gap-1 text-[14px] font-medium text-[color:var(--text-2)]">
              {selectedDemo ? (
                <span className="truncate max-w-[120px]">{selectedDemo.title}</span>
              ) : (
                <span className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-[color:var(--success)]"></span>
                  {activeLabel}
                </span>
              )}
            </div>
          </div>

          <div className="w-px h-5 bg-[color:var(--border)] mx-3"></div>

          <div className="flex items-center gap-1">
            <button 
              onClick={handleGoHome}
              className="flex items-center justify-center w-10 h-10 rounded-lg hover:bg-[color:var(--bg-surface-2)] transition-colors"
              title="返回首页"
            >
              <svg className="w-5 h-5 text-[color:var(--text-2)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
              </svg>
            </button>
            <button 
              onClick={() => setIsSearchOpen(true)}
              className="flex items-center justify-center w-10 h-10 rounded-lg hover:bg-[color:var(--bg-surface-2)] transition-colors"
            >
              <Search className="w-5 h-5 text-[color:var(--text-2)]" />
            </button>
            <div className="w-px h-5 bg-[color:var(--border)] mx-1"></div>
            <button className="flex items-center justify-center w-8 h-8 rounded-full bg-[color:var(--bg-surface-2)] text-[color:var(--text-2)] hover:bg-[color:var(--bg-surface-3)] hover:text-[color:var(--text)] transition-colors border border-[color:var(--border)]">
              <User size={16} />
            </button>
          </div>
        </div>
      </header>

      {/* 全局搜索弹窗 */}
      {isSearchOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-24 px-4">
          <div 
            className="absolute inset-0 bg-black/40 backdrop-blur-sm transition-opacity"
            onClick={() => setIsSearchOpen(false)}
          />
          <div className="relative w-full max-w-2xl bg-[color:var(--bg-surface-1)] rounded-lg shadow-2xl border border-[color:var(--border)] overflow-hidden flex flex-col animate-slideDown">
            <div className="flex items-center px-4 py-3 border-b border-[color:var(--border)] gap-3">
              <Search className="w-5 h-5 text-[color:var(--text-3)]" />
              <input 
                type="text" 
                placeholder="搜索方案、工具或功能..." 
                className="flex-1 bg-transparent text-[14px] text-[color:var(--text)] placeholder-[color:var(--text-3)] outline-none h-6"
                autoFocus
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              <button 
                onClick={() => setIsSearchOpen(false)}
                className="px-2 py-1 text-[12px] bg-[color:var(--bg-surface-2)] text-[color:var(--text-2)] rounded border border-[color:var(--border)] hover:bg-[color:var(--bg-surface-3)]"
              >
                ESC
              </button>
            </div>
            
            <div className="max-h-[60vh] overflow-y-auto p-2">
              {!searchQuery && (
                <div className="p-4 text-center text-[color:var(--text-3)] text-[13px]">
                  输入关键词搜索...
                </div>
              )}
              
              {searchQuery && (
                <div className="space-y-1">
                  {/* Demo 搜索结果 */}
                  {filteredDemos.map(demo => (
                    <div 
                      key={demo.id}
                      onClick={() => {
                        setWorkspaceInitialView('main');
                        setSelectedDemo(demo);
                        setCurrentApp('demo');
                        setDemoViewMode('flow');
                        setIsSearchOpen(false);
                      }}
                      className="flex items-center gap-3 p-3 hover:bg-[color:var(--bg-surface-2)] rounded-md cursor-pointer group"
                    >
                      <div className="w-8 h-8 rounded bg-[color:var(--bg-surface-3)] flex items-center justify-center text-[color:var(--text-2)]">
                        <LayoutGrid size={16} />
                      </div>
                      <div>
                        <div className="text-[13px] font-medium text-[color:var(--text)] flex items-center gap-2">
                          {demo.title}
                          <span className="px-1.5 py-0.5 rounded-full bg-[color:var(--primary)]/10 text-[color:var(--primary)] text-[10px]">Demo</span>
                        </div>
                        <div className="text-[11px] text-[color:var(--text-3)]">{demo.valueProp}</div>
                      </div>
                    </div>
                  ))}

                  {/* 工具搜索结果 */}
                  {filteredTools.map(tool => (
                    <div 
                      key={tool.id}
                      onClick={() => {
                        window.open(tool.url, '_blank');
                        setIsSearchOpen(false);
                      }}
                      className="flex items-center gap-3 p-3 hover:bg-[color:var(--bg-surface-2)] rounded-md cursor-pointer group"
                    >
                      <div className="w-8 h-8 rounded bg-[color:var(--bg-surface-3)] flex items-center justify-center text-[color:var(--text-2)]">
                        <Zap size={16} />
                      </div>
                      <div>
                        <div className="text-[13px] font-medium text-[color:var(--text)] flex items-center gap-2">
                          {tool.title}
                          <span className="px-1.5 py-0.5 rounded-full bg-orange-100 text-orange-600 text-[10px]">工具</span>
                        </div>
                        <div className="text-[11px] text-[color:var(--text-3)]">{tool.name}</div>
                      </div>
                    </div>
                  ))}
                  
                  {/* 无结果提示 */}
                  {filteredDemos.length === 0 && 
                   filteredTools.length === 0 && (
                    <div className="p-8 text-center text-[color:var(--text-3)] text-[13px]">
                      未找到相关内容
                    </div>
                  )}
                </div>
              )}
            </div>
            
            {/* 快捷键提示 */}
            {!searchQuery && (
              <div className="px-4 py-3 border-t border-[color:var(--border)] bg-[color:var(--bg-surface-2)]">
                <div className="flex items-center gap-4 text-[11px] text-[color:var(--text-3)]">
                  <span className="flex items-center gap-1">
                    <LayoutGrid size={12} />
                    搜索 Demo
                  </span>
                  <span className="flex items-center gap-1">
                    <Zap size={12} />
                    搜索工具
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 移动端菜单遮罩 */}
      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* 移动端菜单面板 */}
      {isMobileMenuOpen && (
        <div className="fixed top-14 right-0 left-0 bg-[color:var(--bg-surface-1)] border-b border-[color:var(--border)] z-50 lg:hidden shadow-xl animate-slideDown">
          <div className="p-3 space-y-1.5">
            {apps.map(app => (
              <button
                key={app.id}
                onClick={() => {
                  if (app.id === 'home') {
                    handleGoHome();
                  } else if (app.id === 'efficiency' && selectedDemo) {
                     setDemoViewMode('workspace');
                  } else if (app.id === 'demo') {
                    setSelectedDemo(null);
                  }
                  setCurrentApp(app.id);
                  setIsMobileMenuOpen(false);
                }}
                className={`w-full flex items-center gap-2.5 px-3.5 h-10 text-[13px] rounded-md transition-all duration-150 ${
                  currentApp === app.id 
                    ? 'bg-[color:var(--primary)]/10 text-[color:var(--primary)] font-medium' 
                    : 'text-[color:var(--text-2)] font-normal hover:bg-[color:var(--bg-surface-2)]'
                }`}
              >
                {app.icon}
                {app.name}
              </button>
            ))}

            <a
              href={AI_NAVIGATOR_URL}
              target="_blank"
              rel="noreferrer"
              className="w-full flex items-center gap-2.5 px-3.5 h-10 text-[13px] rounded-md text-[color:var(--text-2)] font-normal hover:bg-[color:var(--bg-surface-2)] transition-all duration-150"
            >
              <img src="https://raw.githubusercontent.com/xjjm123123123/my_imge/main/img/ChatGPT%20Image%202025%E5%B9%B412%E6%9C%8825%E6%97%A5%2014_36_28%201.png" alt="AI领航者" className="w-3.5 h-3.5 object-contain" />
              AI领航者
              <svg className="w-3 h-3 ml-auto opacity-40" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
            </a>

            {selectedDemo && (
              <button 
                onClick={() => {
                  handleReset();
                  setIsMobileMenuOpen(false);
                }}
                className="w-full flex items-center gap-2 h-10 text-[13px] px-3.5 border border-[color:var(--border)] rounded-md hover:bg-[color:var(--danger-subtle)] hover:text-[color:var(--danger)] hover:border-[color:var(--danger)] transition-all duration-150"
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
                退出演示
              </button>
            )}
          </div>
        </div>
      )}

      <main className={`absolute top-14 bottom-0 left-0 right-0 flex flex-col lg:flex-row overflow-hidden z-10 ${isLightMode ? 'light-theme' : ''}`}>
        {currentApp === 'efficiency' ? (
          <Efficiency />
        ) : selectedDemo ? (
          (demoViewMode === 'flow') ? (
            <DemoFlow 
              demo={selectedDemo} 
              onEnterApp={() => {
                if (selectedDemo.url) {
                  window.open(selectedDemo.url, '_blank', 'noopener,noreferrer');
                } else {
                  setDemoViewMode('workspace');
                }
              }} 
            />
          ) : selectedDemo.id === 'gtm' ? (
            <AIGTMView />
          ) : (
            <Workspace demo={selectedDemo} currentApp={currentApp} initialView={workspaceInitialView} />
          )
        ) : currentApp === 'home' ? (
          <div className="flex-1 flex flex-col lg:flex-row overflow-hidden relative">
            <div className="flex-1 overflow-y-auto no-scrollbar p-6 lg:p-8 pb-24 lg:pb-12">
              <div className="max-w-[1440px] mx-auto space-y-8 lg:space-y-10">
                {/* Hero Section */}
                <div className="flex flex-col lg:flex-row bg-white rounded-lg border border-[color:var(--border)] overflow-hidden shadow-[var(--shadow-sm)]">
                  {/* Left Steps Menu */}
                  <div className="lg:w-[320px] flex-shrink-0 flex flex-col justify-center py-6 px-4 border-b lg:border-b-0 lg:border-r border-[color:var(--border)] bg-white">
                    <div className="space-y-1">
                      <div 
                        onClick={() => { setCurrentApp('demo'); setDemoViewMode('flow'); }}
                        className={`group flex items-center gap-4 p-3 rounded-md transition-all cursor-pointer ${true ? 'bg-[color:var(--bg-surface-2)]' : 'hover:bg-[color:var(--bg-surface-2)]'}`}
                      >
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium border transition-colors ${true ? 'border-[color:var(--text-3)] text-[color:var(--text-2)]' : 'border-[color:var(--border-strong)] text-[color:var(--text-3)]'}`}>
                          1
                        </div>
                        <div>
                          <h4 className={`text-[14px] font-medium transition-colors ${true ? 'text-[color:var(--text)]' : 'text-[color:var(--text-2)] group-hover:text-[color:var(--text)]'}`}>浏览行业方案</h4>
                        </div>
                      </div>
                      <div 
                        onClick={() => { setCurrentApp('efficiency'); }}
                        className="group flex items-center gap-4 p-3 rounded-md transition-all cursor-pointer hover:bg-[color:var(--bg-surface-2)]"
                      >
                        <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium border border-[color:var(--border-strong)] text-[color:var(--text-3)]">
                          2
                        </div>
                        <div>
                          <h4 className="text-[14px] font-medium text-[color:var(--text-2)] group-hover:text-[color:var(--text)]">体验数字伙伴</h4>
                        </div>
                      </div>
                       <div className="group flex items-center gap-4 p-3 rounded-md transition-all cursor-pointer hover:bg-[color:var(--bg-surface-2)] opacity-60">
                          <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium border border-[color:var(--border-strong)] text-[color:var(--text-3)]">
                            3
                          </div>
                          <div>
                            <h4 className="text-[14px] font-medium text-[color:var(--text-3)] group-hover:text-[color:var(--text-2)]">更多功能正在开发</h4>
                          </div>
                        </div>
                    </div>
                  </div>

                  {/* Right Banner */}
                  <div className="flex-1 bg-[color:var(--bg-surface-2)] flex items-center justify-center overflow-hidden relative">
                    <img 
                      src="/images/Gemini_Generated_Image_mfzzjvmfzzjvmfzz.png" 
                      alt="Feishu AI Solution" 
                      className="w-full h-auto block"
                      loading="lazy"
                    />
                  </div>
                </div>

                {/* Quick Operation Section */}
                <section>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-[14px] font-medium text-[color:var(--text)]">快速操作</h3>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div
                        onClick={() => {
                          setSelectedDemo(null);
                          setCurrentApp('demo');
                        }}
                        className="flex items-center gap-3 p-3 bg-[color:var(--bg-surface-1)] border border-[color:var(--border)] rounded-lg hover:shadow-md hover:border-[color:var(--primary)] transition-all cursor-pointer group"
                      >
                        <div className="w-9 h-9 rounded-md bg-[color:var(--bg-surface-2)] flex items-center justify-center text-[color:var(--primary)] transition-colors">
                          <img src="https://raw.githubusercontent.com/xjjm123123123/my_imge/main/img/ChatGPT%20Image%202025%E5%B9%B412%E6%9C%8825%E6%97%A5%2014_31_10%201.png" alt="Demo" className="w-5 h-5 object-contain" loading="lazy" />
                        </div>
                        <div className="flex flex-col min-w-0">
                          <span className="text-[13px] font-medium text-[color:var(--text)] truncate">Demo中心</span>
                          <span className="text-[11px] text-[color:var(--text-3)] truncate">浏览所有方案</span>
                        </div>
                      </div>

                      <div
                        onClick={() => {
                           if (selectedDemo) setDemoViewMode('workspace');
                           setCurrentApp('efficiency');
                        }}
                        className="flex items-center gap-3 p-3 bg-[color:var(--bg-surface-1)] border border-[color:var(--border)] rounded-lg hover:shadow-md hover:border-[color:var(--primary)] transition-all cursor-pointer group"
                      >
                        <div className="w-9 h-9 rounded-md bg-[color:var(--bg-surface-2)] flex items-center justify-center text-[color:var(--primary)] transition-colors">
                          <img src="https://raw.githubusercontent.com/xjjm123123123/my_imge/main/img/ChatGPT%20Image%202025%E5%B9%B412%E6%9C%8825%E6%97%A5%2014_31_37%201.png" alt="数字伙伴" className="w-5 h-5 object-contain" loading="lazy" />
                        </div>
                        <div className="flex flex-col min-w-0">
                          <span className="text-[13px] font-medium text-[color:var(--text)] truncate">数字伙伴</span>
                          <span className="text-[11px] text-[color:var(--text-3)] truncate">AI 效率工具</span>
                        </div>
                      </div>

                      <div
                        onClick={() => window.open(AI_NAVIGATOR_URL, '_blank')}
                        className="flex items-center gap-3 p-3 bg-[color:var(--bg-surface-1)] border border-[color:var(--border)] rounded-lg hover:shadow-md hover:border-[color:var(--primary)] transition-all cursor-pointer group"
                      >
                        <div className="w-9 h-9 rounded-md bg-[color:var(--bg-surface-2)] flex items-center justify-center text-[color:var(--primary)] transition-colors">
                          <img src="https://raw.githubusercontent.com/xjjm123123123/my_imge/main/img/ChatGPT%20Image%202025%E5%B9%B412%E6%9C%8825%E6%97%A5%2014_36_28%201.png" alt="AI领航者" className="w-5 h-5 object-contain" loading="lazy" />
                        </div>
                        <div className="flex flex-col min-w-0">
                          <span className="text-[13px] font-medium text-[color:var(--text)] truncate">AI领航者</span>
                          <span className="text-[11px] text-[color:var(--text-3)] truncate">探索更多可能</span>
                        </div>
                      </div>
                  </div>
                </section>

                {/* News Push (Demo List) */}
                <section>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-[14px] font-medium text-[color:var(--text)]">最新 Demo</h3>
                    <div className="flex gap-2">
                       <button 
                         onClick={() => {
                           const container = document.getElementById('demo-list-container');
                           if (container) container.scrollBy({ left: -container.clientWidth, behavior: 'smooth' });
                         }}
                         className="w-6 h-6 rounded-full border border-[color:var(--border)] flex items-center justify-center text-[color:var(--text-2)] hover:bg-[color:var(--bg-surface-2)] transition-colors active:scale-95"
                       >
                         <ChevronDown size={14} className="rotate-90" />
                       </button>
                       <button 
                         onClick={() => {
                           const container = document.getElementById('demo-list-container');
                           if (container) container.scrollBy({ left: container.clientWidth, behavior: 'smooth' });
                         }}
                         className="w-6 h-6 rounded-full border border-[color:var(--border)] flex items-center justify-center text-[color:var(--text-2)] hover:bg-[color:var(--bg-surface-2)] transition-colors active:scale-95"
                       >
                         <ChevronRight size={14} />
                       </button>
                    </div>
                  </div>

                  <div 
                    id="demo-list-container"
                    className="flex overflow-x-auto snap-x snap-mandatory gap-4 no-scrollbar -mx-1 px-1 pb-1 scroll-smooth"
                  >
                    {/* Page 1 */}
                    <div className="flex-none w-full grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 snap-start">
                      {DEMO_LIST.slice(0, 4).map((demo) => (
                        <Card
                          key={demo.id}
                          bordered={false}
                          shadowed={false}
                          onClick={() => {
                            setWorkspaceInitialView('main');
                            setSelectedDemo(demo);
                            setCurrentApp('demo');
                            setDemoViewMode('flow');
                          }}
                          className="group cursor-pointer overflow-hidden bg-[color:var(--bg-surface-1)] border-[0.5px] border-[color:var(--border)] hover:-translate-y-[2px] hover:shadow-[0_8px_24px_rgba(0,0,0,0.12)] transition-all duration-300 rounded-lg flex flex-col h-full p-0"
                          style={{ padding: 0 }}
                        >
                          <div className="aspect-video w-full relative border-b-[0.5px] border-[color:var(--border)] bg-[color:var(--bg-surface-2)]">
                            {demo.cover ? (
                              <img src={demo.cover} alt="" className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-[color:var(--text-3)]">
                                <LayoutGrid size={24} />
                              </div>
                            )}
                            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/5 transition-colors" />
                          </div>
                          <div className="p-3 flex-1 flex flex-col justify-center">
                            <h4 className="text-[16px] font-medium text-[color:var(--text)] mb-1 truncate group-hover:text-[color:var(--primary)] transition-colors">{demo.title}</h4>
                            <p className="text-[12px] text-[color:var(--text-3)] line-clamp-1">{demo.valueProp}</p>
                          </div>
                        </Card>
                      ))}
                    </div>

                    {/* Page 2 (More Demos Placeholder) */}
                    <div className="flex-none w-full grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 snap-start">
                      {DEMO_LIST.slice(4).map((demo) => (
                        <div key={demo.id} className="h-full">
                        {demo.isPlaceholder ? (
                           <div
                            onClick={() => {}}
                            className="h-full ui-card overflow-hidden text-left bg-[color:var(--bg-subtle)] border border-dashed border-[color:var(--border)] hover:border-[color:var(--text-3)] flex flex-col justify-center items-center text-center p-5 rounded-lg transition-colors group cursor-default"
                          >
                            <div className="w-9 h-9 rounded-full bg-[color:var(--surface)] border border-[color:var(--border)] flex items-center justify-center text-[color:var(--text-3)] mb-3 group-hover:scale-110 transition-transform duration-300">
                              <LayoutGrid size={14} />
                            </div>
                            <h4 className="text-[16px] font-medium text-[color:var(--text)] mb-1">{demo.title}</h4>
                            <p className="text-[11px] text-[color:var(--text-3)]">{demo.valueProp}</p>
                          </div>
                        ) : (
                          <Card
                            bordered={false}
                            shadowed={false}
                            onClick={() => {
                              setWorkspaceInitialView('main');
                              setSelectedDemo(demo);
                              setCurrentApp('demo');
                              setDemoViewMode('flow');
                            }}
                            className="group cursor-pointer overflow-hidden bg-[color:var(--bg-surface-1)] border-[0.5px] border-[color:var(--border)] hover:-translate-y-[2px] hover:shadow-[0_8px_24px_rgba(0,0,0,0.12)] transition-all duration-300 rounded-lg flex flex-col h-full p-0"
                            style={{ padding: 0 }}
                          >
                            <div className="aspect-video w-full relative border-b-[0.5px] border-[color:var(--border)] bg-[color:var(--bg-surface-2)]">
                              {demo.cover ? (
                                <img src={demo.cover} alt="" className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center text-[color:var(--text-3)]">
                                  <LayoutGrid size={24} />
                                </div>
                              )}
                              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/5 transition-colors" />
                            </div>
                            <div className="p-3 flex-1 flex flex-col justify-center">
                              <h4 className="text-[16px] font-medium text-[color:var(--text)] mb-1 truncate group-hover:text-[color:var(--primary)] transition-colors">{demo.title}</h4>
                              <p className="text-[12px] text-[color:var(--text-3)] line-clamp-1">{demo.valueProp}</p>
                            </div>
                          </Card>
                        )}
                        </div>
                      ))}
                    </div>
                  </div>
                </section>

                {/* Bottom Split View */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 pb-8">
                  {/* Recently */}
                  <div className="lg:col-span-8">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-[14px] font-medium text-[color:var(--text)]">数字伙伴</h3>
                      <button className="flex items-center gap-2 text-[12px] text-[color:var(--text-2)] hover:text-[color:var(--text)] transition-colors">
                        <span>全部类型</span>
                        <ChevronDown size={12} />
                      </button>
                    </div>
                    <Card borderRadius="medium" shadow="small">
                      {EFFICIENCY_TOOLS.map((tool, index) => (
                        <div
                          key={tool.id}
                          onClick={() => window.open(tool.url, '_blank')}
                          className={`flex items-center justify-between p-4 hover:bg-[color:var(--bg-surface-2)] transition-colors cursor-pointer group ${index !== EFFICIENCY_TOOLS.length - 1 ? 'border-b border-[color:var(--border)]' : ''}`}
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-12 h-12 rounded-lg overflow-hidden bg-[color:var(--bg-surface-2)] flex items-center justify-center">
                              {tool.avatarUrl ? (
                                <img src={tool.avatarUrl} alt="" className="w-8 h-8 object-contain" />
                              ) : (
                                <Zap size={24} className="text-[color:var(--primary)]" />
                              )}
                            </div>
                            <div>
                              <div className="text-[13px] text-[color:var(--text)] font-medium">{tool.title}</div>
                              <div className="text-[11px] text-[color:var(--text-3)] mt-0.5">{tool.name}</div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                             <Tag color="neutral" size="small" shape="round">
                                {tool.skills[0]}
                              </Tag>
                             <span className="text-[12px] text-[color:var(--text-3)]">刚刚</span>
                          </div>
                        </div>
                      ))}
                    </Card>
                  </div>

                  {/* Site AI Assistant (Integrated) */}
                  <div className="lg:col-span-4 flex flex-col">
                     <div className="flex items-center justify-between mb-4">
                      <h3 className="text-[14px] font-medium text-[color:var(--text)]">站点智能问答助手</h3>
                    </div>
                    <div className="ui-card border border-[color:var(--border)] rounded-lg flex flex-col overflow-hidden h-[500px]">
                      {/* Messages Area */}
                      <div className="flex-1 overflow-y-auto no-scrollbar p-3 space-y-3 bg-[color:var(--bg-surface-1)]">
                        {homeMessages.map((m, idx) => (
                          <div key={idx} className="flex flex-col gap-1.5">
                            <div className={`flex ${m.role === 'ai' ? 'justify-start' : 'justify-end'}`}>
                              <div className={`max-w-[90%] p-2.5 rounded-lg text-[12px] leading-relaxed border shadow-sm ${m.role === 'ai' ? 'bg-[color:var(--bg-surface-2)] border-[color:var(--border)] text-[color:var(--text)]' : 'bg-[color:var(--primary)] border-transparent text-white'}`}>
                                {m.role === 'ai' ? (
                                  <div dangerouslySetInnerHTML={{ __html: renderRichText(m.text) }} />
                                ) : (
                                  m.text
                                )}
                              </div>
                            </div>
                            {idx === 0 && m.role === 'ai' && (
                              <div className="flex flex-wrap gap-1.5 ml-1">
                                <button onClick={() => setHomeInput('探探')} className="px-2 py-1 text-[10px] rounded-full border border-[color:var(--border)] bg-[color:var(--bg-surface-1)] hover:bg-[color:var(--bg-surface-2)] transition-colors text-[color:var(--text-2)]">探探</button>
                                <button onClick={() => setHomeInput('蕊蕊')} className="px-2 py-1 text-[10px] rounded-full border border-[color:var(--border)] bg-[color:var(--bg-surface-1)] hover:bg-[color:var(--bg-surface-2)] transition-colors text-[color:var(--text-2)]">蕊蕊</button>
                                <button onClick={() => setHomeInput('巡检')} className="px-2 py-1 text-[10px] rounded-full border border-[color:var(--border)] bg-[color:var(--bg-surface-1)] hover:bg-[color:var(--bg-surface-2)] transition-colors text-[color:var(--text-2)]">巡检</button>
                              </div>
                            )}
                          </div>
                        ))}
                        {isHomeChatLoading && (
                          <div className="flex justify-start">
                            <div className="max-w-[90%] p-2.5 rounded-lg border bg-[color:var(--bg-surface-2)] border-[color:var(--border)]">
                              <div className="flex items-center gap-2">
                                <div className="flex gap-1">
                                  <StarThinkingAnimation size={16} />
                                </div>
                                <span className="text-[11px] text-[color:var(--text-3)]">AI 正在思考...</span>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Input Area */}
                      <div className="p-3 border-t border-[color:var(--border)] bg-[color:var(--bg-surface-1)]">
                        <div className="relative w-full">
                          <input
                            value={homeInput}
                            onChange={(e) => setHomeInput(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') sendHomeMessage();
                            }}
                            placeholder="输入你的问题…"
                            className="w-full pl-3 pr-9 h-9 text-[12px] rounded-md bg-[color:var(--bg-surface-2)] border border-transparent focus:border-[color:var(--primary)] focus:bg-[color:var(--bg-surface-1)] transition-all outline-none"
                          />
                          <button
                            onClick={sendHomeMessage}
                            className="absolute right-1 top-1/2 -translate-y-1/2 w-7 h-7 flex items-center justify-center text-[color:var(--primary)] hover:bg-[color:var(--primary-subtle)] rounded-md transition-colors"
                          >
                            <Send size={14} />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* <BottomToolbar onNavigate={handleToolbarNavigate} /> */}
              </div>
            </div>

          </div>
        ) : currentApp === 'demo' ? (
          <Catalog onSelectDemo={(demo) => { setWorkspaceInitialView('main'); setSelectedDemo(demo); setCurrentApp('demo'); setDemoViewMode('flow'); }} />
        ) : null}
      </main>
    </div>
  );
};

export default memo(App);
