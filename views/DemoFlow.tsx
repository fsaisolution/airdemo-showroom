import React, { useMemo, useState } from 'react';
import { Button, Tag } from '@universe-design/react';
import { Demo } from '../types';
import { ArrowRight, Camera, Brain, CheckSquare, MessageSquare, Monitor, Play } from 'lucide-react';

interface DemoFlowProps {
  demo: Demo;
  onEnterApp: () => void;
}

const FlowNode: React.FC<{ 
  icon: React.ReactNode; 
  title: string; 
  desc: string; 
  x: number; 
  y: number;
  color: string;
}> = ({ icon, title, desc, x, y, color }) => (
  <div 
    className="absolute bg-[color:var(--bg-surface-1)] rounded-[var(--radius-xl)] shadow-[var(--shadow-md)] border border-[color:var(--border)] p-4 w-64 min-h-[200px] flex flex-col gap-3 transition-transform hover:-translate-y-1 hover:shadow-[var(--shadow-lg)] z-10"
    style={{ left: x, top: y }}
  >
    <div className={`h-1 absolute top-0 left-4 right-4 rounded-b-sm ${color}`}></div>
    <div className="flex items-center gap-3 mt-2">
      <div className={`w-10 h-10 rounded-[var(--radius-md)] flex items-center justify-center ${color.replace('bg-', 'bg-opacity-10 text-')}`}>
        {icon}
      </div>
      <h4 className="font-bold text-[color:var(--text)] text-sm">{title}</h4>
    </div>
    <p className="text-xs text-[color:var(--text-2)] leading-relaxed bg-[color:var(--bg-surface-2)] p-2 rounded-[var(--radius-sm)] border border-[color:var(--border)]">
      {desc}
    </p>
    <div className="flex gap-2">
       <span className="text-[10px] font-mono bg-[color:var(--bg-surface-2)] text-[color:var(--text-3)] px-1.5 py-0.5 rounded-[var(--radius-xs)]">Input</span>
       <span className="ml-auto text-[10px] font-mono bg-[color:var(--bg-surface-2)] text-[color:var(--text-3)] px-1.5 py-0.5 rounded-[var(--radius-xs)]">Output</span>
    </div>
  </div>
);

const FlowEdge: React.FC<{
  startX: number;
  startY: number;
  endX: number;
  endY: number;
  isVertical?: boolean;
}> = ({ startX, startY, endX, endY, isVertical }) => {
  let path = '';
  
  if (isVertical) {
    // Vertical connection (S-shape turn)
    const midY = (startY + endY) / 2;
    path = `M ${startX} ${startY} C ${startX} ${midY}, ${endX} ${midY}, ${endX} ${endY}`;
  } else {
    // Horizontal connection
    const midX = (startX + endX) / 2;
    path = `M ${startX} ${startY} C ${midX} ${startY}, ${midX} ${endY}, ${endX} ${endY}`;
  }
  
  return (
    <svg className="absolute inset-0 w-full h-full pointer-events-none z-0 overflow-visible">
      <path d={path} fill="none" stroke="var(--border)" strokeWidth="4" />
      <path d={path} fill="none" stroke="var(--text-3)" strokeWidth="2" strokeDasharray="6 4" className="animate-[dash_20s_linear_infinite]" />
      <circle cx={endX} cy={endY} r="3" fill="var(--text-3)" />
    </svg>
  );
};

