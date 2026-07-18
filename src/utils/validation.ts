import { ProcessModel, ValidationError, ProcessNode, ProcessConnection } from '../types';

export function validateProcess(process: ProcessModel): ValidationError[] {
  const errors: ValidationError[] = [];
  const nodes = process.nodes;
  const connections = process.connections;
  const lanes = process.lanes;

  const nodeMap = new Map<string, ProcessNode>();
  nodes.forEach(n => nodeMap.set(n.id, n));

  // 1. Verificação de Eventos de Início e Término
  const startNodes = nodes.filter(n => n.type.startsWith('start'));
  const endNodes = nodes.filter(n => n.type.startsWith('end'));

  if (startNodes.length === 0) {
    errors.push({
      id: 'err-no-start',
      type: 'error',
      message: 'O processo não possui nenhum evento de Início.',
    });
  }

  if (endNodes.length === 0) {
    errors.push({
      id: 'err-no-end',
      type: 'error',
      message: 'O processo não possui nenhum evento de Término.',
    });
  }

  // 2. Linhas (Raias) sem identificação ou vazias
  lanes.forEach(lane => {
    if (!lane.name || lane.name.trim() === '' || lane.name === 'Nova Raia') {
      errors.push({
        id: `warn-lane-name-${lane.id}`,
        type: 'warning',
        message: `A raia com ID "${lane.id}" não está identificada (nome vazio ou padrão).`,
        elementId: lane.id,
        elementType: 'lane',
      });
    }

    const laneNodes = nodes.filter(n => n.laneId === lane.id);
    if (laneNodes.length === 0) {
      errors.push({
        id: `rec-lane-empty-${lane.id}`,
        type: 'recommendation',
        message: `A raia "${lane.name || lane.id}" está vazia. Considere removê-la para simplificar o diagrama.`,
        elementId: lane.id,
        elementType: 'lane',
      });
    }
  });

  // 3. Blocos sobrepostos (ocupando a mesma posição de grade col/row na mesma raia)
  const positionMap = new Map<string, ProcessNode[]>();
  nodes.forEach(node => {
    const key = `${node.laneId}-${node.row}-${node.column}`;
    if (!positionMap.has(key)) {
      positionMap.set(key, []);
    }
    positionMap.get(key)!.push(node);
  });

  positionMap.forEach((overlappingNodes, key) => {
    if (overlappingNodes.length > 1) {
      const titles = overlappingNodes.map(n => `"${n.title}"`).join(' e ');
      errors.push({
        id: `err-overlap-${key}`,
        type: 'error',
        message: `Os blocos ${titles} estão sobrepostos na mesma célula da grade. Mova um deles.`,
        elementId: overlappingNodes[0].id,
        elementType: 'node',
      });
    }
  });

  // 4. Conexões sem destino válido ou sem origem válida
  connections.forEach(conn => {
    const sourceExists = nodeMap.has(conn.sourceNodeId);
    const targetExists = nodeMap.has(conn.targetNodeId);

    if (!sourceExists) {
      errors.push({
        id: `err-conn-source-${conn.id}`,
        type: 'error',
        message: `Conexão "${conn.label || conn.id}" refere-se a uma origem inexistente.`,
        elementId: conn.id,
        elementType: 'connection',
      });
    }
    if (!targetExists) {
      errors.push({
        id: `err-conn-target-${conn.id}`,
        type: 'error',
        message: `Conexão "${conn.label || conn.id}" refere-se a um destino inexistente.`,
        elementId: conn.id,
        elementType: 'connection',
      });
    }
  });

  // 5. Blocos desconectados, decisões com poucas saídas, atividades sem responsável
  nodes.forEach(node => {
    const incoming = connections.filter(c => c.targetNodeId === node.id);
    const outgoing = connections.filter(c => c.sourceNodeId === node.id);

    const isStart = node.type.startsWith('start');
    const isEnd = node.type.startsWith('end');
    const isAux = ['doc', 'form', 'note', 'external-system', 'database', 'link'].includes(node.type);

    // Blocos totalmente desconectados (exceto se for auxiliar avulso, que é permitido mas gera recomendação)
    if (incoming.length === 0 && outgoing.length === 0) {
      errors.push({
        id: `warn-disconnected-${node.id}`,
        type: isAux ? 'recommendation' : 'warning',
        message: `O bloco "${node.title}" está totalmente desconectado do fluxo.`,
        elementId: node.id,
        elementType: 'node',
      });
    } else {
      // Entradas/Saídas faltantes para elementos operacionais
      if (!isStart && !isAux && incoming.length === 0) {
        errors.push({
          id: `warn-no-incoming-${node.id}`,
          type: 'warning',
          message: `O bloco "${node.title}" não recebe nenhuma conexão de entrada (fluxo inacessível).`,
          elementId: node.id,
          elementType: 'node',
        });
      }
      if (!isEnd && !isAux && outgoing.length === 0) {
        errors.push({
          id: `warn-no-outgoing-${node.id}`,
          type: 'warning',
          message: `O bloco "${node.title}" não possui conexões de saída (fluxo interrompido de forma abrupta).`,
          elementId: node.id,
          elementType: 'node',
        });
      }
    }

    // Decisões sem condições ou com apenas uma saída
    const isDecision = ['decision-exclusive', 'decision-parallel', 'decision-inclusive', 'condition-simple', 'approval-rejection', 'yes-no'].includes(node.type);
    if (isDecision) {
      if (outgoing.length === 1) {
        errors.push({
          id: `warn-decision-one-out-${node.id}`,
          type: 'warning',
          message: `O desvio de decisão "${node.title}" possui apenas 1 caminho de saída. Deveria bifurcar o fluxo.`,
          elementId: node.id,
          elementType: 'node',
        });
      } else if (outgoing.length > 1) {
        // Verificar se há condições descritas nas conexões
        const missingLabels = outgoing.filter(c => !c.label || c.label.trim() === '');
        if (missingLabels.length > 0) {
          errors.push({
            id: `rec-decision-missing-label-${node.id}`,
            type: 'recommendation',
            message: `A decisão "${node.title}" possui saídas sem rótulo/condição descrita (ex: "Sim", "Não").`,
            elementId: node.id,
            elementType: 'node',
          });
        }
      }
    }

    // Atividades operacionais sem executor/responsável
    const isActivity = ['task', 'task-manual', 'task-user', 'task-auto', 'document-send', 'document-recv', 'analysis', 'approval', 'confer', 'sign', 'notify', 'subprocess'].includes(node.type);
    if (isActivity) {
      if (!node.responsible || node.responsible.trim() === '') {
        errors.push({
          id: `rec-no-resp-${node.id}`,
          type: 'recommendation',
          message: `A atividade "${node.title}" não tem um executor/responsável definido.`,
          elementId: node.id,
          elementType: 'node',
        });
      }
    }
  });

  // 6. Inacessibilidade de elementos a partir do início (DFS)
  if (startNodes.length > 0) {
    const visited = new Set<string>();
    const queue: string[] = startNodes.map(n => n.id);

    // Adicionar os starts ao conjunto visitado inicialmente
    startNodes.forEach(n => visited.add(n.id));

    while (queue.length > 0) {
      const currentId = queue.shift()!;
      // Encontrar vizinhos de saída
      const outgoingConns = connections.filter(c => c.sourceNodeId === currentId);
      outgoingConns.forEach(conn => {
        if (nodeMap.has(conn.targetNodeId) && !visited.has(conn.targetNodeId)) {
          visited.add(conn.targetNodeId);
          queue.push(conn.targetNodeId);
        }
      });
    }

    // Todos os nós operacionais que não foram visitados estão inacessíveis
    nodes.forEach(node => {
      const isAux = ['doc', 'form', 'note', 'external-system', 'database', 'link'].includes(node.type);
      if (!visited.has(node.id) && !isAux) {
        errors.push({
          id: `warn-unreachable-${node.id}`,
          type: 'warning',
          message: `O bloco "${node.title}" está inacessível a partir dos pontos de início do fluxo.`,
          elementId: node.id,
          elementType: 'node',
        });
      }
    });
  }

  // 7. Retornos e Loops potencialmente infinitos
  // Um loop é detectado se houver caminho de volta. Recomendamos apenas atenção visual.
  let hasLoop = false;
  connections.forEach(conn => {
    const src = nodeMap.get(conn.sourceNodeId);
    const tgt = nodeMap.get(conn.targetNodeId);
    if (src && tgt && src.column >= tgt.column) {
      hasLoop = true;
    }
  });

  if (hasLoop) {
    errors.push({
      id: 'rec-loop-detected',
      type: 'recommendation',
      message: 'Foram detectadas conexões de retorno (loops) no fluxo. Certifique-se de que as regras de saída do loop estão claras para evitar repetições infinitas.',
    });
  }

  return errors;
}
