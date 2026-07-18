import { ConnectionPathPoint } from '../types';

export function getNodePortCoordinates(
  column: number,
  row: number,
  laneStartY: number,
  port: 'left' | 'right' | 'top' | 'bottom',
  nodeType?: string
): { x: number; y: number } {
  // Constants for drawing
  const cellWidth = 200;
  const cellHeight = 110;
  const nodeWidth = 150;
  const nodeHeight = 65;

  const isEvent = nodeType && (nodeType.startsWith('start') || nodeType.startsWith('end') || nodeType === 'intermediate' || nodeType === 'timer');
  const isDecision = nodeType && ['decision-exclusive', 'decision-parallel', 'decision-inclusive', 'condition-simple', 'approval-rejection', 'yes-no'].includes(nodeType);

  if (isEvent || isDecision) {
    // Circle or diamond. Actual size is 60x60.
    // Center of cell (shifted up slightly to 48px to leave room for bottom text label)
    const centerX = column * cellWidth + cellWidth / 2;
    const centerY = laneStartY + row * cellHeight + 48;

    switch (port) {
      case 'left':
        return { x: centerX - 30, y: centerY };
      case 'right':
        return { x: centerX + 30, y: centerY };
      case 'top':
        return { x: centerX, y: centerY - 30 };
      case 'bottom':
        return { x: centerX, y: centerY + 30 };
    }
  }

  const left = column * cellWidth + (cellWidth - nodeWidth) / 2;
  const top = laneStartY + row * cellHeight + (cellHeight - nodeHeight) / 2;

  switch (port) {
    case 'left':
      return { x: left, y: top + nodeHeight / 2 };
    case 'right':
      return { x: left + nodeWidth, y: top + nodeHeight / 2 };
    case 'top':
      return { x: left + nodeWidth / 2, y: top };
    case 'bottom':
      return { x: left + nodeWidth / 2, y: top + nodeHeight };
  }
}

export function computeOrthogonalPath(
  p1: { x: number; y: number },
  dir1: 'left' | 'right' | 'top' | 'bottom',
  p2: { x: number; y: number },
  dir2: 'left' | 'right' | 'top' | 'bottom'
): string {
  const points: ConnectionPathPoint[] = [p1];

  const buffer = 24;

  if (dir1 === 'right' && dir2 === 'left') {
    if (p2.x > p1.x + buffer) {
      const midX = (p1.x + p2.x) / 2;
      points.push({ x: midX, y: p1.y });
      points.push({ x: midX, y: p2.y });
    } else {
      const midY = p1.y + (p2.y - p1.y) / 2;
      points.push({ x: p1.x + buffer, y: p1.y });
      points.push({ x: p1.x + buffer, y: midY });
      points.push({ x: p2.x - buffer, y: midY });
      points.push({ x: p2.x - buffer, y: p2.y });
    }
  } else if (dir1 === 'bottom' && dir2 === 'top') {
    if (p2.y > p1.y + buffer) {
      const midY = (p1.y + p2.y) / 2;
      points.push({ x: p1.x, y: midY });
      points.push({ x: p2.x, y: midY });
    } else {
      const midX = p1.x + (p2.x - p1.x) / 2;
      points.push({ x: p1.x, y: p1.y + buffer });
      points.push({ x: midX, y: p1.y + buffer });
      points.push({ x: midX, y: p2.y - buffer });
      points.push({ x: p2.x, y: p2.y - buffer });
    }
  } else if (dir1 === 'right' && dir2 === 'top') {
    if (p2.x > p1.x && p2.y > p1.y) {
      points.push({ x: p2.x, y: p1.y });
    } else {
      points.push({ x: p1.x + buffer, y: p1.y });
      points.push({ x: p1.x + buffer, y: p2.y - buffer });
      points.push({ x: p2.x, y: p2.y - buffer });
    }
  } else if (dir1 === 'right' && dir2 === 'bottom') {
    if (p2.x > p1.x && p2.y < p1.y) {
      points.push({ x: p2.x, y: p1.y });
    } else {
      points.push({ x: p1.x + buffer, y: p1.y });
      points.push({ x: p1.x + buffer, y: p2.y + buffer });
      points.push({ x: p2.x, y: p2.y + buffer });
    }
  } else if (dir1 === 'bottom' && dir2 === 'left') {
    if (p2.x > p1.x) {
      points.push({ x: p1.x, y: p2.y });
    } else {
      points.push({ x: p1.x, y: p1.y + buffer });
      points.push({ x: p2.x - buffer, y: p1.y + buffer });
      points.push({ x: p2.x - buffer, y: p2.y });
    }
  } else if (dir1 === 'top' && dir2 === 'left') {
    if (p2.x > p1.x) {
      points.push({ x: p1.x, y: p2.y });
    } else {
      points.push({ x: p1.x, y: p1.y - buffer });
      points.push({ x: p2.x - buffer, y: p1.y - buffer });
      points.push({ x: p2.x - buffer, y: p2.y });
    }
  } else {
    // Default fallback simple L or S connection
    const midX = (p1.x + p2.x) / 2;
    points.push({ x: midX, y: p1.y });
    points.push({ x: midX, y: p2.y });
  }

  points.push(p2);

  // Translate points array to SVG path syntax
  let pathStr = `M ${points[0].x} ${points[0].y}`;
  for (let i = 1; i < points.length; i++) {
    pathStr += ` L ${points[i].x} ${points[i].y}`;
  }
  return pathStr;
}
