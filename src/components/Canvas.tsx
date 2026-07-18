import React, { useState, useRef, useEffect } from 'react';
import * as Icons from 'lucide-react';
import { ProcessModel, ProcessNode, ProcessConnection, LaneModel, EditorMode } from '../types';
import { BLOCK_DEFINITIONS, LANE_COLORS } from '../constants';
import { getNodePortCoordinates, computeOrthogonalPath } from '../utils/routing';

interface CanvasProps {
  process: ProcessModel;
  activeMode: EditorMode;
  selectedNodeId: string | null;
  setSelectedNodeId: (id: string | null) => void;
  selectedConnectionId: string | null;
  setSelectedConnectionId: (id: string | null) => void;
  activeLoadedBlock: string | null;
  setActiveLoadedBlock: (type: string | null) => void;
  zoom: number;
  setZoom: React.Dispatch<React.SetStateAction<number>>;
  onUpdateProcess: (updater: (prev: ProcessModel) => ProcessModel) => void;
  simulationStepId: string | null;
  panX: number;
  setPanX: React.Dispatch<React.SetStateAction<number>>;
  panY: number;
  setPanY: React.Dispatch<React.SetStateAction<number>>;
}

export default function Canvas({
  process,
  activeMode,
  selectedNodeId,
  setSelectedNodeId,
  selectedConnectionId,
  setSelectedConnectionId,
  activeLoadedBlock,
  setActiveLoadedBlock,
  zoom,
  setZoom,
  onUpdateProcess,
  simulationStepId,
  panX,
  setPanX,
  panY,
  setPanY,
}: CanvasProps) {
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });

  // Node movement drag state
  const [draggedNodeId, setDraggedNodeId] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [dragStartGrid, setDragStartGrid] = useState({ column: 0, row: 0, laneId: '' });

  // Connection dragging state
  const [drawingConnection, setDrawingConnection] = useState<{
    sourceNodeId: string;
    sourceConnectorId: 'left' | 'right' | 'top' | 'bottom';
    startX: number;
    startY: number;
    currentX: number;
    currentY: number;
  } | null>(null);

  // Swimlane vertical resizing state
  const [resizingLaneId, setResizingLaneId] = useState<string | null>(null);
  const [resizingStartHeight, setResizingStartHeight] = useState(0);
  const [resizingStartY, setResizingStartY] = useState(0);

  // Hover states
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);
  const [hoveredCell, setHoveredCell] = useState<{
    column: number;
    row: number;
    laneId: string;
    type: string;
  } | null>(null);

  // Custom Confirmation Dialog State
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
    confirmText?: string;
    cancelText?: string;
    isDanger?: boolean;
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {},
    confirmText: 'Confirmar',
    cancelText: 'Cancelar',
    isDanger: false,
  });

  const containerRef = useRef<HTMLDivElement>(null);
  const workspaceRef = useRef<HTMLDivElement>(null);

  // Cell metrics
  const cellWidth = 200;
  const cellHeight = 110;
  const nodeWidth = 150;
  const nodeHeight = 65;

  // Calculate Lane positions dynamically
  let currentY = 0;
  const laneYMap: Record<string, number> = {};
  const lanesWithY = process.lanes.map((lane, index) => {
    const startY = currentY;
    const heightPx = lane.height * cellHeight;
    currentY += heightPx;
    laneYMap[lane.id] = startY;
    return { ...lane, startY, heightPx, index };
  });
  const totalCanvasHeight = currentY;
  const maxColumns = Math.max(12, ...process.nodes.map(n => n.column + 2));
  const totalCanvasWidth = maxColumns * cellWidth;

  // Helper: Find Lane and relative grid coords from absolute mouse position
  const getGridCoordsFromCoords = (x: number, y: number) => {
    const relativeX = x - 288;
    const col = Math.floor(relativeX / cellWidth);
    
    // Find lane under Y
    let foundLaneId = process.lanes[0]?.id || '';
    let relativeRow = 0;

    for (const lane of lanesWithY) {
      if (y >= lane.startY && y < lane.startY + lane.heightPx) {
        foundLaneId = lane.id;
        relativeRow = Math.floor((y - lane.startY) / cellHeight);
        break;
      }
    }

    return { 
      column: Math.max(0, col), 
      row: Math.max(0, relativeRow), 
      laneId: foundLaneId 
    };
  };

  // Clear / Reset Current Workflow Flow
  const clearFlow = () => {
    if (activeMode !== 'edit') return;
    setConfirmDialog({
      isOpen: true,
      title: 'Limpar Área de Trabalho',
      message: 'Tem certeza de que deseja limpar todo o fluxo de trabalho atual? Isso excluirá todos os blocos e conexões nesta área de trabalho.',
      confirmText: 'Sim, Limpar Tudo',
      cancelText: 'Cancelar',
      isDanger: true,
      onConfirm: () => {
        onUpdateProcess((prev) => ({
          ...prev,
          nodes: [
            {
              id: `start-${Date.now()}`,
              type: 'start',
              title: 'Início',
              description: 'Ponto onde o fluxo de trabalho é disparado.',
              laneId: prev.lanes[0]?.id || 'lane-1',
              row: 0,
              column: 0,
              inputs: [],
              outputs: [{ id: 'right', type: 'output' }],
              responsible: '',
              estimatedDuration: 'Imediato',
              systems: [],
              inputDocuments: [],
              outputDocuments: [],
            }
          ],
          connections: [],
        }));
        setSelectedNodeId(null);
        setSelectedConnectionId(null);
      }
    });
  };

  // Pan Handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0 && e.button !== 1) return;

    const targetElement = e.target as HTMLElement;

    // Check if the user is clicking on something interactive
    const isInteractive = 
      targetElement.closest('button') || 
      targetElement.closest('input') || 
      targetElement.closest('textarea') || 
      targetElement.closest('select') ||
      targetElement.closest('.process-node') || 
      targetElement.closest('[title*="Porta"]') || 
      targetElement.closest('.lane-reorder-btn') ||
      targetElement.classList.contains('connection-path');

    if (e.button === 1 || (e.button === 0 && !isInteractive)) {
      setIsPanning(true);
      setPanStart({ x: e.clientX - panX, y: e.clientY - panY });
      e.preventDefault();
    }
  };

  // Global mouse event listeners for smooth panning, dragging and resizing anywhere on the screen
  useEffect(() => {
    if (!isPanning && !draggedNodeId && !drawingConnection && !resizingLaneId) return;

    const handleGlobalMouseMove = (e: MouseEvent) => {
      const container = containerRef.current;
      if (!container) return;

      if (isPanning) {
        setPanX(e.clientX - panStart.x);
        setPanY(e.clientY - panStart.y);
        return;
      }

      // Node dragging
      if (draggedNodeId) {
        const rect = container.getBoundingClientRect();
        const mouseX = (e.clientX - rect.left - panX) / zoom;
        const mouseY = (e.clientY - rect.top - panY) / zoom;

        const { column, row, laneId } = getGridCoordsFromCoords(mouseX, mouseY);

        // Snapping node in real-time
        onUpdateProcess((prev) => {
          const nodes = prev.nodes.map((n) => {
            if (n.id === draggedNodeId) {
              // Check boundary logic within that lane height
              const targetLane = prev.lanes.find(l => l.id === laneId);
              const maxRow = targetLane ? targetLane.height - 1 : 0;
              return {
                ...n,
                column,
                row: Math.min(maxRow, row),
                laneId,
              };
            }
            return n;
          });
          return { ...prev, nodes };
        });
        return;
      }

      // Connection dragging
      if (drawingConnection) {
        const rect = container.getBoundingClientRect();
        const mouseX = (e.clientX - rect.left - panX) / zoom;
        const mouseY = (e.clientY - rect.top - panY) / zoom;
        setDrawingConnection((prev) => prev ? { ...prev, currentX: mouseX - 288, currentY: mouseY } : null);
        return;
      }

      // Lane Resizing
      if (resizingLaneId) {
        const deltaY = e.clientY - resizingStartY;
        const deltaCells = Math.round(deltaY / cellHeight);
        const newHeight = Math.max(1, resizingStartHeight + deltaCells);

        onUpdateProcess((prev) => {
          const lanes = prev.lanes.map((l) => {
            if (l.id === resizingLaneId) {
              return { ...l, height: newHeight };
            }
            return l;
          });
          return { ...prev, lanes };
        });
      }
    };

    const handleGlobalMouseUp = (e: MouseEvent) => {
      setIsPanning(false);
      setDraggedNodeId(null);
      setResizingLaneId(null);

      if (drawingConnection) {
        setDrawingConnection(null);
      }
    };

    window.addEventListener('mousemove', handleGlobalMouseMove);
    window.addEventListener('mouseup', handleGlobalMouseUp);

    return () => {
      window.removeEventListener('mousemove', handleGlobalMouseMove);
      window.removeEventListener('mouseup', handleGlobalMouseUp);
    };
  }, [
    isPanning,
    panStart,
    draggedNodeId,
    drawingConnection,
    resizingLaneId,
    resizingStartY,
    resizingStartHeight,
    panX,
    panY,
    zoom,
  ]);

  const handleMouseMove = (e: React.MouseEvent) => {
    if (activeMode !== 'edit') return;
    if (activeLoadedBlock) {
      const container = containerRef.current;
      if (!container) return;

      const rect = container.getBoundingClientRect();
      const mouseX = (e.clientX - rect.left - panX) / zoom;
      const mouseY = (e.clientY - rect.top - panY) / zoom;

      const { column, row, laneId } = getGridCoordsFromCoords(mouseX, mouseY);
      setHoveredCell({ column, row, laneId, type: activeLoadedBlock });
    }
  };

  const handleMouseUp = (e: React.MouseEvent) => {
    // Handled globally for superior precision and smooth dragging
  };

  // Handle Drag & Drop HTML5 from sidebar
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';

    const type = (window as any).__draggingBlockType;
    if (!type) return;

    const container = containerRef.current;
    if (!container) return;

    const rect = container.getBoundingClientRect();
    const mouseX = (e.clientX - rect.left - panX) / zoom;
    const mouseY = (e.clientY - rect.top - panY) / zoom;

    const { column, row, laneId } = getGridCoordsFromCoords(mouseX, mouseY);
    setHoveredCell({ column, row, laneId, type });
  };

  const handleDragLeave = () => {
    setHoveredCell(null);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setHoveredCell(null);
    const type = e.dataTransfer.getData('bpmn/block-type') || (window as any).__draggingBlockType;
    (window as any).__draggingBlockType = null;

    const container = containerRef.current;
    if (!container || !type) return;

    const rect = container.getBoundingClientRect();
    const mouseX = (e.clientX - rect.left - panX) / zoom;
    const mouseY = (e.clientY - rect.top - panY) / zoom;

    const { column, row, laneId } = getGridCoordsFromCoords(mouseX, mouseY);
    addNodeAt(type, column, row, laneId);
  };

  // Canvas Click (Insert by Click-to-Place)
  const handleCanvasClick = (e: React.MouseEvent) => {
    if (activeMode !== 'edit') return;

    const container = containerRef.current;
    if (!container) return;

    const rect = container.getBoundingClientRect();
    const mouseX = (e.clientX - rect.left - panX) / zoom;
    const mouseY = (e.clientY - rect.top - panY) / zoom;

    const { column, row, laneId } = getGridCoordsFromCoords(mouseX, mouseY);

    if (activeLoadedBlock) {
      addNodeAt(activeLoadedBlock, column, row, laneId);
      setActiveLoadedBlock(null);
      setHoveredCell(null);
    } else {
      // Clear selections if clicked blank area
      const targetElement = e.target as HTMLElement;
      if (targetElement === containerRef.current || targetElement.id === 'flowgrid-workspace') {
        setSelectedNodeId(null);
        setSelectedConnectionId(null);
      }
    }
  };

  const addNodeAt = (type: string, column: number, row: number, laneId: string) => {
    const blockDef = BLOCK_DEFINITIONS.find((b) => b.type === type);
    if (!blockDef) return;

    // Check if cell is already occupied
    const isOccupied = process.nodes.some(
      (n) => n.laneId === laneId && n.row === row && n.column === column
    );
    if (isOccupied) return;

    const newNodeId = `node-${Date.now()}`;
    const newNode: ProcessNode = {
      id: newNodeId,
      type,
      title: blockDef.title,
      description: blockDef.description,
      laneId,
      row,
      column,
      inputs: blockDef.inputs.map((id) => ({ id, type: 'input' })),
      outputs: blockDef.outputs.map((id) => ({ id, type: 'output' })),
      responsible: '',
      estimatedDuration: '1 hora',
      systems: [],
      inputDocuments: [],
      outputDocuments: [],
    };

    // Calculate auto-connections for snapping/joints
    const autoConnections: ProcessConnection[] = [];

    // Left neighbor
    const leftNeighbor = process.nodes.find(
      (n) => n.laneId === laneId && n.column === column - 1 && n.row === row
    );
    if (leftNeighbor) {
      const leftHasRight = leftNeighbor.outputs.some((o) => o.id === 'right');
      const newHasLeft = newNode.inputs.some((i) => i.id === 'left');
      if (leftHasRight && newHasLeft) {
        autoConnections.push({
          id: `conn-auto-${Date.now()}-left`,
          sourceNodeId: leftNeighbor.id,
          sourceConnectorId: 'right',
          targetNodeId: newNodeId,
          targetConnectorId: 'left',
        });
      }
    }

    // Right neighbor
    const rightNeighbor = process.nodes.find(
      (n) => n.laneId === laneId && n.column === column + 1 && n.row === row
    );
    if (rightNeighbor) {
      const newHasRight = newNode.outputs.some((o) => o.id === 'right');
      const rightHasLeft = rightNeighbor.inputs.some((i) => i.id === 'left');
      if (newHasRight && rightHasLeft) {
        autoConnections.push({
          id: `conn-auto-${Date.now()}-right`,
          sourceNodeId: newNodeId,
          sourceConnectorId: 'right',
          targetNodeId: rightNeighbor.id,
          targetConnectorId: 'left',
        });
      }
    }

    // Top neighbor
    const topNeighbor = process.nodes.find(
      (n) => n.laneId === laneId && n.column === column && n.row === row - 1
    );
    if (topNeighbor) {
      const topHasBottom = topNeighbor.outputs.some((o) => o.id === 'bottom');
      const newHasTop = newNode.inputs.some((i) => i.id === 'top');
      if (topHasBottom && newHasTop) {
        autoConnections.push({
          id: `conn-auto-${Date.now()}-top`,
          sourceNodeId: topNeighbor.id,
          sourceConnectorId: 'bottom',
          targetNodeId: newNodeId,
          targetConnectorId: 'top',
        });
      }
    }

    // Bottom neighbor
    const bottomNeighbor = process.nodes.find(
      (n) => n.laneId === laneId && n.column === column && n.row === row + 1
    );
    if (bottomNeighbor) {
      const newHasBottom = newNode.outputs.some((o) => o.id === 'bottom');
      const bottomHasTop = bottomNeighbor.inputs.some((i) => i.id === 'top');
      if (newHasBottom && bottomHasTop) {
        autoConnections.push({
          id: `conn-auto-${Date.now()}-bottom`,
          sourceNodeId: newNodeId,
          sourceConnectorId: 'bottom',
          targetNodeId: bottomNeighbor.id,
          targetConnectorId: 'top',
        });
      }
    }

    onUpdateProcess((prev) => ({
      ...prev,
      nodes: [...prev.nodes, newNode],
      connections: [...prev.connections, ...autoConnections],
    }));
  };

  // Create Connection
  const handlePortMouseDown = (
    e: React.MouseEvent,
    nodeId: string,
    portId: 'left' | 'right' | 'top' | 'bottom',
    type: 'input' | 'output' | 'both'
  ) => {
    if (activeMode !== 'edit') return;
    e.stopPropagation();

    const node = process.nodes.find((n) => n.id === nodeId);
    if (!node) return;

    const laneStartY = laneYMap[node.laneId] || 0;
    const portCoords = getNodePortCoordinates(node.column, node.row, laneStartY, portId, node.type);

    setDrawingConnection({
      sourceNodeId: nodeId,
      sourceConnectorId: portId,
      startX: portCoords.x,
      startY: portCoords.y,
      currentX: portCoords.x,
      currentY: portCoords.y,
    });
  };

  const handlePortMouseUp = (
    e: React.MouseEvent,
    nodeId: string,
    portId: 'left' | 'right' | 'top' | 'bottom'
  ) => {
    if (activeMode !== 'edit') return;
    e.stopPropagation();

    if (drawingConnection) {
      const sourceId = drawingConnection.sourceNodeId;
      const sourcePort = drawingConnection.sourceConnectorId;

      // Prevent connecting to self
      if (sourceId === nodeId) {
        setDrawingConnection(null);
        return;
      }

      // Check if connection already exists
      const exists = process.connections.some(
        (c) =>
          c.sourceNodeId === sourceId &&
          c.sourceConnectorId === sourcePort &&
          c.targetNodeId === nodeId &&
          c.targetConnectorId === portId
      );

      if (!exists) {
        const newConn: ProcessConnection = {
          id: `conn-${Date.now()}`,
          sourceNodeId: sourceId,
          sourceConnectorId: sourcePort,
          targetNodeId: nodeId,
          targetConnectorId: portId,
        };

        onUpdateProcess((prev) => ({
          ...prev,
          connections: [...prev.connections, newConn],
        }));
      }

      setDrawingConnection(null);
    }
  };

  // Node Deletion, Duplication
  const deleteNode = (nodeId: string) => {
    // Check if node has connections
    const hasConns = process.connections.some(
      (c) => c.sourceNodeId === nodeId || c.targetNodeId === nodeId
    );

    const performDelete = () => {
      onUpdateProcess((prev) => ({
        ...prev,
        nodes: prev.nodes.filter((n) => n.id !== nodeId),
        connections: prev.connections.filter(
          (c) => c.sourceNodeId !== nodeId && c.targetNodeId !== nodeId
        ),
      }));

      if (selectedNodeId === nodeId) {
        setSelectedNodeId(null);
      }
    };

    if (hasConns) {
      setConfirmDialog({
        isOpen: true,
        title: 'Excluir Bloco',
        message: 'Este bloco possui conexões ativas. Deseja realmente excluí-lo e remover suas conexões?',
        confirmText: 'Excluir Bloco',
        cancelText: 'Cancelar',
        isDanger: true,
        onConfirm: performDelete,
      });
    } else {
      performDelete();
    }
  };

  const duplicateNode = (node: ProcessNode) => {
    // Find next empty column in the same row or row+1
    let col = node.column + 1;
    let isOccupied = process.nodes.some(
      (n) => n.laneId === node.laneId && n.row === node.row && n.column === col
    );

    while (isOccupied) {
      col++;
      isOccupied = process.nodes.some(
        (n) => n.laneId === node.laneId && n.row === node.row && n.column === col
      );
    }

    const duplicated: ProcessNode = {
      ...node,
      id: `node-dup-${Date.now()}`,
      column: col,
      title: `${node.title} (Cópia)`,
    };

    onUpdateProcess((prev) => ({
      ...prev,
      nodes: [...prev.nodes, duplicated],
    }));
  };

  // Lane sorting & additions
  const moveLane = (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= process.lanes.length) return;

    onUpdateProcess((prev) => {
      const list = [...prev.lanes];
      const temp = list[index];
      list[index] = list[targetIndex];
      list[targetIndex] = temp;
      return { ...prev, lanes: list };
    });
  };

  const deleteLane = (laneId: string) => {
    const laneNodes = process.nodes.filter((n) => n.laneId === laneId);

    const performDelete = () => {
      onUpdateProcess((prev) => ({
        ...prev,
        lanes: prev.lanes.filter((l) => l.id !== laneId),
        nodes: prev.nodes.filter((n) => n.laneId !== laneId),
        connections: prev.connections.filter(
          (c) => {
            const sourceNode = prev.nodes.find(n => n.id === c.sourceNodeId);
            const targetNode = prev.nodes.find(n => n.id === c.targetNodeId);
            return sourceNode?.laneId !== laneId && targetNode?.laneId !== laneId;
          }
        ),
      }));
    };

    if (laneNodes.length > 0) {
      setConfirmDialog({
        isOpen: true,
        title: 'Excluir Raia de Responsabilidade',
        message: 'A raia contém blocos de processo. Deseja realmente excluí-la junto com todos os seus blocos?',
        confirmText: 'Excluir Raia',
        cancelText: 'Cancelar',
        isDanger: true,
        onConfirm: performDelete,
      });
    } else {
      performDelete();
    }
  };

  const duplicateLane = (lane: LaneModel) => {
    const newId = `lane-dup-${Date.now()}`;
    const duplicated: LaneModel = {
      ...lane,
      id: newId,
      name: `${lane.name} (Cópia)`,
    };

    onUpdateProcess((prev) => ({
      ...prev,
      lanes: [...prev.lanes, duplicated],
    }));
  };

  const addLane = () => {
    const newLane: LaneModel = {
      id: `lane-${Date.now()}`,
      name: 'Nova Raia / Departamento',
      description: 'Descrição opcional da responsabilidade',
      color: '#38bdf8',
      height: 3,
    };

    onUpdateProcess((prev) => ({
      ...prev,
      lanes: [...prev.lanes, newLane],
    }));
  };

  // Keyboard controls listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (activeMode !== 'edit') return;
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      if (e.key === 'Escape') {
        if (activeLoadedBlock) {
          setActiveLoadedBlock(null);
          setHoveredCell(null);
        }
        setSelectedNodeId(null);
        setSelectedConnectionId(null);
        return;
      }

      const increment = e.shiftKey ? 2 : 1;

      if (selectedNodeId) {
        const node = process.nodes.find(n => n.id === selectedNodeId);
        if (!node) return;

        switch (e.key) {
          case 'Delete':
          case 'Backspace':
            deleteNode(selectedNodeId);
            break;
          case 'ArrowRight':
            onUpdateProcess(prev => ({
              ...prev,
              nodes: prev.nodes.map(n => n.id === selectedNodeId ? { ...n, column: n.column + increment } : n)
            }));
            break;
          case 'ArrowLeft':
            onUpdateProcess(prev => ({
              ...prev,
              nodes: prev.nodes.map(n => n.id === selectedNodeId ? { ...n, column: Math.max(0, n.column - increment) } : n)
            }));
            break;
          case 'ArrowDown': {
            const lane = process.lanes.find(l => l.id === node.laneId);
            const maxRow = lane ? lane.height - 1 : 10;
            onUpdateProcess(prev => ({
              ...prev,
              nodes: prev.nodes.map(n => n.id === selectedNodeId ? { ...n, row: Math.min(maxRow, n.row + increment) } : n)
            }));
            break;
          }
          case 'ArrowUp':
            onUpdateProcess(prev => ({
              ...prev,
              nodes: prev.nodes.map(n => n.id === selectedNodeId ? { ...n, row: Math.max(0, n.row - increment) } : n)
            }));
            break;
          case 'd':
          case 'D':
            if (e.ctrlKey || e.metaKey) {
              e.preventDefault();
              duplicateNode(node);
            }
            break;
          case 'Escape':
            setSelectedNodeId(null);
            break;
        }
      } else if (selectedConnectionId) {
        if (e.key === 'Delete' || e.key === 'Backspace') {
          onUpdateProcess(prev => ({
            ...prev,
            connections: prev.connections.filter(c => c.id !== selectedConnectionId)
          }));
          setSelectedConnectionId(null);
        } else if (e.key === 'Escape') {
          setSelectedConnectionId(null);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedNodeId, selectedConnectionId, process, activeMode, activeLoadedBlock, setActiveLoadedBlock]);

  return (
    <div 
      id="flowgrid-canvas-container"
      ref={containerRef}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onMouseLeave={handleDragLeave}
      onDrop={handleDrop}
      onClick={handleCanvasClick}
      className={`flex-1 relative overflow-hidden select-none bg-slate-50 dark:bg-slate-950 grid-canvas ${
        isPanning ? 'cursor-grabbing' : activeLoadedBlock ? 'cursor-cell' : 'cursor-grab'
      }`}
      style={{}}
    >
      {/* Real Workspace with Transform Matrix */}
      <div
        ref={workspaceRef}
        id="flowgrid-workspace"
        style={{
          transform: `translate(${panX}px, ${panY}px) scale(${zoom})`,
          transformOrigin: '0 0',
          width: `${totalCanvasWidth}px`,
          height: `${totalCanvasHeight}px`,
          backgroundImage: 'linear-gradient(to right, rgba(148, 163, 184, 0.1) 1px, transparent 1px), linear-gradient(to bottom, rgba(148, 163, 184, 0.1) 1px, transparent 1px)',
          backgroundSize: `${cellWidth}px ${cellHeight}px`,
          backgroundPosition: '288px 0px',
        }}
        className="absolute inset-0 pointer-events-none transition-transform duration-75"
      >
        <div className="relative w-full h-full pointer-events-auto">
          
          {/* 1. Raias (Swimlanes) Background Canvas */}
          {lanesWithY.map((lane) => (
            <div
              key={lane.id}
              style={{
                top: `${lane.startY}px`,
                height: `${lane.heightPx}px`,
                width: `${totalCanvasWidth}px`,
              }}
              className="absolute left-0 border-b border-slate-200 dark:border-slate-800 flex"
            >
              {/* Lane Left Header */}
              <div 
                style={{ backgroundColor: `${lane.color}15`, borderLeftColor: lane.color }}
                className="w-72 shrink-0 border-r border-slate-200 dark:border-slate-800 border-l-4 flex flex-col justify-between p-4 bg-white dark:bg-slate-950/60 sticky left-0 z-10"
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <input
                      type="text"
                      disabled={activeMode !== 'edit'}
                      value={lane.name}
                      onChange={(e) => {
                        const newName = e.target.value;
                        onUpdateProcess((prev) => ({
                          ...prev,
                          lanes: prev.lanes.map((l) => l.id === lane.id ? { ...l, name: newName } : l),
                        }));
                      }}
                      className="font-semibold text-slate-800 dark:text-slate-100 text-sm bg-transparent border-b border-transparent hover:border-slate-300 dark:hover:border-slate-700 focus:border-indigo-500 focus:bg-white dark:focus:bg-slate-900 focus:outline-hidden rounded-sm px-1 py-0.5 w-full"
                    />
                    
                    {/* Lane Reorder / Edit Buttons */}
                    {activeMode === 'edit' && (
                      <div className="flex items-center gap-0.5 shrink-0 opacity-0 group-hover:opacity-100 focus-within:opacity-100 hover:opacity-100 transition-opacity export-hide">
                        <button
                          onClick={() => moveLane(lane.index, 'up')}
                          disabled={lane.index === 0}
                          className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-sm disabled:opacity-30"
                          title="Mover para cima"
                        >
                          <Icons.ChevronUp size={12} />
                        </button>
                        <button
                          onClick={() => moveLane(lane.index, 'down')}
                          disabled={lane.index === process.lanes.length - 1}
                          className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-sm disabled:opacity-30"
                          title="Mover para baixo"
                        >
                          <Icons.ChevronDown size={12} />
                        </button>
                        <button
                          onClick={() => duplicateLane(lane)}
                          className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-sm"
                          title="Duplicar raia"
                        >
                          <Icons.Copy size={11} />
                        </button>
                        <button
                          onClick={() => deleteLane(lane.id)}
                          className="p-1 hover:bg-red-50 dark:hover:bg-red-950/20 text-slate-400 hover:text-red-500 dark:hover:text-red-400 rounded-sm"
                          title="Excluir raia"
                        >
                          <Icons.Trash2 size={11} />
                        </button>
                      </div>
                    )}
                  </div>

                  <textarea
                    disabled={activeMode !== 'edit'}
                    value={lane.description || ''}
                    onChange={(e) => {
                      const newDesc = e.target.value;
                      onUpdateProcess((prev) => ({
                        ...prev,
                        lanes: prev.lanes.map((l) => l.id === lane.id ? { ...l, description: newDesc } : l),
                      }));
                    }}
                    placeholder="Descrição da responsabilidade..."
                    className="text-[10px] text-slate-400 dark:text-slate-500 bg-transparent hover:border-slate-300 dark:hover:border-slate-700 focus:bg-white dark:focus:bg-slate-900 border border-transparent focus:outline-hidden rounded-sm px-1 py-0.5 mt-1 w-full resize-none h-12"
                  />
                </div>

                {/* Color picker circle */}
                {activeMode === 'edit' && (
                  <div className="flex items-center gap-1.5 mt-2 export-hide">
                    {LANE_COLORS.map((col) => (
                      <button
                        key={col.value}
                        onClick={() => {
                          onUpdateProcess((prev) => ({
                            ...prev,
                            lanes: prev.lanes.map((l) => l.id === lane.id ? { ...l, color: col.value } : l),
                          }));
                        }}
                        style={{ backgroundColor: col.value }}
                        className={`w-4.5 h-4.5 rounded-full border-2 transition-all ${
                          lane.color === col.value 
                            ? 'border-slate-800 dark:border-white scale-110 shadow-xs' 
                            : 'border-transparent hover:scale-105'
                        }`}
                        title={col.name}
                      ></button>
                    ))}
                  </div>
                )}
              </div>

              {/* Lane Columns Grid cells */}
              <div className="flex-1 flex relative">
                {Array.from({ length: maxColumns }).map((_, colIdx) => (
                  <div
                    key={colIdx}
                    style={{ width: `${cellWidth}px` }}
                    className="h-full border-r border-slate-200/50 dark:border-slate-800/50 shrink-0 flex flex-col relative"
                  >
                    {Array.from({ length: lane.height }).map((_, rowIdx) => (
                      <div
                        key={rowIdx}
                        style={{ height: `${cellHeight}px` }}
                        className="w-full border-b border-slate-100/70 dark:border-slate-900/40 last:border-b-0 relative flex items-center justify-center shrink-0"
                      >
                        {/* Elegant grid cell slot for block nesting */}
                        <div className="absolute inset-1.5 rounded-xl border border-slate-200/60 bg-slate-100/40 shadow-[inset_0_2px_4px_rgba(0,0,0,0.06)] pointer-events-none" />
                        
                        {/* Coordinate Helper label on edit mode */}
                        {activeMode === 'edit' && (
                          <span className="absolute bottom-1 right-2.5 text-[8px] font-mono text-slate-400/75 select-none tracking-wider uppercase font-bold export-hide">
                            C{colIdx} R{rowIdx}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                ))}

                {/* Swimlane Resize vertical Handle */}
                {activeMode === 'edit' && (
                  <div
                    onMouseDown={(e) => {
                      e.stopPropagation();
                      setResizingLaneId(lane.id);
                      setResizingStartHeight(lane.height);
                      setResizingStartY(e.clientY);
                    }}
                    className="absolute bottom-0 left-72 right-0 h-2 bg-transparent hover:bg-indigo-500/30 cursor-row-resize z-20 transition-colors"
                  ></div>
                )}
              </div>
            </div>
          ))}

          {/* Columns Grid Offset Wrapper for SVG, Nodes and Previews */}
          <div className="absolute left-72 top-0 right-0 bottom-0 pointer-events-none z-15">
            {/* 2. Svg Canvas Layer for connections */}
            <svg
              style={{ width: `${totalCanvasWidth - 288}px`, height: `${totalCanvasHeight}px` }}
              className="absolute inset-0 pointer-events-none"
            >
            <defs>
              <marker
                id="arrow"
                viewBox="0 0 10 10"
                refX="8"
                refY="5"
                markerWidth="6"
                markerHeight="6"
                orient="auto-start-reverse"
              >
                <path d="M 0 1 L 10 5 L 0 9 z" fill="#64748b" />
              </marker>
              <marker
                id="arrow-selected"
                viewBox="0 0 10 10"
                refX="8"
                refY="5"
                markerWidth="6"
                markerHeight="6"
                orient="auto-start-reverse"
              >
                <path d="M 0 1 L 10 5 L 0 9 z" fill="#4f46e5" />
              </marker>
              <marker
                id="arrow-simulation"
                viewBox="0 0 10 10"
                refX="8"
                refY="5"
                markerWidth="8"
                markerHeight="8"
                orient="auto-start-reverse"
              >
                <path d="M 0 1 L 10 5 L 0 9 z" fill="#10b981" />
              </marker>
            </defs>

            {/* Existing Connections */}
            {process.connections.map((conn) => {
              const srcNode = process.nodes.find((n) => n.id === conn.sourceNodeId);
              const tgtNode = process.nodes.find((n) => n.id === conn.targetNodeId);
              if (!srcNode || !tgtNode) return null;

              const srcLaneStartY = laneYMap[srcNode.laneId] || 0;
              const tgtLaneStartY = laneYMap[tgtNode.laneId] || 0;

              const p1 = getNodePortCoordinates(srcNode.column, srcNode.row, srcLaneStartY, conn.sourceConnectorId, srcNode.type);
              const p2 = getNodePortCoordinates(tgtNode.column, tgtNode.row, tgtLaneStartY, conn.targetConnectorId, tgtNode.type);

              const pathString = computeOrthogonalPath(p1, conn.sourceConnectorId, p2, conn.targetConnectorId);
              
              const isSelected = selectedConnectionId === conn.id;
              
              // Highlight connection during execution simulation
              const isSimulatingActive = activeMode === 'simulation' && (simulationStepId === conn.sourceNodeId);

              return (
                <g key={conn.id} className="pointer-events-auto group">
                  <path
                    d={pathString}
                    fill="none"
                    stroke={isSelected ? '#4f46e5' : isSimulatingActive ? '#10b981' : '#64748b'}
                    strokeWidth={isSelected ? 3.5 : isSimulatingActive ? 3.5 : 2}
                    markerEnd={`url(#${isSelected ? 'arrow-selected' : isSimulatingActive ? 'arrow-simulation' : 'arrow'})`}
                    className="cursor-pointer transition-colors"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedConnectionId(conn.id);
                      setSelectedNodeId(null);
                    }}
                  />
                  {/* Invisible thicker path to make hovering/clicking connections easy */}
                  <path
                    d={pathString}
                    fill="none"
                    stroke="transparent"
                    strokeWidth={15}
                    className="cursor-pointer"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedConnectionId(conn.id);
                      setSelectedNodeId(null);
                    }}
                  />

                  {/* Render conditional label on the path if registered */}
                  {conn.label && (
                    <foreignObject
                      x={(p1.x + p2.x) / 2 - 40}
                      y={(p1.y + p2.y) / 2 - 10}
                      width="90"
                      height="24"
                      className="pointer-events-none"
                    >
                      <div className="bg-white/90 dark:bg-slate-900/90 backdrop-blur-xs border border-slate-200 dark:border-slate-800 px-1 py-0.5 rounded-sm shadow-xs text-[9px] font-semibold text-center text-slate-600 dark:text-slate-400 truncate">
                        {conn.label}
                      </div>
                    </foreignObject>
                  )}
                </g>
              );
            })}

            {/* Current Active drawing connection path preview */}
            {drawingConnection && (
              <path
                d={`M ${drawingConnection.startX} ${drawingConnection.startY} L ${drawingConnection.currentX} ${drawingConnection.currentY}`}
                fill="none"
                stroke="#6366f1"
                strokeWidth={2}
                strokeDasharray="4 4"
                markerEnd="url(#arrow-selected)"
              />
            )}

            {/* Auto-connection snap previews */}
            {hoveredCell && (() => {
              const isOccupied = process.nodes.some(
                (n) => n.laneId === hoveredCell.laneId && n.row === hoveredCell.row && n.column === hoveredCell.column
              );
              if (isOccupied) return null;

              const paths: React.ReactNode[] = [];
              const laneStartY = laneYMap[hoveredCell.laneId] || 0;

              // 1. Left neighbor
              const leftNeighbor = process.nodes.find(
                (n) => n.laneId === hoveredCell.laneId && n.column === hoveredCell.column - 1 && n.row === hoveredCell.row
              );
              if (leftNeighbor) {
                const p1 = getNodePortCoordinates(leftNeighbor.column, leftNeighbor.row, laneYMap[leftNeighbor.laneId] || 0, 'right', leftNeighbor.type);
                const p2 = getNodePortCoordinates(hoveredCell.column, hoveredCell.row, laneStartY, 'left', hoveredCell.type);
                const d = computeOrthogonalPath(p1, 'right', p2, 'left');
                paths.push(
                  <path
                    key="auto-conn-left"
                    d={d}
                    fill="none"
                    stroke="#4f46e5"
                    strokeWidth={2.5}
                    strokeDasharray="5 5"
                    className="animate-pulse opacity-85"
                    markerEnd="url(#arrow-selected)"
                  />
                );
              }

              // 2. Right neighbor
              const rightNeighbor = process.nodes.find(
                (n) => n.laneId === hoveredCell.laneId && n.column === hoveredCell.column + 1 && n.row === hoveredCell.row
              );
              if (rightNeighbor) {
                const p1 = getNodePortCoordinates(hoveredCell.column, hoveredCell.row, laneStartY, 'right', hoveredCell.type);
                const p2 = getNodePortCoordinates(rightNeighbor.column, rightNeighbor.row, laneYMap[rightNeighbor.laneId] || 0, 'left', rightNeighbor.type);
                const d = computeOrthogonalPath(p1, 'right', p2, 'left');
                paths.push(
                  <path
                    key="auto-conn-right"
                    d={d}
                    fill="none"
                    stroke="#4f46e5"
                    strokeWidth={2.5}
                    strokeDasharray="5 5"
                    className="animate-pulse opacity-85"
                    markerEnd="url(#arrow-selected)"
                  />
                );
              }

              // 3. Top neighbor
              const topNeighbor = process.nodes.find(
                (n) => n.laneId === hoveredCell.laneId && n.column === hoveredCell.column && n.row === hoveredCell.row - 1
              );
              if (topNeighbor) {
                const p1 = getNodePortCoordinates(topNeighbor.column, topNeighbor.row, laneYMap[topNeighbor.laneId] || 0, 'bottom', topNeighbor.type);
                const p2 = getNodePortCoordinates(hoveredCell.column, hoveredCell.row, laneStartY, 'top', hoveredCell.type);
                const d = computeOrthogonalPath(p1, 'bottom', p2, 'top');
                paths.push(
                  <path
                    key="auto-conn-top"
                    d={d}
                    fill="none"
                    stroke="#4f46e5"
                    strokeWidth={2.5}
                    strokeDasharray="5 5"
                    className="animate-pulse opacity-85"
                    markerEnd="url(#arrow-selected)"
                  />
                );
              }

              // 4. Bottom neighbor
              const bottomNeighbor = process.nodes.find(
                (n) => n.laneId === hoveredCell.laneId && n.column === hoveredCell.column && n.row === hoveredCell.row + 1
              );
              if (bottomNeighbor) {
                const p1 = getNodePortCoordinates(hoveredCell.column, hoveredCell.row, laneStartY, 'bottom', hoveredCell.type);
                const p2 = getNodePortCoordinates(bottomNeighbor.column, bottomNeighbor.row, laneYMap[bottomNeighbor.laneId] || 0, 'top', bottomNeighbor.type);
                const d = computeOrthogonalPath(p1, 'bottom', p2, 'top');
                paths.push(
                  <path
                    key="auto-conn-bottom"
                    d={d}
                    fill="none"
                    stroke="#4f46e5"
                    strokeWidth={2.5}
                    strokeDasharray="5 5"
                    className="animate-pulse opacity-85"
                    markerEnd="url(#arrow-selected)"
                  />
                );
              }

              return <>{paths}</>;
            })()}
          </svg>

          {/* 3. Blocos (Nodes) Layer */}
          {process.nodes.map((node) => {
            const laneStartY = laneYMap[node.laneId] || 0;

            const isSelected = selectedNodeId === node.id;
            const isCurrentSim = activeMode === 'simulation' && simulationStepId === node.id;

            // Find visual block type config
            const bDef = BLOCK_DEFINITIONS.find((b) => b.type === node.type);
            const iconName = bDef?.icon || 'HelpCircle';
            const IconComponent = (Icons as any)[iconName] || Icons.HelpCircle;

            // Category color classes
            const isEvent = node.type.startsWith('start') || node.type.startsWith('end') || node.type === 'intermediate' || node.type === 'timer';
            const isDecision = ['decision-exclusive', 'decision-parallel', 'decision-inclusive', 'condition-simple', 'approval-rejection', 'yes-no'].includes(node.type);
            const isAux = ['doc', 'form', 'note', 'external-system', 'database', 'link'].includes(node.type);
            const isDragged = draggedNodeId === node.id;

            // Coordinate calculations: shift events & decisions upwards to prevent label overlapping cell bottom
            const finalWidth = isEvent || isDecision ? 60 : nodeWidth;
            const finalHeight = isEvent || isDecision ? 60 : nodeHeight;
            const leftPos = isEvent || isDecision 
              ? node.column * cellWidth + (cellWidth - 60) / 2
              : node.column * cellWidth + (cellWidth - nodeWidth) / 2;
            const topPos = isEvent || isDecision
              ? laneStartY + node.row * cellHeight + 18
              : laneStartY + node.row * cellHeight + (cellHeight - nodeHeight) / 2;

            let nodeClass = '';
            if (isEvent) {
              nodeClass = 'border border-emerald-400 bg-gradient-to-b from-emerald-50 to-emerald-100 text-emerald-900 rounded-full border-b-4 border-b-emerald-600 shadow-[0_4px_6px_rgba(16,185,129,0.18),0_1px_1px_rgba(255,255,255,0.7)_inset] h-15 w-15';
            } else if (isDecision) {
              nodeClass = 'h-15 w-15';
            } else if (isAux) {
              nodeClass = 'border border-purple-300 bg-gradient-to-b from-purple-50 to-purple-100 text-purple-900 rounded-xl border-b-4 border-b-purple-500 shadow-[0_4px_6px_rgba(168,85,247,0.18),0_1px_1px_rgba(255,255,255,0.7)_inset]';
            } else {
              // Standard Activity
              nodeClass = 'border border-sky-300 bg-gradient-to-b from-sky-50 to-sky-100 text-sky-900 rounded-xl border-b-4 border-b-sky-500 shadow-[0_4px_6px_rgba(14,165,233,0.18),0_1px_1px_rgba(255,255,255,0.7)_inset]';
            }

            return (
              <React.Fragment key={node.id}>
                <div
                  onMouseEnter={() => setHoveredNodeId(node.id)}
                  onMouseLeave={() => setHoveredNodeId(null)}
                  style={{
                    left: `${leftPos}px`,
                    top: `${topPos}px`,
                    width: `${finalWidth}px`,
                    height: `${finalHeight}px`,
                  }}
                  className={`absolute pointer-events-auto flex items-center justify-center p-2.5 text-center cursor-pointer select-none transition-all process-node duration-200 ${nodeClass} ${
                    isDragged
                      ? 'z-40 scale-106 rotate-2 -translate-y-2.5 shadow-[0_16px_32px_rgba(0,0,0,0.16)] ring-2 ring-indigo-500/40 cursor-grabbing'
                      : isSelected && !isDecision
                        ? 'ring-3 ring-indigo-500/50 border-indigo-500 scale-102 shadow-[0_6px_12px_rgba(99,102,241,0.22)] translate-y-[-1px] border-b-3' 
                        : `hover:scale-102 hover:translate-y-[-2px] ${isDecision ? '' : 'hover:shadow-md'}`
                  } ${isCurrentSim && !isDecision ? 'ring-4 ring-emerald-500/60 border-emerald-500 animate-pulse bg-emerald-100 text-emerald-900' : ''}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedNodeId(node.id);
                    setSelectedConnectionId(null);
                  }}
                  onMouseDown={(e) => {
                    if (activeMode !== 'edit') return;
                    if (e.target instanceof HTMLButtonElement) return;
                    e.stopPropagation();
                    setDraggedNodeId(node.id);
                    setDragStartGrid({ column: node.column, row: node.row, laneId: node.laneId });
                  }}
                >
                  {/* Inner Diamond Shape for decision blocks */}
                  {isDecision && (
                    <div
                      style={{
                        width: '42.4px',
                        height: '42.4px',
                        left: '8.8px',
                        top: '8.8px',
                      }}
                      className={`absolute rotate-45 border border-amber-400 bg-gradient-to-br from-amber-50 to-amber-100 text-amber-900 border-b-4 border-b-amber-600 border-r-4 border-r-amber-600/70 shadow-[0_4px_6px_rgba(245,158,11,0.2),0_1px_1px_rgba(255,255,255,0.7)_inset] rounded-[3px] transition-all duration-200 ${
                        isSelected
                          ? 'ring-3 ring-indigo-500/50 border-indigo-500 shadow-[0_6px_12px_rgba(99,102,241,0.22)]'
                          : ''
                      } ${
                        isCurrentSim
                          ? 'ring-4 ring-emerald-500/60 border-emerald-500 bg-emerald-100 text-emerald-900'
                          : ''
                      }`}
                    />
                  )}

                  {/* Visual Details based on type */}
                  <div className="flex flex-col items-center justify-center w-full h-full z-10 relative pointer-events-none">
                    <div className="flex items-center gap-1.5">
                      <IconComponent size={isEvent || isDecision ? 20 : 16} className="shrink-0 opacity-90 text-slate-800" />
                      {!isEvent && !isDecision && (
                        <span className="text-[11px] font-bold truncate max-w-[110px] text-slate-900">
                          {node.title}
                        </span>
                      )}
                    </div>
                    {!isEvent && !isDecision && node.responsible && (
                      <span className="text-[8.5px] font-mono mt-1 text-slate-600 font-semibold truncate max-w-[120px] uppercase tracking-wider">
                        {node.responsible}
                      </span>
                    )}
                  </div>

                  {/* Hover Ports Circles: Handles connection drafting */}
                  {activeMode === 'edit' && hoveredNodeId === node.id && (
                    <>
                      {/* Left Port */}
                      <div
                        onMouseDown={(e) => handlePortMouseDown(e, node.id, 'left', 'both')}
                        onMouseUp={(e) => handlePortMouseUp(e, node.id, 'left')}
                        style={{
                          left: '-6px',
                          top: '50%',
                          transform: 'translateY(-50%)',
                        }}
                        className="absolute w-3 h-3 rounded-full bg-indigo-500 border-2 border-white hover:scale-125 hover:bg-indigo-600 transition-transform cursor-crosshair z-30 pointer-events-auto"
                        title="Porta Esquerda"
                      />
                      {/* Right Port */}
                      <div
                        onMouseDown={(e) => handlePortMouseDown(e, node.id, 'right', 'both')}
                        onMouseUp={(e) => handlePortMouseUp(e, node.id, 'right')}
                        style={{
                          right: '-6px',
                          top: '50%',
                          transform: 'translateY(-50%)',
                        }}
                        className="absolute w-3 h-3 rounded-full bg-indigo-500 border-2 border-white hover:scale-125 hover:bg-indigo-600 transition-transform cursor-crosshair z-30 pointer-events-auto"
                        title="Porta Direita"
                      />
                      {/* Top Port */}
                      <div
                        onMouseDown={(e) => handlePortMouseDown(e, node.id, 'top', 'both')}
                        onMouseUp={(e) => handlePortMouseUp(e, node.id, 'top')}
                        style={{
                          left: '50%',
                          top: '-6px',
                          transform: 'translateX(-50%)',
                        }}
                        className="absolute w-3 h-3 rounded-full bg-indigo-500 border-2 border-white hover:scale-125 hover:bg-indigo-600 transition-transform cursor-crosshair z-30 pointer-events-auto"
                        title="Porta Superior"
                      />
                      {/* Bottom Port */}
                      <div
                        onMouseDown={(e) => handlePortMouseDown(e, node.id, 'bottom', 'both')}
                        onMouseUp={(e) => handlePortMouseUp(e, node.id, 'bottom')}
                        style={{
                          left: '50%',
                          bottom: '-6px',
                          transform: 'translateX(-50%)',
                        }}
                        className="absolute w-3 h-3 rounded-full bg-indigo-500 border-2 border-white hover:scale-125 hover:bg-indigo-600 transition-transform cursor-crosshair z-30 pointer-events-auto"
                        title="Porta Inferior"
                      />
                    </>
                  )}
                </div>

                {/* Event / Decision text label beneath element, upright sibling */}
                {(isEvent || isDecision) && (
                  <div
                    style={{
                      left: `${leftPos + 30}px`,
                      top: `${topPos + 60}px`,
                    }}
                    className="absolute -translate-x-1/2 mt-1 w-32 text-center pointer-events-none z-20"
                  >
                    <span className="text-[10px] font-extrabold text-slate-800 leading-none block truncate bg-white/95 px-1.5 py-0.5 rounded shadow border border-slate-200/80">
                      {node.title}
                    </span>
                  </div>
                )}
              </React.Fragment>
            );
          })}

          {/* Ghost / Hover Preview Block for Snapping */}
          {hoveredCell && (() => {
            const isOccupied = process.nodes.some(
              (n) => n.laneId === hoveredCell.laneId && n.row === hoveredCell.row && n.column === hoveredCell.column
            );
            if (isOccupied) return null;

            const bDef = BLOCK_DEFINITIONS.find((b) => b.type === hoveredCell.type);
            if (!bDef) return null;

            const laneStartY = laneYMap[hoveredCell.laneId] || 0;

            const iconName = bDef.icon || 'HelpCircle';
            const IconComponent = (Icons as any)[iconName] || Icons.HelpCircle;

            const isEvent = bDef.category === 'event';
            const isDecision = bDef.category === 'decision';
            const isAux = bDef.category === 'auxiliary';

            // Coordinate calculations: shift events & decisions upwards to prevent label overlapping cell bottom
            const finalWidth = isEvent || isDecision ? 60 : nodeWidth;
            const finalHeight = isEvent || isDecision ? 60 : nodeHeight;
            const leftPos = isEvent || isDecision 
              ? hoveredCell.column * cellWidth + (cellWidth - 60) / 2
              : hoveredCell.column * cellWidth + (cellWidth - nodeWidth) / 2;
            const topPos = isEvent || isDecision
              ? laneStartY + hoveredCell.row * cellHeight + 18
              : laneStartY + hoveredCell.row * cellHeight + (cellHeight - nodeHeight) / 2;

            let previewClass = '';
            if (isEvent) {
              previewClass = 'border-2 border-dashed border-emerald-500 bg-emerald-50/40 text-emerald-800 rounded-full h-15 w-15 shadow-inner animate-pulse';
            } else if (isDecision) {
              previewClass = 'h-15 w-15';
            } else if (isAux) {
              previewClass = 'border-2 border-dashed border-purple-400 bg-purple-50/40 text-purple-800 rounded-xl shadow-inner animate-pulse';
            } else {
              previewClass = 'border-2 border-dashed border-sky-400 bg-sky-50/40 text-sky-800 rounded-xl shadow-inner animate-pulse';
            }

            return (
              <React.Fragment key="preview">
                <div
                  style={{
                    left: `${leftPos}px`,
                    top: `${topPos}px`,
                    width: `${finalWidth}px`,
                    height: `${finalHeight}px`,
                  }}
                  className={`absolute flex flex-col items-center justify-center p-2.5 text-center pointer-events-none select-none transition-all duration-100 z-30 ${previewClass}`}
                >
                  {/* Inner Diamond Shape for decision previews */}
                  {isDecision && (
                    <div
                      style={{
                        width: '42.4px',
                        height: '42.4px',
                        left: '8.8px',
                        top: '8.8px',
                      }}
                      className="absolute rotate-45 border-2 border-dashed border-amber-500 bg-amber-50/40 text-amber-800 rounded-[3px] shadow-inner animate-pulse"
                    />
                  )}

                  <div className="flex flex-col items-center justify-center w-full h-full z-10 relative pointer-events-none">
                    <div className="flex items-center gap-1.5 opacity-60">
                      <IconComponent size={isEvent || isDecision ? 20 : 16} className="shrink-0" />
                      {!isEvent && !isDecision && (
                        <span className="text-[11px] font-bold truncate max-w-[110px]">
                          {bDef.title}
                        </span>
                      )}
                    </div>
                    {!isEvent && !isDecision && (
                      <span className="text-[8px] font-mono mt-1 text-slate-500 font-semibold uppercase tracking-wider">
                        Encaixar aqui
                      </span>
                    )}
                  </div>
                </div>

                {/* Event / Decision text label beneath element, upright sibling */}
                {(isEvent || isDecision) && (
                  <div
                    style={{
                      left: `${leftPos + 30}px`,
                      top: `${topPos + 60}px`,
                    }}
                    className="absolute -translate-x-1/2 mt-1 w-32 text-center pointer-events-none z-20"
                  >
                    <span className="text-[9px] font-extrabold text-slate-600 leading-none block truncate bg-white/90 px-1.5 py-0.5 rounded shadow border border-slate-200/50">
                      {bDef.title}
                    </span>
                  </div>
                )}
              </React.Fragment>
            );
          })()}

          </div>

        </div>
      </div>

      {/* Floating Canvas UI Controls */}
      <div className="absolute bottom-6 right-6 flex items-center gap-2 z-20">
        {activeMode === 'edit' && (
          <button
            id="btn-clear-flow"
            onClick={(e) => {
              e.stopPropagation();
              clearFlow();
            }}
            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-red-500 hover:text-red-600 dark:text-red-400 dark:hover:text-red-350 p-3.5 rounded-full shadow-lg hover:bg-red-50 dark:hover:bg-red-950/20 flex items-center justify-center transition-all active:scale-95 animate-in fade-in zoom-in duration-200"
            title="Limpar Área de Trabalho (Excluir todos os blocos)"
          >
            <Icons.Trash2 size={16} />
          </button>
        )}

        <button
          id="btn-add-lane"
          onClick={(e) => {
            e.stopPropagation();
            addLane();
          }}
          className="bg-indigo-600 hover:bg-indigo-700 text-white p-3.5 rounded-full shadow-lg hover:shadow-indigo-600/20 flex items-center justify-center transition-all active:scale-95"
          title="Adicionar Raia de Responsabilidade"
        >
          <Icons.FolderPlus size={18} />
        </button>

        <button
          id="btn-center-view"
          onClick={(e) => {
            e.stopPropagation();
            setPanX(50);
            setPanY(50);
            setZoom(1.0);
          }}
          className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 p-3.5 rounded-full shadow-lg hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center justify-center transition-all active:scale-95"
          title="Centralizar Visualização"
        >
          <Icons.Maximize2 size={16} />
        </button>
      </div>

      {/* Custom Confirmation Modal */}
      {confirmDialog.isOpen && (
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
                onClick={() => setConfirmDialog(prev => ({ ...prev, isOpen: false }))}
                className="px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
              >
                {confirmDialog.cancelText || 'Cancelar'}
              </button>
              <button
                type="button"
                onClick={() => {
                  confirmDialog.onConfirm();
                  setConfirmDialog(prev => ({ ...prev, isOpen: false }));
                }}
                className={`px-4 py-2 text-sm font-medium text-white rounded-lg transition-colors shadow-xs ${
                  confirmDialog.isDanger 
                    ? 'bg-red-600 hover:bg-red-700 focus:ring-red-500' 
                    : 'bg-indigo-600 hover:bg-indigo-700 focus:ring-indigo-500'
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
