import React, { useEffect, useRef, useState } from 'react';
import { DiagramParams, DiagramState, Node, Connection } from '../types/diagram-types';
import { generateDiagram } from '../utils/diagram-generator';
import { motion } from 'motion/react';

interface DiagramCanvasProps {
  params: DiagramParams;
  onStateChange?: (state: DiagramState) => void;
}

export function DiagramCanvas({ params, onStateChange }: DiagramCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [currentState, setCurrentState] = useState<DiagramState | null>(null);
  const [targetState, setTargetState] = useState<DiagramState | null>(null);
  const [scale, setScale] = useState(1);
  const animationFrameRef = useRef<number>();
  const progressRef = useRef(0);

  // Generate new diagram when params change
  useEffect(() => {
    const newDiagram = generateDiagram(params);
    setTargetState(newDiagram);
    progressRef.current = 0;
  }, [params]);

  // Initialize
  useEffect(() => {
    const initial = generateDiagram(params);
    setCurrentState(initial);
    setTargetState(initial);
  }, []);

  // Calculate scale to fit canvas in viewport
  useEffect(() => {
    const updateScale = () => {
      if (!containerRef.current) return;
      
      const container = containerRef.current;
      const containerRect = container.getBoundingClientRect();
      const padding = 32; // 8 * 4 = 32px (p-8 from parent)
      const availableWidth = containerRect.width - padding * 2;
      const availableHeight = containerRect.height - padding * 2;
      
      if (availableWidth <= 0 || availableHeight <= 0) {
        // Fallback: use window dimensions
        const controlPanelWidth = 320; // w-80 = 320px
        const windowPadding = 64; // padding on both sides
        const fallbackWidth = window.innerWidth - controlPanelWidth - windowPadding;
        const fallbackHeight = window.innerHeight - windowPadding;
        
        const widthScale = fallbackWidth / params.canvasWidth;
        const heightScale = fallbackHeight / params.canvasHeight;
        const newScale = Math.min(widthScale, heightScale, 1);
        setScale(newScale);
        return;
      }
      
      const widthScale = availableWidth / params.canvasWidth;
      const heightScale = availableHeight / params.canvasHeight;
      const newScale = Math.min(widthScale, heightScale, 1); // Never scale up, only down
      
      setScale(newScale);
    };

    // Use requestAnimationFrame to ensure layout is complete
    const timeoutId = setTimeout(() => {
      updateScale();
    }, 0);

    const resizeObserver = new ResizeObserver(() => {
      updateScale();
    });

    if (containerRef.current) {
      resizeObserver.observe(containerRef.current);
    }

    window.addEventListener('resize', updateScale);
    return () => {
      clearTimeout(timeoutId);
      window.removeEventListener('resize', updateScale);
      resizeObserver.disconnect();
    };
  }, [params.canvasWidth, params.canvasHeight]);

  // Animation loop
  useEffect(() => {
    if (!currentState || !targetState) return;

    const animate = () => {
      const speed = params.animationSpeed * 0.1;
      progressRef.current = Math.min(1, progressRef.current + speed);

      const interpolated = interpolateStates(
        currentState,
        targetState,
        easeInOutCubic(progressRef.current)
      );

      drawDiagram(canvasRef.current, interpolated, params);
      onStateChange?.(interpolated);

      if (progressRef.current < 1) {
        animationFrameRef.current = requestAnimationFrame(animate);
      } else {
        setCurrentState(targetState);
        onStateChange?.(targetState);
      }
    };

    animationFrameRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [currentState, targetState, params]);

  return (
    <div ref={containerRef} className="w-full h-full flex items-center justify-center">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="rounded-lg overflow-hidden shadow-2xl shrink-0 border-2 border-neutral-700"
        style={{ 
          backgroundColor: params.backgroundColor,
          width: `${params.canvasWidth * scale}px`,
          height: `${params.canvasHeight * scale}px`
        }}
      >
        <canvas
          ref={canvasRef}
          width={params.canvasWidth}
          height={params.canvasHeight}
          className="block"
          style={{ 
            width: `${params.canvasWidth * scale}px`,
            height: `${params.canvasHeight * scale}px`
          }}
        />
      </motion.div>
    </div>
  );
}

function interpolateStates(
  from: DiagramState,
  to: DiagramState,
  progress: number
): DiagramState {
  const nodes: Node[] = [];
  const maxNodes = Math.max(from.nodes.length, to.nodes.length);

  for (let i = 0; i < maxNodes; i++) {
    const fromNode = from.nodes[i] || to.nodes[Math.min(i, to.nodes.length - 1)];
    const toNode = to.nodes[i] || from.nodes[Math.min(i, from.nodes.length - 1)];

    nodes.push({
      id: toNode.id,
      x: lerp(fromNode.x, toNode.x, progress),
      y: lerp(fromNode.y, toNode.y, progress),
      width: lerp(fromNode.width, toNode.width, progress),
      height: lerp(fromNode.height, toNode.height, progress),
      label: toNode.label || fromNode.label,
    });
  }

  const connections: Connection[] = [];
  const maxConnections = Math.max(from.connections.length, to.connections.length);

  for (let i = 0; i < maxConnections; i++) {
    const fromConn = from.connections[i] || to.connections[Math.min(i, to.connections.length - 1)];
    const toConn = to.connections[i] || from.connections[Math.min(i, from.connections.length - 1)];

    connections.push({
      id: toConn.id,
      from: toConn.from,
      to: toConn.to,
      curve: lerp(fromConn.curve, toConn.curve, progress),
      dashed: toConn.dashed,
      hasArrow: toConn.hasArrow,
      controlPoint1: {
        x: lerp(fromConn.controlPoint1.x, toConn.controlPoint1.x, progress),
        y: lerp(fromConn.controlPoint1.y, toConn.controlPoint1.y, progress),
      },
      controlPoint2: {
        x: lerp(fromConn.controlPoint2.x, toConn.controlPoint2.x, progress),
        y: lerp(fromConn.controlPoint2.y, toConn.controlPoint2.y, progress),
      },
    });
  }

  return { nodes, connections };
}

function drawDiagram(
  canvas: HTMLCanvasElement | null,
  state: DiagramState,
  params: DiagramParams
) {
  if (!canvas) return;

  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  // Clear canvas
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = params.backgroundColor;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Draw connections first (behind nodes)
  state.connections.forEach(conn => {
    const fromNode = state.nodes.find(n => n.id === conn.from);
    const toNode = state.nodes.find(n => n.id === conn.to);
    if (!fromNode || !toNode) return;

    // Calculate start and end points with gap from node edges
    const startPoint = getConnectionPoint(fromNode, toNode, params.arrowGap);
    const endPoint = getConnectionPoint(toNode, fromNode, params.arrowGap);

    ctx.strokeStyle = params.strokeColor;
    ctx.lineWidth = params.connectionThickness;

    if (conn.dashed) {
      ctx.setLineDash([params.dashLength, params.dashGap]);
    } else {
      ctx.setLineDash([]);
    }

    // Adjust control points proportionally
    const fromX = fromNode.x + fromNode.width / 2;
    const fromY = fromNode.y + fromNode.height / 2;
    const toX = toNode.x + toNode.width / 2;
    const toY = toNode.y + toNode.height / 2;

    // Calculate how much to adjust control points based on shortened line
    const totalDx = toX - fromX;
    const totalDy = toY - fromY;
    const totalDist = Math.sqrt(totalDx * totalDx + totalDy * totalDy);
    
    if (totalDist === 0) return;

    const startRatio = Math.sqrt((startPoint.x - fromX) ** 2 + (startPoint.y - fromY) ** 2) / totalDist;
    const endRatio = 1 - Math.sqrt((toX - endPoint.x) ** 2 + (toY - endPoint.y) ** 2) / totalDist;

    const cp1 = {
      x: lerp(startPoint.x, conn.controlPoint1.x, 1 / (1 - startRatio)),
      y: lerp(startPoint.y, conn.controlPoint1.y, 1 / (1 - startRatio)),
    };

    const cp2 = {
      x: lerp(endPoint.x, conn.controlPoint2.x, 1 / endRatio),
      y: lerp(endPoint.y, conn.controlPoint2.y, 1 / endRatio),
    };

    // Draw bezier curve
    ctx.beginPath();
    ctx.moveTo(startPoint.x, startPoint.y);
    ctx.bezierCurveTo(
      conn.controlPoint1.x,
      conn.controlPoint1.y,
      conn.controlPoint2.x,
      conn.controlPoint2.y,
      endPoint.x,
      endPoint.y
    );
    ctx.stroke();

    // Draw arrow
    if (conn.hasArrow) {
      const arrowPos = 0.5;
      const point = getPointOnBezier(
        startPoint,
        conn.controlPoint1,
        conn.controlPoint2,
        endPoint,
        arrowPos
      );
      const tangent = getTangentOnBezier(
        startPoint,
        conn.controlPoint1,
        conn.controlPoint2,
        endPoint,
        arrowPos
      );

      drawArrow(ctx, point.x, point.y, tangent.x, tangent.y, params.arrowSize, params.strokeColor);
    }

    ctx.setLineDash([]);
  });

  // Draw nodes
  state.nodes.forEach(node => {
    ctx.strokeStyle = params.strokeColor;
    ctx.fillStyle = params.fillColor;
    ctx.lineWidth = params.nodeThickness;

    if (params.nodeRoundness > 0) {
      roundRect(ctx, node.x, node.y, node.width, node.height, params.nodeRoundness);
    } else {
      ctx.fillRect(node.x, node.y, node.width, node.height);
      ctx.strokeRect(node.x, node.y, node.width, node.height);
    }

    // Draw label text
    if (node.label && node.label.trim()) {
      ctx.save();
      ctx.fillStyle = params.strokeColor;
      
      // Base font size that will scale with node size
      const baseFontSize = Math.min(node.width, node.height) * 0.5; // Adjust this factor to your preference
      ctx.font = `bold ${baseFontSize}px AzeretMono, ui-monospace, monospace`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      
      // Calculate text position (center of node)
      const textX = node.x + node.width / 2;
      const textY = node.y + node.height / 2;
      
      // Function to get text width with current font
      const getTextWidth = (text: string) => {
        const metrics = ctx.measureText(text);
        return metrics.width;
      };
      
      // Function to wrap text
      const wrapText = (text: string, maxWidth: number) => {
        const words = text.split(' ');
        const lines: string[] = [];
        let currentLine = words[0];
        
        for (let i = 1; i < words.length; i++) {
          const word = words[i];
          const width = getTextWidth(currentLine + ' ' + word);
          
          if (width < maxWidth) {
            currentLine += ' ' + word;
          } else {
            lines.push(currentLine);
            currentLine = word;
          }
        }
        lines.push(currentLine);
        return lines;
      };
      
      // Calculate available width and height (with padding)
      const padding = 8;
      const maxWidth = node.width - (padding * 2);
      const maxHeight = node.height - (padding * 2);
      
      // Adjust font size to fit width
      let fontSize = baseFontSize;
      let lines: string[] = [];
      
      // Try to fit text with word wrapping
      while (fontSize > 8) { // Minimum font size
        ctx.font = `bold ${fontSize}px AzeretMono, ui-monospace, monospace`;
        lines = wrapText(node.label, maxWidth);
        const lineHeight = fontSize * 1.2;
        const totalHeight = lines.length * lineHeight;
        
        if (totalHeight <= maxHeight) {
          break;
        }
        
        fontSize -= 1;
      }
      
      // Draw each line of text
      const lineHeight = fontSize * 1.2;
      const startY = textY - ((lines.length - 1) * lineHeight) / 2;
      
      lines.forEach((line, i) => {
        ctx.fillText(line, textX, startY + (i * lineHeight));
      });
      
      ctx.restore();
    }
  });
}

// Get connection point on edge of node with gap
function getConnectionPoint(fromNode: Node, toNode: Node, gap: number): { x: number; y: number } {
  const fromCenterX = fromNode.x + fromNode.width / 2;
  const fromCenterY = fromNode.y + fromNode.height / 2;
  const toCenterX = toNode.x + toNode.width / 2;
  const toCenterY = toNode.y + toNode.height / 2;

  const dx = toCenterX - fromCenterX;
  const dy = toCenterY - fromCenterY;
  const angle = Math.atan2(dy, dx);

  // Find intersection with rectangle edge
  const corners = [
    { x: fromNode.x, y: fromNode.y }, // top-left
    { x: fromNode.x + fromNode.width, y: fromNode.y }, // top-right
    { x: fromNode.x + fromNode.width, y: fromNode.y + fromNode.height }, // bottom-right
    { x: fromNode.x, y: fromNode.y + fromNode.height }, // bottom-left
  ];

  // Check which edge the line intersects
  let edgeX = fromCenterX;
  let edgeY = fromCenterY;

  const halfWidth = fromNode.width / 2;
  const halfHeight = fromNode.height / 2;

  // Calculate intersection based on angle
  if (Math.abs(Math.cos(angle)) > Math.abs(Math.sin(angle)) * (halfWidth / halfHeight)) {
    // Intersects left or right edge
    if (dx > 0) {
      edgeX = fromNode.x + fromNode.width;
      edgeY = fromCenterY + (halfWidth / Math.abs(Math.cos(angle))) * Math.sin(angle);
    } else {
      edgeX = fromNode.x;
      edgeY = fromCenterY - (halfWidth / Math.abs(Math.cos(angle))) * Math.sin(angle);
    }
  } else {
    // Intersects top or bottom edge
    if (dy > 0) {
      edgeY = fromNode.y + fromNode.height;
      edgeX = fromCenterX + (halfHeight / Math.abs(Math.sin(angle))) * Math.cos(angle);
    } else {
      edgeY = fromNode.y;
      edgeX = fromCenterX - (halfHeight / Math.abs(Math.sin(angle))) * Math.cos(angle);
    }
  }

  // Add gap offset
  const gapX = gap * Math.cos(angle);
  const gapY = gap * Math.sin(angle);

  return {
    x: edgeX + gapX,
    y: edgeY + gapY,
  };
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number
) {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + width - radius, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
  ctx.lineTo(x + width, y + height - radius);
  ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  ctx.lineTo(x + radius, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
}

function drawArrow(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  dx: number,
  dy: number,
  size: number,
  color: string
) {
  const angle = Math.atan2(dy, dx);
  const arrowAngle = Math.PI / 6;

  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(
    x - size * Math.cos(angle - arrowAngle),
    y - size * Math.sin(angle - arrowAngle)
  );
  ctx.lineTo(
    x - size * Math.cos(angle + arrowAngle),
    y - size * Math.sin(angle + arrowAngle)
  );
  ctx.closePath();
  ctx.fill();
}

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

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}