const DemoFlow: React.FC<DemoFlowProps> = ({ demo, onEnterApp }) => {
  const [isRightPanelOpen, setIsRightPanelOpen] = useState(() => {
    // Default open on desktop (width > 768px), closed on mobile
    return window.innerWidth > 768;
  });

  const defaultNodes = [
    { id: 1, title: '全景数据采集', desc: '实时接入工厂摄像头数据流与 IoT 传感器信号', icon: <Camera size={20} />, color: 'bg-blue-500' },
    { id: 2, title: '多模态 AI 分析', desc: 'YOLOv8 + Gemini 联合分析，识别违规行为与设备隐患', icon: <Brain size={20} />, color: 'bg-purple-500' },
    { id: 3, title: '智能业务路由', desc: '基于风险等级自动分发：警告/工单/停机指令', icon: <CheckSquare size={20} />, color: 'bg-orange-500' },
    { id: 4, title: '闭环行动触达', desc: '推送飞书卡片给对应负责人，拉起应急群组', icon: <MessageSquare size={20} />, color: 'bg-green-500' },
  ];

  const inspectionFlow = useMemo(() => {
    const CARD_WIDTH = 256;
    const CARD_HEIGHT = 200;
    const GAP_X = 84;
    const GAP_Y = 120;

    const topY = GAP_Y;
    const bottomY = GAP_Y + CARD_HEIGHT + GAP_Y;

    // Calculate the actual width of the node group (from col1X to col3X + CARD_WIDTH)
    const groupWidth = 3 * CARD_WIDTH + 2 * GAP_X;
    const groupHeight = 2 * CARD_HEIGHT + GAP_Y;

    // Calculate container size with equal padding on all sides
    const containerWidth = groupWidth + GAP_X * 2;
    const containerHeight = groupHeight + GAP_Y * 2;

    // Calculate starting X position to center the node group
    const startX = (containerWidth - groupWidth) / 2;

    const col1X = startX;
    const col2X = startX + CARD_WIDTH + GAP_X;
    const col3X = startX + (CARD_WIDTH + GAP_X) * 2;

    const nodes = [
      {
        id: 1,
        title: '摄像头点位输入',
        desc: '录入厂区点位与摄像头绑定信息，建立可追溯数据源',
        icon: <Camera size={20} />,
        color: 'bg-blue-500',
        x: col1X,
        y: topY,
      },
      {
        id: 2,
        title: '点位摄像头视频抽帧',
        desc: '从视频流按规则抽帧，生成可检索的图片序列',
        icon: <Camera size={20} />,
        color: 'bg-indigo-500',
        x: col2X,
        y: topY,
      },
      {
        id: 3,
        title: 'AI 识别违规',
        desc: '识别在岗玩手机、睡岗、5S 不合规等违规行为',
        icon: <Brain size={20} />,
        color: 'bg-purple-500',
        x: col3X,
        y: topY,
      },
      {
        id: 4,
        title: '大屏展示',
        desc: '实时汇总告警与趋势，管理者在大屏一眼掌控',
        icon: <Monitor size={20} />,
        color: 'bg-green-500',
        x: col2X,
        y: bottomY,
      },
      {
        id: 5,
        title: '数据录入',
        desc: '违规记录与字段自动入表，支持人工补充与复核',
        icon: <CheckSquare size={20} />,
        color: 'bg-orange-500',
        x: col3X,
        y: bottomY,
      },
    ];

    const edges: Array<{ from: number; to: number }> = [
      { from: 1, to: 2 },
      { from: 2, to: 3 },
      { from: 2, to: 4 },
      { from: 3, to: 5 },
      { from: 4, to: 5 },
    ];

    return { nodes, edges, containerWidth, containerHeight, CARD_WIDTH, CARD_HEIGHT };
  }, []);

  const { nodes, edges, containerWidth, containerHeight, cardWidth, cardHeight } = useMemo(() => {
    if (demo.id === 'inspection') {
      return {
        nodes: inspectionFlow.nodes,
        edges: inspectionFlow.edges,
        containerWidth: inspectionFlow.containerWidth,
        containerHeight: inspectionFlow.containerHeight,
        cardWidth: inspectionFlow.CARD_WIDTH,
        cardHeight: inspectionFlow.CARD_HEIGHT,
      };
    }

    const rawNodes = demo.steps && demo.steps.length > 0
      ? demo.steps.map((step) => {
          const getIcon = (component: string) => {
            const iconMap: Record<string, React.ReactNode> = {
              '探探': <MessageSquare size={20} />,
              '参参': <Brain size={20} />,
              '呆呆': <Monitor size={20} />,
              '图图': <Camera size={20} />,
              '蕊蕊': <CheckSquare size={20} />,
              'Aily': <Brain size={20} />,
              '移动端': <Camera size={20} />,
              'Base 表格': <CheckSquare size={20} />,
            };
            return iconMap[component] || <Brain size={20} />;
          };

          const getColor = (component: string) => {
            const colorMap: Record<string, string> = {
              '探探': 'bg-blue-500',
              '参参': 'bg-purple-500',
              '呆呆': 'bg-indigo-500',
              '图图': 'bg-pink-500',
              '蕊蕊': 'bg-green-500',
              'Aily': 'bg-purple-500',
              '移动端': 'bg-sky-500',
              'Base 表格': 'bg-orange-500',
            };
            return colorMap[component] || 'bg-blue-500';
          };

          return {
            id: step.id,
            title: step.title,
            desc: step.script || step.value || '',
            icon: getIcon(step.component),
            color: getColor(step.component),
          };
        })
      : defaultNodes;

    const COLUMNS = 3;
    const CARD_WIDTH = 256;
    const CARD_HEIGHT = 200;
    const GAP_X = 60;
    const GAP_Y = 80;
    const PADDING = 60;

    const positionedNodes = rawNodes.map((node, index) => {
      const row = Math.floor(index / COLUMNS);
      const col = index % COLUMNS;
      const isEvenRow = row % 2 === 0;
      const effectiveCol = isEvenRow ? col : (COLUMNS - 1 - col);

      return {
        ...node,
        x: PADDING + effectiveCol * (CARD_WIDTH + GAP_X),
        y: PADDING + row * (CARD_HEIGHT + GAP_Y),
        row,
        col: effectiveCol,
      };
    });

    const totalRows = Math.ceil(positionedNodes.length / COLUMNS);
    const containerWidth = PADDING * 2 + COLUMNS * CARD_WIDTH + (COLUMNS - 1) * GAP_X;
    const containerHeight = PADDING * 2 + totalRows * CARD_HEIGHT + (totalRows - 1) * GAP_Y;

    const sequentialEdges = positionedNodes.slice(0, -1).map((n, i) => ({ from: n.id, to: positionedNodes[i + 1].id }));
    return { nodes: positionedNodes, edges: sequentialEdges, containerWidth, containerHeight, cardWidth: CARD_WIDTH, cardHeight: CARD_HEIGHT };
  }, [demo.id, demo.steps, defaultNodes, inspectionFlow]);

  const nodeById = useMemo(() => new Map(nodes.map(n => [n.id, n] as const)), [nodes]);

  return (
    <div className="flex-1 flex h-full bg-[color:var(--bg-body)] overflow-hidden relative font-sans">
      {/* Canvas Area */}
      <div className="flex-1 relative overflow-auto bg-[radial-gradient(var(--border)_1px,transparent_1px)] [background-size:20px_20px]">
         <div className="min-w-full min-h-full flex">
           <div className="relative flex-shrink-0 m-auto" style={{ width: containerWidth, height: containerHeight }}>
              {/* Edges */}
              {edges.map((edge, i) => {
                const from = nodeById.get(edge.from);
                const to = nodeById.get(edge.to);
                if (!from || !to) return null;

                const isVertical = from.y !== to.y;

                let startX: number;
                let startY: number;
                let endX: number;
                let endY: number;

                if (isVertical) {
                  if (from.y < to.y) {
                    startX = from.x + cardWidth / 2;
                    startY = from.y + cardHeight;
                    endX = to.x + cardWidth / 2;
                    endY = to.y;
                  } else {
                    startX = from.x + cardWidth / 2;
                    startY = from.y;
                    endX = to.x + cardWidth / 2;
                    endY = to.y + cardHeight;
                  }
                } else {
                  if (from.x < to.x) {
                    startX = from.x + cardWidth;
                    startY = from.y + cardHeight / 2;
                    endX = to.x;
                    endY = to.y + cardHeight / 2;
                  } else {
                    startX = from.x;
                    startY = from.y + cardHeight / 2;
                    endX = to.x + cardWidth;
                    endY = to.y + cardHeight / 2;
                  }
                }

                return (
                  <FlowEdge
                    key={`${edge.from}-${edge.to}-${i}`}
                    startX={startX}
                    startY={startY}
                    endX={endX}
                    endY={endY}
                    isVertical={isVertical}
                  />
                );
              })}

              {/* Nodes */}
              {nodes.map(node => (
                <FlowNode key={node.id} {...node} />
              ))}
           </div>
         </div>
         
         <div className="absolute top-6 left-6 z-20">
            <div className="bg-[color:var(--bg-surface-1)]/80 backdrop-blur shadow-sm border border-[color:var(--border)] rounded-lg p-3 flex items-center gap-3">
               <span className="flex h-2 w-2 rounded-full bg-[color:var(--success)] animate-pulse"></span>
               <span className="text-xs font-semibold text-[color:var(--text-2)]">流程引擎运行中</span>
            </div>
         </div>
      </div>
      
      {/* Right Panel Toggle */}
      {!isRightPanelOpen && (
           <button
             onClick={() => setIsRightPanelOpen(true)}
             className="absolute bottom-6 left-1/2 -translate-x-1/2 z-20"
           >
             <Button type="outlined" size="medium">
               打开流程说明
             </Button>
           </button>
         )}
      
         {/* Right Sidebar */}
         {isRightPanelOpen && (
         <div className="w-[360px] bg-[color:var(--bg-surface-1)] border-l border-[color:var(--border)] shadow-xl z-30 flex flex-col">
           {/* Header */}
           <div className="h-16 border-b border-[color:var(--border)] flex items-center justify-between px-4 md:px-6">
              <div className="flex items-center gap-2">
                <Tag color="neutral" size="small">Flow</Tag>
                <h3 className="text-sm font-bold text-[color:var(--text)] whitespace-nowrap">业务流程编排</h3>
              </div>
           </div>

           {/* Content */}
           <div className="flex-1 p-6 overflow-y-auto">
              <div className="aspect-video w-full rounded-xl bg-[color:var(--bg-surface-2)] border border-[color:var(--border)] mb-6 overflow-hidden relative group">
                 {demo.id === 'inspection' ? (
                   <video 
                     src="/video/巡检demo演示.mp4" 
                     className="w-full h-full object-cover"
                     controls
                     autoPlay
                     muted
                     loop
                   />
                 ) : demo.cover ? (
                   <img src={demo.cover} className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" />
                 ) : (
                   <div className="w-full h-full flex items-center justify-center text-[color:var(--text-3)]">Preview</div>
                 )}
                 <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent flex items-end p-4 pointer-events-none">
                    <h2 className="text-white font-bold text-lg">{demo.title}</h2>
                 </div>
              </div>

              {demo.id === 'inspection' && (
                <div className="mb-6 text-center">
                  <a 
                    href="https://bytedance.larkoffice.com/docx/IGOIdvqKwoyr0txSiAOchpoSn7d?from=auth_notice&hash=f312b4dccca9ccfc1c61e8db0afc4dc3" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-[color:var(--primary)] hover:underline text-sm flex items-center justify-center gap-1"
                  >
                    <span>查看说明文档</span>
                    <ArrowRight size={14} />
                  </a>
                </div>
              )}

              <div className="space-y-6">
                <div>
                  <h4 className="text-xs font-bold text-[color:var(--text)] uppercase tracking-widest mb-3">流程说明</h4>
                  <p className="text-sm text-[color:var(--text-2)] leading-relaxed font-light">
                    {demo.valueProp}
                  </p>
                </div>

                <div>
                  <h4 className="text-xs font-bold text-[color:var(--text)] uppercase tracking-widest mb-3">关键节点</h4>
                  <ul className="space-y-3">
                    {nodes.map((n, i) => (
                      <li key={n.id} className="flex items-center gap-3 text-sm text-[color:var(--text-2)]">
                        <span className="w-5 h-5 rounded-full bg-[color:var(--bg-surface-2)] border border-[color:var(--border)] flex items-center justify-center text-[10px] font-bold text-[color:var(--text-3)]">{i+1}</span>
                        <span>{n.title}</span>
                      </li>
                    ))}
                  </ul>
                </div>
           </div>
        </div>

        {/* Footer Actions */}
        <div className="p-6 border-t border-[color:var(--border)] bg-[color:var(--bg-surface-1)]">
           <Button 
             type="primary"
             size="large"
             block
             onClick={onEnterApp}
             icon={<Play size={16} />}
           >
             进入应用
           </Button>
           <p className="text-center mt-3 text-[10px] text-[color:var(--text-3)]">
             点击即可进入应用模式体验真实交互
           </p>
           <Button
             type="outlined"
             size="medium"
             block
             onClick={() => setIsRightPanelOpen(false)}
             className="mt-4"
           >
             收起流程说明
           </Button>
        </div>
      </div>
      )}
    </div>
  );
};

export default DemoFlow;
