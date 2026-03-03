import React, { useState, useEffect, useRef, memo } from 'react';
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
  ScanLine
} from 'lucide-react';
import { DEMO_LIST, EFFICIENCY_TOOLS, PROMPT_TEMPLATES, INSPECTION_COVER_URL, GTM_COVER_URL } from './constants';
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
  
  processedText = processedText.replace(/\*\*(.*?)\*\*/g, '<strong class="text-base font-semibold text-[color:var(--text)]">$1</strong>');
  processedText = processedText.replace(/\*(.*?)\*/g, '<em class="text-[color:var(--text-2)]">$1</em>');
  processedText = processedText.replace(/`(.*?)`/g, '<code class="bg-[color:var(--bg-surface-2)] px-1.5 py-0.5 rounded text-xs font-mono text-[color:var(--primary)] border border-[color:var(--border)]">$1</code>');
  
  const urlRegex = /(https?:\/\/[^\s\)]+)/g;
  processedText = processedText.replace(urlRegex, '<a href="$1" target="_blank" rel="noopener noreferrer" class="text-[color:var(--primary)] hover:text-[color:var(--primary-hover)] underline font-medium">$1</a>');
  
  processedText = processedText.replace(/^### (.+)$/gm, '<h3 class="text-sm font-semibold text-[color:var(--text)] mt-3 mb-2 border-l-2 border-[color:var(--primary)] pl-2">$1</h3>');
  processedText = processedText.replace(/^## (.+)$/gm, '<h2 class="text-base font-bold text-[color:var(--text)] mt-4 mb-2">$1</h2>');
  processedText = processedText.replace(/^# (.+)$/gm, '<h1 class="text-lg font-bold text-[color:var(--text)] mt-4 mb-2">$1</h1>');
  
  processedText = processedText.replace(/^- (.+)$/gm, '<li class="text-xs text-[color:var(--text-2)] ml-4 mb-1">$1</li>');
  processedText = processedText.replace(/^(\d+)\. (.+)$/gm, '<li class="text-xs text-[color:var(--text-2)] ml-4 mb-1"><span class="font-medium text-[color:var(--text)]">$1.</span> $2</li>');
  
  processedText = processedText.replace(/\n\n/g, '</p><p class="text-xs text-[color:var(--text-2)] leading-relaxed mb-2">');
  processedText = processedText.replace(/\n/g, '<br/>');
  
  processedText = '<p class="text-xs text-[color:var(--text-2)] leading-relaxed mb-2">' + processedText + '</p>';
  
  return processedText;
};

const AI_NAVIGATOR_URL = 'http://115.190.84.234:8081';
const AILY_CHAT_ENDPOINT = (import.meta as any).env?.VITE_AILY_CHAT_ENDPOINT || '/api/aily';

const App: React.FC = () => {
  const [selectedDemo, setSelectedDemo] = useState<Demo | null>(null);
  const [currentApp, setCurrentApp] = useState<AppId>('home');
  const [workspaceInitialView, setWorkspaceInitialView] = useState<WorkspaceViewId>('main');
  const [demoViewMode, setDemoViewMode] = useState<'flow' | 'workspace'>('flow');
  const [homeMessages, setHomeMessages] = useState<Message[]>([{ role: 'ai', text: '你好，我是首页 AI 助手。想先看探探 / 睿睿 / 巡检哪个？' }]);
  const [homeInput, setHomeInput] = useState('');
  const [isHomeChatCollapsed, setIsHomeChatCollapsed] = useState(true);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isHomeChatLoading, setIsHomeChatLoading] = useState(false);

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
    if (t.includes('睿睿') || lower.includes('ruirui')) return '睿睿适合做汇报复盘：金句、干系人洞察、故事线及案例推荐。';
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

          {/* 桌面端导航菜单 */}
          <nav className="hidden lg:flex items-center gap-1 ml-2 lg:ml-8 overflow-x-auto no-scrollbar">
            {apps.map(app => (
              <button
                key={app.id}
                onClick={() => {
                  if (app.id === 'home') {
                    handleGoHome();
                    return;
                  }
                  if (app.id === 'efficiency' && selectedDemo) {
                     setDemoViewMode('workspace');
                  }
                  if (app.id === 'demo') {
                    setSelectedDemo(null);
                  }
                  setCurrentApp(app.id);
                }}
                className={`relative px-4 h-10 text-[14px] whitespace-nowrap flex-shrink-0 rounded-lg font-medium transition-all duration-150 ${
                  currentApp === app.id 
                    ? 'text-[color:var(--primary)] bg-[color:var(--primary)]/10' 
                    : 'text-[color:var(--text-2)] hover:text-[color:var(--text)] hover:bg-[color:var(--bg-surface-2)]'
                }`}
              >
                <span className="flex items-center gap-2">
                  {app.icon}
                  {app.name}
                </span>
                {currentApp === app.id && (
                  <span className="absolute bottom-1 left-1/2 -translate-x-1/2 w-5 h-0.5 bg-[color:var(--primary)] rounded-full" />
                )}
              </button>
            ))}

            <div className="w-px h-5 bg-[color:var(--border)] mx-2" />

            <a
              href={AI_NAVIGATOR_URL}
              target="_blank"
              rel="noreferrer"
              className="relative px-4 h-10 text-[14px] whitespace-nowrap flex-shrink-0 rounded-lg font-medium transition-all duration-150 text-[color:var(--text-2)] hover:text-[color:var(--text)] hover:bg-[color:var(--bg-surface-2)] flex items-center gap-2"
            >
              <img src="https://raw.githubusercontent.com/xjjm123123123/my_imge/main/img/ChatGPT%20Image%202025%E5%B9%B412%E6%9C%8825%E6%97%A5%2014_36_28%201.png" alt="AI领航者" className="w-4 h-4 object-contain" loading="lazy" />
              AI领航者
            </a>
          </nav>

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
            <button className="flex items-center justify-center w-10 h-10 rounded-lg hover:bg-[color:var(--bg-surface-2)] transition-colors">
              <Search className="w-5 h-5 text-[color:var(--text-2)]" />
            </button>
            <button className="flex items-center justify-center w-10 h-10 rounded-lg hover:bg-[color:var(--bg-surface-2)] transition-colors">
              <Settings className="w-5 h-5 text-[color:var(--text-2)]" />
            </button>
            <div className="w-px h-5 bg-[color:var(--border)] mx-1"></div>
            <button className="flex items-center justify-center w-8 h-8 rounded-full overflow-hidden hover:ring-2 hover:ring-[color:var(--primary)] hover:ring-offset-2 hover:ring-offset-[color:var(--bg-surface-1)] transition-all">
              <img 
                src="https://raw.githubusercontent.com/xjjm123123123/my_imge/main/img/ChatGPT%20Image%202025%E5%B9%B412%E6%9C%8825%E6%97%A5%2014_32_47%201.png" 
                alt="用户头像" 
                className="w-full h-full object-cover"
                loading="lazy"
              />
            </button>
          </div>
        </div>
      </header>

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
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-auto lg:h-[320px]">
                  {/* Left Steps */}
                  <div className="lg:col-span-3 ui-card p-6 flex flex-col justify-between rounded-lg border border-[color:var(--border)] h-full">
                    <div className="space-y-6">
                      <div className="flex gap-4">
                        <div className="flex flex-col items-center">
                          <div className="w-6 h-6 rounded-full border border-[color:var(--primary)] text-[color:var(--primary)] flex items-center justify-center text-xs font-medium">1</div>
                          <div className="w-px h-full bg-[color:var(--border)] my-1"></div>
                        </div>
                        <div>
                          <h4 className="text-[14px] font-medium text-[color:var(--text)]">浏览行业方案</h4>
                          <p className="text-[12px] text-[color:var(--text-2)] mt-1">探索不同行业的 AI 落地场景</p>
                        </div>
                      </div>
                      <div className="flex gap-4">
                         <div className="flex flex-col items-center">
                          <div className="w-6 h-6 rounded-full border border-[color:var(--border-strong)] text-[color:var(--text-3)] flex items-center justify-center text-xs font-medium">2</div>
                          <div className="w-px h-full bg-[color:var(--border)] my-1"></div>
                        </div>
                        <div>
                          <h4 className="text-[14px] font-medium text-[color:var(--text)]">体验数字伙伴</h4>
                          <p className="text-[12px] text-[color:var(--text-2)] mt-1">与 AI 助手协作完成任务</p>
                        </div>
                      </div>
                      <div className="flex gap-4">
                         <div className="flex flex-col items-center">
                          <div className="w-6 h-6 rounded-full border border-[color:var(--border-strong)] text-[color:var(--text-3)] flex items-center justify-center text-xs font-medium">3</div>
                        </div>
                        <div>
                          <h4 className="text-[14px] font-medium text-[color:var(--text)]">查看数据洞察</h4>
                          <p className="text-[12px] text-[color:var(--text-2)] mt-1">基于 AI 分析的业务决策</p>
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={() => setCurrentApp('demo')}
                      className="w-full ui-btn ui-btn-secondary h-9 text-[13px] justify-center font-medium rounded-md mt-4"
                    >
                      查看全部方案
                    </button>
                  </div>

                  {/* Right Banner */}
                  <div className="lg:col-span-9 ui-card overflow-hidden border border-[color:var(--border)] shadow-[var(--shadow-sm)] rounded-lg relative bg-gradient-to-br from-blue-50 to-white">
                    <div className="px-8 py-10 relative z-10 h-full flex flex-col justify-center">
                       <h2 className="text-2xl sm:text-3xl lg:text-4xl font-semibold text-[color:var(--text)] tracking-tight leading-tight mb-4">
                        <TextType
                          text={['欢迎来到\n飞书 AI 解决方案样板间']}
                          typingSpeed={100}
                          cursorCharacter="|"
                          loop={false}
                          showCursor={true}
                        />
                      </h2>
                      <p className="text-base text-[color:var(--text-2)] leading-relaxed max-w-xl font-normal mb-8">
                        用最短路径把客户需求翻译成方案故事线：<br/>数据结构化 → AI 洞察 → 行动闭环。
                      </p>
                      <button
                        onClick={() => setCurrentApp('demo')}
                        className="w-fit ui-btn ui-btn-primary h-10 px-6 text-[14px] justify-center font-medium transition-transform active:scale-95 rounded-md shadow-md hover:shadow-lg"
                      >
                        开始探索
                        <ArrowRight size={14} />
                      </button>
                    </div>
                    
                    {/* Decorative Image */}
                    <div className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-12 h-[120%] w-[50%] hidden lg:flex items-center justify-center pointer-events-none z-0 opacity-90 mix-blend-multiply">
                      <img 
                        src="/images/Gemini_Generated_Image_bsrt5bbsrt5bbsrt.png" 
                        alt="Feishu AI Solution" 
                        className="max-w-full max-h-full object-contain transform scale-[1.1]"
                        loading="lazy"
                      />
                    </div>
                  </div>
                </div>

                {/* Quick Operation Section */}
                <section>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-[14px] font-medium text-[color:var(--text)]">快速操作</h3>
                    <button 
                      onClick={() => setCurrentApp('efficiency')}
                      className="flex items-center gap-1 text-[13px] text-[color:var(--text-2)] hover:text-[color:var(--text)] transition-colors"
                    >
                      查看全部
                      <ArrowRight size={14} />
                    </button>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {EFFICIENCY_TOOLS.map((tool) => (
                      <div
                        key={tool.id}
                        onClick={() => window.open(tool.url, '_blank')}
                        className="flex items-center gap-3 p-3 bg-[color:var(--bg-surface-1)] border border-[color:var(--border)] rounded-lg hover:shadow-md hover:border-[color:var(--primary)] transition-all cursor-pointer group"
                      >
                        <div className="w-9 h-9 rounded-md bg-[color:var(--bg-surface-2)] flex items-center justify-center text-[color:var(--primary)] group-hover:bg-[color:var(--primary)] group-hover:text-white transition-colors">
                          {tool.avatarUrl ? (
                            <img src={tool.avatarUrl} alt="" className="w-5 h-5 object-contain" />
                          ) : (
                            <Zap size={18} />
                          )}
                        </div>
                        <div className="flex flex-col min-w-0">
                          <span className="text-[13px] font-medium text-[color:var(--text)] truncate">{tool.title}</span>
                          <span className="text-[11px] text-[color:var(--text-3)] truncate">{tool.name}</span>
                        </div>
                      </div>
                    ))}
                    <div className="flex items-center gap-3 p-3 bg-[color:var(--bg-surface-1)] border border-dashed border-[color:var(--border)] rounded-lg hover:border-[color:var(--text-3)] transition-all cursor-default">
                       <div className="w-9 h-9 rounded-md bg-[color:var(--bg-surface-2)] flex items-center justify-center text-[color:var(--text-3)]">
                         <Plus size={18} />
                       </div>
                       <span className="text-[13px] text-[color:var(--text-3)]">更多工具</span>
                    </div>
                  </div>
                </section>

                {/* News Push (Demo List) */}
                <section>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-[14px] font-medium text-[color:var(--text)]">最新方案</h3>
                    <div className="flex gap-2">
                       <button className="w-6 h-6 rounded-full border border-[color:var(--border)] flex items-center justify-center text-[color:var(--text-2)] hover:bg-[color:var(--bg-surface-2)]">
                         <ChevronDown size={14} className="rotate-90" />
                       </button>
                       <button className="w-6 h-6 rounded-full border border-[color:var(--border)] flex items-center justify-center text-[color:var(--text-2)] hover:bg-[color:var(--bg-surface-2)]">
                         <ChevronRight size={14} />
                       </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    {DEMO_LIST.map((demo) => (
                      <div
                        key={demo.id}
                        onClick={() => {
                          setWorkspaceInitialView('main');
                          setSelectedDemo(demo);
                          setCurrentApp('demo');
                          setDemoViewMode('flow');
                        }}
                        className="group cursor-pointer"
                      >
                        <div className="aspect-video w-full rounded-lg overflow-hidden border border-[color:var(--border)] mb-3 relative">
                          {demo.cover ? (
                            <img src={demo.cover} alt="" className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
                          ) : (
                            <div className="w-full h-full bg-[color:var(--bg-surface-2)] flex items-center justify-center text-[color:var(--text-3)]">
                              <LayoutGrid size={24} />
                            </div>
                          )}
                          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/5 transition-colors" />
                        </div>
                        <h4 className="text-[14px] font-medium text-[color:var(--text)] mb-1 truncate group-hover:text-[color:var(--primary)] transition-colors">{demo.title}</h4>
                        <p className="text-[12px] text-[color:var(--text-3)] line-clamp-1">{demo.valueProp}</p>
                      </div>
                    ))}
                  </div>
                </section>

                {/* Bottom Split View */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 pb-8">
                  {/* Recently */}
                  <div className="lg:col-span-8">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-[14px] font-medium text-[color:var(--text)]">最近访问</h3>
                      <div className="flex items-center gap-2 text-[12px] text-[color:var(--text-2)] cursor-pointer hover:text-[color:var(--text)]">
                        <span>全部类型</span>
                        <ChevronDown size={12} />
                      </div>
                    </div>
                    <div className="ui-card border border-[color:var(--border)] rounded-lg divide-y divide-[color:var(--border)]">
                      {[
                        { title: '智能巡检方案演示', type: 'Demo', time: '10分钟前', icon: <ScanLine size={16} /> },
                        { title: '与"探探"进行了对话', type: 'Chat', time: '1小时前', icon: <MessageSquare size={16} /> },
                        { title: '查看了"AI 智能巡检"工具', type: 'Tool', time: '昨天', icon: <Zap size={16} /> },
                      ].map((item, i) => (
                        <div key={i} className="flex items-center justify-between p-4 hover:bg-[color:var(--bg-surface-2)] transition-colors cursor-pointer">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded bg-[color:var(--bg-surface-2)] flex items-center justify-center text-[color:var(--primary)]">
                              {item.icon}
                            </div>
                            <span className="text-[13px] text-[color:var(--text)]">{item.title}</span>
                          </div>
                          <span className="text-[12px] text-[color:var(--text-3)]">{item.time}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Related Applications */}
                  <div className="lg:col-span-4">
                     <div className="flex items-center justify-between mb-4">
                      <h3 className="text-[14px] font-medium text-[color:var(--text)]">相关应用</h3>
                    </div>
                    <div className="ui-card border border-[color:var(--border)] rounded-lg p-2">
                      {[
                        { name: '飞书文档', desc: '高效创作与协作', icon: '📝' },
                        { name: '飞书多维表格', desc: '新一代业务系统', icon: '📊' },
                        { name: '飞书妙记', desc: '智能会议纪要', icon: '🎙️' },
                      ].map((app, i) => (
                        <div key={i} className="flex items-center gap-3 p-3 hover:bg-[color:var(--bg-surface-2)] rounded-md cursor-pointer transition-colors">
                           <div className="w-8 h-8 flex items-center justify-center text-xl">{app.icon}</div>
                           <div>
                             <h4 className="text-[13px] font-medium text-[color:var(--text)]">{app.name}</h4>
                             <p className="text-[11px] text-[color:var(--text-3)]">{app.desc}</p>
                           </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* <BottomToolbar onNavigate={handleToolbarNavigate} /> */}
              </div>
            </div>

            <aside
              className={`lg:w-[320px] lg:h-auto flex flex-col flex-shrink-0 z-40 lg:relative fixed top-[56px] lg:top-auto lg:right-auto lg:left-auto bottom-auto transition-all duration-300 ease-in-out backdrop-blur-xl ${
                isHomeChatCollapsed
                  ? 'w-10 h-10 rounded-full right-4 left-auto bg-[color:var(--primary)] shadow-lg border-0 items-center justify-center overflow-hidden'
                  : 'w-[calc(100%-32px)] h-[360px] right-4 left-4 rounded-2xl bg-[color:var(--bg-surface-1)] shadow-[var(--shadow-xl)] border border-[color:var(--border)]'
              } lg:bg-transparent lg:shadow-[var(--shadow-xl)] lg:border lg:border-t-0 lg:border-l lg:border-[color:var(--border)] lg:rounded-none lg:items-stretch lg:justify-start lg:overflow-visible ui-card`}
            >
              <div className={`h-11 lg:h-12 border-b border-[color:var(--border)] flex items-center justify-between px-3.5 lg:px-4 bg-transparent flex-shrink-0 ${isHomeChatCollapsed ? 'border-0 p-0 justify-center w-full h-full' : ''}`}>
                <button
                  type="button"
                  onClick={() => setIsHomeChatCollapsed((v) => !v)}
                  className={`flex items-center gap-2 text-[13px] font-medium text-[color:var(--text)] min-w-0 lg:pointer-events-none w-full lg:w-auto ${isHomeChatCollapsed ? 'justify-center h-full text-white' : ''}`}
                  aria-label={isHomeChatCollapsed ? '展开首页 AI 助手' : '折叠首页 AI 助手'}
                >
                  <div className={`w-5 h-5 rounded-md flex items-center justify-center shadow-sm flex-shrink-0 ${isHomeChatCollapsed ? 'bg-transparent text-white shadow-none' : 'bg-[color:var(--primary)] text-white'}`}>
                    <Zap size={12} />
                  </div>
                  <span className={`flex-1 text-left ${isHomeChatCollapsed ? 'hidden lg:block' : 'block'}`}>首页 AI 助手</span>
                  <ChevronDown size={14} className={`lg:hidden transition-transform ${isHomeChatCollapsed ? 'hidden' : 'rotate-180'}`} />
                </button>
              </div>

              <div className={`flex-1 overflow-y-auto no-scrollbar p-3.5 lg:p-4 space-y-3 bg-transparent ${isHomeChatCollapsed ? 'hidden lg:block' : ''}`}>
                {homeMessages.map((m, idx) => (
                  <div key={idx} className="flex flex-col gap-1.5">
                    <div className={`flex ${m.role === 'ai' ? 'justify-start' : 'justify-end'}`}>
                      <div className={`max-w-[90%] p-2.5 lg:p-3 rounded-lg text-[12px] lg:text-[13px] leading-relaxed border shadow-[var(--shadow-sm)] ${m.role === 'ai' ? 'bg-[color:var(--surface)]/80 border-[color:var(--border)] text-[color:var(--text)] backdrop-blur-md' : 'bg-[color:var(--primary)] border-transparent text-white'}`}>
                        {m.role === 'ai' ? (
                          <div dangerouslySetInnerHTML={{ __html: renderRichText(m.text) }} />
                        ) : (
                          m.text
                        )}
                      </div>
                    </div>
                    {idx === 0 && m.role === 'ai' && (
                      <div className="flex flex-wrap gap-1.5 ml-1">
                        <button onClick={() => setHomeInput('探探')} className="ui-btn ui-btn-secondary h-6 lg:h-7 px-2.5 lg:px-3 text-[11px] lg:text-xs rounded-full border-[color:var(--border)] bg-[color:var(--bg-surface-1)] hover:bg-[color:var(--bg-surface-2)] shadow-sm transition-all">探探</button>
                        <button onClick={() => setHomeInput('睿睿')} className="ui-btn ui-btn-secondary h-6 lg:h-7 px-2.5 lg:px-3 text-[11px] lg:text-xs rounded-full border-[color:var(--border)] bg-[color:var(--bg-surface-1)] hover:bg-[color:var(--bg-surface-2)] shadow-sm transition-all">睿睿</button>
                        <button onClick={() => setHomeInput('巡检')} className="ui-btn ui-btn-secondary h-6 lg:h-7 px-2.5 lg:px-3 text-[11px] lg:text-xs rounded-full border-[color:var(--border)] bg-[color:var(--bg-surface-1)] hover:bg-[color:var(--bg-surface-2)] shadow-sm transition-all">巡检</button>
                      </div>
                    )}
                  </div>
                ))}
                {isHomeChatLoading && (
                  <div className="flex justify-start">
                    <div className="max-w-[90%] p-2.5 lg:p-3 rounded-lg border bg-[color:var(--surface)]/80 border-[color:var(--border)] backdrop-blur-md">
                      <div className="flex items-center gap-2">
                        <div className="flex gap-1">
                          <span className="w-1.5 h-1.5 bg-[color:var(--text-3)] rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
                          <span className="w-1.5 h-1.5 bg-[color:var(--text-3)] rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
                          <span className="w-1.5 h-1.5 bg-[color:var(--text-3)] rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
                        </div>
                        <span className="text-[11px] text-[color:var(--text-3)]">AI 正在思考...</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className={`p-3 lg:p-4 border-t border-[color:var(--border)] bg-transparent flex-shrink-0 ${isHomeChatCollapsed ? 'hidden lg:block' : ''}`}>
                <div className="relative w-full flex flex-col lg:block gap-2 lg:gap-0">
                  <input
                    value={homeInput}
                    onChange={(e) => setHomeInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') sendHomeMessage();
                    }}
                    placeholder="输入你的问题…"
                    className="ui-input w-full pl-3.5 pr-3.5 lg:pr-10 h-9 lg:h-10 text-[12px] lg:text-sm rounded-full bg-[color:var(--bg-surface-2)] border-transparent focus:bg-[color:var(--bg-surface-1)] focus:border-[color:var(--primary)] transition-all shadow-inner"
                  />
                  <div className="flex justify-end lg:block">
                    <button
                      onClick={sendHomeMessage}
                      className="static lg:absolute lg:right-1 lg:top-1/2 lg:-translate-y-1/2 w-7 h-7 flex items-center justify-center bg-[color:var(--primary)] text-white rounded-full shadow-sm hover:shadow-md hover:scale-105 active:scale-95 transition-all"
                    >
                      <Send size={12} />
                    </button>
                  </div>
                </div>
              </div>
            </aside>
          </div>
        ) : currentApp === 'demo' ? (
          <Catalog onSelectDemo={(demo) => { setWorkspaceInitialView('main'); setSelectedDemo(demo); setCurrentApp('demo'); setDemoViewMode('flow'); }} />
        ) : null}
      </main>
    </div>
  );
};

export default memo(App);
