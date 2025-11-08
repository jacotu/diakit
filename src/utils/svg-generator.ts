import { DiagramState, DiagramParams, Node, Connection } from '../types/diagram-types';

// Helper function to get connection point on edge of node
function getConnectionPoint(fromNode: Node, toNode: Node, gap: number): { x: number; y: number } {
  const fromCenterX = fromNode.x + fromNode.width / 2;
  const fromCenterY = fromNode.y + fromNode.height / 2;
  const toCenterX = toNode.x + toNode.width / 2;
  const toCenterY = toNode.y + toNode.height / 2;

  const dx = toCenterX - fromCenterX;
  const dy = toCenterY - fromCenterY;
  const angle = Math.atan2(dy, dx);

  const halfWidth = fromNode.width / 2;
  const halfHeight = fromNode.height / 2;

  let edgeX = fromCenterX;
  let edgeY = fromCenterY;

  if (Math.abs(Math.cos(angle)) > Math.abs(Math.sin(angle)) * (halfWidth / halfHeight)) {
    if (dx > 0) {
      edgeX = fromNode.x + fromNode.width;
      edgeY = fromCenterY + (halfWidth / Math.abs(Math.cos(angle))) * Math.sin(angle);
    } else {
      edgeX = fromNode.x;
      edgeY = fromCenterY - (halfWidth / Math.abs(Math.cos(angle))) * Math.sin(angle);
    }
  } else {
    if (dy > 0) {
      edgeY = fromNode.y + fromNode.height;
      edgeX = fromCenterX + (halfHeight / Math.abs(Math.sin(angle))) * Math.cos(angle);
    } else {
      edgeY = fromNode.y;
      edgeX = fromCenterX - (halfHeight / Math.abs(Math.sin(angle))) * Math.cos(angle);
    }
  }

  const gapX = gap * Math.cos(angle);
  const gapY = gap * Math.sin(angle);

  return {
    x: edgeX + gapX,
    y: edgeY + gapY,
  };
}

// Helper function to get point on bezier curve
function getPointOnBezier(
  p0: { x: number; y: number },
  p1: { x: number; y: number },
  p2: { x: number; y: number },
  p3: { x: number; y: number },
  t: number
) {
  const t2 = t * t;
  const t3 = t2 * t;
  const mt = 1 - t;
  const mt2 = mt * mt;
  const mt3 = mt2 * mt;

  return {
    x: mt3 * p0.x + 3 * mt2 * t * p1.x + 3 * mt * t2 * p2.x + t3 * p3.x,
    y: mt3 * p0.y + 3 * mt2 * t * p1.y + 3 * mt * t2 * p2.y + t3 * p3.y,
  };
}

// Helper function to get tangent on bezier curve
function getTangentOnBezier(
  p0: { x: number; y: number },
  p1: { x: number; y: number },
  p2: { x: number; y: number },
  p3: { x: number; y: number },
  t: number
) {
  const t2 = t * t;
  const mt = 1 - t;
  const mt2 = mt * mt;

  const dx =
    3 * mt2 * (p1.x - p0.x) +
    6 * mt * t * (p2.x - p1.x) +
    3 * t2 * (p3.x - p2.x);
  const dy =
    3 * mt2 * (p1.y - p0.y) +
    6 * mt * t * (p2.y - p1.y) +
    3 * t2 * (p3.y - p2.y);

  return { x: dx, y: dy };
}

