import React, { useState } from 'react';
import { 
  Play, Save, Plus, Copy, Trash2, Download, Upload, 
  Undo2, Redo2, Eye, FileText, PlayCircle, ShieldAlert, 
  AlertCircle, CheckCircle2, ChevronDown, ZoomIn, ZoomOut, Maximize2, Sparkles, FileSpreadsheet
} from 'lucide-react';
import { ProcessModel, EditorMode } from '../types';

interface TopbarProps {
  process: ProcessModel;
  activeMode: EditorMode;
  setActiveMode: (mode: EditorMode) => void;
  onSave: () => void;
  onUndo: () => void;
  onRedo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  onNewProcess: () => void;
  onDuplicateProcess: () => void;
  onDeleteProcess: () => void;
  onImportJSON: (json: string) => void;
  onExportJSON: () => void;
  onExportMarkdown: () => void;
  onExportImage: (format: 'png' | 'svg') => void;
  onExportBPMN: () => void;
  zoom: number;
  setZoom: (z: number | ((prev: number) => number)) => void;
  onResetZoom: () => void;
  validationCount: { errors: number; warnings: number; recommendations: number };
  showValidationPanel: boolean;
  setShowValidationPanel: (show: boolean) => void;
  projectsList: { id: string; name: string }[];
  onSelectProject: (id: string) => void;
  onRenameProcess: (name: string) => void;
}

