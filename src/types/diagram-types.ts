export interface DiagramParams {
  // Layout & Structure
  nodeCount: number;
  connectionDensity: number;
  layoutSpread: number;
  verticalBias: number;
  horizontalBias: number;
  
  // Node Properties
  nodeMinWidth: number;
  nodeMaxWidth: number;
  nodeMinHeight: number;
  nodeMaxHeight: number;
  nodeRoundness: number;
  nodeThickness: number;
  nodeScale: number;
  
  // Connection Properties
  curveIntensity: number;
  curveVariation: number;
  connectionThickness: number;
  arrowSize: number;
  arrowFrequency: number;
  dashedFrequency: number;
  dashLength: number;
  dashGap: number;
  arrowGap: number;
  
  // Flow Direction
  flowDirectionality: number;
  downwardBias: number;
  rightwardBias: number;
  backwardConnectionFreq: number;
  
  // Complexity
  multiConnectionChance: number;
  branchingFactor: number;
  clusterTendency: number;
  
  // Visual Details
  curveSmoothing: number;
  controlPointDistance: number;
  selfLoopChance: number;
  parallelLineOffset: number;
  
  // Randomness
  randomSeed: number;
  positionJitter: number;
  sizeVariation: number;
  styleVariation: number;
  
  // Animation
  animationSpeed: number;
  morphComplexity: number;
  
  // Colors
  strokeColor: string;
  fillColor: string;
  backgroundColor: string;
  
  // Canvas
  canvasWidth: number;
  canvasHeight: number;
  
  // Node Labels
  nodeTitles: string[];
}

export interface Node {
  id: number;
  x: number;
  y: number;
  width: number;
  height: number;
  label?: string;
}

export interface Connection {
  id: number;
  from: number;
  to: number;
  curve: number;
  dashed: boolean;
  hasArrow: boolean;
  controlPoint1: { x: number; y: number };
  controlPoint2: { x: number; y: number };
}

export interface DiagramState {
  nodes: Node[];
  connections: Connection[];
}
