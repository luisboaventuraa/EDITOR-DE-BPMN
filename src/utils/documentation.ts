import { ProcessModel, ProcessNode } from '../types';

export function generateProcessMarkdown(process: ProcessModel): string {
  const nodes = process.nodes;
  const connections = process.connections;
  const lanes = process.lanes;

  // Map of nodes
  const nodeMap = new Map<string, ProcessNode>();
  nodes.forEach(n => nodeMap.set(n.id, n));

  // Extract metadata lists
  const responsibles = Array.from(new Set(
    nodes.map(n => n.responsible).filter((r): r is string => !!r && r.trim() !== '')
  ));

  const systems = Array.from(new Set(
    nodes.flatMap(n => n.systems || []).filter(s => !!s && s.trim() !== '')
  ));

  const inputDocs = Array.from(new Set(
    nodes.flatMap(n => n.inputDocuments || []).filter(d => !!d && d.trim() !== '')
  ));

  const outputDocs = Array.from(new Set(
    nodes.flatMap(n => n.outputDocuments || []).filter(d => !!d && d.trim() !== '')
  ));

  // Determine starting and ending events
  const starts = nodes.filter(n => n.type.startsWith('start'));
  const ends = nodes.filter(n => n.type.startsWith('end'));

  // Logical step tracing (BFS starting from starts)
  const stepSequence: string[] = [];
  const visited = new Set<string>();
  const queue: string[] = starts.map(n => n.id);
  starts.forEach(n => visited.add(n.id));

  let stepCount = 1;
  while (queue.length > 0) {
    const currentId = queue.shift()!;
    const node = nodeMap.get(currentId);
    if (!node) continue;

    const lane = lanes.find(l => l.id === node.laneId);
    const incomingConns = connections.filter(c => c.targetNodeId === node.id);
    const outgoingConns = connections.filter(c => c.sourceNodeId === node.id);

    let stepDoc = `### Passo ${stepCount++}: ${node.title}\n`;
    stepDoc += `- **Tipo**: ${getNodeTypeLabel(node.type)}\n`;
    if (lane) {
      stepDoc += `- **Raia (Responsabilidade)**: **${lane.name}**\n`;
    }
    if (node.responsible) {
      stepDoc += `- **Executor**: ${node.responsible}\n`;
    }
    if (node.estimatedDuration) {
      stepDoc += `- **Prazo Estimado**: ${node.estimatedDuration}\n`;
    }
    if (node.description) {
      stepDoc += `- **Descrição**: ${node.description}\n`;
    }
    if (node.systems && node.systems.length > 0) {
      stepDoc += `- **Sistemas**: ${node.systems.join(', ')}\n`;
    }
    if (node.inputDocuments && node.inputDocuments.length > 0) {
      stepDoc += `- **Documentos de Entrada**: ${node.inputDocuments.join(', ')}\n`;
    }
    if (node.outputDocuments && node.outputDocuments.length > 0) {
      stepDoc += `- **Documentos de Saída**: ${node.outputDocuments.join(', ')}\n`;
    }
    if (node.instructions) {
      stepDoc += `- **Instruções de Execução**: *${node.instructions}*\n`;
    }

    // Branching logic description
    if (outgoingConns.length > 0) {
      stepDoc += `- **Próximos Passos (Ramificações)**:\n`;
      outgoingConns.forEach(conn => {
        const target = nodeMap.get(conn.targetNodeId);
        if (target) {
          const condText = conn.label ? ` se [**${conn.label}**]` : '';
          stepDoc += `  - Segue para **"${target.title}"**${condText} (Conexão: ${conn.sourceConnectorId} → ${conn.targetConnectorId})\n`;
        }
      });
    } else {
      stepDoc += `- **Próximos Passos**: *Este é um ponto de encerramento do fluxo.*\n`;
    }

    stepSequence.push(stepDoc);

    // Queue unvisited targets
    outgoingConns.forEach(conn => {
      if (!visited.has(conn.targetNodeId)) {
        visited.add(conn.targetNodeId);
        queue.push(conn.targetNodeId);
      }
    });
  }

  // Check if any nodes were missed (disconnected components)
  const missedNodes = nodes.filter(n => !visited.has(n.id));
  if (missedNodes.length > 0) {
    stepSequence.push(`### Outras Etapas Registradas (Elementos Avulsos ou Secundários)\n`);
    missedNodes.forEach(node => {
      stepSequence.push(`#### Bloco: ${node.title} (${getNodeTypeLabel(node.type)})\n- **Descrição**: ${node.description || 'Nenhuma descrição fornecida.'}\n- **Raia**: ${lanes.find(l => l.id === node.laneId)?.name || 'Não associada'}\n`);
    });
  }

  // Format full Markdown
  return `# Relatório de Documentação de Processo: ${process.name}

## 1. Identificação Geral
- **Nome do Processo**: ${process.name}
- **Finalidade**: ${process.description || 'Não detalhada pelo modelador.'}
- **Versão Atual**: v${process.version}.0
- **Data de Geração**: ${new Date().toLocaleDateString('pt-BR', { year: 'numeric', month: 'long', day: 'numeric' })}
- **Autor/Modelador**: luis.junior@pinhais.pr.gov.br (Local State Repository)

## 2. Escopo e Raias de Atuação (Swimlanes)
As seguintes áreas, cargos ou sistemas participam ativamente deste fluxo de trabalho:
${lanes.map((lane, idx) => `${idx + 1}. **${lane.name}**: ${lane.description || 'Área participante.'}`).join('\n')}

## 3. Disparadores (Eventos de Início)
O processo é formalmente iniciado quando ocorre:
${starts.map(s => `- **${s.title}** (${getNodeTypeLabel(s.type)}): *${s.description || 'Gatilho de início do processo.'}*`).join('\n') || '- Nenhum evento de início cadastrado.'}

## 4. Recursos Envolvidos (Resumo)
- **Equipes/Responsáveis**: ${responsibles.length > 0 ? responsibles.join(', ') : '*Nenhum responsável detalhado.*'}
- **Sistemas de Informação**: ${systems.length > 0 ? systems.join(', ') : '*Nenhum sistema integrado.*'}
- **Insumos / Documentos de Entrada**: ${inputDocs.length > 0 ? inputDocs.join(', ') : '*Nenhum documento prévio exigido.*'}
- **Produtos / Documentos de Saída**: ${outputDocs.length > 0 ? outputDocs.join(', ') : '*Nenhum documento gerado durante o fluxo.*'}

## 5. Sequência Detalhada das Atividades
Abaixo estão descritas todas as atividades do fluxo na sua ordem lógica de execução:

${stepSequence.join('\n')}

## 6. Resultados Esperados e Encerramento
O processo é considerado finalizado quando atinge os seguintes resultados:
${ends.map(e => `- **${e.title}** (${getNodeTypeLabel(e.type)}): *${e.description || 'Status final concluído.'}*`).join('\n') || '- Nenhum evento de término cadastrado.'}

## 7. Riscos, Exceções e Observações
- **Loops e Retornos**: Existem regras de repetição em caso de inconformidades, revisões ou rejeição de etapas. Certifique-se de que os analistas validaram as condições de saída para mitigar gargalos operacionais.
- **SLA e Prazos**: Recomenda-se monitorar os prazos de cada atividade para assegurar que o processo completo atenda ao tempo padrão esperado.

## 8. Histórico de Alterações
| Versão | Data | Autor | Tipo de Alteração |
| :--- | :--- | :--- | :--- |
| **v1.0** | ${new Date().toLocaleDateString('pt-BR')} | luis.junior@pinhais.pr.gov.br | Criação e modelagem inicial do fluxo na grade visual BPMN. |
`;
}