export default function Topbar({
  process,
  activeMode,
  setActiveMode,
  onSave,
  onUndo,
  onRedo,
  canUndo,
  canRedo,
  onNewProcess,
  onDuplicateProcess,
  onDeleteProcess,
  onImportJSON,
  onExportJSON,
  onExportMarkdown,
  onExportImage,
  onExportBPMN,
  zoom,
  setZoom,
  onResetZoom,
  validationCount,
  showValidationPanel,
  setShowValidationPanel,
  projectsList,
  onSelectProject,
  onRenameProcess,
}: TopbarProps) {
  const [showProjectsDropdown, setShowProjectsDropdown] = useState(false);
  const [showExportDropdown, setShowExportDropdown] = useState(false);
  const [isRenaming, setIsRenaming] = useState(false);
  const [tempName, setTempName] = useState(process.name);

  const handleRenameSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (tempName.trim()) {
      onRenameProcess(tempName);
      setIsRenaming(false);
    }
  };

  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const text = event.target?.result as string;
        onImportJSON(text);
      };
      reader.readAsText(file);
    }
  };

  return (
    <header className="h-16 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 flex items-center justify-between px-6 shrink-0 shadow-xs z-30">
      {/* Esquerda: Titulo e Seletor de Projetos */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-indigo-600 rounded-lg text-white">
            <Sparkles size={18} className="animate-pulse" />
          </div>
          <span className="font-semibold text-slate-800 dark:text-slate-100 hidden sm:inline text-sm md:text-base">
            BPMN FlowGrid
          </span>
        </div>

        <div className="h-6 w-px bg-slate-200 dark:bg-slate-800 hidden sm:block"></div>

        {/* Nome do Processo Editável */}
        <div className="relative">
          {isRenaming ? (
            <form onSubmit={handleRenameSubmit} className="flex items-center gap-1">
              <input
                type="text"
                value={tempName}
                onChange={(e) => setTempName(e.target.value)}
                autoFocus
                onBlur={() => {
                  setTimeout(() => setIsRenaming(false), 200);
                }}
                className="px-2 py-1 text-sm border border-indigo-500 rounded-md focus:outline-hidden focus:ring-1 focus:ring-indigo-500 dark:bg-slate-900 dark:border-slate-700 dark:text-slate-100 font-medium"
              />
            </form>
          ) : (
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  setTempName(process.name);
                  setIsRenaming(true);
                }}
                className="font-medium text-slate-800 dark:text-slate-200 text-sm hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors text-left max-w-44 md:max-w-64 truncate"
                title="Clique para renomear"
              >
                {process.name}
              </button>
              
              {/* Dropdown de Processos Recentes */}
              <div className="relative">
                <button 
                  onClick={() => setShowProjectsDropdown(!showProjectsDropdown)}
                  className="p-1 hover:bg-slate-100 dark:hover:bg-slate-900 rounded-md text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 transition-colors"
                >
                  <ChevronDown size={14} />
                </button>

                {showProjectsDropdown && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setShowProjectsDropdown(false)}></div>
                    <div className="absolute top-full left-0 mt-2 w-64 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-lg z-50 py-2">
                      <div className="px-3 py-1.5 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                        Processos Salvos
                      </div>
                      <div className="max-h-48 overflow-y-auto mt-1">
                        {projectsList.map((proj) => (
                          <button
                            key={proj.id}
                            onClick={() => {
                              onSelectProject(proj.id);
                              setShowProjectsDropdown(false);
                            }}
                            className={`w-full text-left px-4 py-2 text-sm transition-colors flex items-center justify-between ${
                              proj.id === process.id 
                                ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-400 font-medium' 
                                : 'text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/50'
                            }`}
                          >
                            <span className="truncate pr-2">{proj.name}</span>
                            {proj.id === process.id && <CheckCircle2 size={12} className="shrink-0" />}
                          </button>
                        ))}
                      </div>
                      <div className="border-t border-slate-100 dark:border-slate-800 mt-2 pt-2 px-2 flex flex-col gap-1">
                        <button
                          onClick={() => {
                            onNewProcess();
                            setShowProjectsDropdown(false);
                          }}
                          className="w-full flex items-center gap-2 px-2 py-1.5 text-xs text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 rounded-lg font-medium transition-colors"
                        >
                          <Plus size={14} /> Novo Processo
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Meio: Seleção de Modos de Visualização */}
      <div className="bg-slate-100 dark:bg-slate-900 p-0.5 rounded-xl hidden md:flex items-center gap-0.5">
        <button
          onClick={() => setActiveMode('edit')}
          className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-all ${
            activeMode === 'edit'
              ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-sm'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
          }`}
        >
          <Save size={13} />
          Edição
        </button>
        <button
          onClick={() => setActiveMode('presentation')}
          className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-all ${
            activeMode === 'presentation'
              ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-sm'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
          }`}
        >
          <Eye size={13} />
          Apresentação
        </button>
        <button
          onClick={() => setActiveMode('simulation')}
          className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-all ${
            activeMode === 'simulation'
              ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-sm'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
          }`}
        >
          <PlayCircle size={13} />
          Simulação
        </button>
        <button
          onClick={() => setActiveMode('documentation')}
          className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-all ${
            activeMode === 'documentation'
              ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-sm'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
          }`}
        >
          <FileText size={13} />
          Documentação
        </button>
      </div>

      {/* Direita: Ações, Desfazer, Validação e Exportação */}
      <div className="flex items-center gap-2 md:gap-3">
        {/* Undo/Redo */}
        <div className="flex items-center gap-0.5 bg-slate-100 dark:bg-slate-900 p-0.5 rounded-lg">
          <button
            onClick={onUndo}
            disabled={!canUndo}
            title="Desfazer (Ctrl+Z)"
            className={`p-1.5 rounded-md transition-colors ${
              canUndo
                ? 'text-slate-700 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-800'
                : 'text-slate-300 dark:text-slate-700 cursor-not-allowed'
            }`}
          >
            <Undo2 size={14} />
          </button>
          <button
            onClick={onRedo}
            disabled={!canRedo}
            title="Refazer (Ctrl+Shift+Z)"
            className={`p-1.5 rounded-md transition-colors ${
              canRedo
                ? 'text-slate-700 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-800'
                : 'text-slate-300 dark:text-slate-700 cursor-not-allowed'
            }`}
          >
            <Redo2 size={14} />
          </button>
        </div>

        {/* Zoom Controls */}
        <div className="hidden lg:flex items-center gap-0.5 bg-slate-100 dark:bg-slate-900 p-0.5 rounded-lg">
          <button
            onClick={() => setZoom(z => Math.max(0.4, z - 0.1))}
            title="Reduzir Zoom (-)"
            className="p-1.5 rounded-md text-slate-700 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-800"
          >
            <ZoomOut size={14} />
          </button>
          <button
            onClick={onResetZoom}
            title="Resetar Zoom"
            className="px-2 py-0.5 text-[10px] font-mono text-slate-600 dark:text-slate-400 hover:bg-white dark:hover:bg-slate-800 rounded-md transition-colors"
          >
            {Math.round(zoom * 100)}%
          </button>
          <button
            onClick={() => setZoom(z => Math.min(2.0, z + 0.1))}
            title="Ampliar Zoom (+)"
            className="p-1.5 rounded-md text-slate-700 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-800"
          >
            <ZoomIn size={14} />
          </button>
        </div>

        {/* Validação */}
        <button
          onClick={() => setShowValidationPanel(!showValidationPanel)}
          className={`relative p-2 rounded-xl transition-all flex items-center gap-1 text-xs font-medium ${
            showValidationPanel
              ? 'bg-amber-500/10 border border-amber-500/30 text-amber-600 dark:text-amber-400'
              : 'hover:bg-slate-100 dark:hover:bg-slate-900 text-slate-600 dark:text-slate-400 border border-transparent'
          }`}
          title="Ver painel de validação"
        >
          {validationCount.errors > 0 ? (
            <ShieldAlert size={16} className="text-red-500 animate-bounce" />
          ) : validationCount.warnings > 0 ? (
            <AlertCircle size={16} className="text-amber-500" />
          ) : (
            <CheckCircle2 size={16} className="text-emerald-500" />
          )}
          <span className="hidden sm:inline">Validação</span>
          {(validationCount.errors > 0 || validationCount.warnings > 0) && (
            <span className="bg-red-500 dark:bg-red-600 text-white rounded-full px-1.5 py-0.5 text-[9px] font-bold">
              {validationCount.errors + validationCount.warnings}
            </span>
          )}
        </button>

        {/* Ações Rápidas de Projeto (Duplicar, Novo, Deletar) */}
        <div className="flex items-center gap-1 border-l border-slate-200 dark:border-slate-800 pl-2">
          <button
            onClick={onDuplicateProcess}
            title="Duplicar Processo"
            className="p-2 hover:bg-slate-100 dark:hover:bg-slate-900 rounded-xl text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 transition-colors"
          >
            <Copy size={15} />
          </button>
          <button
            onClick={onDeleteProcess}
            title="Excluir Processo"
            className="p-2 hover:bg-red-50 dark:hover:bg-red-950/20 rounded-xl text-slate-500 hover:text-red-600 dark:text-slate-400 dark:hover:text-red-400 transition-colors"
          >
            <Trash2 size={15} />
          </button>
        </div>

        {/* Exportação & Importação */}
        <div className="relative">
          <button
            onClick={() => setShowExportDropdown(!showExportDropdown)}
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-md shadow-indigo-600/10 hover:shadow-indigo-600/20 active:scale-98 transition-all"
          >
            <Download size={14} />
            Compartilhar / Exportar
          </button>

          {showExportDropdown && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setShowExportDropdown(false)}></div>
              <div className="absolute right-0 top-full mt-2 w-56 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-lg z-50 py-2">
                <div className="px-3 py-1.5 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  Importação
                </div>
                <button
                  onClick={() => {
                    handleImportClick();
                    setShowExportDropdown(false);
                  }}
                  className="w-full text-left px-4 py-2 text-xs text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/50 flex items-center gap-2 transition-colors"
                >
                  <Upload size={14} className="text-slate-400" />
                  Importar JSON (.json)
                </button>
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  accept=".json"
                  className="hidden"
                />

                <div className="h-px bg-slate-100 dark:bg-slate-800 my-2"></div>
                <div className="px-3 py-1.5 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  Formatos de Arquivo
                </div>
                <button
                  onClick={() => {
                    onExportJSON();
                    setShowExportDropdown(false);
                  }}
                  className="w-full text-left px-4 py-2 text-xs text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/50 flex items-center gap-2 transition-colors"
                >
                  <Download size={14} className="text-indigo-500" />
                  Exportar JSON (.json)
                </button>
                <button
                  onClick={() => {
                    onExportMarkdown();
                    setShowExportDropdown(false);
                  }}
                  className="w-full text-left px-4 py-2 text-xs text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/50 flex items-center gap-2 transition-colors"
                >
                  <FileText size={14} className="text-emerald-500" />
                  Relatório Markdown (.md)
                </button>
                <button
                  onClick={() => {
                    onExportBPMN();
                    setShowExportDropdown(false);
                  }}
                  className="w-full text-left px-4 py-2 text-xs text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/50 flex items-center gap-2 transition-colors"
                >
                  <FileSpreadsheet size={14} className="text-blue-500" />
                  BPMN 2.0 XML (.bpmn)
                </button>

                <div className="h-px bg-slate-100 dark:bg-slate-800 my-2"></div>
                <div className="px-3 py-1.5 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  Imagem / Diagrama
                </div>
                <button
                  onClick={() => {
                    onExportImage('svg');
                    setShowExportDropdown(false);
                  }}
                  className="w-full text-left px-4 py-2 text-xs text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/50 flex items-center gap-2 transition-colors"
                >
                  <Download size={14} className="text-pink-500" />
                  Salvar Vetor SVG (.svg)
                </button>
                <button
                  onClick={() => {
                    onExportImage('png');
                    setShowExportDropdown(false);
                  }}
                  className="w-full text-left px-4 py-2 text-xs text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/50 flex items-center gap-2 transition-colors"
                >
                  <Download size={14} className="text-orange-500" />
                  Imagem Raster PNG (.png)
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
