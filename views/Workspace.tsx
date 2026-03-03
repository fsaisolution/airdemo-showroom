import React, { useState, useEffect, useRef } from 'react';
import Loading from '../components/Loading';
import { GoogleGenAI } from "@google/genai";
import { BusinessContext, Demo } from '../types';
import { EFFICIENCY_TOOLS } from '../constants';
import { 
  getCheckpointList, 
  queryCheckpointData, 
  writeViolationRecord,
  generateNewId,
  getCurrentTimestamp,
  getCurrentDate,
  type ViolationRecord 
} from '../services/larkBaseService';
import { analyzeImageForViolation, formatConfidence } from '../services/aiVisionService';
import ViolationCard from '../components/ViolationCard';
import { 
  Hash, 
  Type, 
  List, 
  Image, 
  Zap, 
  FileText, 
  ArrowUpRight, 
  MessageSquare, 
  Send, 
  Grid, 
  ChevronDown 
} from 'lucide-react';

type AppId = 'home' | 'demo' | 'efficiency';
type ViewId = 'main' | 'management' | 'equipment' | 'factory';
type SecondaryViewId = Exclude<ViewId, 'main'>;
type FieldType = 'text' | 'number' | 'select' | 'image';
type BaseViewMode = 'table' | 'app';

interface WorkspaceProps {
  demo: Demo;
  currentApp: AppId;
  initialView?: ViewId;
}

interface ColumnDef {
  key: string;
  label: string;
  type: FieldType;
}