export function getNodeTypeLabel(type: string): string {
  switch (type) {
    case 'start': return 'Início Simples';
    case 'start-message': return 'Início por Mensagem';
    case 'start-timer': return 'Início por Temporizador';
    case 'end': return 'Término Simples';
    case 'end-message': return 'Término por Mensagem';
    case 'intermediate': return 'Evento Intermediário';
    case 'timer': return 'Espera / Temporizador';
    case 'task': return 'Tarefa Geral';
    case 'task-manual': return 'Atividade Manual';
    case 'task-user': return 'Atividade de Usuário';
    case 'task-auto': return 'Atividade Automática';
    case 'document-send': return 'Envio de Documento';
    case 'document-recv': return 'Recebimento de Documento';
    case 'analysis': return 'Análise Técnica';
    case 'approval': return 'Aprovação';
    case 'confer': return 'Conferência / Auditoria';
    case 'sign': return 'Assinatura Eletrônica';
    case 'notify': return 'Notificação';
    case 'subprocess': return 'Subprocesso Interno';
    case 'decision-exclusive': return 'Decisão Exclusiva (XOR)';
    case 'decision-parallel': return 'Decisão Paralela (AND)';
    case 'decision-inclusive': return 'Decisão Inclusiva (OR)';
    case 'condition-simple': return 'Condição Simples';
    case 'approval-rejection': return 'Bifurcação Aprovação / Rejeição';
    case 'yes-no': return 'Escolha Sim / Não';
    case 'doc': return 'Documento Físico/Digital';
    case 'form': return 'Formulário Eletrônico';
    case 'note': return 'Nota de Observação';
    case 'external-system': return 'Sistema de Integração';
    case 'database': return 'Banco de Dados';
    case 'link': return 'Link de Referência';
    default: return 'Elemento BPMN';
  }
}
