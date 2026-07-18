import React, { useState } from 'react';
import * as Icons from 'lucide-react';
import { BLOCK_CATEGORIES, BLOCK_DEFINITIONS } from '../constants';
import { BlockTypeDefinition } from '../types';

interface SidebarProps {
  activeLoadedBlock: string | null;
  setActiveLoadedBlock: (type: string | null) => void;
}

export default function Sidebar({
  activeLoadedBlock,
  setActiveLoadedBlock,
}: SidebarProps) {
  const [activeCategory, setActiveCategory] = useState<'all' | 'event' | 'activity' | 'decision' | 'auxiliary'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Dynamically resolve icon from Lucide
  const renderIcon = (iconName: string, className = 'w-4 h-4') => {
    const IconComponent = (Icons as any)[iconName] || Icons.HelpCircle;
    return <IconComponent className={className} />;
  };

  const filteredDefinitions = BLOCK_DEFINITIONS.filter((def) => {
    const matchesCategory = activeCategory === 'all' || def.category === activeCategory;
    const matchesSearch = 
      def.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      def.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const handleDragStart = (e: React.DragEvent, type: string) => {
    e.dataTransfer.setData('bpmn/block-type', type);
    e.dataTransfer.effectAllowed = 'copy';
    (window as any).__draggingBlockType = type;
  };

  const handleDragEnd = () => {
    (window as any).__draggingBlockType = null;
  };

  return (
    <aside className="w-80 border-r border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 flex flex-col shrink-0 h-full overflow-hidden">
      {/* Search Header */}
      <div className="p-4 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 flex flex-col gap-3">
        <div className="relative">
          <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400">
            <Icons.Search size={14} />
          </span>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar bloco ou ferramenta..."
            className="w-full pl-9 pr-4 py-2 border border-slate-200 dark:border-slate-800 rounded-xl text-xs focus:outline-hidden focus:ring-1 focus:ring-indigo-500 dark:bg-slate-900 dark:text-slate-100 placeholder:text-slate-400"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
            >
              <Icons.X size={12} />
            </button>
          )}
        </div>

        {/* Categories Tabs */}
        <div className="grid grid-cols-5 gap-1 bg-slate-100 dark:bg-slate-900 p-1 rounded-xl">
          {(['all', 'event', 'activity', 'decision', 'auxiliary'] as const).map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`py-1 rounded-lg text-[10px] font-semibold uppercase tracking-wider text-center transition-all ${
                activeCategory === cat
                  ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-xs'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
              }`}
            >
              {cat === 'all' ? 'Tudo' : cat === 'event' ? 'Ev' : cat === 'activity' ? 'At' : cat === 'decision' ? 'Dc' : 'Ax'}
            </button>
          ))}
        </div>
      </div>

      {/* Accordion / Scrolling List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {activeLoadedBlock && (
          <div className="bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800 p-3 rounded-xl flex items-center justify-between shadow-xs">
            <div className="flex items-center gap-2">
              <div className="animate-bounce p-1.5 bg-indigo-600 text-white rounded-lg">
                <Icons.Sparkles size={12} />
              </div>
              <div>
                <h4 className="text-xs font-bold text-indigo-900 dark:text-indigo-300">Modo Clique-e-Encaixe</h4>
                <p className="text-[10px] text-indigo-700 dark:text-indigo-400">Clique na grade para inserir</p>
              </div>
            </div>
            <button
              onClick={() => setActiveLoadedBlock(null)}
              className="text-indigo-500 hover:text-indigo-700 text-xs font-semibold uppercase hover:bg-white dark:hover:bg-slate-800 px-2 py-1 rounded-md transition-all"
            >
              Cancelar
            </button>
          </div>
        )}

        {/* Group definitions by category */}
        {(['event', 'activity', 'decision', 'auxiliary'] as const).map((cat) => {
          const categoryDefs = filteredDefinitions.filter((d) => d.category === cat);
          if (categoryDefs.length === 0) return null;

          const catMeta = BLOCK_CATEGORIES[cat];

          return (
            <div key={cat} className="space-y-2">
              <h3 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center justify-between">
                <span>{catMeta.title}</span>
                <span className="text-[9px] bg-slate-200 dark:bg-slate-800 text-slate-500 dark:text-slate-400 rounded-full px-1.5 py-0.5">
                  {categoryDefs.length}
                </span>
              </h3>

              <div className="grid grid-cols-1 gap-2">
                {categoryDefs.map((def) => {
                  const isSelected = activeLoadedBlock === def.type;

                  return (
                    <div
                      key={def.type}
                      draggable
                      onDragStart={(e) => handleDragStart(e, def.type)}
                      onDragEnd={handleDragEnd}
                      onClick={() => {
                        if (isSelected) {
                          setActiveLoadedBlock(null);
                        } else {
                          setActiveLoadedBlock(def.type);
                        }
                      }}
                      className={`group relative p-3 border rounded-xl flex items-start gap-3 cursor-grab active:cursor-grabbing hover:shadow-xs transition-all ${
                        isSelected
                          ? 'border-indigo-600 bg-indigo-50/50 dark:border-indigo-500 dark:bg-indigo-950/20 shadow-md ring-2 ring-indigo-500/20'
                          : 'border-slate-200/80 bg-white hover:border-slate-300 dark:border-slate-800 dark:bg-slate-950 dark:hover:border-slate-700'
                      }`}
                    >
                      {/* Icon */}
                      <div className={`p-2 rounded-lg border ${catMeta.color} shrink-0 group-hover:scale-105 transition-transform`}>
                        {renderIcon(def.icon, 'w-4 h-4')}
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-1">
                          <h4 className="text-xs font-semibold text-slate-700 dark:text-slate-200 group-hover:text-slate-900 dark:group-hover:text-white transition-colors truncate">
                            {def.title}
                          </h4>
                          <span className="text-[8px] uppercase tracking-wider text-slate-400 font-mono hidden group-hover:inline">
                            Arrastar
                          </span>
                        </div>
                        <p className="text-[10px] text-slate-400 dark:text-slate-500 line-clamp-1 group-hover:line-clamp-2 transition-all">
                          {def.description}
                        </p>
                      </div>

                      {/* Ports Indicators (Hover helper) */}
                      <div className="absolute right-2 bottom-1.5 flex items-center gap-0.5 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity">
                        {def.inputs.includes('left') && (
                          <span className="w-1.5 h-1.5 rounded-full bg-slate-300 dark:bg-slate-700" title="Porta entrada esquerda"></span>
                        )}
                        {def.outputs.includes('right') && (
                          <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 dark:bg-indigo-600" title="Porta saída direita"></span>
                        )}
                        {def.outputs.includes('bottom') && (
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 dark:bg-emerald-600" title="Porta saída inferior"></span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </aside>
  );
}
