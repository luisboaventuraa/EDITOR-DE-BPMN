import React, { useState, useEffect } from 'react';
import { 
  FileText, Clock, User, Cpu, Tag, Trash2, 
  Layers, ExternalLink, HelpCircle, Check, Plus, X, Bookmark
} from 'lucide-react';
import { ProcessModel, ProcessNode, ProcessConnection, LaneModel } from '../types';

interface PropertiesPanelProps {
  process: ProcessModel;
  selectedNodeId: string | null;
  selectedConnectionId: string | null;
  onUpdateProcess: (updater: (prev: ProcessModel) => ProcessModel) => void;
  onDeleteNode: (id: string) => void;
}

export default function PropertiesPanel({
  process,
  selectedNodeId,
  selectedConnectionId,
  onUpdateProcess,
  onDeleteNode,
}: PropertiesPanelProps) {
  const node = process.nodes.find((n) => n.id === selectedNodeId);
  const connection = process.connections.find((c) => c.id === selectedConnectionId);

  // Local states to prevent lag during fast typing
  const [nodeTitle, setNodeTitle] = useState('');
  const [nodeDesc, setNodeDesc] = useState('');
  const [nodeResp, setNodeResp] = useState('');
  const [nodeDuration, setNodeDuration] = useState('');
  const [nodePriority, setNodePriority] = useState<'Baixa' | 'Média' | 'Alta'>('Média');
  const [nodeInstructions, setNodeInstructions] = useState('');
  const [nodeColor, setNodeColor] = useState('');
  const [systemInput, setSystemInput] = useState('');
  const [docInputIn, setDocInputIn] = useState('');
  const [docInputOut, setDocInputOut] = useState('');

  const [connLabel, setConnLabel] = useState('');
  const [connCondition, setConnCondition] = useState('');

  // Sync state when selection shifts
  useEffect(() => {
    if (node) {
      setNodeTitle(node.title);
      setNodeDesc(node.description || '');
      setNodeResp(node.responsible || '');
      setNodeDuration(node.estimatedDuration || '');
      setNodePriority(node.priority || 'Média');
      setNodeInstructions(node.instructions || '');
      setNodeColor(node.color || '');
    }
  }, [selectedNodeId]);

  useEffect(() => {
    if (connection) {
      setConnLabel(connection.label || '');
      setConnCondition(connection.condition || '');
    }
  }, [selectedConnectionId]);

  // Update functions
  const updateNodeField = (field: keyof ProcessNode, value: any) => {
    onUpdateProcess((prev) => ({
      ...prev,
      nodes: prev.nodes.map((n) => (n.id === selectedNodeId ? { ...n, [field]: value } : n)),
    }));
  };

  const updateConnectionField = (field: keyof ProcessConnection, value: any) => {
    onUpdateProcess((prev) => ({
      ...prev,
      connections: prev.connections.map((c) => (c.id === selectedConnectionId ? { ...c, [field]: value } : c)),
    }));
  };

  // Systems Chip Array Actions
  const addSystem = () => {
    if (!node || !systemInput.trim()) return;
    const current = node.systems || [];
    if (!current.includes(systemInput.trim())) {
      updateNodeField('systems', [...current, systemInput.trim()]);
    }
    setSystemInput('');
  };

  const removeSystem = (sys: string) => {
    if (!node) return;
    const filtered = (node.systems || []).filter(s => s !== sys);
    updateNodeField('systems', filtered);
  };

  // Input Documents
  const addInputDoc = () => {
    if (!node || !docInputIn.trim()) return;
    const current = node.inputDocuments || [];
    if (!current.includes(docInputIn.trim())) {
      updateNodeField('inputDocuments', [...current, docInputIn.trim()]);
    }
    setDocInputIn('');
  };

  const removeInputDoc = (doc: string) => {
    if (!node) return;
    const filtered = (node.inputDocuments || []).filter(d => d !== doc);
    updateNodeField('inputDocuments', filtered);
  };

  // Output Documents
  const addOutputDoc = () => {
    if (!node || !docInputOut.trim()) return;
    const current = node.outputDocuments || [];
    if (!current.includes(docInputOut.trim())) {
      updateNodeField('outputDocuments', [...current, docInputOut.trim()]);
    }
    setDocInputOut('');
  };

  const removeOutputDoc = (doc: string) => {
    if (!node) return;
    const filtered = (node.outputDocuments || []).filter(d => d !== doc);
    updateNodeField('outputDocuments', filtered);
  };

  if (!node && !connection) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-slate-400 dark:text-slate-500 h-full">
        <Bookmark size={36} className="mb-3 opacity-30 animate-pulse" />
        <h4 className="text-sm font-semibold">Nenhum Elemento Selecionado</h4>
        <p className="text-xs max-w-44 mt-1">Clique em um bloco de processo ou conexão para configurar suas propriedades avançadas.</p>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto h-full p-5 space-y-5">
      {/* SELEÇÃO: BLOCO DE PROCESSO */}
      {node && (
        <>
          {/* Header */}
          <div className="border-b border-slate-100 dark:border-slate-800 pb-3">
            <span className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">
              Propriedades do Bloco
            </span>
            <div className="flex items-center justify-between gap-2 mt-1">
              <input
                type="text"
                value={nodeTitle}
                onChange={(e) => {
                  setNodeTitle(e.target.value);
                  updateNodeField('title', e.target.value);
                }}
                className="font-bold text-slate-800 dark:text-slate-100 text-base bg-transparent border-b border-transparent hover:border-slate-300 dark:hover:border-slate-700 focus:border-indigo-500 focus:outline-hidden rounded-sm py-0.5 w-full"
              />
              <button
                onClick={() => onDeleteNode(node.id)}
                className="p-1.5 hover:bg-red-50 dark:hover:bg-red-950/20 text-slate-400 hover:text-red-500 dark:hover:text-red-400 rounded-md transition-colors"
                title="Excluir este bloco"
              >
                <Trash2 size={15} />
              </button>
            </div>
          </div>

          {/* Form Fields */}
          <div className="space-y-4">
            {/* Descrição */}
            <div>
              <label className="block text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1">
                Finalidade / Descrição
              </label>
              <textarea
                value={nodeDesc}
                onChange={(e) => {
                  setNodeDesc(e.target.value);
                  updateNodeField('description', e.target.value);
                }}
                placeholder="Descreva detalhadamente o objetivo desta etapa..."
                className="w-full text-xs px-3 py-2 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-hidden focus:ring-1 focus:ring-indigo-500 dark:bg-slate-900 dark:text-slate-100 h-16 resize-none"
              />
            </div>

            {/* Executor / Responsável */}
            <div>
              <label className="block text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1">
                Responsável / Executor
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400">
                  <User size={13} />
                </span>
                <input
                  type="text"
                  value={nodeResp}
                  onChange={(e) => {
                    setNodeResp(e.target.value);
                    updateNodeField('responsible', e.target.value);
                  }}
                  placeholder="Cargo, Pessoa ou Departamento..."
                  className="w-full pl-9 pr-3 py-2 border border-slate-200 dark:border-slate-800 rounded-xl text-xs focus:outline-hidden focus:ring-1 focus:ring-indigo-500 dark:bg-slate-900 dark:text-slate-100"
                />
              </div>
            </div>

            {/* SLA / Duração Estimada */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1">
                  Prazo Estimado (SLA)
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400">
                    <Clock size={13} />
                  </span>
                  <input
                    type="text"
                    value={nodeDuration}
                    onChange={(e) => {
                      setNodeDuration(e.target.value);
                      updateNodeField('estimatedDuration', e.target.value);
                    }}
                    placeholder="Ex: 2 horas, 1 dia..."
                    className="w-full pl-9 pr-3 py-2 border border-slate-200 dark:border-slate-800 rounded-xl text-xs focus:outline-hidden focus:ring-1 focus:ring-indigo-500 dark:bg-slate-900 dark:text-slate-100"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1">
                  Prioridade
                </label>
                <select
                  value={nodePriority}
                  onChange={(e) => {
                    const p = e.target.value as 'Baixa' | 'Média' | 'Alta';
                    setNodePriority(p);
                    updateNodeField('priority', p);
                  }}
                  className="w-full px-3 py-2 border border-slate-200 dark:border-slate-800 rounded-xl text-xs focus:outline-hidden focus:ring-1 focus:ring-indigo-500 dark:bg-slate-900 dark:text-slate-100"
                >
                  <option value="Baixa">Baixa</option>
                  <option value="Média">Média</option>
                  <option value="Alta">Alta</option>
                </select>
              </div>
            </div>

            {/* Sistemas Integrados / Utilizados */}
            <div>
              <label className="block text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                <Cpu size={12} /> Sistemas Utilizados
              </label>
              <div className="flex gap-1">
                <input
                  type="text"
                  value={systemInput}
                  onChange={(e) => setSystemInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && addSystem()}
                  placeholder="Adicionar sistema (Enter)..."
                  className="w-full px-3 py-1.5 border border-slate-200 dark:border-slate-800 rounded-xl text-xs focus:outline-hidden focus:ring-1 focus:ring-indigo-500 dark:bg-slate-900 dark:text-slate-100"
                />
                <button
                  onClick={addSystem}
                  className="bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 p-2 rounded-xl border border-slate-200 dark:border-slate-800 transition-all"
                >
                  <Plus size={14} />
                </button>
              </div>
              <div className="flex flex-wrap gap-1 mt-2">
                {(node.systems || []).map((sys) => (
                  <span
                    key={sys}
                    className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 px-2 py-0.5 rounded-lg text-[10px] font-medium"
                  >
                    {sys}
                    <button onClick={() => removeSystem(sys)} className="hover:text-red-500">
                      <X size={10} />
                    </button>
                  </span>
                ))}
              </div>
            </div>

            {/* Documentos de Entrada */}
            <div>
              <label className="block text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                <FileText size={12} className="text-amber-500" /> Insumos / Documentos de Entrada
              </label>
              <div className="flex gap-1">
                <input
                  type="text"
                  value={docInputIn}
                  onChange={(e) => setDocInputIn(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && addInputDoc()}
                  placeholder="Ex: Ficha de cadastro, RG..."
                  className="w-full px-3 py-1.5 border border-slate-200 dark:border-slate-800 rounded-xl text-xs focus:outline-hidden focus:ring-1 focus:ring-indigo-500 dark:bg-slate-900 dark:text-slate-100"
                />
                <button
                  onClick={addInputDoc}
                  className="bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 p-2 rounded-xl border border-slate-200 dark:border-slate-800 transition-all"
                >
                  <Plus size={14} />
                </button>
              </div>
              <div className="flex flex-wrap gap-1 mt-2">
                {(node.inputDocuments || []).map((doc) => (
                  <span
                    key={doc}
                    className="flex items-center gap-1 bg-amber-50/70 border border-amber-200 dark:bg-amber-950/20 dark:border-amber-900 text-amber-800 dark:text-amber-300 px-2 py-0.5 rounded-lg text-[10px] font-medium"
                  >
                    {doc}
                    <button onClick={() => removeInputDoc(doc)} className="hover:text-red-500">
                      <X size={10} />
                    </button>
                  </span>
                ))}
              </div>
            </div>

            {/* Documentos de Saída */}
            <div>
              <label className="block text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                <FileText size={12} className="text-emerald-500" /> Resultados / Documentos de Saída
              </label>
              <div className="flex gap-1">
                <input
                  type="text"
                  value={docInputOut}
                  onChange={(e) => setDocInputOut(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && addOutputDoc()}
                  placeholder="Ex: Certidão, Contrato assinado..."
                  className="w-full px-3 py-1.5 border border-slate-200 dark:border-slate-800 rounded-xl text-xs focus:outline-hidden focus:ring-1 focus:ring-indigo-500 dark:bg-slate-900 dark:text-slate-100"
                />
                <button
                  onClick={addOutputDoc}
                  className="bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 p-2 rounded-xl border border-slate-200 dark:border-slate-800 transition-all"
                >
                  <Plus size={14} />
                </button>
              </div>
              <div className="flex flex-wrap gap-1 mt-2">
                {(node.outputDocuments || []).map((doc) => (
                  <span
                    key={doc}
                    className="flex items-center gap-1 bg-emerald-50/70 border border-emerald-200 dark:bg-emerald-950/20 dark:border-emerald-900 text-emerald-800 dark:text-emerald-300 px-2 py-0.5 rounded-lg text-[10px] font-medium"
                  >
                    {doc}
                    <button onClick={() => removeOutputDoc(doc)} className="hover:text-red-500">
                      <X size={10} />
                    </button>
                  </span>
                ))}
              </div>
            </div>

            {/* Instruções de Execução */}
            <div>
              <label className="block text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1">
                Manual / Instruções de Procedimento
              </label>
              <textarea
                value={nodeInstructions}
                onChange={(e) => {
                  setNodeInstructions(e.target.value);
                  updateNodeField('instructions', e.target.value);
                }}
                placeholder="Insira as regras e o passo-a-passo operacional para esta tarefa..."
                className="w-full text-xs px-3 py-2 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-hidden focus:ring-1 focus:ring-indigo-500 dark:bg-slate-900 dark:text-slate-100 h-24 resize-none"
              />
            </div>
          </div>
        </>
      )}

      {/* SELEÇÃO: CONEXÃO (ELBOW PATH) */}
      {connection && (
        <>
          {/* Header */}
          <div className="border-b border-slate-100 dark:border-slate-800 pb-3">
            <span className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">
              Propriedades da Conexão
            </span>
            <h3 className="font-bold text-slate-800 dark:text-slate-100 text-sm mt-1">
              Desvio de Fluxo / Condicional
            </h3>
          </div>

          {/* Form Fields */}
          <div className="space-y-4">
            {/* Nome / Label */}
            <div>
              <label className="block text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1">
                Rótulo / Decisão (Ex: "Sim", "Não")
              </label>
              <input
                type="text"
                value={connLabel}
                onChange={(e) => {
                  setConnLabel(e.target.value);
                  updateConnectionField('label', e.target.value);
                }}
                placeholder="Ex: Sim, Não, Aprovado, Rejeitado..."
                className="w-full px-3 py-2 border border-slate-200 dark:border-slate-800 rounded-xl text-xs focus:outline-hidden focus:ring-1 focus:ring-indigo-500 dark:bg-slate-900 dark:text-slate-100"
              />
            </div>

            {/* Condição técnica */}
            <div>
              <label className="block text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1">
                Fórmula / Condição Lógica
              </label>
              <textarea
                value={connCondition}
                onChange={(e) => {
                  setConnCondition(e.target.value);
                  updateConnectionField('condition', e.target.value);
                }}
                placeholder="Ex: valor_solicitado > 10000..."
                className="w-full text-xs px-3 py-2 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-hidden focus:ring-1 focus:ring-indigo-500 dark:bg-slate-900 dark:text-slate-100 h-16 resize-none"
              />
            </div>

            <div className="p-3 bg-slate-50 dark:bg-slate-900/60 rounded-xl border border-slate-200 dark:border-slate-800 text-[10px] text-slate-400 dark:text-slate-500 space-y-1">
              <p className="font-semibold text-slate-500 dark:text-slate-400">Informações Técnicas:</p>
              <p>Origem ID: <span className="font-mono">{connection.sourceNodeId}</span> ({connection.sourceConnectorId})</p>
              <p>Destino ID: <span className="font-mono">{connection.targetNodeId}</span> ({connection.targetConnectorId})</p>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
