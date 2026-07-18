export interface LaneModel {
  id: string;
  name: string;
  description?: string;
  color: string;
  isCollapsed?: boolean;
  height: number; // Height in grid cells (each cell is e.g. 80px)
}

export interface ConnectorPoint {
  id: 'left' | 'right' | 'top' | 'bottom';
  type: 'input' | 'output' | 'both';
}

export interface ProcessNode {
  id: string;
  type: string; // e.g., 'start', 'start-message', 'start-timer', 'end', 'end-message', 'task', 'task-manual', 'task-user', 'task-auto', 'document-send', 'document-recv', 'analysis', 'approval', 'confer', 'sign', 'notify', 'subprocess', 'decision-exclusive', 'decision-parallel', 'decision-inclusive', 'condition-simple', 'approval-rejection', 'yes-no', 'doc', 'form', 'note', 'external-system', 'database', 'link', 'marker', 'grouping', 'connector', 'return-conn'
  title: string;
  description?: string;
  laneId: string;
  row: number;    // Absolute grid row index or relative inside lane
  column: number; // Absolute grid column index
  width?: number; // width in grid cells (default 1)
  height?: number; // height in grid cells (default 1)
  inputs: ConnectorPoint[];
  outputs: ConnectorPoint[];
  responsible?: string;
  estimatedDuration?: string;
  priority?: 'Baixa' | 'Média' | 'Alta';
  systems?: string[];
  inputDocuments?: string[];
  outputDocuments?: string[];
  instructions?: string;
  startCondition?: string;
  expectedResult?: string;
  color?: string;
  externalLinks?: string[];
  subProcessFlow?: ProcessModel; // Flow for subprocess type
}

export interface ConnectionPathPoint {
  x: number;
  y: number;
}

export interface ProcessConnection {
  id: string;
  sourceNodeId: string;
  sourceConnectorId: 'left' | 'right' | 'top' | 'bottom';
  targetNodeId: string;
  targetConnectorId: 'left' | 'right' | 'top' | 'bottom';
  label?: string;
  condition?: string;
  path?: ConnectionPathPoint[];
}

export interface ProcessModel {
  id: string;
  name: string;
  description?: string;
  version: number;
  lanes: LaneModel[];
  nodes: ProcessNode[];
  connections: ProcessConnection[];
  createdAt: string;
  updatedAt: string;
}

export interface ValidationError {
  id: string;
  type: 'error' | 'warning' | 'recommendation';
  message: string;
  elementId?: string;
  elementType?: 'node' | 'lane' | 'connection';
}

export interface HistoryState {
  past: Omit<ProcessModel, 'id' | 'createdAt' | 'updatedAt'>[];
  future: Omit<ProcessModel, 'id' | 'createdAt' | 'updatedAt'>[];
}

export type EditorMode = 'edit' | 'presentation' | 'simulation' | 'documentation';

export interface BlockTypeDefinition {
  type: string;
  category: 'event' | 'activity' | 'decision' | 'auxiliary';
  title: string;
  description: string;
  icon: string; // lucide icon name
  inputs: ('left' | 'right' | 'top' | 'bottom')[];
  outputs: ('left' | 'right' | 'top' | 'bottom')[];
}
