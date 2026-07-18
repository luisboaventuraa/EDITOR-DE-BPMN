import React, { useState } from 'react';
import { 
  FileText, Clipboard, Download, Check, Eye, Code, 
  Layers, Printer, RefreshCw, BookOpen, Clock, Cpu
} from 'lucide-react';
import { ProcessModel } from '../types';
import { generateProcessMarkdown } from '../utils/documentation';

interface DocumentationPanelProps {
  process: ProcessModel;
  onExportMarkdown: () => void;
}

export default function DocumentationPanel({
  process,
  onExportMarkdown,
}: DocumentationPanelProps) {
  const [activeTab, setActiveTab] = useState<'visual' | 'markdown'>('visual');
  const [copied, setCopied] = useState(false);

  const markdownText = generateProcessMarkdown(process);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(markdownText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Falha ao copiar texto: ', err);
    }
  };

  // Group nodes by Lane to display in visual report
  const laneGroups = process.lanes.map(lane => {
    const laneNodes = process.nodes.filter(n => n.laneId === lane.id);
    return {
      ...lane,
      nodes: laneNodes
    };
  });

  // Calculate some stats for the report
  const totalNodes = process.nodes.length;
  const decisionNodes = process.nodes.filter(n => 
    ['decision-exclusive', 'decision-parallel', 'decision-inclusive', 'condition-simple', 'approval-rejection'].includes(n.type)
  ).length;
  const startNodes = process.nodes.filter(n => n.type.startsWith('start')).length;
  const endNodes = process.nodes.filter(n => n.type.startsWith('end')).length;

  return (
    <div className="flex flex-col h-full bg-white dark:bg-slate-950 overflow-hidden">
      {/* Tab controls header */}
      <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between shrink-0 bg-slate-50/50 dark:bg-slate-900/10">
        <div className="flex items-center bg-slate-100 dark:bg-slate-900 p-0.5 rounded-xl">
          <button
            onClick={() => setActiveTab('visual')}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
              activeTab === 'visual'
                ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-xs'
                : 'text-slate-500 hover:text-slate-700 dark:text-slate-400'
            }`}
          >
            <BookOpen size={13} />
            Visualização Formatada
          </button>
          <button
            onClick={() => setActiveTab('markdown')}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
              activeTab === 'markdown'
                ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-xs'
                : 'text-slate-500 hover:text-slate-700 dark:text-slate-400'
            }`}
          >
            <Code size={13} />
            Código Markdown (.md)
          </button>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={handleCopy}
            className="flex items-center gap-1 text-[10px] font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 px-2.5 py-1.5 rounded-xl transition-all"
            title="Copiar relatório para área de transferência"
          >
            {copied ? (
              <>
                <Check size={12} className="text-emerald-500" /> Copiado!
              </>
            ) : (
              <>
                <Clipboard size={12} /> Copiar
              </>
            )}
          </button>

          <button
            onClick={onExportMarkdown}
            className="flex items-center gap-1 text-[10px] font-bold text-white bg-indigo-600 hover:bg-indigo-700 shadow-xs px-2.5 py-1.5 rounded-xl transition-all"
            title="Exportar como arquivo Markdown (.md)"
          >
            <Download size={12} /> Exportar MD
          </button>
        </div>
      </div>

      {/* Main viewport */}
      <div className="flex-1 overflow-y-auto p-6">
        
        {/* TAB 1: VISUAL FORMATTED DOCUMENT */}
        {activeTab === 'visual' && (
          <div className="max-w-3xl mx-auto space-y-8 text-left bg-white dark:bg-slate-950 p-6 sm:p-10 border border-slate-100 dark:border-slate-900 rounded-2xl shadow-xs">
            {/* Document Header / Cover Page */}
            <div className="border-b-4 border-indigo-600 pb-6 space-y-3">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-extrabold uppercase tracking-widest text-indigo-600 bg-indigo-50 dark:bg-indigo-950/40 dark:text-indigo-400 px-2.5 py-0.5 rounded-md">
                  MANUAL OPERACIONAL DE PROCEDIMENTOS
                </span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
                {process.name}
              </h1>
              {process.description && (
                <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed italic">
                  "{process.description}"
                </p>
              )}
              <div className="text-[10px] text-slate-400 dark:text-slate-500 font-mono pt-2 flex flex-wrap gap-x-4 gap-y-1">
                <span>Versão do Documento: 1.0</span>
                <span>Última revisão: {new Date().toLocaleDateString('pt-BR')}</span>
              </div>
            </div>

            {/* Quick stats grid */}
            <div className="grid grid-cols-4 gap-4 p-4 bg-slate-50 dark:bg-slate-900/50 rounded-2xl border border-slate-100 dark:border-slate-800">
              <div className="text-center">
                <span className="block text-lg font-black text-slate-800 dark:text-white">{totalNodes}</span>
                <span className="text-[9px] text-slate-400 dark:text-slate-500 uppercase tracking-wider font-semibold">Etapas</span>
              </div>
              <div className="text-center">
                <span className="block text-lg font-black text-slate-800 dark:text-white">{process.lanes.length}</span>
                <span className="text-[9px] text-slate-400 dark:text-slate-500 uppercase tracking-wider font-semibold">Departamentos</span>
              </div>
              <div className="text-center">
                <span className="block text-lg font-black text-slate-800 dark:text-white">{decisionNodes}</span>
                <span className="text-[9px] text-slate-400 dark:text-slate-500 uppercase tracking-wider font-semibold">Decisões</span>
              </div>
              <div className="text-center">
                <span className="block text-lg font-black text-slate-800 dark:text-white">{process.connections.length}</span>
                <span className="text-[9px] text-slate-400 dark:text-slate-500 uppercase tracking-wider font-semibold">Transições</span>
              </div>
            </div>

            {/* Index Section */}
            <div className="space-y-3">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100 dark:border-slate-800 pb-1.5">
                Estrutura de Responsabilidades (Raias)
              </h3>
              <div className="space-y-1.5">
                {process.lanes.map((lane, i) => (
                  <div key={lane.id} className="flex items-center justify-between text-xs text-slate-700 dark:text-slate-300">
                    <span className="font-semibold flex items-center gap-2">
                      <span style={{ backgroundColor: lane.color }} className="w-2.5 h-2.5 rounded-full shrink-0"></span>
                      Raia {i + 1}: {lane.name}
                    </span>
                    <span className="text-slate-400 dark:text-slate-500 font-mono">
                      {process.nodes.filter(n => n.laneId === lane.id).length} tarefas
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Detailed Steps by Lane */}
            <div className="space-y-6 pt-4">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100 dark:border-slate-800 pb-1.5">
                Roteiros Detalhados de Procedimento
              </h3>

              {laneGroups.map((lane, index) => {
                if (lane.nodes.length === 0) return null;

                return (
                  <div key={lane.id} className="space-y-4">
                    <div style={{ borderLeftColor: lane.color }} className="border-l-4 pl-3.5 py-1">
                      <h4 className="font-extrabold text-slate-800 dark:text-slate-100 text-sm">
                        Departamento: {lane.name}
                      </h4>
                      {lane.description && (
                        <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5">{lane.description}</p>
                      )}
                    </div>

                    <div className="space-y-4">
                      {lane.nodes.map((node, nodeIdx) => (
                        <div key={node.id} className="bg-slate-50/50 dark:bg-slate-900/10 p-4 rounded-xl border border-slate-100 dark:border-slate-900 space-y-3">
                          <div className="flex items-start justify-between gap-2">
                            <h5 className="font-bold text-xs text-slate-800 dark:text-slate-200">
                              {nodeIdx + 1}. {node.title}
                            </h5>
                            {node.estimatedDuration && (
                              <span className="flex items-center gap-1 text-[9px] font-bold text-indigo-600 bg-indigo-50 dark:bg-indigo-950/40 dark:text-indigo-400 px-2 py-0.5 rounded-sm">
                                <Clock size={9} /> {node.estimatedDuration}
                              </span>
                            )}
                          </div>

                          {node.description && (
                            <p className="text-xs text-slate-500 dark:text-slate-400">
                              {node.description}
                            </p>
                          )}

                          {/* Inputs / Outputs Tables inside Step Card */}
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-[10px] pt-1.5 border-t border-slate-100 dark:border-slate-800">
                            <div>
                              <span className="font-extrabold text-slate-400 uppercase tracking-wider block mb-1">
                                Documentos de Entrada (Insumos)
                              </span>
                              {node.inputDocuments && node.inputDocuments.length > 0 ? (
                                <ul className="list-disc pl-4 space-y-0.5 text-slate-600 dark:text-slate-400">
                                  {node.inputDocuments.map(doc => <li key={doc}>{doc}</li>)}
                                </ul>
                              ) : (
                                <span className="text-slate-400 dark:text-slate-500 italic">Sem exigência de insumo físico.</span>
                              )}
                            </div>

                            <div>
                              <span className="font-extrabold text-slate-400 uppercase tracking-wider block mb-1">
                                Documentos de Saída (Resultados)
                              </span>
                              {node.outputDocuments && node.outputDocuments.length > 0 ? (
                                <ul className="list-disc pl-4 space-y-0.5 text-slate-600 dark:text-slate-400">
                                  {node.outputDocuments.map(doc => <li key={doc}>{doc}</li>)}
                                </ul>
                              ) : (
                                <span className="text-slate-400 dark:text-slate-500 italic">Sem produção de documento físico.</span>
                              )}
                            </div>
                          </div>

                          {/* Action manual instructions */}
                          {node.instructions && (
                            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-2.5 rounded-lg text-xs text-slate-600 dark:text-slate-300">
                              <strong className="text-[10px] uppercase text-indigo-500 tracking-wider block mb-1">Instruções Passo-a-Passo:</strong>
                              <p className="italic leading-relaxed">"{node.instructions}"</p>
                            </div>
                          )}

                          {/* Systems Info */}
                          {node.systems && node.systems.length > 0 && (
                            <div className="flex items-center gap-1.5 text-[10px] text-slate-500 dark:text-slate-400">
                              <Cpu size={12} className="text-indigo-500 shrink-0" />
                              <span>Sistemas: <strong>{node.systems.join(', ')}</strong></span>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* TAB 2: RAW MARKDOWN PREVIEW */}
        {activeTab === 'markdown' && (
          <div className="h-full flex flex-col space-y-3">
            <label className="block text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider text-left">
              Código de Marcação Markdown Gerado:
            </label>
            <div className="flex-1 bg-slate-900 dark:bg-slate-950 p-4 rounded-xl border border-slate-800 overflow-auto font-mono text-xs text-slate-300 leading-relaxed text-left selection:bg-slate-800">
              <pre className="whitespace-pre-wrap">{markdownText}</pre>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
