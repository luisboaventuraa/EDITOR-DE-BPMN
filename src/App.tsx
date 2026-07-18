import React, { useState, useEffect } from 'react';
import { TEMPLATE_PROCESSES } from './templates';
import { validateProcess } from './utils/validation';
import { generateProcessMarkdown } from './utils/documentation';
import { exportToBPMN20 } from './utils/bpmnExport';
import { ProcessModel, ValidationError, EditorMode } from './types';
import { toPng, toSvg } from 'html-to-image';

// Components
import Topbar from './components/Topbar';
import Sidebar from './components/Sidebar';
import Canvas from './components/Canvas';
import PropertiesPanel from './components/PropertiesPanel';
import ValidationPanel from './components/ValidationPanel';
import SimulationPanel from './components/SimulationPanel';
import DocumentationPanel from './components/DocumentationPanel';

import { Sparkles, HelpCircle, Layers, CheckCircle } from 'lucide-react';

export default function App() {
  // 1. Core Process and Projects State
  const [projectsList, setProjectsList] = useState<{ id: string; name: string; process: ProcessModel }[]>([]);
  const [process, setProcess] = useState<ProcessModel>(TEMPLATE_PROCESSES[0]); // fallback if storage blank

  // 2. Navigation / Zoom State
  const [activeMode, setActiveMode] = useState<EditorMode>('edit');
  const [zoom, setZoom] = useState(1.0);
  const [panX, setPanX] = useState(60);
  const [panY, setPanY] = useState(60);

  // 3. Selection States
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [selectedConnectionId, setSelectedConnectionId] = useState<string | null>(null);
  const [activeLoadedBlock, setActiveLoadedBlock] = useState<string | null>(null);

  // 4. Panel Toggles
  const [showValidationPanel, setShowValidationPanel] = useState(false);

  // 5. History stacks
  const [historyStack, setHistoryStack] = useState<ProcessModel[]>([]);
  const [redoStack, setRedoStack] = useState<ProcessModel[]>([]);

  // 6. Simulation runtime state
  const [simulationStepId, setSimulationStepId] = useState<string | null>(null);

  // 7. Validation errors output
  const [validationErrors, setValidationErrors] = useState<ValidationError[]>([]);

  // 8. Custom Notification & Confirmation Modal States
  const [notification, setNotification] = useState<{
    type: 'success' | 'error' | 'info';
    message: string;
  } | null>(null);

  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    confirmText?: string;
    isDanger?: boolean;
    onConfirm: () => void;
  } | null>(null);

  // Auto-hide notification toast
  useEffect(() => {
    if (notification) {
      const timer = setTimeout(() => {
        setNotification(null);
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [notification]);

  // Force Light Theme by removing dark mode class from html/body
  useEffect(() => {
    document.documentElement.classList.remove('dark');
    document.body.classList.remove('dark');
  }, []);

  // On initial mount: read projects from local storage
  useEffect(() => {
    const rawProjects = localStorage.getItem('flowgrid_projects');
    if (rawProjects) {
      try {
        const parsed = JSON.parse(rawProjects);
        if (parsed && Array.isArray(parsed) && parsed.length > 0) {
          setProjectsList(parsed);
          
          // Load current project if saved
          const currentId = localStorage.getItem('flowgrid_current_id');
          const found = parsed.find((p: any) => p.id === currentId);
          if (found) {
            setProcess(found.process);
          } else {
            setProcess(parsed[0].process);
          }
          return;
        }
      } catch (e) {
        console.error('Falha ao ler projetos do local storage', e);
      }
    }

    // Default: populate localStorage with beautiful templates
    const initialList = TEMPLATE_PROCESSES.map((tmpl) => ({
      id: tmpl.id,
      name: tmpl.name,
      process: tmpl,
    }));
    setProjectsList(initialList);
    setProcess(TEMPLATE_PROCESSES[0]);
    localStorage.setItem('flowgrid_projects', JSON.stringify(initialList));
    localStorage.setItem('flowgrid_current_id', TEMPLATE_PROCESSES[0].id);
  }, []);

  // Compute validation on process changes
  useEffect(() => {
    const errors = validateProcess(process);
    setValidationErrors(errors);
  }, [process]);

  // Sync mode changes
  useEffect(() => {
    // Clear selections and loaded blocks on mode change
    setSelectedNodeId(null);
    setSelectedConnectionId(null);
    setActiveLoadedBlock(null);
    setSimulationStepId(null);
  }, [activeMode]);

  // History controls
  const handleUndo = () => {
    if (historyStack.length === 0) return;
    const previous = historyStack[historyStack.length - 1];
    setHistoryStack((prev) => prev.slice(0, prev.length - 1));
    setRedoStack((prev) => [process, ...prev]);
    setProcess(previous);

    // Save back to projects list
    updateProjectsListDirectly(previous);
  };

  const handleRedo = () => {
    if (redoStack.length === 0) return;
    const next = redoStack[0];
    setRedoStack((prev) => prev.slice(1));
    setHistoryStack((prev) => [...prev, process]);
    setProcess(next);

    // Save back to projects list
    updateProjectsListDirectly(next);
  };

  // State Updaters
  const updateProcessWithHistory = (updater: (prev: ProcessModel) => ProcessModel) => {
    setProcess((prev) => {
      const next = updater(prev);
      setHistoryStack((prevStack) => [...prevStack, prev]);
      setRedoStack([]); // Clear Redo on any new manual action
      updateProjectsListDirectly(next);
      return next;
    });
  };

  const updateProcessDirectly = (updater: (prev: ProcessModel) => ProcessModel) => {
    setProcess((prev) => {
      const next = updater(prev);
      updateProjectsListDirectly(next);
      return next;
    });
  };

  const updateProjectsListDirectly = (targetProcess: ProcessModel) => {
    setProjectsList((prevList) => {
      const newList = prevList.map((p) => 
        p.id === targetProcess.id 
          ? { ...p, name: targetProcess.name, process: targetProcess } 
          : p
      );
      localStorage.setItem('flowgrid_projects', JSON.stringify(newList));
      return newList;
    });
  };

  // Project Actions
  const handleNewProcess = () => {
    const newId = `process-${Date.now()}`;
    const newModel: ProcessModel = {
      id: newId,
      name: 'Novo Processo de Trabalho',
      description: 'Escreva uma descrição detalhada para orientar a modelagem deste fluxo de valor.',
      version: 1,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      lanes: [
        {
          id: 'lane-1',
          name: 'Departamento Solicitante',
          description: 'Responsável pelo início e acompanhamento das requisições',
          color: '#3b82f6',
          height: 2,
        },
        {
          id: 'lane-2',
          name: 'Área de Análise / Aprovação',
          description: 'Responsável pela triagem técnica e decisão final',
          color: '#10b981',
          height: 2,
        },
      ],
      nodes: [
        {
          id: 'start-1',
          type: 'start-standard',
          title: 'Início',
          description: 'Ponto onde o fluxo de trabalho é disparado.',
          laneId: 'lane-1',
          row: 0,
          column: 0,
          inputs: [],
          outputs: [{ id: 'right', type: 'output' }],
          responsible: '',
          estimatedDuration: 'Imediato',
          systems: [],
          inputDocuments: [],
          outputDocuments: [],
        },
      ],
      connections: [],
    };

    setHistoryStack([]);
    setRedoStack([]);
    setProcess(newModel);
    
    setProjectsList((prev) => {
      const newList = [...prev, { id: newId, name: newModel.name, process: newModel }];
      localStorage.setItem('flowgrid_projects', JSON.stringify(newList));
      return newList;
    });
    localStorage.setItem('flowgrid_current_id', newId);
    setPanX(60);
    setPanY(60);
    setZoom(1.0);
  };

  const handleDuplicateProcess = () => {
    const newId = `process-dup-${Date.now()}`;
    const duplicated: ProcessModel = {
      ...process,
      id: newId,
      name: `${process.name} (Cópia)`,
    };

    setProjectsList((prev) => {
      const newList = [...prev, { id: newId, name: duplicated.name, process: duplicated }];
      localStorage.setItem('flowgrid_projects', JSON.stringify(newList));
      return newList;
    });
    localStorage.setItem('flowgrid_current_id', newId);
    setProcess(duplicated);
    setHistoryStack([]);
    setRedoStack([]);
  };

  const handleDeleteProcess = () => {
    if (projectsList.length <= 1) {
      setNotification({
        type: 'error',
        message: 'Não é possível deletar o único processo ativo. Crie um novo primeiro!',
      });
      return;
    }

    setConfirmDialog({
      isOpen: true,
      title: 'Excluir Processo Permanentemente',
      message: `Tem certeza de que deseja excluir permanentemente o processo "${process.name}"? Esta ação não pode ser desfeita.`,
      confirmText: 'Excluir Permanentemente',
      isDanger: true,
      onConfirm: () => {
        const remaining = projectsList.filter((p) => p.id !== process.id);
        setProjectsList(remaining);
        localStorage.setItem('flowgrid_projects', JSON.stringify(remaining));

        const nextProject = remaining[0];
        localStorage.setItem('flowgrid_current_id', nextProject.id);
        setProcess(nextProject.process);
        setHistoryStack([]);
        setRedoStack([]);
        setNotification({
          type: 'success',
          message: 'Processo excluído com sucesso.',
        });
      }
    });
  };

  const handleSelectProject = (id: string) => {
    const found = projectsList.find((p) => p.id === id);
    if (found) {
      setProcess(found.process);
      localStorage.setItem('flowgrid_current_id', id);
      setHistoryStack([]);
      setRedoStack([]);
      setSelectedNodeId(null);
      setSelectedConnectionId(null);
    }
  };

  const handleRenameProcess = (newName: string) => {
    updateProcessDirectly((prev) => ({
      ...prev,
      name: newName,
    }));
  };

  // Import / Export
  const handleImportJSON = (jsonString: string) => {
    try {
      const parsed = JSON.parse(jsonString);
      if (parsed && parsed.id && parsed.name && Array.isArray(parsed.lanes) && Array.isArray(parsed.nodes)) {
        // Success
        setHistoryStack([]);
        setRedoStack([]);
        setProcess(parsed);
        
        // Add to projects list
        setProjectsList((prev) => {
          const exists = prev.some((p) => p.id === parsed.id);
          let newList = [];
          if (exists) {
            newList = prev.map((p) => p.id === parsed.id ? { ...p, name: parsed.name, process: parsed } : p);
          } else {
            newList = [...prev, { id: parsed.id, name: parsed.name, process: parsed }];
          }
          localStorage.setItem('flowgrid_projects', JSON.stringify(newList));
          return newList;
        });
        localStorage.setItem('flowgrid_current_id', parsed.id);
        setNotification({
          type: 'success',
          message: 'Processo importado com sucesso!',
        });
      } else {
        setNotification({
          type: 'error',
          message: 'O arquivo JSON fornecido não possui o esquema de processo válido do BPMN FlowGrid.',
        });
      }
    } catch (e) {
      setNotification({
        type: 'error',
        message: 'Erro ao processar o arquivo JSON. Certifique-se de que é um JSON válido.',
      });
    }
  };

  const handleExportJSON = () => {
    const dataStr = JSON.stringify(process, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${process.name.toLowerCase().replace(/\s+/g, '_')}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handleExportMarkdown = () => {
    const docText = generateProcessMarkdown(process);
    const blob = new Blob([docText], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${process.name.toLowerCase().replace(/\s+/g, '_')}_documentacao.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handleExportBPMN = () => {
    const bpmnXml = exportToBPMN20(process);
    const blob = new Blob([bpmnXml], { type: 'application/xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${process.name.toLowerCase().replace(/\s+/g, '_')}.bpmn`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handleExportImage = (format: 'png' | 'svg') => {
    const workspaceEl = document.getElementById('flowgrid-workspace');
    if (!workspaceEl) {
      setNotification({
        type: 'error',
        message: 'Área de trabalho do diagrama não encontrada.',
      });
      return;
    }

    setNotification({
      type: 'info',
      message: 'Preparando a imagem do diagrama, por favor aguarde...',
    });

    // Calculate exact canvas dimensions based ONLY on columns and lanes with nodes/events
    const cellWidth = 200;
    const cellHeight = 110;

    const hasNodes = process.nodes.length > 0;
    const maxCol = hasNodes ? Math.max(...process.nodes.map((n) => n.column)) : 0;
    // We want to export from column 0 up to maxCol. Left offset is 288px.
    const totalWidth = 288 + (maxCol + 1) * cellWidth;

    // Calculate Lane positions dynamically
    let currentY = 0;
    const lanesWithY = process.lanes.map((lane, index) => {
      const startY = currentY;
      const heightPx = lane.height * cellHeight;
      currentY += heightPx;
      return { ...lane, startY, heightPx, index };
    });

    // Find the bottom of the last lane that has any node
    const activeLaneIds = new Set(process.nodes.map((n) => n.laneId));
    const activeLanes = lanesWithY.filter((l) => activeLaneIds.has(l.id));
    const maxActiveLaneIndex = activeLanes.length > 0 
      ? Math.max(...activeLanes.map((l) => l.index)) 
      : process.lanes.length - 1; // Default to all lanes if no nodes exist

    const lastActiveLane = lanesWithY.find((l) => l.index === maxActiveLaneIndex) || lanesWithY[lanesWithY.length - 1];
    const totalHeight = (lastActiveLane ? lastActiveLane.startY + lastActiveLane.heightPx : currentY) + 10;

    const filterFunc = (node: Node) => {
      if (node instanceof HTMLElement) {
        // Exclude reorder/action buttons, color pickers, coordinate labels, and connection ports/handles
        if (
          node.tagName === 'BUTTON' ||
          node.classList.contains('export-hide') ||
          node.title?.startsWith('Porta') ||
          node.classList.contains('cursor-row-resize') ||
          node.classList.contains('connection-draft-port')
        ) {
          return false;
        }
      }
      return true;
    };

    const options = {
      width: totalWidth,
      height: totalHeight,
      style: {
        transform: 'none',
        transformOrigin: '0 0',
      },
      backgroundColor: '#f8fafc',
      filter: filterFunc,
    };

    if (format === 'svg') {
      toSvg(workspaceEl, options)
        .then((dataUrl) => {
          const a = document.createElement('a');
          a.href = dataUrl;
          a.download = `${process.name.toLowerCase().replace(/\s+/g, '_')}_diagrama.svg`;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);

          setNotification({
            type: 'success',
            message: 'Diagrama exportado com sucesso em formato SVG!',
          });
        })
        .catch((error) => {
          console.error('Falha ao exportar diagrama para SVG', error);
          setNotification({
            type: 'error',
            message: 'Ocorreu um erro ao exportar o diagrama para SVG.',
          });
        });
    } else {
      toPng(workspaceEl, {
        ...options,
        pixelRatio: 2, // High resolution crisp rendering
      })
        .then((dataUrl) => {
          const a = document.createElement('a');
          a.href = dataUrl;
          a.download = `${process.name.toLowerCase().replace(/\s+/g, '_')}_diagrama.png`;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);

          setNotification({
            type: 'success',
            message: 'Diagrama exportado com sucesso em formato PNG!',
          });
        })
        .catch((error) => {
          console.error('Falha ao exportar diagrama para PNG', error);
          setNotification({
            type: 'error',
            message: 'Ocorreu um erro ao exportar o diagrama para PNG.',
          });
        });
    }
  };

  // Center workspace onto a specific node
  const handleCenterNode = (nodeId: string) => {
    const node = process.nodes.find((n) => n.id === nodeId);
    if (!node) return;

    // Determine Y start position of containing lane
    let laneY = 0;
    for (const lane of process.lanes) {
      if (lane.id === node.laneId) break;
      laneY += lane.height * 110;
    }

    const nodeX = node.column * 200 + (200 - 150) / 2 + 75; // center offset
    const nodeY = laneY + node.row * 110 + (110 - 65) / 2 + 32;

    const container = document.getElementById('flowgrid-canvas-container');
    if (container) {
      const rect = container.getBoundingClientRect();
      const width = rect.width || 800;
      const height = rect.height || 600;

      setPanX(width / 2 - nodeX * zoom);
      setPanY(height / 2 - nodeY * zoom);
    }

    setSelectedNodeId(nodeId);
    setSelectedConnectionId(null);
  };

  const handleSelectElementFromValidation = (id: string, type: 'node' | 'lane' | 'connection') => {
    if (type === 'node') {
      handleCenterNode(id);
    } else if (type === 'connection') {
      setSelectedConnectionId(id);
      setSelectedNodeId(null);
    }
  };

  // Calculate error counts
  const validationCount = {
    errors: validationErrors.filter(e => e.type === 'error').length,
    warnings: validationErrors.filter(e => e.type === 'warning').length,
    recommendations: validationErrors.filter(e => e.type === 'recommendation').length,
  };

  return (
    <div className="h-screen w-screen flex flex-col overflow-hidden bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-100 font-sans">
      
      {/* 1. Header Admin Bar */}
      <Topbar
        process={process}
        activeMode={activeMode}
        setActiveMode={setActiveMode}
        onSave={() => setNotification({ type: 'success', message: 'O processo foi salvo automaticamente em seu navegador!' })}
        onUndo={handleUndo}
        onRedo={handleRedo}
        canUndo={historyStack.length > 0}
        canRedo={redoStack.length > 0}
        onNewProcess={handleNewProcess}
        onDuplicateProcess={handleDuplicateProcess}
        onDeleteProcess={handleDeleteProcess}
        onImportJSON={handleImportJSON}
        onExportJSON={handleExportJSON}
        onExportMarkdown={handleExportMarkdown}
        onExportImage={handleExportImage}
        onExportBPMN={handleExportBPMN}
        zoom={zoom}
        setZoom={setZoom}
        onResetZoom={() => setZoom(1.0)}
        validationCount={validationCount}
        showValidationPanel={showValidationPanel}
        setShowValidationPanel={setShowValidationPanel}
        projectsList={projectsList}
        onSelectProject={handleSelectProject}
        onRenameProcess={handleRenameProcess}
      />

      {/* 2. Main Flex Container */}
      <div className="flex-1 flex overflow-hidden">
        
        {/* VIEW MODE: STANDARD / PRESENTATION / SIMULATION */}
        {activeMode !== 'documentation' ? (
          <>
            {/* Esquerda: Paleta de Blocos (Disponível apenas em modo Edição) */}
            {activeMode === 'edit' && (
              <Sidebar
                activeLoadedBlock={activeLoadedBlock}
                setActiveLoadedBlock={setActiveLoadedBlock}
              />
            )}

            {/* Centro: Tela de Desenho / Canvas */}
            <Canvas
              process={process}
              activeMode={activeMode}
              selectedNodeId={selectedNodeId}
              setSelectedNodeId={setSelectedNodeId}
              selectedConnectionId={selectedConnectionId}
              setSelectedConnectionId={setSelectedConnectionId}
              activeLoadedBlock={activeLoadedBlock}
              setActiveLoadedBlock={setActiveLoadedBlock}
              zoom={zoom}
              setZoom={setZoom}
              panX={panX}
              setPanX={setPanX}
              panY={panY}
              setPanY={setPanY}
              onUpdateProcess={updateProcessWithHistory}
              simulationStepId={simulationStepId}
            />

            {/* Direita: Propriedades / Validação / Simulação Panel Slots */}
            {activeMode !== 'presentation' && (
              <aside className="w-85 border-l border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 flex flex-col h-full shrink-0 z-20">
                {activeMode === 'edit' && (
                  showValidationPanel ? (
                    <ValidationPanel
                      errors={validationErrors}
                      onSelectElement={handleSelectElementFromValidation}
                    />
                  ) : (
                    <PropertiesPanel
                      process={process}
                      selectedNodeId={selectedNodeId}
                      selectedConnectionId={selectedConnectionId}
                      onUpdateProcess={updateProcessDirectly}
                      onDeleteNode={(id) => {
                        updateProcessWithHistory((prev) => ({
                          ...prev,
                          nodes: prev.nodes.filter((n) => n.id !== id),
                          connections: prev.connections.filter(
                            (c) => c.sourceNodeId !== id && c.targetNodeId !== id
                          ),
                        }));
                        setSelectedNodeId(null);
                      }}
                    />
                  )
                )}

                {activeMode === 'simulation' && (
                  <SimulationPanel
                    process={process}
                    simulationStepId={simulationStepId}
                    setSimulationStepId={setSimulationStepId}
                    onCenterNode={handleCenterNode}
                  />
                )}
              </aside>
            )}
          </>
        ) : (
          /* VIEW MODE: AUTOMATIC DOCUMENTATION PREVIEW */
          <div className="flex-1 overflow-hidden h-full">
            <DocumentationPanel
              process={process}
              onExportMarkdown={handleExportMarkdown}
            />
          </div>
        )}

      </div>

      {/* 3. Global Notification Toast */}
      {notification && (
        <div className="fixed bottom-6 left-6 z-50 flex items-center gap-2.5 px-4 py-3 rounded-lg shadow-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 animate-in fade-in slide-in-from-bottom-5 duration-200">
          {notification.type === 'success' ? (
            <div className="flex items-center justify-center w-5 h-5 rounded-full bg-emerald-100 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 text-xs font-bold">✓</div>
          ) : notification.type === 'error' ? (
            <div className="flex items-center justify-center w-5 h-5 rounded-full bg-red-100 dark:bg-red-950/50 text-red-600 dark:text-red-400 text-xs font-bold">✗</div>
          ) : (
            <div className="flex items-center justify-center w-5 h-5 rounded-full bg-blue-100 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 text-xs font-bold">i</div>
          )}
          <span className="text-sm font-medium text-slate-800 dark:text-slate-100">
            {notification.message}
          </span>
        </div>
      )}

      {/* 4. Global Confirmation Dialog */}
      {confirmDialog?.isOpen && (
        <div className="fixed inset-0 bg-slate-900/60 dark:bg-slate-950/80 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-900 rounded-xl shadow-2xl border border-slate-200 dark:border-slate-800 max-w-md w-full overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="p-6">
              <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 mb-2">
                {confirmDialog.title}
              </h3>
              <p className="text-sm text-slate-600 dark:text-slate-300">
                {confirmDialog.message}
              </p>
            </div>
            <div className="bg-slate-50 dark:bg-slate-800/50 px-6 py-4 flex items-center justify-end gap-3 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setConfirmDialog(null)}
                className="px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => {
                  confirmDialog.onConfirm();
                  setConfirmDialog(null);
                }}
                className={`px-4 py-2 text-sm font-medium text-white rounded-lg transition-colors shadow-xs ${
                  confirmDialog.isDanger 
                    ? 'bg-red-600 hover:bg-red-700' 
                    : 'bg-indigo-600 hover:bg-indigo-700'
                }`}
              >
                {confirmDialog.confirmText || 'Confirmar'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
