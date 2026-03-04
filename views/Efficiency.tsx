import React from 'react';
import { Button, Card, Tag } from '@universe-design/react';
import { FileText, PlayCircle } from 'lucide-react';
import { EFFICIENCY_TOOLS } from '../constants';

type EfficiencyTool = (typeof EFFICIENCY_TOOLS)[number];

const ToolAvatar: React.FC<{ tool: EfficiencyTool }> = ({ tool }) => {
  if (tool.avatarUrl) {
    return (
      <img
        src={tool.avatarUrl}
        alt={tool.name || tool.title}
        className="w-full h-full object-cover"
        loading="lazy"
        referrerPolicy="no-referrer"
      />
    );
  }
  return null;
};

const Efficiency: React.FC = () => {
  return (
    <div className="flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto overflow-x-hidden no-scrollbar bg-transparent animate-fadeIn relative h-full">
      <div className="max-w-6xl mx-auto relative z-10">
        <header className="mb-6 sm:mb-8 lg:mb-10">
          <h2 className="text-xl sm:text-2xl lg:text-3xl font-semibold text-[color:var(--text)] mb-2 sm:mb-3 tracking-tight">数字伙伴</h2>
          <p className="text-sm sm:text-base lg:text-lg text-[color:var(--text-2)] font-normal">售前过程中的高频提效助手，一键打开即用。</p>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 lg:gap-8">
          {EFFICIENCY_TOOLS.map((tool) => (
            <Card
              key={tool.id}
              style={{ width: '100%' }}
              borderRadius="large"
              shadow="medium"
            >
              <div className="flex flex-col h-full p-1">
                <div className="flex items-start justify-between gap-4 mb-4 min-w-0">
                  <div className="flex items-start gap-4 min-w-0">
                    <div className="w-12 h-12 rounded-xl overflow-hidden flex-shrink-0">
                      <ToolAvatar tool={tool} />
                    </div>
                    <div className="min-w-0 flex-1 pt-0.5">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-base sm:text-lg font-semibold text-[color:var(--text)] tracking-tight">{tool.title}</h3>
                        {tool.name && (
                          <Tag color="blue" shape="round" size="small">
                            {tool.name}
                          </Tag>
                        )}
                      </div>
                      <a
                        href={tool.url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs font-normal text-[color:var(--text-3)] hover:text-[color:var(--primary)] truncate block mt-1 transition-colors max-w-full"
                      >
                        {tool.url}
                      </a>
                    </div>
                  </div>
                </div>

                <div className="rounded-lg p-3 text-sm font-normal text-[color:var(--text-2)] leading-relaxed mb-4 flex-1 bg-[color:var(--bg-surface-2)]">
                  "{tool.highlight}"
                </div>

                <div className="flex flex-col gap-3 mt-auto pt-1">
                  <div className="flex flex-wrap gap-2">
                    {tool.skills.slice(0, 2).map((s) => (
                      <Tag key={`${tool.id}-${s}`} color="neutral" shape="round" size="small">
                        {s}
                      </Tag>
                    ))}
                  </div>
                  <div className="flex items-center justify-between gap-2 pt-2 border-t border-[color:var(--border-subtle)]">
                    <div className="flex gap-2">
                      <Button
                        type="outlined"
                        size="small"
                        href={tool.docUrl}
                        target="_blank"
                        icon={<FileText size={14} />}
                      >
                        文档
                      </Button>
                      <Button
                        type="outlined"
                        size="small"
                        href={tool.videoUrl}
                        target="_blank"
                        icon={<PlayCircle size={14} />}
                      >
                        视频
                      </Button>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        type="primary"
                        size="small"
                        href={tool.url}
                        target="_blank"
                      >
                        打开
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Efficiency;
