import React from 'react';
import { Demo } from '../types';
import { DEMO_LIST } from '../constants';
import { LayoutGrid } from 'lucide-react';
import { Card } from '@universe-design/react';

interface CatalogProps {
  onSelectDemo: (demo: Demo) => void;
}

const Catalog: React.FC<CatalogProps> = ({ onSelectDemo }) => {
  return (
    <div className="h-full w-full overflow-y-auto font-sans text-[color:var(--text)]">
      <section className="min-h-full flex flex-col p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
        <div className="mb-4 sm:mb-6 lg:mb-8">
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-[color:var(--text)] mb-2">
            Demo 中心
          </h1>
          <p className="text-sm sm:text-base lg:text-base text-[color:var(--text-3)]">
            探索 AI 数字伙伴在不同业务场景中的实际应用
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
          {DEMO_LIST.map((demo) => (
            <Card
              key={demo.id}
              bordered={false}
              shadowed={false}
              onClick={() => onSelectDemo(demo)}
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
          
          <div className="border border-dashed border-[color:var(--border)] rounded-lg flex items-center justify-center p-6 sm:p-10 text-[color:var(--text-3)] bg-[color:var(--bg-surface-1)] min-h-[200px] cursor-default hover:border-[color:var(--text-3)] transition-colors">
            <div className="text-center">
              <div className="w-14 h-14 mx-auto mb-4 rounded-full bg-[color:var(--bg-surface-2)] border border-[color:var(--border)] flex items-center justify-center shadow-sm">
                 <LayoutGrid size={16} />
              </div>
              <p className="font-medium text-sm text-[color:var(--text-2)] mb-1.5">M2 阶段新增...</p>
              <p className="text-xs text-[color:var(--text-3)] font-normal">AI 妙记智能分析 / AI 客服助手 / VOC 声音分析</p>
            </div>
          </div>
        </div>

        {/* Design Document Info A~C Section */}
        <section className="mt-8 pt-6 sm:mt-12 sm:pt-8 lg:mt-24 lg:pt-16 border-t border-[color:var(--border)]">
          <h3 className="text-[10px] font-bold text-[color:var(--text-3)] uppercase tracking-[0.15em] mb-6 sm:mb-8 lg:mb-12 text-center">设计方案包 (Part A-C)</h3>
          <div className="grid grid-cols-1 sm:grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8 lg:gap-12">
            <div className="space-y-2 sm:space-y-3">
              <h4 className="font-semibold text-[color:var(--text)] text-sm flex items-center gap-2.5">
                <span className="w-5 h-5 rounded-full bg-[color:var(--text)] text-[color:var(--bg)] flex items-center justify-center text-[10px] font-bold">A</span>
                选择理由
              </h4>
              <p className="text-xs sm:text-xs font-normal text-[color:var(--text-2)] leading-relaxed">选定 GTM 与智能巡检，覆盖销售运营及线下管理两大最能通过结构化 AI (Base + Aily) 产生闭环价值的黄金场景。目标决策层对"商机流失"与"安全违规"极其敏感。</p>
            </div>
            <div className="space-y-2 sm:space-y-3">
              <h4 className="font-semibold text-[color:var(--text)] text-sm flex items-center gap-2.5">
                <span className="w-5 h-5 rounded-full bg-[color:var(--text)] text-[color:var(--bg)] flex items-center justify-center text-[10px] font-bold">B</span>
                价值主张
              </h4>
              <p className="text-xs sm:text-xs font-normal text-[color:var(--text-2)] leading-relaxed">"不讲技术名词，只讲业务风险。AirDemo 致力于让管理层在5分钟内看到：AI 是如何从无序数据中提取行动建议，并直接产生业务回报的。"</p>
            </div>
            <div className="space-y-2 sm:space-y-3">
              <h4 className="font-semibold text-[color:var(--text)] text-sm flex items-center gap-2.5">
                <span className="w-5 h-5 rounded-full bg-[color:var(--text)] text-[color:var(--bg)] flex items-center justify-center text-[10px] font-bold">C</span>
                Catalog 设计
              </h4>
              <p className="text-xs sm:text-xs font-normal text-[color:var(--text-2)] leading-relaxed">卡片式展示，强引导"价值"与"要点"，让售前在还没进入 Demo 前就能准确根据客户画像快速匹配推荐方案。</p>
            </div>
          </div>
        </section>
      </section>
    </div>
  );
};

export default Catalog;
