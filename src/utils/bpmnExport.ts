import { ProcessModel } from '../types';

export function exportToBPMN20(process: ProcessModel): string {
  const definitionsId = `Definitions_${Math.floor(Math.random() * 1000000)}`;
  const processId = `Process_${Math.floor(Math.random() * 1000000)}`;
  const collaborationId = `Collaboration_${Math.floor(Math.random() * 1000000)}`;
  const participantId = `Participant_${Math.floor(Math.random() * 1000000)}`;

  let xml = `<?xml version="1.0" encoding="UTF-8"?>
<bpmn:definitions 
  xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL" 
  xmlns:bpmndi="http://www.omg.org/spec/BPMN/20100524/DI" 
  xmlns:dc="http://www.omg.org/spec/DD/20100524/DC" 
  xmlns:di="http://www.omg.org/spec/DD/20100524/DI" 
  id="${definitionsId}" 
  targetNamespace="http://bpmn.io/schema/bpmn" 
  exporter="BPMN FlowGrid" 
  exporterVersion="1.0">
  
  <bpmn:collaboration id="${collaborationId}">
    <bpmn:participant id="${participantId}" name="${escapeXml(process.name)}" processRef="${processId}" />
  </bpmn:collaboration>

  <bpmn:process id="${processId}" isExecutable="false">
    <bpmn:laneSet id="LaneSet_${processId}">`;

  // 1. Add Swimlanes
  process.lanes.forEach((lane) => {
    const laneNodeIds = process.nodes.filter((n) => n.laneId === lane.id).map((n) => n.id);
    xml += `
      <bpmn:lane id="Lane_${lane.id}" name="${escapeXml(lane.name)}">`;
    laneNodeIds.forEach((nodeId) => {
      xml += `
        <bpmn:flowNodeRef>${nodeId}</bpmn:flowNodeRef>`;
    });
    xml += `
      </bpmn:lane>`;
  });

  xml += `
    </bpmn:laneSet>`;

  // 2. Add Nodes (Start, End, Gateway, UserTask)
  process.nodes.forEach((node) => {
    const outgoing = process.connections.filter((c) => c.sourceNodeId === node.id).map((c) => c.id);
    const incoming = process.connections.filter((c) => c.targetNodeId === node.id).map((c) => c.id);

    let incomingTags = '';
    let outgoingTags = '';
    incoming.forEach((id) => (incomingTags += `\n    <bpmn:incoming>Flow_${id}</bpmn:incoming>`));
    outgoing.forEach((id) => (outgoingTags += `\n    <bpmn:outgoing>Flow_${id}</bpmn:outgoing>`));

    if (node.type.startsWith('start')) {
      xml += `
    <bpmn:startEvent id="${node.id}" name="${escapeXml(node.title)}">${incomingTags}${outgoingTags}
    </bpmn:startEvent>`;
    } else if (node.type.startsWith('end')) {
      xml += `
    <bpmn:endEvent id="${node.id}" name="${escapeXml(node.title)}">${incomingTags}${outgoingTags}
    </bpmn:endEvent>`;
    } else if (['decision-exclusive', 'decision-parallel', 'decision-inclusive', 'condition-simple', 'approval-rejection'].includes(node.type)) {
      xml += `
    <bpmn:exclusiveGateway id="${node.id}" name="${escapeXml(node.title)}">${incomingTags}${outgoingTags}
    </bpmn:exclusiveGateway>`;
    } else {
      // Standard User Task / Activity
      xml += `
    <bpmn:userTask id="${node.id}" name="${escapeXml(node.title)}">${incomingTags}${outgoingTags}
    </bpmn:userTask>`;
    }
  });

  // 3. Add Connection Flows
  process.connections.forEach((conn) => {
    xml += `
    <bpmn:sequenceFlow id="Flow_${conn.id}" sourceRef="${conn.sourceNodeId}" targetRef="${conn.targetNodeId}" name="${escapeXml(conn.label || '')}" />`;
  });

  xml += `
  </bpmn:process>

  <bpmndi:BPMNDiagram id="BPMNDiagram_${Math.floor(Math.random() * 1000000)}">
    <bpmndi:BPMNPlane id="BPMNPlane_1" bpmnElement="${collaborationId}">
      <bpmndi:BPMNShape id="Participant_Shape" bpmnElement="${participantId}" isHorizontal="true">
        <dc:Bounds x="100" y="50" width="1200" height="600" />
      </bpmndi:BPMNShape>`;

  // 4. Add Visual Coordinates for Swimlanes
  let currentY = 50;
  process.lanes.forEach((lane) => {
    const laneHeightPx = lane.height * 110;
    xml += `
      <bpmndi:BPMNShape id="Lane_Shape_${lane.id}" bpmnElement="Lane_${lane.id}" isHorizontal="true">
        <dc:Bounds x="130" y="${currentY}" width="1170" height="${laneHeightPx}" />
      </bpmndi:BPMNShape>`;
    currentY += laneHeightPx;
  });

  // 5. Add Visual Coordinates for Nodes
  currentY = 50;
  const laneYMap: Record<string, number> = {};
  process.lanes.forEach((lane) => {
    laneYMap[lane.id] = currentY;
    currentY += lane.height * 110;
  });

  process.nodes.forEach((node) => {
    const laneStartY = laneYMap[node.laneId] || 50;
    const isEvent = node.type.startsWith('start') || node.type.startsWith('end');
    const isGateway = ['decision-exclusive', 'decision-parallel', 'decision-inclusive', 'condition-simple', 'approval-rejection'].includes(node.type);

    const x = node.column * 200 + (200 - 150) / 2 + 100;
    const y = laneStartY + node.row * 110 + (110 - 65) / 2;

    const width = isEvent ? 36 : isGateway ? 50 : 100;
    const height = isEvent ? 36 : isGateway ? 50 : 80;

    xml += `
      <bpmndi:BPMNShape id="Shape_${node.id}" bpmnElement="${node.id}">
        <dc:Bounds x="${x}" y="${y}" width="${width}" height="${height}" />
      </bpmndi:BPMNShape>`;
  });

  // 6. Add Visual Paths for Connections
  process.connections.forEach((conn) => {
    xml += `
      <bpmndi:BPMNEdge id="Edge_Flow_${conn.id}" bpmnElement="Flow_${conn.id}">
        <di:waypoint x="150" y="150" />
        <di:waypoint x="300" y="150" />
      </bpmndi:BPMNEdge>`;
  });

  xml += `
    </bpmndi:BPMNPlane>
  </bpmndi:BPMNDiagram>
</bpmn:definitions>`;

  return xml;
}

function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}