export function generateSvgFromDiagramState(state: DiagramState, params: DiagramParams): string {
  const { canvasWidth, canvasHeight, backgroundColor, strokeColor, fillColor, nodeThickness, nodeRoundness, connectionThickness, arrowSize, arrowGap, dashLength, dashGap } = params;

  let svgContent = '';

  // Background
  svgContent += `<rect x="0" y="0" width="${canvasWidth}" height="${canvasHeight}" fill="${backgroundColor}"/>`;

  // Draw connections first (behind nodes)
  state.connections.forEach(conn => {
    const fromNode = state.nodes.find(n => n.id === conn.from);
    const toNode = state.nodes.find(n => n.id === conn.to);
    if (!fromNode || !toNode) return;

    const startPoint = getConnectionPoint(fromNode, toNode, arrowGap);
    const endPoint = getConnectionPoint(toNode, fromNode, arrowGap);

    const fromX = fromNode.x + fromNode.width / 2;
    const fromY = fromNode.y + fromNode.height / 2;
    const toX = toNode.x + toNode.width / 2;
    const toY = toNode.y + toNode.height / 2;

    const totalDx = toX - fromX;
    const totalDy = toY - fromY;
    const totalDist = Math.sqrt(totalDx * totalDx + totalDy * totalDy);
    
    if (totalDist === 0) return;

    const startRatio = Math.sqrt((startPoint.x - fromX) ** 2 + (startPoint.y - fromY) ** 2) / totalDist;
    const endRatio = 1 - Math.sqrt((toX - endPoint.x) ** 2 + (toY - endPoint.y) ** 2) / totalDist;

    // Helper function for linear interpolation
    const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

    const cp1 = {
      x: lerp(startPoint.x, conn.controlPoint1.x, 1 / (1 - startRatio)),
      y: lerp(startPoint.y, conn.controlPoint1.y, 1 / (1 - startRatio)),
    };

    const cp2 = {
      x: lerp(endPoint.x, conn.controlPoint2.x, 1 / endRatio),
      y: lerp(endPoint.y, conn.controlPoint2.y, 1 / endRatio),
    };

    // Draw bezier curve
    const path = `M ${startPoint.x} ${startPoint.y} C ${cp1.x} ${cp1.y}, ${cp2.x} ${cp2.y}, ${endPoint.x} ${endPoint.y}`;
    
    let strokeDasharray = '';
    if (conn.dashed) {
      strokeDasharray = `stroke-dasharray="${dashLength} ${dashGap}"`;
    }

    svgContent += `<path d="${path}" stroke="${strokeColor}" stroke-width="${connectionThickness}" fill="none" ${strokeDasharray}/>`;

    // Draw arrow
    if (conn.hasArrow) {
      const arrowPos = 0.5;
      const point = getPointOnBezier(
        startPoint,
        cp1,
        cp2,
        endPoint,
        arrowPos
      );
      const tangent = getTangentOnBezier(
        startPoint,
        cp1,
        cp2,
        endPoint,
        arrowPos
      );

      const angle = Math.atan2(tangent.y, tangent.x);
      const arrowAngle = Math.PI / 6;

      const arrowPath = [
        `M ${point.x} ${point.y}`,
        `L ${point.x - arrowSize * Math.cos(angle - arrowAngle)} ${point.y - arrowSize * Math.sin(angle - arrowAngle)}`,
        `L ${point.x - arrowSize * Math.cos(angle + arrowAngle)} ${point.y - arrowSize * Math.sin(angle + arrowAngle)}`,
        'Z'
      ].join(' ');

      svgContent += `<path d="${arrowPath}" fill="${strokeColor}"/>`;
    }
  });

  // Draw nodes
  state.nodes.forEach(node => {
    const x = node.x;
    const y = node.y;
    const width = node.width;
    const height = node.height;
    const rx = nodeRoundness > 0 ? nodeRoundness : 0;

    if (rx > 0) {
      svgContent += `<rect x="${x}" y="${y}" width="${width}" height="${height}" rx="${rx}" ry="${rx}" fill="${fillColor}" stroke="${strokeColor}" stroke-width="${nodeThickness}"/>`;
    } else {
      svgContent += `<rect x="${x}" y="${y}" width="${width}" height="${height}" fill="${fillColor}" stroke="${strokeColor}" stroke-width="${nodeThickness}"/>`;
    }

    // Draw label text
    if (node.label && node.label.trim()) {
      const textX = node.x + node.width / 2;
      const textY = node.y + node.height / 2;
      const escapedLabel = node.label.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
      svgContent += `<text x="${textX}" y="${textY}" font-family="AzeretMono, ui-monospace, monospace" font-size="12" fill="${strokeColor}" text-anchor="middle" dominant-baseline="middle">${escapedLabel}</text>`;
    }
  });

  return `<svg width="${canvasWidth}" height="${canvasHeight}" viewBox="0 0 ${canvasWidth} ${canvasHeight}" xmlns="http://www.w3.org/2000/svg">${svgContent}</svg>`;
}

