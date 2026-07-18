import React, { useState, useEffect } from 'react';
import { 
  Play, RotateCcw, ArrowRight, ArrowLeft, User, 
  Clock, FileText, CheckCircle, HelpCircle, AlertCircle, Sparkles
} from 'lucide-react';
import { ProcessModel, ProcessNode, ProcessConnection } from '../types';
import { getNodeTypeLabel } from '../utils/documentation';

interface SimulationPanelProps {
  process: ProcessModel;
  simulationStepId: string | null;
  setSimulationStepId: (id: string | null) => void;
  onCenterNode: (nodeId: string) => void;
}

export default function SimulationPanel({
  process,
  simulationStepId,
  setSimulationStepId,
  onCenterNode,
}: SimulationPanelProps) {
  const [history, setHistory] = useState<string[]>([]);
  const [activeStep, setActiveStep] = useState<ProcessNode | null>(null);

  const startNodes = process.nodes.filter((n) => n.type.startsWith('start'));

  // Sync active step
  useEffect(() => {
    if (simulationStepId) {
      const node = process.nodes.find((n) => n.id === simulationStepId);
      setActiveStep(node || null);
      if (node) {
        onCenterNode(node.id);
      }
    } else {
      setActiveStep(null);
    }
  }, [simulationStepId, process.nodes]);

  const startSimulation = (nodeId: string) => {
    setHistory([]);
    setSimulationStepId(nodeId);
  };

  const resetSimulation = () => {
    setHistory([]);
    setSimulationStepId(null);
    setActiveStep(null);
  };

  const stepForward = (targetNodeId: string) => {
    if (simulationStepId) {
      setHistory((prev) => [...prev, simulationStepId]);
    }
    setSimulationStepId(targetNodeId);
  };

  const stepBackward = () => {
    if (history.length === 0) return;
    const newHistory = [...history];
    const prevId = newHistory.pop()!;
    setHistory(newHistory);
    setSimulationStepId(prevId);
  };

  // If no simulation is active, show the launcher
  if (!activeStep) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-6 text-center h-full">
        <div className="p-4 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900 rounded-full text-emerald-600 dark:text-emerald-400 mb-4 animate-pulse">
          <Play size={32} />
        </div>
        <h3 className="font-bold text-slate-800 dark:text-slate-100 text-sm">
          Simulador de Execução Passo-a-Passo
        </h3>
        <p className="text-xs text-slate-500 dark:text-slate-400 max-w-56 mt-2">
          Percorra o fluxo de trabalho simulando as tarefas cotidianas para validar regras e dependências.
        </p>

        {startNodes.length === 0 ? (
          <div className="mt-4 p-3 bg-red-50 dark:bg-red-950/20 text-red-700 dark:text-red-400 rounded-xl border border-red-200 dark:border-red-900 text-xs flex items-center gap-2 max-w-xs">
            <AlertCircle size={16} className="shrink-0" />
            <span>Nenhum evento de início cadastrado no diagrama para iniciar a simulação!</span>
          </div>
        ) : (
          <div className="mt-6 w-full max-w-xs space-y-2">
            <label className="block text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider text-left pl-1">
              Selecione o Gatilho de Entrada:
            </label>
            {startNodes.map((start) => (
              <button
                key={start.id}
                onClick={() => startSimulation(start.id)}
                className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-emerald-500 hover:bg-emerald-50/10 hover:text-emerald-700 dark:hover:text-emerald-400 p-3.5 rounded-xl text-xs font-semibold text-left text-slate-700 dark:text-slate-300 transition-all flex items-center justify-between group shadow-sm"
              >
                <span className="truncate pr-2">{start.title}</span>
                <ArrowRight size={14} className="text-slate-400 group-hover:translate-x-0.5 transition-transform shrink-0" />
              </button>
            ))}
          </div>
        )}
      </div>
    );
  }

  // Find outgoing options
  const outgoingConnections = process.connections.filter((c) => c.sourceNodeId === activeStep.id);
  const isEndNode = activeStep.type.startsWith('end');

  return (
    <div className="flex-1 overflow-y-auto h-full p-5 space-y-5">
      {/* Simulation HUD header */}
      <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
        <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400">
          <Sparkles size={16} className="animate-spin" />
          <span className="text-[10px] font-bold uppercase tracking-wider">Simulação Ativa</span>
        </div>
        <button
          onClick={resetSimulation}
          className="flex items-center gap-1 text-[10px] font-bold text-red-500 hover:text-red-700 uppercase bg-red-50 dark:bg-red-950/20 px-2 py-1 rounded-md transition-colors"
        >
          <RotateCcw size={10} /> Parar
        </button>
      </div>

      {/* Step Info Card */}
      <div className="bg-emerald-50/40 dark:bg-emerald-950/5 border border-emerald-500/25 p-4 rounded-2xl shadow-xs space-y-3">
        <div>
          <span className="text-[9px] bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 px-2 py-0.5 rounded-full font-bold">
            {getNodeTypeLabel(activeStep.type)}
          </span>
          <h3 className="font-bold text-slate-800 dark:text-white text-base mt-2">
            {activeStep.title}
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
            {activeStep.description || 'Nenhum detalhe operacional fornecido para esta etapa.'}
          </p>
        </div>

        {/* Operational Specs Grid */}
        <div className="grid grid-cols-2 gap-2 text-[11px] pt-2 border-t border-emerald-500/10">
          <div className="space-y-1">
            <span className="text-slate-400 flex items-center gap-1"><User size={11} /> Executor</span>
            <p className="font-semibold text-slate-700 dark:text-slate-200">{activeStep.responsible || 'Qualquer Operador'}</p>
          </div>
          <div className="space-y-1">
            <span className="text-slate-400 flex items-center gap-1"><Clock size={11} /> SLA Estimado</span>
            <p className="font-semibold text-slate-700 dark:text-slate-200">{activeStep.estimatedDuration || 'Imediato'}</p>
          </div>
        </div>

        {/* Requirements Documents */}
        {activeStep.inputDocuments && activeStep.inputDocuments.length > 0 && (
          <div className="pt-2.5 border-t border-emerald-500/10 space-y-1.5">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
              <FileText size={11} className="text-amber-500" /> Insumos / Documentos Exigidos:
            </span>
            <div className="flex flex-wrap gap-1">
              {activeStep.inputDocuments.map((doc) => (
                <span key={doc} className="bg-amber-50 border border-amber-200 text-amber-800 dark:bg-amber-950/20 dark:border-amber-900 dark:text-amber-300 px-2 py-0.5 rounded-lg text-[9px] font-medium">
                  {doc}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Outputs Produced */}
        {activeStep.outputDocuments && activeStep.outputDocuments.length > 0 && (
          <div className="pt-2.5 border-t border-emerald-500/10 space-y-1.5">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
              <FileText size={11} className="text-emerald-500" /> Resultados / Documentos Gerados:
            </span>
            <div className="flex flex-wrap gap-1">
              {activeStep.outputDocuments.map((doc) => (
                <span key={doc} className="bg-emerald-50 border border-emerald-200 text-emerald-800 dark:bg-emerald-950/20 dark:border-emerald-900 dark:text-emerald-300 px-2 py-0.5 rounded-lg text-[9px] font-medium">
                  {doc}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Systems Utilized */}
        {activeStep.systems && activeStep.systems.length > 0 && (
          <div className="pt-2.5 border-t border-emerald-500/10 space-y-1">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Sistemas de Apoio:</span>
            <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">{activeStep.systems.join(', ')}</p>
          </div>
        )}

        {/* Procedures Instructions */}
        {activeStep.instructions && (
          <div className="pt-2.5 border-t border-emerald-500/10 space-y-1">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Roteiro Operacional:</span>
            <p className="text-xs text-slate-600 dark:text-slate-400 bg-white/60 dark:bg-slate-900/40 p-2 border border-emerald-500/10 rounded-lg italic">
              "{activeStep.instructions}"
            </p>
          </div>
        )}
      </div>

      {/* Navigation Buttons: Forward Paths */}
      <div className="space-y-2">
        <label className="block text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-2">
          {isEndNode ? 'Fim de Ciclo' : 'Decisões / Próximos Caminhos do Fluxo:'}
        </label>

        {isEndNode ? (
          <div className="bg-emerald-500/10 border border-emerald-500/20 p-4 rounded-xl text-center space-y-2 text-emerald-700 dark:text-emerald-400">
            <CheckCircle size={28} className="mx-auto" />
            <h4 className="text-xs font-bold uppercase tracking-wider">Simulação Concluída</h4>
            <p className="text-[11px] leading-relaxed">Você chegou a um ponto terminal. O fluxo de trabalho foi executado com sucesso!</p>
            <button
              onClick={resetSimulation}
              className="mt-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs px-3 py-1.5 rounded-lg transition-all"
            >
              Simular Outro Gatilho
            </button>
          </div>
        ) : outgoingConnections.length === 0 ? (
          <div className="bg-amber-500/10 border border-amber-500/20 p-3.5 rounded-xl text-amber-700 dark:text-amber-400 text-xs flex items-center gap-2">
            <AlertCircle size={16} className="shrink-0" />
            <span>Fluxo interrompido de forma abrupta (Falta conexão de saída). Adicione um evento de término na etapa de edição.</span>
          </div>
        ) : (
          <div className="space-y-1.5">
            {outgoingConnections.map((conn) => {
              const targetNode = process.nodes.find((n) => n.id === conn.targetNodeId);
              if (!targetNode) return null;

              return (
                <button
                  key={conn.id}
                  onClick={() => stepForward(targetNode.id)}
                  className="w-full text-left bg-indigo-600 hover:bg-indigo-700 active:scale-99 text-white px-4 py-3 rounded-xl shadow-xs transition-all flex items-center justify-between font-semibold text-xs text-wrap break-words"
                >
                  <div className="flex-1 min-w-0 pr-2">
                    {conn.label && (
                      <span className="block text-[9px] text-indigo-200 uppercase tracking-widest mb-0.5">
                        Caso: "{conn.label}"
                      </span>
                    )}
                    <span className="block truncate">Seguir para "{targetNode.title}"</span>
                  </div>
                  <ArrowRight size={14} className="shrink-0" />
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Histórico e botão voltar */}
      {history.length > 0 && (
        <button
          onClick={stepBackward}
          className="w-full border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-900 text-slate-600 dark:text-slate-300 font-semibold text-xs py-2 rounded-xl transition-all flex items-center justify-center gap-2"
        >
          <ArrowLeft size={13} /> Voltar Etapa Anterior ({history.length} no histórico)
        </button>
      )}
    </div>
  );
}
