import { ScrollArea } from './ui/scroll-area';
import { Label } from './ui/label';
import { Slider } from './ui/slider';
import { DiagramParams, DiagramState, Node, Connection } from '../types/diagram-types';
import { Button } from './ui/button';
import { Shuffle, Download } from 'lucide-react';
import { Input } from './ui/input';
import { generateSvgFromDiagramState } from '../utils/svg-generator';
import { useRef, useEffect, useState } from 'react';

interface ControlPanelProps {
  params: DiagramParams;
  updateParam: (key: keyof DiagramParams, value: number | string | string[]) => void;
  updateNodeTitle: (index: number, title: string) => void;
  currentState: DiagramState | null;
}

export function ControlPanel({ params, updateParam, updateNodeTitle, currentState }: ControlPanelProps) {
  const svgButtonRef = useRef<HTMLButtonElement>(null);
  const [randomizeWidth, setRandomizeWidth] = useState<number | undefined>(undefined);

  useEffect(() => {
    const updateWidth = () => {
      if (svgButtonRef.current) {
        const svgWidth = svgButtonRef.current.offsetWidth;
        if (svgWidth > 0) {
          setRandomizeWidth(svgWidth);
        }
      }
    };

    // Use requestAnimationFrame to ensure SVG button is rendered
    const rafId = requestAnimationFrame(() => {
      updateWidth();
      // Also check after a short delay to ensure layout is complete
      setTimeout(updateWidth, 10);
    });
    
    // Use ResizeObserver for dynamic updates
    const resizeObserver = new ResizeObserver(() => {
      updateWidth();
    });

    // Observe SVG button when it's available
    const checkAndObserve = () => {
      if (svgButtonRef.current) {
        resizeObserver.observe(svgButtonRef.current);
      } else {
        setTimeout(checkAndObserve, 10);
      }
    };
    checkAndObserve();

    window.addEventListener('resize', updateWidth);
    
    return () => {
      cancelAnimationFrame(rafId);
      resizeObserver.disconnect();
      window.removeEventListener('resize', updateWidth);
    };
  }, []);

  const randomize = () => {
    updateParam('randomSeed', Math.floor(Math.random() * 10000));
  };

  const downloadImage = () => {
    const canvas = document.querySelector('canvas');
    if (!canvas) return;

    const link = document.createElement('a');
    link.download = `diakit-${Date.now()}.png`;
    link.href = canvas.toDataURL();
    link.click();
  };

  const downloadSVG = () => {
    if (!currentState) {
      console.error('No diagram state available for SVG export');
      return;
    }

    const svgString = generateSvgFromDiagramState(currentState, params);

    const blob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.download = `diakit-${Date.now()}.svg`;
    link.href = url;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="w-80 bg-black flex flex-col border-r border-neutral-800 h-screen">
      <div className="p-4 border-b border-neutral-800 shrink-0">
        <div className="flex items-center gap-2 mb-4">
          <div className="flex-1 flex items-center justify-center h-9 text-white text-xs font-medium">
            diakit
          </div>
          <Button 
            onClick={randomize} 
            variant="outline" 
            className="gap-2 border-neutral-700 bg-neutral-800 text-white hover:bg-neutral-700 text-xs"
            style={randomizeWidth ? { width: `${randomizeWidth}px` } : undefined}
          >
            <Shuffle className="w-4 h-4" />
            Randomize
          </Button>
        </div>
        <div className="flex gap-2">
          <Button onClick={downloadImage} variant="outline" className="flex-1 gap-2 border-neutral-700 bg-neutral-800 text-white hover:bg-neutral-700 text-xs">
            <Download className="w-4 h-4" />
            PNG
          </Button>
          <Button 
            ref={svgButtonRef}
            onClick={downloadSVG} 
            variant="outline" 
            className="flex-1 gap-2 border-neutral-700 bg-neutral-800 text-white hover:bg-neutral-700 text-xs"
          >
            <Download className="w-4 h-4" />
            SVG
          </Button>
        </div>
      </div>

      <ScrollArea className="flex-1 overflow-auto">
        <div className="p-4 space-y-3">
          {/* Canvas */}
          <Section title="Canvas">
            <div className="text-neutral-500 mb-2">
              {params.canvasWidth}×{params.canvasHeight}px
            </div>
            <div className="grid grid-cols-4 gap-2 mb-3">
              <button
                onClick={() => {
                  const maxDim = Math.max(window.innerWidth - 400, window.innerHeight - 100);
                  updateParam('canvasWidth', maxDim);
                  updateParam('canvasHeight', maxDim);
                }}
                className="flex flex-col items-center gap-1 p-2 bg-neutral-800 hover:bg-neutral-700 rounded border border-neutral-700 transition-colors"
              >
                <svg className="w-5 h-5 text-neutral-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                </svg>
                <span className="text-neutral-400">Full</span>
              </button>
              <button
                onClick={() => {
                  updateParam('canvasWidth', 900);
                  updateParam('canvasHeight', 1600);
                }}
                className="flex flex-col items-center gap-1 p-2 bg-neutral-800 hover:bg-neutral-700 rounded border border-neutral-700 transition-colors"
              >
                <svg className="w-5 h-5 text-neutral-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <rect x="8" y="4" width="8" height="16" strokeWidth={2} rx="1" />
                </svg>
                <span className="text-neutral-400">9×16</span>
              </button>
              <button
                onClick={() => {
                  updateParam('canvasWidth', 1000);
                  updateParam('canvasHeight', 1250);
                }}
                className="flex flex-col items-center gap-1 p-2 bg-neutral-800 hover:bg-neutral-700 rounded border border-neutral-700 transition-colors"
              >
                <svg className="w-5 h-5 text-neutral-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <rect x="7" y="5" width="10" height="14" strokeWidth={2} rx="1" />
                </svg>
                <span className="text-neutral-400">4×5</span>
              </button>
              <button
                onClick={() => {
                  updateParam('canvasWidth', 1600);
                  updateParam('canvasHeight', 900);
                }}
                className="flex flex-col items-center gap-1 p-2 bg-neutral-800 hover:bg-neutral-700 rounded border border-neutral-700 transition-colors"
              >
                <svg className="w-5 h-5 text-neutral-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <rect x="4" y="8" width="16" height="8" strokeWidth={2} rx="1" />
                </svg>
                <span className="text-neutral-400">16×9</span>
              </button>
            </div>
            <Control
              label="Canvas Width"
              value={params.canvasWidth}
              min={400}
              max={3000}
              step={10}
              onChange={(v) => updateParam('canvasWidth', v)}
            />
            <Control
              label="Canvas Height"
              value={params.canvasHeight}
              min={400}
              max={3000}
              step={10}
              onChange={(v) => updateParam('canvasHeight', v)}
            />
          </Section>

          {/* Colors */}
          <Section title="Colors">
            <ColorControl
              label="Stroke Color"
              value={params.strokeColor}
              onChange={(v) => updateParam('strokeColor', v)}
            />
            <ColorControl
              label="Fill Color"
              value={params.fillColor}
              onChange={(v) => updateParam('fillColor', v)}
            />
            <ColorControl
              label="Background"
              value={params.backgroundColor}
              onChange={(v) => updateParam('backgroundColor', v)}
            />
          </Section>

          {/* Layout & Structure */}
          <Section title="Layout & Structure">
            <Control
              label="Node Count"
              value={params.nodeCount}
              min={3}
              max={20}
              step={1}
              onChange={(v) => {
                updateParam('nodeCount', v);
                // Sync nodeTitles array length
                const currentTitles = params.nodeTitles || [];
                const newTitles = Array.from({ length: v }, (_, i) => currentTitles[i] || '');
                updateParam('nodeTitles', newTitles);
              }}
            />
            <Control
              label="Connection Density"
              value={params.connectionDensity}
              min={0}
              max={1}
              step={0.05}
              onChange={(v) => updateParam('connectionDensity', v)}
            />
            <Control
              label="Layout Spread"
              value={params.layoutSpread}
              min={0}
              max={1}
              step={0.05}
              onChange={(v) => updateParam('layoutSpread', v)}
            />
            <Control
              label="Vertical Bias"
              value={params.verticalBias}
              min={0}
              max={1}
              step={0.05}
              onChange={(v) => updateParam('verticalBias', v)}
            />
            <Control
              label="Horizontal Bias"
              value={params.horizontalBias}
              min={0}
              max={1}
              step={0.05}
              onChange={(v) => updateParam('horizontalBias', v)}
            />
          </Section>

          {/* Node Titles */}
          <Section title="Node Titles">
            <div className="space-y-2">
              {Array.from({ length: params.nodeCount }).map((_, index) => (
                <div key={index} className="space-y-1">
                  <Label className="text-neutral-500 text-xs">Node {index + 1}</Label>
                  <Input
                    type="text"
                    value={params.nodeTitles?.[index] || ''}
                    onChange={(e) => updateNodeTitle(index, e.target.value)}
                    placeholder={`Node ${index + 1} title`}
                    className="h-8 bg-neutral-800 border-neutral-700 text-neutral-300 text-sm"
                  />
                </div>
              ))}
            </div>
          </Section>

          {/* Node Properties */}
          <Section title="Node Properties">
            <Control
              label="Scale"
              value={params.nodeScale}
              min={0.5}
              max={3.0}
              step={0.1}
              onChange={(v) => updateParam('nodeScale', v)}
            />
            <Control
              label="Min Width"
              value={params.nodeMinWidth}
              min={30}
              max={150}
              step={5}
              onChange={(v) => updateParam('nodeMinWidth', v)}
            />
            <Control
              label="Max Width"
              value={params.nodeMaxWidth}
              min={50}
              max={200}
              step={5}
              onChange={(v) => updateParam('nodeMaxWidth', v)}
            />
            <Control
              label="Min Height"
              value={params.nodeMinHeight}
              min={15}
              max={60}
              step={5}
              onChange={(v) => updateParam('nodeMinHeight', v)}
            />
            <Control
              label="Max Height"
              value={params.nodeMaxHeight}
              min={20}
              max={80}
              step={5}
              onChange={(v) => updateParam('nodeMaxHeight', v)}
            />
            <Control
              label="Roundness"
              value={params.nodeRoundness}
              min={0}
              max={10}
              step={0.5}
              onChange={(v) => updateParam('nodeRoundness', v)}
            />
            <Control
              label="Thickness"
              value={params.nodeThickness}
              min={0.5}
              max={4}
              step={0.5}
              onChange={(v) => updateParam('nodeThickness', v)}
            />
          </Section>

          {/* Connection Properties */}
          <Section title="Connection Properties">
            <Control
              label="Curve Intensity"
              value={params.curveIntensity}
              min={0}
              max={1.5}
              step={0.05}
              onChange={(v) => updateParam('curveIntensity', v)}
            />
            <Control
              label="Curve Variation"
              value={params.curveVariation}
              min={0}
              max={1}
              step={0.05}
              onChange={(v) => updateParam('curveVariation', v)}
            />
            <Control
              label="Line Thickness"
              value={params.connectionThickness}
              min={0.5}
              max={4}
              step={0.5}
              onChange={(v) => updateParam('connectionThickness', v)}
            />
            <Control
              label="Arrow Size"
              value={params.arrowSize}
              min={4}
              max={16}
              step={1}
              onChange={(v) => updateParam('arrowSize', v)}
            />
            <Control
              label="Arrow Gap"
              value={params.arrowGap}
              min={0}
              max={30}
              step={1}
              onChange={(v) => updateParam('arrowGap', v)}
            />
            <Control
              label="Arrow Frequency"
              value={params.arrowFrequency}
              min={0}
              max={1}
              step={0.05}
              onChange={(v) => updateParam('arrowFrequency', v)}
            />
            <Control
              label="Dashed Frequency"
              value={params.dashedFrequency}
              min={0}
              max={1}
              step={0.05}
              onChange={(v) => updateParam('dashedFrequency', v)}
            />
            <Control
              label="Dash Length"
              value={params.dashLength}
              min={2}
              max={15}
              step={1}
              onChange={(v) => updateParam('dashLength', v)}
            />
            <Control
              label="Dash Gap"
              value={params.dashGap}
              min={2}
              max={15}
              step={1}
              onChange={(v) => updateParam('dashGap', v)}
            />
          </Section>

          {/* Flow Direction */}
          <Section title="Flow Direction">
            <Control
              label="Directionality"
              value={params.flowDirectionality}
              min={0}
              max={1}
              step={0.05}
              onChange={(v) => updateParam('flowDirectionality', v)}
            />
            <Control
              label="Downward Bias"
              value={params.downwardBias}
              min={0}
              max={1}
              step={0.05}
              onChange={(v) => updateParam('downwardBias', v)}
            />
            <Control
              label="Rightward Bias"
              value={params.rightwardBias}
              min={0}
              max={1}
              step={0.05}
              onChange={(v) => updateParam('rightwardBias', v)}
            />
            <Control
              label="Backward Connections"
              value={params.backwardConnectionFreq}
              min={0}
              max={0.5}
              step={0.05}
              onChange={(v) => updateParam('backwardConnectionFreq', v)}
            />
          </Section>

          {/* Complexity */}
          <Section title="Complexity">
            <Control
              label="Multi-Connection Chance"
              value={params.multiConnectionChance}
              min={0}
              max={1}
              step={0.05}
              onChange={(v) => updateParam('multiConnectionChance', v)}
            />
            <Control
              label="Branching Factor"
              value={params.branchingFactor}
              min={0}
              max={1}
              step={0.05}
              onChange={(v) => updateParam('branchingFactor', v)}
            />
            <Control
              label="Cluster Tendency"
              value={params.clusterTendency}
              min={0}
              max={1}
              step={0.05}
              onChange={(v) => updateParam('clusterTendency', v)}
            />
          </Section>

          {/* Visual Details */}
          <Section title="Visual Details">
            <Control
              label="Curve Smoothing"
              value={params.curveSmoothing}
              min={0}
              max={1}
              step={0.05}
              onChange={(v) => updateParam('curveSmoothing', v)}
            />
            <Control
              label="Control Point Distance"
              value={params.controlPointDistance}
              min={0.1}
              max={1}
              step={0.05}
              onChange={(v) => updateParam('controlPointDistance', v)}
            />
            <Control
              label="Self-Loop Chance"
              value={params.selfLoopChance}
              min={0}
              max={0.3}
              step={0.05}
              onChange={(v) => updateParam('selfLoopChance', v)}
            />
            <Control
              label="Parallel Line Offset"
              value={params.parallelLineOffset}
              min={5}
              max={30}
              step={1}
              onChange={(v) => updateParam('parallelLineOffset', v)}
            />
          </Section>

          {/* Randomness */}
          <Section title="Randomness">
            <Control
              label="Random Seed"
              value={params.randomSeed}
              min={0}
              max={10000}
              step={1}
              onChange={(v) => updateParam('randomSeed', v)}
            />
            <Control
              label="Position Jitter"
              value={params.positionJitter}
              min={0}
              max={0.5}
              step={0.05}
              onChange={(v) => updateParam('positionJitter', v)}
            />
            <Control
              label="Size Variation"
              value={params.sizeVariation}
              min={0}
              max={1}
              step={0.05}
              onChange={(v) => updateParam('sizeVariation', v)}
            />
            <Control
              label="Style Variation"
              value={params.styleVariation}
              min={0}
              max={1}
              step={0.05}
              onChange={(v) => updateParam('styleVariation', v)}
            />
          </Section>

          {/* Animation */}
          <Section title="Animation">
            <Control
              label="Animation Speed"
              value={params.animationSpeed}
              min={0.1}
              max={2}
              step={0.1}
              onChange={(v) => updateParam('animationSpeed', v)}
            />
            <Control
              label="Morph Complexity"
              value={params.morphComplexity}
              min={0}
              max={1}
              step={0.05}
              onChange={(v) => updateParam('morphComplexity', v)}
            />
          </Section>
        </div>
      </ScrollArea>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-neutral-900 rounded-lg p-3 border border-neutral-800">
      <h3 className="text-neutral-400 mb-3">{title}</h3>
      <div className="space-y-3">{children}</div>
    </div>
  );
}

function Control({
  label,
  value,
  min,
  max,
  step,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (value: number) => void;
}) {
  return (
    <div className="space-y-1.5">
      <div className="flex justify-between items-center">
        <Label className="text-neutral-500">{label}</Label>
        <span className="text-neutral-400 tabular-nums">
          {value.toFixed(step < 1 ? 2 : 0)}
        </span>
      </div>
      <Slider
        value={[value]}
        min={min}
        max={max}
        step={step}
        onValueChange={(values) => onChange(values[0])}
        className="w-full"
      />
    </div>
  );
}

function ColorControl({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-neutral-500">{label}</Label>
      <div className="flex gap-2">
        <Input
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-12 h-8 p-1 bg-neutral-800 border-neutral-700"
        />
        <Input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="flex-1 h-8 bg-neutral-800 border-neutral-700 text-neutral-300"
        />
      </div>
    </div>
  );
}