const Workspace: React.FC<WorkspaceProps> = ({ demo, currentApp, initialView }) => {
  const [isAiRunning, setIsAiRunning] = useState(false);
  const [iframeLoading, setIframeLoading] = useState(true);
  const [iframeError, setIframeError] = useState(false);
  const [expandedStages, setExpandedStages] = useState<Record<string, boolean>>({});
  const [isSidebarVisible, setIsSidebarVisible] = useState(false);

  useEffect(() => {
    if (demo.url && currentApp === 'demo') {
      setIframeLoading(true);
      setIframeError(false);
      
      const timeout = setTimeout(() => {
        setIframeError(true);
        setIframeLoading(false);
      }, 5000);

      return () => clearTimeout(timeout);
    }
  }, [demo.url, currentApp, demo.id]);

  const baseIframeUrl = 'https://bytedance.larkoffice.com/base/Rcbrbk2qCazsPTs48TecJSIKnod?from=from_copylink';
  const baseAppIframeUrl = 'https://bytedance.larkoffice.com/app/Vv6DbpDoGawcMwszp3XcMms6nTf';
  
  // UI State
  const [currentView, setCurrentView] = useState<ViewId>(initialView || 'main');
  const [baseViewMode, setBaseViewMode] = useState<BaseViewMode>('app');
  
  // State for current active table and columns
  const [editableMainData, setEditableMainData] = useState<any[]>(demo.mainTable);
  const [editableSecondaryDataByView, setEditableSecondaryDataByView] = useState<{
    management?: any[];
    equipment?: any[];
    factory?: any[];
  }>(() => {
    const base = demo.secondaryTable ? { management: demo.secondaryTable, equipment: demo.secondaryTable, factory: demo.secondaryTable } : {};
    return { ...base, ...(demo.secondaryTables || {}) };
  });
  const [columns, setColumns] = useState<ColumnDef[]>([]);
  const [editingCell, setEditingCell] = useState<{rowIndex: number, colKey: string} | null>(null);
  
  // New Column Form State
  const [showAddColumn, setShowAddColumn] = useState(false);
  const [newColName, setNewColName] = useState('');
  const [newColType, setNewColType] = useState<FieldType>('text');

  // Bot Chat Messages
  const [messages, setMessages] = useState<{role: 'ai' | 'user', text?: string, card?: any}[]>([]);
  const [isAilyThinking, setIsAilyThinking] = useState(false);
  const [activeBusinessContext, setActiveBusinessContext] = useState<BusinessContext | null>(null);
  
  // Inspection Analysis State
  const [selectedCheckpoint, setSelectedCheckpoint] = useState<string>('');
  const [checkpointList, setCheckpointList] = useState<string[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisStep, setAnalysisStep] = useState<string>('');

  const chatEndRef = useRef<HTMLDivElement>(null);
  const tableContainerRef = useRef<HTMLDivElement>(null);
  const bottomScrollbarRef = useRef<HTMLDivElement>(null);
  const bottomScrollbarInnerRef = useRef<HTMLDivElement>(null);
  const isSyncingScrollRef = useRef(false);

  const getSecondaryData = (view: SecondaryViewId) => editableSecondaryDataByView[view] || [];

  useEffect(() => {
    setShowAddColumn(false);
    setEditingCell(null);
    if (currentApp !== 'demo') setBaseViewMode('app');
  }, [currentApp]);

  useEffect(() => {
    setIframeLoading(true);
  }, [baseViewMode]);

  // Load checkpoint list
  useEffect(() => {
    const loadCheckpoints = async () => {
      const list = await getCheckpointList();
      setCheckpointList(list);
      if (list.length > 0) {
        setSelectedCheckpoint(list[0]);
      }
    };
    loadCheckpoints();
  }, []);

  useEffect(() => {
    setEditableMainData(demo.mainTable);
    const base = demo.secondaryTable ? { management: demo.secondaryTable, equipment: demo.secondaryTable, factory: demo.secondaryTable } : {};
    setEditableSecondaryDataByView({ ...base, ...(demo.secondaryTables || {}) });
  }, [demo]);

  useEffect(() => {
    setCurrentView(initialView || 'main');
  }, [demo, initialView]);

  useEffect(() => {
    setShowAddColumn(false);
    setEditingCell(null);
  }, [baseViewMode]);

  const viewNameMap: Record<ViewId, string> = {
    main: '人员违规数据表',
    management: '巡检管理数据表',
    equipment: '设备巡检数据表',
    factory: '厂区巡检数据表'
  };

  // Initialize and React to View Changes
  useEffect(() => {
    // Determine which dataset to use as source for schema
    const secondarySource = currentView === 'main' ? undefined : (demo.secondaryTables?.[currentView] || demo.secondaryTable);
    const useSecondary = (currentView !== 'main') && secondarySource && secondarySource.length > 0;
    const sourceData = useSecondary ? secondarySource![0] : demo.mainTable[0];
    
    const initialColumns: ColumnDef[] = Object.keys(sourceData).map(key => {
      if (key === 'id') return { key, label: 'ID', type: 'text' as FieldType };
      const lowerKey = key.toLowerCase();
      let type: FieldType = 'text';
      
      if (lowerKey.includes('budget') || lowerKey.includes('score') || lowerKey === '编号' || lowerKey === '序列号') {
        type = 'number';
      } else if (
        lowerKey.includes('risk') || 
        lowerKey.includes('status') || 
        lowerKey.includes('状态') || 
        lowerKey.includes('情况') || 
        lowerKey.includes('岗位') ||
        lowerKey === '部门'
      ) {
        type = 'select';
      } else if (lowerKey.includes('图片') || lowerKey.includes('记录') || lowerKey.includes('photo') || lowerKey.includes('image')) {
        type = 'image';
      }
      
      return { key, label: key, type };
    });
    setColumns(initialColumns);

    setMessages(prev => [...prev, { 
      role: 'ai', 
      text: `已切换至【${viewNameMap[currentView]}】。Aily 已根据该业务维度同步分析模型。` 
    }]);
  }, [currentView, demo]);

  const getVisibleTableData = () => {
    const useSecondary = (currentView !== 'main') && getSecondaryData(currentView as SecondaryViewId).length > 0;
    let data = useSecondary ? [...getSecondaryData(currentView as SecondaryViewId)] : [...editableMainData];
    
    if (currentView === 'management') {
      return data;
    }
    if (currentView === 'equipment') {
      if (demo.secondaryTables?.equipment) return data;
      return data.filter(row => row.任务名称?.includes('电机') || row.任务名称?.includes('电气') || row.位置?.includes('设备'));
    }
    if (currentView === 'factory') {
      if (demo.secondaryTables?.factory) return data;
      return data.filter(row => row.任务名称?.includes('照明') || row.位置?.includes('仓库') || row.位置?.includes('休息区'));
    }
    return data;
  };

  const visibleTable = getVisibleTableData();

  useEffect(() => {
    const tableEl = tableContainerRef.current;
    const scrollbarEl = bottomScrollbarRef.current;
    const innerEl = bottomScrollbarInnerRef.current;
    if (!tableEl || !scrollbarEl || !innerEl) return;

    const syncFromTable = () => {
      if (isSyncingScrollRef.current) return;
      isSyncingScrollRef.current = true;
      scrollbarEl.scrollLeft = tableEl.scrollLeft;
      queueMicrotask(() => {
        isSyncingScrollRef.current = false;
      });
    };

    const syncFromScrollbar = () => {
      if (isSyncingScrollRef.current) return;
      isSyncingScrollRef.current = true;
      tableEl.scrollLeft = scrollbarEl.scrollLeft;
      queueMicrotask(() => {
        isSyncingScrollRef.current = false;
      });
    };

    const updateInnerWidth = () => {
      innerEl.style.width = `${tableEl.scrollWidth}px`;
      scrollbarEl.scrollLeft = tableEl.scrollLeft;
    };

    updateInnerWidth();

    tableEl.addEventListener('scroll', syncFromTable, { passive: true });
    scrollbarEl.addEventListener('scroll', syncFromScrollbar, { passive: true });
    window.addEventListener('resize', updateInnerWidth, { passive: true });

    const resizeObserver = new ResizeObserver(updateInnerWidth);
    resizeObserver.observe(tableEl);

    return () => {
      tableEl.removeEventListener('scroll', syncFromTable);
      scrollbarEl.removeEventListener('scroll', syncFromScrollbar);
      window.removeEventListener('resize', updateInnerWidth);
      resizeObserver.disconnect();
    };
  }, [columns, currentView, currentApp, baseViewMode, visibleTable.length]);

  // Handlers
  const handleCellEdit = (rowIndex: number, colKey: string, value: string) => {
    const targetRow = visibleTable[rowIndex];
    const useSecondary = (currentView !== 'main') && getSecondaryData(currentView as SecondaryViewId).length > 0;
    const secondaryView = currentView as SecondaryViewId;
    const sourceData = useSecondary ? [...getSecondaryData(secondaryView)] : [...editableMainData];
    const setData = useSecondary
      ? (next: any[]) => setEditableSecondaryDataByView(prev => ({ ...prev, [secondaryView]: next }))
      : setEditableMainData;

    const sourceIndex = sourceData.findIndex(r => r.id === targetRow.id);
    if (sourceIndex !== -1) {
      const colDef = columns.find(c => c.key === colKey);
      let finalValue: any = value;
      if (colDef?.type === 'number') finalValue = value.replace(/[^0-9.-]+/g,"");
      sourceData[sourceIndex] = { ...sourceData[sourceIndex], [colKey]: finalValue };
      setData(sourceData);
    }
  };

  const handleAddRecord = () => {
    const useSecondary = (currentView !== 'main') && getSecondaryData(currentView as SecondaryViewId).length > 0;
    const secondaryView = currentView as SecondaryViewId;
    const sourceData = useSecondary ? [...getSecondaryData(secondaryView)] : [...editableMainData];
    const setData = useSecondary
      ? (next: any[]) => setEditableSecondaryDataByView(prev => ({ ...prev, [secondaryView]: next }))
      : setEditableMainData;

    const newId = `NEW-${Date.now()}`;
    const newRecord: any = { id: newId };
    columns.forEach(col => { 
      if (col.key !== 'id') {
        newRecord[col.key] = col.type === 'number' ? '0' : ''; 
      }
    });
    setData([...sourceData, newRecord]);
  };

  const handleDeleteRecord = (id: string) => {
    const useSecondary = (currentView !== 'main') && getSecondaryData(currentView as SecondaryViewId).length > 0;
    const secondaryView = currentView as SecondaryViewId;
    if (useSecondary) {
      setEditableSecondaryDataByView(prev => ({ ...prev, [secondaryView]: (prev[secondaryView] || []).filter(row => row.id !== id) }));
      return;
    }
    setEditableMainData(prev => prev.filter(row => row.id !== id));
  };

  const handleAddColumn = () => {
    if (!newColName.trim()) return;
    const newKey = newColName;
    const newCol: ColumnDef = { key: newKey, label: newColName, type: newColType };
    
    setColumns(prev => [...prev, newCol]);
    
    // Add to both datasets to maintain consistency
    setEditableMainData(prev => prev.map(row => ({ ...row, [newKey]: newColType === 'number' ? '0' : '' })));
    setEditableSecondaryDataByView(prev => {
      const next: typeof prev = { ...prev };
      (Object.keys(next) as SecondaryViewId[]).forEach(view => {
        const rows = next[view];
        if (!rows) return;
        next[view] = rows.map(row => ({ ...row, [newKey]: newColType === 'number' ? '0' : '' }));
      });
      return next;
    });
    
    setNewColName('');
    setShowAddColumn(false);
    setIsAiRunning(true);
    
    setTimeout(() => {
      setIsAiRunning(false);
      setMessages(prev => [...prev, { role: 'ai', text: `已成功添加新维度“${newCol.label}”。Aily 已自动更新多维分析模型。` }]);
    }, 100);
  };

  const deleteColumn = (key: string) => {
    if (key === 'id') return;
    setColumns(columns.filter(c => c.key !== key));
  };

  /**
   * 执行 AI 巡检分析流程
   * 1. 显示思考过程
   * 2. 调用工作流进行人员违规判断
   * 3. 输出卡片式结果
   */
  const executeInspectionAnalysis = async () => {
    if (!selectedCheckpoint) {
      setMessages(prev => [...prev, { role: 'ai', text: '请先选择一个点位进行分析。' }]);
      return;
    }

    setIsAnalyzing(true);
    setMessages(prev => [...prev, { role: 'user', text: `开始巡检分析：${selectedCheckpoint}` }]);

    try {
      // 显示"正在思考并生成答案..."标题
      setMessages(prev => [...prev, { 
        role: 'ai', 
        text: '正在思考并生成答案...' 
      }]);
      
      await new Promise(resolve => setTimeout(resolve, 500));

      // Step 1: 调用人员违规判断工作流
      setAnalysisStep('调用人员违规判断工作流');
      setMessages(prev => {
        const newMessages = [...prev];
        newMessages[newMessages.length - 1] = {
          role: 'ai',
          text: '正在思考并生成答案...\n\n调用人员违规判断工作流'
        };
        return newMessages;
      });
      
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Step 2: 正在查询点位图像数据
      setAnalysisStep('正在查询点位图像数据');
      setMessages(prev => {
        const newMessages = [...prev];
        newMessages[newMessages.length - 1] = {
          role: 'ai',
          text: '正在思考并生成答案...\n\n正在查询点位图像数据'
        };
        return newMessages;
      });
      
      const checkpointData = await queryCheckpointData(selectedCheckpoint);
      
      if (!checkpointData) {
        setMessages(prev => [...prev, { role: 'ai', text: `未找到点位「${selectedCheckpoint}」的数据，请检查数据源。` }]);
        setIsAnalyzing(false);
        setAnalysisStep('');
        return;
      }

      await new Promise(resolve => setTimeout(resolve, 1000));

      // Step 3: 正在进行 AI 视觉分析
      setAnalysisStep('正在进行 AI 视觉分析');
      setMessages(prev => {
        const newMessages = [...prev];
        newMessages[newMessages.length - 1] = {
          role: 'ai',
          text: '正在思考并生成答案...\n\n正在进行 AI 视觉分析'
        };
        return newMessages;
      });

      const analysisResult = await analyzeImageForViolation(checkpointData.图像, selectedCheckpoint);

      await new Promise(resolve => setTimeout(resolve, 1000));

      // Step 4: 输出卡片
      const currentDate = getCurrentDate();
      const currentTime = getCurrentTimestamp();

      // 移除思考过程，添加结果卡片
      setMessages(prev => {
        const newMessages = prev.slice(0, -1); // 移除思考过程消息
        return [
          ...newMessages,
          {
            role: 'ai',
            card: {
              type: 'violation' as const,
              data: {
                imageUrl: checkpointData.图像,
                violationType: analysisResult.violationType,
                confidence: analysisResult.confidence,
                description: analysisResult.description,
                location: selectedCheckpoint,
                department: analysisResult.suggestedDepartment,
                date: currentDate,
                time: currentTime,
              }
            }
          }
        ];
      });

      // Step 5: 写入违规记录（如果有违规）
      if (analysisResult.violationType !== '无违规') {
        const newIdNum = generateNewId(editableMainData);
        
        const newRecord: ViolationRecord = {
          编号: newIdNum,
          日期: currentDate,
          抓取时间: currentTime,
          位置: selectedCheckpoint,
          违规情况: analysisResult.violationType,
          部门: analysisResult.suggestedDepartment,
          违规记录: checkpointData.图像,
          AI生成: '是'
        };
        
        await writeViolationRecord(newRecord);
        
        // 刷新表格数据（如果当前视图是主视图）
        if (currentView === 'main') {
          const tableRecord = {
            id: String(newIdNum),
            编号: String(newIdNum),
            日期: currentDate,
            违规情况: analysisResult.violationType,
            违规记录: checkpointData.图像,
            抓取时间: currentTime,
            位置: selectedCheckpoint,
            部门: analysisResult.suggestedDepartment
          };
          setEditableMainData(prev => [tableRecord, ...prev]);
        }
      }

    } catch (error) {
      console.error('Analysis failed:', error);
      setMessages(prev => [...prev, { role: 'ai', text: '分析过程中发生错误，请重试。' }]);
    } finally {
      setIsAnalyzing(false);
      setAnalysisStep('');
    }
  };

  const askGemini = async (question: string, context?: BusinessContext) => {
    setIsAilyThinking(true);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const ctx = context || activeBusinessContext;
      const ctxPayload = ctx
        ? {
            id: ctx.id,
            title: ctx.title,
            category: ctx.category,
            description: ctx.description,
            scenario: ctx.scenario,
            mcps: ctx.mcps,
            skills: ctx.skills,
            agents: ctx.agents
          }
        : null;

      const systemInstruction = [
        '你是一个专业的业务分析师 Aily。',
        `当前演示场景：${demo.title}`,
        `当前数据视角：${currentView}`,
        `当前表格结构（字段定义）：${JSON.stringify(columns)}`,
        `当前可见数据（行记录）：${JSON.stringify(visibleTable)}`,
        ctxPayload ? `业务上下文（Business Context）：${JSON.stringify(ctxPayload)}` : null,
        ctxPayload ? '你必须遵循该业务上下文的目标/约束/输出要求，并尽量引用可见数据作为证据。' : null,
        '请根据以上信息提供深度的业务见解。语言：中文。简洁、专业、结果导向。'
      ]
        .filter(Boolean)
        .join('\n');

      const response = await ai.models.generateContent({
        model: 'gemini-3-pro-preview',
        contents: question,
        config: { systemInstruction, temperature: 0.7 },
      });
      setMessages(prev => [...prev, { role: 'ai', text: response.text || "已完成分析。" }]);
    } catch (error) {
      setMessages(prev => [...prev, { role: 'ai', text: "AI 响应异常，请重试。" }]);
    } finally {
      setIsAilyThinking(false);
    }
  };

  const getHeaderIcon = (type: FieldType) => {
    switch(type) {
      case 'number': return <span className="text-[color:var(--primary)] mr-2"><Hash size={14} /></span>;
      case 'select': return <span className="text-[color:var(--warning)] mr-2"><List size={14} /></span>;
      case 'image': return <span className="text-[color:var(--purple)] mr-2"><Image size={14} /></span>;
      default: return <span className="text-[color:var(--text-3)] mr-2"><Type size={14} /></span>;
    }
  };

  const getPillColor = (value: string) => {
    const v = String(value).trim();
    if (!v) return 'bg-[color:var(--bg-surface-2)] text-[color:var(--text-3)] border-[color:var(--border)]';
    if (['高', '不合规', '紧急', '进行中', '在岗玩手机', '睡岗', '走路玩手机'].includes(v)) return 'bg-[color:var(--danger-bg)] text-[color:var(--danger)] border-[color:var(--danger-border)]';
    if (['无', '合规', '已完成', '已交付', '生产部'].includes(v)) return 'bg-[color:var(--success-bg)] text-[color:var(--success)] border-[color:var(--success-border)]';
    if (['处理中', '中', 'AI识别结论', '不符合5s标准', '机械工艺师'].includes(v)) return 'bg-[color:var(--primary-bg)] text-[color:var(--primary)] border-[color:var(--primary-border)]';
    return 'bg-[color:var(--bg-surface-2)] text-[color:var(--text-2)] border-[color:var(--border)]';
  };

  const appImageColumn = columns.find((c) => c.type === 'image' && c.key !== 'id');
  const appPrimaryColumns = columns.filter((c) => c.key !== 'id' && c.type !== 'image');
  const appTitleColumn = appPrimaryColumns[0];
  const appDetailColumns = appPrimaryColumns.slice(1, 5);

  const getFieldKey = (candidates: string[]) => {
    const exact = columns.find((c) => candidates.includes(c.key));
    if (exact) return exact.key;
    const partial = columns.find((c) => candidates.some((k) => c.key.includes(k)));
    return partial?.key;
  };

  const normalizeDay = (raw: any) => {
    if (raw == null) return '';
    const s = String(raw).trim();
    if (!s) return '';
    const first = s.split(' ')[0];
    if (/^\d{4}[-/]\d{2}[-/]\d{2}$/.test(first)) return first.replace(/\//g, '-');
    const m = s.match(/(\d{4})[-/](\d{1,2})[-/](\d{1,2})/);
    if (m) {
      const y = m[1];
      const mm = String(m[2]).padStart(2, '0');
      const dd = String(m[3]).padStart(2, '0');
      return `${y}-${mm}-${dd}`;
    }
    return first;
  };

  const countBy = (rows: any[], key?: string) => {
    const m = new Map<string, number>();
    if (!key) return m;
    for (const r of rows) {
      const v = String(r[key] ?? '').trim() || '未填';
      m.set(v, (m.get(v) || 0) + 1);
    }
    return m;
  };

  const countByDay = (rows: any[], dateKey?: string) => {
    const m = new Map<string, number>();
    if (!dateKey) return m;
    for (const r of rows) {
      const d = normalizeDay(r[dateKey]);
      if (!d) continue;
      m.set(d, (m.get(d) || 0) + 1);
    }
    return m;
  };

  // ... (Chart components removed for brevity, will rely on simple HTML/CSS if needed or keep existing)
  // Actually, keeping the charts but cleaning them up
  const LineChart: React.FC<{ labels: string[]; values: number[]; color: string }> = ({ labels, values, color }) => {
    const max = Math.max(1, ...values);
    const w = 420;
    const h = 140;
    const pad = 18;
    const step = values.length <= 1 ? 0 : (w - pad * 2) / (values.length - 1);
    const pts = values
      .map((v, i) => {
        const x = pad + step * i;
        const y = pad + (h - pad * 2) * (1 - v / max);
        return `${x},${y}`;
      })
      .join(' ');

    const area = `${pad},${h - pad} ${pts} ${pad + step * (values.length - 1)},${h - pad}`;

    return (
      <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-36">
        <defs>
          <linearGradient id="lineFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={0.1} />
            <stop offset="100%" stopColor={color} stopOpacity={0} />
          </linearGradient>
        </defs>
        <path d={`M ${area}`} fill="url(#lineFill)" />
        <polyline points={pts} fill="none" stroke={color} strokeWidth="2" />
        {values.map((v, i) => {
          const x = pad + step * i;
          const y = pad + (h - pad * 2) * (1 - v / max);
          return <circle key={`p-${i}`} cx={x} cy={y} r={3} fill={color} />;
        })}
      </svg>
    );
  };

  return (
    <div className="h-full w-full flex flex-col lg:flex-row overflow-hidden bg-[color:var(--bg-body)] font-sans relative text-[color:var(--text)]">
      {/* Sidebar Toggle Button */}
      <button
        onClick={() => setIsSidebarVisible(!isSidebarVisible)}
        className={`fixed top-[64px] right-4 z-[100] lg:hidden w-10 h-10 rounded-full bg-[color:var(--primary)] text-white shadow-lg flex items-center justify-center hover:bg-[color:var(--primary-hover)] transition-all ${isSidebarVisible ? 'hidden' : ''}`}
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><line x1="9" y1="3" x2="9" y2="21"></line></svg>
      </button>

      <section className="flex-1 flex flex-col min-w-0 bg-[color:var(--bg-body)] relative overflow-hidden order-1">
        <div className="flex-1 flex flex-col overflow-y-auto bg-[color:var(--bg-body)]">
          {currentApp === 'demo' ? (
            demo.url ? (
              <div className="flex-1 bg-[color:var(--bg-body)] relative">
                {iframeError ? (
                  <div className="flex-1 flex flex-col items-center justify-center p-8">
                    <div className="text-center max-w-md">
                      <div className="w-16 h-16 rounded-full bg-[color:var(--bg-surface-2)] flex items-center justify-center mx-auto mb-4">
                        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-[color:var(--text-3)]">
                          <circle cx="12" cy="12" r="10"></circle>
                          <line x1="12" y1="8" x2="12" y2="12"></line>
                          <line x1="12" y1="16" x2="12.01" y2="16"></line>
                        </svg>
                      </div>
                      <h3 className="text-lg font-semibold text-[color:var(--text)] mb-2">无法在页面中加载</h3>
                      <p className="text-sm text-[color:var(--text-2)] mb-6">该外部链接设置了安全策略，不允许在页面中嵌入。</p>
                      <a
                        href={demo.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="ui-btn ui-btn-primary h-10 px-6 text-sm inline-flex items-center gap-2"
                      >
                        在新标签页中打开
                        <ArrowUpRight size={14} />
                      </a>
                    </div>
                  </div>
                ) : (
                  <>
                    {iframeLoading && (
                      <div className={isSidebarVisible ? "hidden lg:block" : ""}>
                        <Loading />
                      </div>
                    )}
                    <iframe
                      src={demo.url}
                      title={demo.title}
                      className="w-full h-full border-0"
                      allow="clipboard-read; clipboard-write; fullscreen"
                      allowFullScreen
                      onLoad={() => setIframeLoading(false)}
                      onError={() => setIframeError(true)}
                    />
                  </>
                )}
              </div>
            ) : demo.id === 'gtm' ? (
              <div className="flex-1 bg-[color:var(--bg-body)] relative">
                {iframeLoading && (
                  <div className={isSidebarVisible ? "hidden lg:block" : ""}>
                    <Loading />
                  </div>
                )}
                <iframe
                  src="https://bytedance.larkoffice.com/base/JRAkbvyCbag90QsDAhicKriBnZe?table=tblYiXmzqwotHNwg&view=vewwHwSIUN"
                  title="Lark Base"
                  className="w-full h-full border-0"
                  allow="clipboard-read; clipboard-write; fullscreen"
                  allowFullScreen
                  onLoad={() => setIframeLoading(false)}
                />
              </div>
            ) : (
              <div className="flex-1 flex flex-col overflow-hidden animate-fadeIn relative">
                <div className="h-14 bg-[color:var(--bg-body)] border-b border-[color:var(--border)] flex items-center px-6 lg:px-8 gap-6 flex-shrink-0 z-10">
                  <div className="ml-auto inline-flex rounded-[var(--radius-md)] border border-[color:var(--border)] bg-[color:var(--bg-surface-1)] p-1">
                    <button
                      onClick={() => setBaseViewMode('table')}
                      className={`px-3 sm:px-4 py-1.5 text-xs sm:text-xs font-semibold rounded-[var(--radius-sm)] transition-all min-h-[44px] ${baseViewMode === 'table' ? 'bg-[color:var(--bg-surface-2)] text-[color:var(--text)] shadow-sm ring-1 ring-black/5' : 'text-[color:var(--text-3)] hover:text-[color:var(--text)]'}`}
                    >
                      多维表格
                    </button>
                    <button
                      onClick={() => setBaseViewMode('app')}
                      className={`px-3 sm:px-4 py-1.5 text-xs sm:text-xs font-semibold rounded-[var(--radius-sm)] transition-all min-h-[44px] ${baseViewMode === 'app' ? 'bg-[color:var(--bg-surface-2)] text-[color:var(--text)] shadow-sm ring-1 ring-black/5' : 'text-[color:var(--text-3)] hover:text-[color:var(--text)]'}`}
                    >
                      应用模式
                    </button>
                  </div>
                </div>
                
                {baseViewMode === 'table' ? (
                  <div className="flex-1 bg-[color:var(--bg-body)] relative">
                    {iframeLoading && (
                      <div className={isSidebarVisible ? "hidden lg:block" : ""}>
                        <Loading />
                      </div>
                    )}
                    <iframe
                      src={baseIframeUrl}
                      title="Lark Base"
                      className="w-full h-full border-0"
                      allow="clipboard-read; clipboard-write; fullscreen"
                      allowFullScreen
                      onLoad={() => setIframeLoading(false)}
                    />
                  </div>
                ) : (
                  <div className="flex-1 bg-[color:var(--bg-body)] relative">
                    {iframeLoading && (
                      <div className={isSidebarVisible ? "hidden lg:block" : ""}>
                        <Loading />
                      </div>
                    )}
                    <iframe
                      src={baseAppIframeUrl}
                      title="Lark App"
                      className="w-full h-full border-0"
                      allow="clipboard-read; clipboard-write; fullscreen"
                      allowFullScreen
                      onLoad={() => setIframeLoading(false)}
                    />
                  </div>
                )}
              </div>
            )
          ) : (
            <div className="flex-1 flex items-center justify-center text-[color:var(--text-3)] flex-col gap-4">
              <div className="text-6xl opacity-10 grayscale">
                <Grid size={60} strokeWidth={1} />
              </div>
              <p className="text-[10px] font-bold uppercase tracking-widest">Building AI Modules...</p>
            </div>
          )}
        </div>
      </section>

      {/* Mobile Overlay Backdrop */}
      {isSidebarVisible && (
        <div 
          className="fixed inset-0 bg-black/30 backdrop-blur-sm z-40 lg:hidden"
          onClick={() => setIsSidebarVisible(false)}
        />
      )}

      {/* 3. AILY SIDEBAR - Desktop Only */}
      <aside className={`lg:flex lg:static lg:w-[360px] lg:h-auto lg:border-l lg:border-[color:var(--border)] lg:bg-[color:var(--bg-surface-1)] lg:flex-col lg:flex-shrink-0 lg:shadow-xl lg:relative lg:order-2 ${isSidebarVisible ? 'fixed top-[64px] right-4 left-4 bottom-4 z-50 flex flex-col rounded-2xl bg-[color:var(--bg-surface-1)]/95 backdrop-blur-md shadow-2xl border border-[color:var(--border)]' : 'hidden'}`}>
        {demo.id === 'gtm' ? (
          <div className="flex flex-col h-full">
            <div className="h-14 lg:h-16 border-b border-[color:var(--border)] flex items-center justify-between px-4 sm:px-6 bg-[color:var(--bg-surface-1)] sticky top-0 z-10">
              <h4 className="text-xs sm:text-xs font-bold text-[color:var(--text-2)] uppercase tracking-widest flex items-center gap-2">
                <div className="w-6 h-6 bg-[color:var(--primary)] rounded-[var(--radius-sm)] flex items-center justify-center shadow-sm text-white">
                  <Grid size={14} />
                </div>
                Agent 工具栈
              </h4>
              <button 
                onClick={() => setIsSidebarVisible(false)}
                className="lg:hidden w-10 h-10 min-w-[44px] min-h-[44px] rounded-full bg-[color:var(--bg-surface-2)] flex items-center justify-center text-[color:var(--text-3)] hover:text-[color:var(--text)] active:scale-95 transition-all"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-3 sm:space-y-4 bg-[color:var(--bg-surface-1)]">
              {(() => {
                const groupedSteps = demo.steps.reduce((acc, step) => {
                  const stage = step.title.split(' - ')[0];
                  if (!acc[stage]) {
                    acc[stage] = [];
                  }
                  acc[stage].push(step);
                  return acc;
                }, {} as Record<string, typeof demo.steps>);

                return Object.entries(groupedSteps).map(([stage, steps]) => {
                  const typedSteps = steps as typeof demo.steps;
                  const isExpanded = expandedStages[stage] !== false;
                  return (
                    <div key={stage} className="mb-2">
                      <div 
                        className="flex items-center justify-between py-3 cursor-pointer hover:bg-[color:var(--bg-surface-2)] rounded-lg px-2 -mx-2 select-none min-h-[44px]"
                        onClick={() => setExpandedStages(prev => ({ ...prev, [stage]: !isExpanded }))}
                      >
                        <h5 className="text-xs sm:text-xs font-bold text-[color:var(--text-2)] uppercase tracking-widest">{stage}</h5>
                        <div className={`transform transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''} text-[color:var(--text-3)]`}>
                          <ChevronDown size={16} />
                        </div>
                      </div>
                      
                      <div className={`space-y-3 sm:space-y-4 overflow-hidden transition-all duration-300 ${isExpanded ? 'max-h-[1000px] opacity-100 mt-2' : 'max-h-0 opacity-0'}`}>
                        {typedSteps.map((step) => {
                          const tool = EFFICIENCY_TOOLS.find(t => t.name === step.component);
                          return (
                            <div 
                              key={step.id} 
                              className="p-3 sm:p-4 rounded-xl border border-[color:var(--border)] bg-[color:var(--bg-surface-2)] hover:border-[color:var(--primary)] transition-all cursor-pointer group flex gap-3"
                              onClick={() => tool?.url && window.open(tool.url, '_blank')}
                            >
                              <div className="w-10 h-10 min-w-[40px] min-h-[40px] rounded-[var(--radius-md)] bg-[color:var(--bg-surface-2)] border border-[color:var(--border)] flex items-center justify-center overflow-hidden flex-shrink-0">
                                {tool?.avatarUrl ? (
                                  <img src={tool.avatarUrl} alt={tool?.name} className="w-full h-full object-cover" />
                                ) : (
                                  <Zap size={20} />
                                )}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between mb-1">
                                  <span className="text-sm sm:text-sm font-bold text-[color:var(--text)]">{step.component}</span>
                                </div>
                                <p className="text-xs sm:text-xs text-[color:var(--text-3)] line-clamp-2 group-hover:text-[color:var(--text-2)] transition-colors">{step.script}</p>
                              </div>
                              {tool?.url && (
                                <div className="flex items-center justify-center text-[color:var(--text-3)] group-hover:text-[color:var(--primary)] min-w-[44px] min-h-[44px]">
                                  <ArrowUpRight size={16} />
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                });
              })()}
            </div>
          </div>
        ) : (
          <>
            <div className="h-14 lg:h-16 border-b border-[color:var(--border)] flex items-center justify-between px-4 sm:px-6 bg-[color:var(--bg-surface-1)] sticky top-0 z-10">
              <div className="flex flex-col min-w-0">
                <h4 className="text-xs sm:text-xs font-bold text-[color:var(--text-2)] uppercase tracking-widest flex items-center gap-2">
                  <div className="w-6 h-6 bg-[color:var(--primary)] rounded-[var(--radius-sm)] flex items-center justify-center shadow-sm text-white">
                    <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2L4.5 20.29l.71.71L12 18l6.79 3 .71-.71L12 2z"/></svg>
                  </div>
                  Aily 分析工作台
                </h4>
                {activeBusinessContext && (
                  <div className="text-[10px] sm:text-[10px] font-semibold text-[color:var(--text-3)] tracking-tight truncate mt-1">
                    当前上下文：{activeBusinessContext.title}
                  </div>
                )}
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => setMessages([])} className="text-xs sm:text-xs font-medium text-[color:var(--text-3)] hover:text-[color:var(--text)] px-3 py-2 min-h-[44px] min-w-[44px] rounded-[var(--radius-sm)] hover:bg-[color:var(--bg-surface-2)] transition-colors">清空</button>
                <button 
                  onClick={() => setIsSidebarVisible(false)}
                  className="lg:hidden w-10 h-10 min-w-[44px] min-h-[44px] rounded-full bg-[color:var(--bg-surface-2)] flex items-center justify-center text-[color:var(--text-3)] hover:text-[color:var(--text)] active:scale-95 transition-all"
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                </button>
              </div>
            </div>

            {/* Inspection Control Panel */}
            <div className="px-4 sm:px-6 py-4 bg-[color:var(--bg-surface-2)] border-b border-[color:var(--border)] space-y-3">
              <div>
                <label className="text-xs sm:text-xs font-semibold text-[color:var(--text-3)] mb-1.5 block">选择巡检点位</label>
                <div className="relative">
                  <select 
                    value={selectedCheckpoint}
                    onChange={(e) => setSelectedCheckpoint(e.target.value)}
                    disabled={isAnalyzing}
                    className="w-full h-11 pl-3 pr-8 text-sm bg-[color:var(--bg-surface-1)] border border-[color:var(--border)] rounded-[var(--radius-md)] appearance-none focus:outline-none focus:ring-2 focus:ring-[color:var(--primary)]/20 focus:border-[color:var(--primary)] transition-all text-[color:var(--text-3)]"
                  >
                    {checkpointList.map(cp => (
                      <option key={cp} value={cp}>{cp}</option>
                    ))}
                  </select>
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 text-[color:var(--text-3)] pointer-events-none">
                    <ChevronDown size={16} />
                  </div>
                </div>
              </div>
              
              <button
                onClick={executeInspectionAnalysis}
                disabled={isAnalyzing || !selectedCheckpoint}
                className={`w-full h-11 min-h-[44px] flex items-center justify-center gap-2 text-sm font-medium rounded-[var(--radius-md)] transition-all ${
                  isAnalyzing || !selectedCheckpoint
                    ? 'bg-[color:var(--bg-surface-3)] text-[color:var(--text-3)] cursor-not-allowed'
                    : 'bg-[color:var(--primary)] text-white hover:bg-[color:var(--primary-hover)] shadow-sm hover:shadow active:scale-95'
                }`}
              >
                {isAnalyzing ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>{analysisStep || '分析中...'}</span>
                  </>
                ) : (
                  <>
                    <Zap size={16} />
                    <span>执行智能巡检</span>
                  </>
                )}
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 sm:space-y-5 no-scrollbar bg-[color:var(--bg-surface-1)]">
              {messages.map((msg, i) => (
                <div key={i} className={`flex ${msg.role === 'ai' ? 'justify-start' : 'justify-end'} animate-fadeIn`}>
                  <div className={`max-w-[90%] sm:max-w-[90%] p-3 sm:p-4 rounded-2xl text-sm leading-relaxed shadow-sm border ${msg.role === 'ai' ? 'bg-[color:var(--bg-surface-2)] border-[color:var(--border)] text-[color:var(--text)]' : 'bg-[color:var(--primary)] border-transparent text-white'}`}>
                    {msg.text && <div className="whitespace-pre-wrap">{msg.text}</div>}
                    {msg.card && msg.card.type === 'violation' && (
                      <ViolationCard 
                        {...msg.card.data} 
                        onViewDetails={() => setBaseViewMode('table')}
                      />
                    )}
                  </div>
                </div>
              ))}
              {isAilyThinking && (
                <div className="flex justify-start animate-pulse">
                  <div className="bg-[color:var(--bg-surface-2)] p-3 sm:p-4 rounded-[var(--radius-md)] text-xs text-[color:var(--text-3)] font-semibold border border-[color:var(--border)] shadow-sm">Aily 正在深度解构业务维度...</div>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>

            <div className="p-4 sm:p-6 border-t border-[color:var(--border)] bg-[color:var(--bg-surface-1)]">
              <div className="relative flex items-end gap-2">
                <textarea
                  placeholder="向 Aily 提问业务现状..."
                  disabled={isAilyThinking}
                  rows={1}
                  className="w-full min-h-[44px] max-h-[200px] text-sm bg-[color:var(--bg-surface-2)] border border-[color:var(--border)] rounded-[var(--radius-md)] focus:ring-2 focus:ring-[color:var(--primary)]/20 focus:border-[color:var(--primary)] transition-all resize-none p-3"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      const value = e.currentTarget.value.trim();
                      if (!value || isAilyThinking) return;
                      setMessages(prev => [...prev, { role: 'user', text: value }]);
                      askGemini(value);
                      e.currentTarget.value = '';
                    }
                  }}
                />
                <button
                  className="flex-shrink-0 p-3 bg-[color:var(--primary)] text-white rounded-[var(--radius-md)] hover:opacity-90 disabled:opacity-50 transition-opacity"
                  disabled={isAilyThinking}
                  onClick={(e) => {
                    const textarea = e.currentTarget.previousSibling as HTMLTextAreaElement;
                    const value = textarea.value.trim();
                    if (!value || isAilyThinking) return;
                    setMessages(prev => [...prev, { role: 'user', text: value }]);
                    askGemini(value);
                    textarea.value = '';
                  }}
                >
                  <Send size={18} />
                </button>
              </div>
            </div>
          </>
        )}
      </aside>
    </div>
  );
};

export default Workspace;
