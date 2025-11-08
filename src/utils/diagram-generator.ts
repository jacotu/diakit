import { DiagramParams, DiagramState, Node, Connection } from '../types/diagram-types';

class SeededRandom {
  private seed: number;

  constructor(seed: number) {
    this.seed = seed;
  }

  random(): number {
    const x = Math.sin(this.seed++) * 10000;
    return x - Math.floor(x);
  }

  range(min: number, max: number): number {
    return min + this.random() * (max - min);
  }

  choice<T>(array: T[]): T {
    return array[Math.floor(this.random() * array.length)];
  }
}

export function generateDiagram(params: DiagramParams): DiagramState {
  const rng = new SeededRandom(params.randomSeed);
  const width = params.canvasWidth;
  const height = params.canvasHeight;
  const margin = 80;

  // Generate nodes
  const nodes: Node[] = [];
  const nodeCount = Math.round(params.nodeCount);

  for (let i = 0; i < nodeCount; i++) {
    const baseX = margin + (width - 2 * margin) * (i / nodeCount);
    const baseY = margin + (height - 2 * margin) * 0.5;

    const jitterX = (rng.random() - 0.5) * (width - 2 * margin) * params.positionJitter;
    const jitterY = (rng.random() - 0.5) * (height - 2 * margin) * params.positionJitter;

    // Apply layout spread
    const spreadX = (rng.random() - 0.5) * (width - 2 * margin) * params.layoutSpread;
    const spreadY = (rng.random() - 0.5) * (height - 2 * margin) * params.layoutSpread;

    // Apply bias
    const biasX = (params.horizontalBias - 0.5) * (width - 2 * margin) * 0.3;
    const biasY = (params.verticalBias - 0.5) * (height - 2 * margin) * 0.3;

    const x = baseX + jitterX + spreadX + biasX;
    const y = baseY + jitterY + spreadY + biasY;

    const baseWidth = rng.range(
      params.nodeMinWidth,
      params.nodeMinWidth + (params.nodeMaxWidth - params.nodeMinWidth) * params.sizeVariation
    );
    const baseHeight = rng.range(
      params.nodeMinHeight,
      params.nodeMinHeight + (params.nodeMaxHeight - params.nodeMinHeight) * params.sizeVariation
    );

    const nodeWidth = baseWidth * params.nodeScale;
    const nodeHeight = baseHeight * params.nodeScale;

    nodes.push({
      id: i,
      x: Math.max(margin, Math.min(width - margin - nodeWidth, x)),
      y: Math.max(margin, Math.min(height - margin - nodeHeight, y)),
      width: nodeWidth,
      height: nodeHeight,
      label: params.nodeTitles && params.nodeTitles[i] ? params.nodeTitles[i] : undefined,
    });
  }

  // Generate connections
  const connections: Connection[] = [];
  let connectionId = 0;

  for (let i = 0; i < nodeCount; i++) {
    const connectionsFromNode = Math.floor(
      1 + params.connectionDensity * params.branchingFactor * 5
    );

    for (let j = 0; j < connectionsFromNode; j++) {
      if (rng.random() > params.connectionDensity) continue;

      let targetIndex: number;

      // Self loop chance
      if (rng.random() < params.selfLoopChance) {
        targetIndex = i;
      } else {
        // Flow directionality
        const forwardBias = params.flowDirectionality;
        if (rng.random() < forwardBias && i < nodeCount - 1) {
          // Forward connection
          const range = Math.max(1, Math.floor(nodeCount * params.downwardBias * 0.5));
          targetIndex = Math.min(
            nodeCount - 1,
            i + 1 + Math.floor(rng.random() * range)
          );
        } else if (rng.random() < params.backwardConnectionFreq && i > 0) {
          // Backward connection
          targetIndex = Math.floor(rng.random() * i);
        } else {
          // Random connection
          targetIndex = Math.floor(rng.random() * nodeCount);
          if (targetIndex === i) {
            targetIndex = (i + 1) % nodeCount;
          }
        }
      }

      const fromNode = nodes[i];
      const toNode = nodes[targetIndex];

      const fromX = fromNode.x + fromNode.width / 2;
      const fromY = fromNode.y + fromNode.height / 2;
      const toX = toNode.x + toNode.width / 2;
      const toY = toNode.y + toNode.height / 2;

      const dx = toX - fromX;
      const dy = toY - fromY;
      const distance = Math.sqrt(dx * dx + dy * dy);

      // Control points for bezier curve
      const curveFactor =
        params.curveIntensity *
        (1 + (rng.random() - 0.5) * params.curveVariation);

      const perpX = -dy / distance;
      const perpY = dx / distance;

      const midX = (fromX + toX) / 2;
      const midY = (fromY + toY) / 2;

      const offset = distance * curveFactor * (rng.random() - 0.5);

      const cp1Distance = distance * params.controlPointDistance * params.curveSmoothing;
      const cp2Distance = distance * params.controlPointDistance * params.curveSmoothing;

      const controlPoint1 = {
        x: fromX + dx * 0.33 + perpX * offset * 0.7,
        y: fromY + dy * 0.33 + perpY * offset * 0.7,
      };

      const controlPoint2 = {
        x: fromX + dx * 0.67 + perpX * offset * 1.3,
        y: fromY + dy * 0.67 + perpY * offset * 1.3,
      };

      connections.push({
        id: connectionId++,
        from: i,
        to: targetIndex,
        curve: curveFactor,
        dashed: rng.random() < params.dashedFrequency,
        hasArrow: rng.random() < params.arrowFrequency,
        controlPoint1,
        controlPoint2,
      });

      // Multi-connection chance
      if (rng.random() < params.multiConnectionChance && i !== targetIndex) {
        const offset2 = -offset * 0.6;
        connections.push({
          id: connectionId++,
          from: i,
          to: targetIndex,
          curve: curveFactor * 0.8,
          dashed: rng.random() < params.dashedFrequency,
          hasArrow: rng.random() < params.arrowFrequency,
          controlPoint1: {
            x: fromX + dx * 0.33 + perpX * offset2 * 0.7,
            y: fromY + dy * 0.33 + perpY * offset2 * 0.7,
          },
          controlPoint2: {
            x: fromX + dx * 0.67 + perpX * offset2 * 1.3,
            y: fromY + dy * 0.67 + perpY * offset2 * 1.3,
          },
        });
      }
    }
  }

  return { nodes, connections };
}
