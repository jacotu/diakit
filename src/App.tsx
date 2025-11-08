import { useState } from 'react';
import { DiagramCanvas } from './components/DiagramCanvas';
import { ControlPanel } from './components/ControlPanel';
import { DiagramParams, DiagramState } from './types/diagram-types';

export default function App() {
  const [params, setParams] = useState<DiagramParams>({
    // Layout & Structure
    nodeCount: 8,
    connectionDensity: 0.4,
    layoutSpread: 0.7,
    verticalBias: 0.5,
    horizontalBias: 0.5,
    
    // Node Properties
    nodeMinWidth: 60,
    nodeMaxWidth: 120,
    nodeMinHeight: 20,
    nodeMaxHeight: 40,
    nodeRoundness: 2,
    nodeThickness: 2,
    nodeScale: 1.0,
    
    // Connection Properties
    curveIntensity: 0.6,
    curveVariation: 0.5,
    connectionThickness: 1.5,
    arrowSize: 8,
    arrowFrequency: 0.7,
    dashedFrequency: 0.3,
    dashLength: 5,
    dashGap: 5,
    arrowGap: 10,
    
    // Flow Direction
    flowDirectionality: 0.6,
    downwardBias: 0.6,
    rightwardBias: 0.5,
    backwardConnectionFreq: 0.15,
    
    // Complexity
    multiConnectionChance: 0.3,
    branchingFactor: 0.5,
    clusterTendency: 0.4,
    
    // Visual Details
    curveSmoothing: 0.8,
    controlPointDistance: 0.5,
    selfLoopChance: 0.05,
    parallelLineOffset: 12,
    
    // Randomness
    randomSeed: 42,
    positionJitter: 0.2,
    sizeVariation: 0.6,
    styleVariation: 0.5,
    
    // Animation
    animationSpeed: 0.5,
    morphComplexity: 0.7,
    
    // Colors
    strokeColor: '#ffffff',
    fillColor: '#000000',
    backgroundColor: '#1a1a1a',
    
    // Canvas
    canvasWidth: 1711,
    canvasHeight: 1400,
    
    // Node Labels
    nodeTitles: Array(8).fill(''),
  });

  const [currentState, setCurrentState] = useState<DiagramState | null>(null);

  const updateParam = (key: keyof DiagramParams, value: number | string | string[]) => {
    setParams(prev => ({ ...prev, [key]: value }));
  };
  
  const updateNodeTitle = (index: number, title: string) => {
    setParams(prev => {
      const newTitles = [...(prev.nodeTitles || [])];
      while (newTitles.length <= index) {
        newTitles.push('');
      }
      newTitles[index] = title;
      return { ...prev, nodeTitles: newTitles };
    });
  };

  return (
    <div className="flex h-screen bg-neutral-900 overflow-hidden">
      <ControlPanel params={params} updateParam={updateParam} updateNodeTitle={updateNodeTitle} currentState={currentState} />
      <div className="flex-1 flex items-center justify-center p-8 overflow-auto">
        <DiagramCanvas params={params} onStateChange={setCurrentState} />
      </div>
    </div>
  );
}
