import React, { useState } from 'react';
import { ShieldAlert, AlertCircle, Info, ChevronRight, CheckCircle2 } from 'lucide-react';
import { ValidationError } from '../types';

interface ValidationPanelProps {
  errors: ValidationError[];
  onSelectElement: (id: string, type: 'node' | 'lane' | 'connection') => void;
}

export default function ValidationPanel({
  errors,
  onSelectElement,
}: ValidationPanelProps) {
  const [activeFilter, setActiveFilter] = useState<'all' | 'error' | 'warning' | 'recommendation'>('all');

  const filteredErrors = errors.filter((err) => {
    if (activeFilter === 'all') return true;
    return err.type === activeFilter;
  });

  const errorCount = errors.filter(e => e.type === 'error').length;
  const warningCount = errors.filter(e => e.type === 'warning').length;
  const recommendationCount = errors.filter(e => e.type === 'recommendation').length;

  return (
    <div className="flex flex-col h-full bg-white dark:bg-slate-950 overflow-hidden">
      {/* Header and Summary Cards */}
      <div className="p-4 border-b border-slate-100 dark:border-slate-800 space-y-3 shrink-0">
        <h3 className="font-bold text-slate-800 dark:text-slate-100 text-sm">
          Relatório de Validação e Qualidade
        </h3>

        {/* Counts badges row */}
        <div className="grid grid-cols-4 gap-1.5 p-1 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-800">
          <button
            onClick={() => setActiveFilter('all')}
            className={`py-1.5 rounded-lg text-center flex flex-col items-center transition-all ${
              activeFilter === 'all'
                ? 'bg-white dark:bg-slate-800 text-slate-800 dark:text-white shadow-xs font-semibold'
                : 'text-slate-500 hover:text-slate-700 dark:text-slate-400'
            }`}
          >
            <span className="text-xs">{errors.length}</span>
            <span className="text-[8px] uppercase tracking-wider">Tudo</span>
          </button>

          <button
            onClick={() => setActiveFilter('error')}
            className={`py-1.5 rounded-lg text-center flex flex-col items-center transition-all ${
              activeFilter === 'error'
                ? 'bg-white dark:bg-slate-800 text-red-600 dark:text-red-400 shadow-xs font-semibold'
                : 'text-slate-500 hover:text-red-500 dark:text-slate-400'
            }`}
          >
            <span className="text-xs font-bold text-red-500">{errorCount}</span>
            <span className="text-[8px] uppercase tracking-wider">Erros</span>
          </button>

          <button
            onClick={() => setActiveFilter('warning')}
            className={`py-1.5 rounded-lg text-center flex flex-col items-center transition-all ${
              activeFilter === 'warning'
                ? 'bg-white dark:bg-slate-800 text-amber-600 dark:text-amber-400 shadow-xs font-semibold'
                : 'text-slate-500 hover:text-amber-500 dark:text-slate-400'
            }`}
          >
            <span className="text-xs font-bold text-amber-500">{warningCount}</span>
            <span className="text-[8px] uppercase tracking-wider">Alertas</span>
          </button>

          <button
            onClick={() => setActiveFilter('recommendation')}
            className={`py-1.5 rounded-lg text-center flex flex-col items-center transition-all ${
              activeFilter === 'recommendation'
                ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-xs font-semibold'
                : 'text-slate-500 hover:text-indigo-500 dark:text-slate-400'
            }`}
          >
            <span className="text-xs font-bold text-indigo-500">{recommendationCount}</span>
            <span className="text-[8px] uppercase tracking-wider">Dicas</span>
          </button>
        </div>
      </div>

      {/* Issues list */}
      <div className="flex-1 overflow-y-auto p-4 space-y-2">
        {filteredErrors.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center text-slate-400 dark:text-slate-500">
            <CheckCircle2 size={32} className="text-emerald-500 mb-2 animate-pulse" />
            <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300">Nenhum problema encontrado</h4>
            <p className="text-[10px] max-w-40 mt-1">Este fluxo segue perfeitamente todas as regras de montagem e qualidade BPMN.</p>
          </div>
        ) : (
          filteredErrors.map((err) => {
            const isError = err.type === 'error';
            const isWarning = err.type === 'warning';

            return (
              <div
                key={err.id}
                onClick={() => {
                  if (err.elementId && err.elementType) {
                    onSelectElement(err.elementId, err.elementType);
                  }
                }}
                className={`p-3 border rounded-xl flex items-start gap-3 text-left transition-all cursor-pointer ${
                  err.elementId 
                    ? 'hover:border-indigo-500 hover:bg-slate-50 dark:hover:bg-slate-900/50 hover:shadow-xs' 
                    : ''
                } ${
                  isError 
                    ? 'border-red-100 bg-red-50/20 dark:border-red-950/20 dark:bg-red-950/5' 
                    : isWarning 
                    ? 'border-amber-100 bg-amber-50/20 dark:border-amber-950/20 dark:bg-amber-950/5' 
                    : 'border-indigo-100 bg-indigo-50/10 dark:border-indigo-950/20 dark:bg-indigo-950/5'
                }`}
              >
                <div className="shrink-0 mt-0.5">
                  {isError ? (
                    <ShieldAlert size={14} className="text-red-500" />
                  ) : isWarning ? (
                    <AlertCircle size={14} className="text-amber-500" />
                  ) : (
                    <Info size={14} className="text-indigo-500" />
                  )}
                </div>

                <div className="flex-1 min-w-0 space-y-0.5">
                  <p className="text-xs font-semibold text-slate-700 dark:text-slate-200 line-clamp-2">
                    {err.message}
                  </p>
                  {err.elementId && (
                    <span className="inline-flex items-center gap-1 text-[9px] font-semibold text-indigo-600 dark:text-indigo-400">
                      Ir para elemento <ChevronRight size={10} />
                    </span>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Footer statistics summary */}
      <div className="p-3.5 bg-slate-50 dark:bg-slate-900/40 border-t border-slate-100 dark:border-slate-800 text-[10px] text-slate-500 dark:text-slate-400 shrink-0">
        <p className="font-semibold text-slate-700 dark:text-slate-300">Entendendo as severidades:</p>
        <ul className="list-disc pl-4 space-y-0.5 mt-1">
          <li><strong className="text-red-500">Erro:</strong> Quebra regras estruturais que impedem a execução.</li>
          <li><strong className="text-amber-500">Alerta:</strong> Inconsistências graves ou fluxos órfãos recomendados a consertar.</li>
          <li><strong className="text-indigo-500">Dica:</strong> Melhores práticas de modelagem e responsabilidades.</li>
        </ul>
      </div>
    </div>
  );
}
