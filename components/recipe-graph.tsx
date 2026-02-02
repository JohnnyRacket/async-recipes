'use client';

import { useMemo, useCallback } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  Node,
  Edge,
  ConnectionLineType,
  NodeMouseHandler,
} from '@xyflow/react';
import dagre from 'dagre';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { RecipeStep, IngredientCategory } from '@/lib/types';
import { StepStatus } from '@/hooks/use-cooking-state';
import { getIngredientColors } from '@/lib/utils';

import '@xyflow/react/dist/style.css';

interface RecipeGraphProps {
  steps: RecipeStep[];
  compact?: boolean;
  ingredientCategories?: Record<string, IngredientCategory>;
  // Interactive mode props
  stepStatuses?: Record<string, StepStatus>;
  onStepClick?: (stepId: string) => void;
}

const NODE_WIDTH_FULL = 240;
const NODE_HEIGHT_FULL = 150;
const NODE_WIDTH_COMPACT = 120;
const NODE_HEIGHT_COMPACT = 50;

// Use dagre to automatically layout the graph
// Starting nodes (no dependencies) are placed at the top row at the same height
// Branches are compacted vertically - nodes sit just below their dependencies
function getLayoutedElements(
  nodes: Node[],
  edges: Edge[],
  nodeWidth: number,
  nodeHeight: number,
  steps: RecipeStep[]
) {
  // Build step lookup and dependency graph
  const stepMap = new Map(steps.map((s) => [s.id, s]));
  const startingNodeIds = new Set(
    steps.filter((s) => s.dependsOn.length === 0).map((s) => s.id)
  );

  // Calculate the "branch depth" for each node - how far down its own branch it sits
  // This is different from dagre's rank which considers merge points
  const branchDepth = new Map<string, number>();
  
  function calculateBranchDepth(stepId: string, visited = new Set<string>()): number {
    if (branchDepth.has(stepId)) return branchDepth.get(stepId)!;
    if (visited.has(stepId)) return 0; // Cycle protection
    visited.add(stepId);
    
    const step = stepMap.get(stepId);
    if (!step || step.dependsOn.length === 0) {
      branchDepth.set(stepId, 0);
      return 0;
    }
    
    // Depth is 1 + max depth of dependencies
    const maxDepDeth = Math.max(
      ...step.dependsOn.map((depId) => calculateBranchDepth(depId, visited))
    );
    const depth = maxDepDeth + 1;
    branchDepth.set(stepId, depth);
    return depth;
  }
  
  steps.forEach((s) => calculateBranchDepth(s.id));

  // Use dagre for horizontal positioning, but we'll override vertical
  const dagreGraph = new dagre.graphlib.Graph();
  dagreGraph.setDefaultEdgeLabel(() => ({}));
  dagreGraph.setGraph({ 
    rankdir: 'TB', 
    nodesep: 40, 
    ranksep: 60, 
    align: 'UL',
    ranker: 'tight-tree' // Use tight-tree for more compact layout
  });

  nodes.forEach((node) => {
    dagreGraph.setNode(node.id, { width: nodeWidth, height: nodeHeight });
  });

  edges.forEach((edge) => {
    dagreGraph.setEdge(edge.source, edge.target);
  });

  dagre.layout(dagreGraph);

  // Get dagre positions for X coordinates, but recalculate Y based on branch depth
  const rowHeight = nodeHeight + 40; // Consistent spacing between rows
  
  const layoutedNodes = nodes.map((node) => {
    const nodeWithPosition = dagreGraph.node(node.id);
    const depth = branchDepth.get(node.id) ?? 0;
    
    return {
      ...node,
      position: {
        x: nodeWithPosition.x - nodeWidth / 2,
        y: depth * rowHeight, // Position based on branch depth, not dagre rank
      },
    };
  });

  // Ensure all starting nodes are at y=0
  layoutedNodes.forEach((node) => {
    if (startingNodeIds.has(node.id)) {
      node.position.y = 0;
    }
  });

  return { nodes: layoutedNodes, edges };
}

function getStepStyle(
  step: RecipeStep,
  status: StepStatus | undefined,
  isAvailable: boolean,
  nodeWidth: number,
  nodeHeight: number,
  compact: boolean
): React.CSSProperties {
  const baseStyle: React.CSSProperties = {
    width: nodeWidth,
    height: nodeHeight,
    borderRadius: compact ? '6px' : '8px',
    fontSize: compact ? '10px' : '12px',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
  };

  // If no status provided (non-interactive mode), use original behavior
  if (status === undefined) {
    const canStartImmediately = step.dependsOn.length === 0;
    return {
      ...baseStyle,
      background: canStartImmediately ? '#dcfce7' : '#fef9c3',
      border: canStartImmediately ? '2px solid #16a34a' : '2px solid #ca8a04',
    };
  }

  if (status === 'completed') {
    return {
      ...baseStyle,
      background: '#dcfce7',
      border: '3px solid #16a34a',
    };
  }

  if (isAvailable) {
    return {
      ...baseStyle,
      background: '#fef9c3',
      border: '2px solid #ca8a04',
    };
  }

  // Blocked (pending but not available)
  return {
    ...baseStyle,
    background: '#f1f5f9',
    border: '2px dashed #cbd5e1',
    opacity: 0.5,
    cursor: 'not-allowed',
  };
}

export function RecipeGraph({
  steps,
  compact = false,
  ingredientCategories,
  stepStatuses,
  onStepClick,
}: RecipeGraphProps) {
  const nodeWidth = compact ? NODE_WIDTH_COMPACT : NODE_WIDTH_FULL;
  const nodeHeight = compact ? NODE_HEIGHT_COMPACT : NODE_HEIGHT_FULL;
  const isInteractive = stepStatuses !== undefined;

  // Calculate which steps are available
  const availableSteps = useMemo(() => {
    if (!stepStatuses) return new Set<string>();
    const available = new Set<string>();
    steps.forEach((step) => {
      if (stepStatuses[step.id] === 'completed') return;
      const depsComplete = step.dependsOn.every(
        (depId) => stepStatuses[depId] === 'completed'
      );
      if (depsComplete) {
        available.add(step.id);
      }
    });
    return available;
  }, [steps, stepStatuses]);

  // Find starting node IDs (no dependencies)
  const startingNodeIds = useMemo(
    () => steps.filter((s) => s.dependsOn.length === 0).map((s) => s.id),
    [steps]
  );

  // Transform steps into React Flow nodes and edges
  const { nodes, edges } = useMemo(() => {
    const nodeList: Node[] = steps.map((step, index) => {
      const status = stepStatuses?.[step.id];
      const isAvailable = availableSteps.has(step.id);

      return {
        id: step.id,
        type: 'default',
        data: {
          label: compact ? (
            <div className="text-center p-1">
              <div className="font-semibold text-xs">Step {index + 1}</div>
            </div>
          ) : (
            <div className="text-center p-2 h-full flex flex-col">
              <div className="flex-1">
                <div className="font-semibold text-sm flex items-center justify-center gap-1">
                  {status === 'completed' && (
                    <CheckIcon className="w-4 h-4 text-green-600" />
                  )}
                  Step {index + 1}
                  {step.isPassive && (
                    <PassiveIcon className="w-4 h-4 text-blue-500" />
                  )}
                </div>
                <div className="text-xs mt-1 line-clamp-2">{step.text}</div>
              </div>
              {/* Metadata badges */}
              <div className="flex flex-wrap items-center justify-center gap-1 mt-2">
                {step.duration && (
                  <span className="text-[10px] bg-background/80 px-1.5 py-0.5 rounded border">
                    {step.duration}m
                  </span>
                )}
                {step.temperature && (
                  <span className="text-[10px] bg-orange-100 text-orange-700 px-1.5 py-0.5 rounded">
                    {step.temperature}
                  </span>
                )}
              </div>
              {/* Ingredient tags with color coding */}
              {step.ingredients && step.ingredients.length > 0 && (
                <div className="flex flex-wrap items-center justify-center gap-1 mt-1">
                  {step.ingredients.slice(0, 4).map((ing, i) => {
                    const colors = getIngredientColors(ing, ingredientCategories);
                    return (
                      <span
                        key={i}
                        className={`text-[9px] px-1.5 py-0.5 rounded ${colors.bg} ${colors.text}`}
                      >
                        {ing}
                      </span>
                    );
                  })}
                  {step.ingredients.length > 4 && (
                    <span className="text-[9px] text-muted-foreground">
                      +{step.ingredients.length - 4}
                    </span>
                  )}
                </div>
              )}
            </div>
          ),
          stepId: step.id,
        },
        position: { x: 0, y: 0 },
        style: getStepStyle(
          step,
          status,
          isAvailable,
          nodeWidth,
          nodeHeight,
          compact
        ),
      };
    });

    const edgeList: Edge[] = steps.flatMap((step) =>
      step.dependsOn.map((depId) => ({
        id: `${depId}-${step.id}`,
        source: depId,
        target: step.id,
        type: 'smoothstep',
        animated: !stepStatuses || stepStatuses[depId] !== 'completed',
        style: {
          stroke:
            stepStatuses?.[depId] === 'completed' ? '#16a34a' : '#64748b',
          strokeWidth: compact ? 1 : 2,
        },
      }))
    );

    return getLayoutedElements(nodeList, edgeList, nodeWidth, nodeHeight, steps);
  }, [steps, compact, nodeWidth, nodeHeight, stepStatuses, availableSteps, ingredientCategories]);

  // Handle node click
  const handleNodeClick: NodeMouseHandler = useCallback(
    (_, node) => {
      if (onStepClick) {
        onStepClick(node.id);
      }
    },
    [onStepClick]
  );

  // Calculate the initial viewport to show starting nodes at top
  const initialViewport = useMemo(() => {
    if (nodes.length === 0) return undefined;
    
    const startNodes = nodes.filter((n) => startingNodeIds.includes(n.id));
    if (startNodes.length === 0) return undefined;
    
    // Find the center X of starting nodes and their top Y position
    const avgX = startNodes.reduce((sum, n) => sum + n.position.x, 0) / startNodes.length;
    const minY = Math.min(...startNodes.map((n) => n.position.y));
    
    // Return viewport that centers starting nodes horizontally and shows them at top
    return {
      x: -(avgX - 200), // Offset to center horizontally (adjust for viewport width)
      y: -(minY - 30), // Small padding from top
      zoom: 0.9,
    };
  }, [nodes, startingNodeIds]);

  // Compact mode - just the graph without wrapper
  if (compact) {
    return (
      <div className="h-full bg-muted/30 rounded-lg">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          connectionLineType={ConnectionLineType.SmoothStep}
          fitView
          fitViewOptions={{ padding: 0.3 }}
          minZoom={0.3}
          maxZoom={1}
          proOptions={{ hideAttribution: true }}
          nodesDraggable={false}
          nodesConnectable={false}
          elementsSelectable={false}
          panOnDrag={false}
          zoomOnScroll={false}
        >
          <Background color="#94a3b8" gap={12} size={1} />
        </ReactFlow>
      </div>
    );
  }

  // Full mode with card wrapper
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex flex-wrap items-center justify-between gap-4">
          {/* Title */}
          <span>Cooking Flow</span>

          {/* Legend */}
          <div className="flex gap-4 text-sm font-normal">
            {isInteractive ? (
              <>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded bg-yellow-100 border-2 border-yellow-600" />
                  <span className="text-muted-foreground">Available</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded bg-green-100 border-3 border-green-600" />
                  <span className="text-muted-foreground">Completed</span>
                </div>
              </>
            ) : (
              <>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded bg-green-100 border-2 border-green-600" />
                  <span className="text-muted-foreground">Start here</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded bg-yellow-100 border-2 border-yellow-600" />
                  <span className="text-muted-foreground">Waiting on dependencies</span>
                </div>
              </>
            )}
          </div>
        </CardTitle>
        {isInteractive && (
          <p className="text-sm text-muted-foreground">
            Click on a step to toggle completion
          </p>
        )}
      </CardHeader>
      <CardContent>
        <div className="h-[500px] bg-muted/30 rounded-lg overflow-hidden">
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodeClick={handleNodeClick}
            connectionLineType={ConnectionLineType.SmoothStep}
            defaultViewport={initialViewport}
            fitView={!initialViewport}
            fitViewOptions={{ padding: 0.2 }}
            minZoom={0.5}
            maxZoom={1.5}
            proOptions={{ hideAttribution: true }}
            nodesDraggable={false}
            nodesConnectable={false}
          >
            <Background color="#94a3b8" gap={16} size={1} />
            <Controls showInteractive={false} />
            <MiniMap
              nodeColor={(node) => {
                const style = node.style as { background?: string } | undefined;
                return style?.background || '#e2e8f0';
              }}
              maskColor="rgb(0, 0, 0, 0.1)"
            />
          </ReactFlow>
        </div>
      </CardContent>
    </Card>
  );
}

// Icon components
function CheckIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M5 13l4 4L19 7"
      />
    </svg>
  );
}

function PassiveIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      aria-label="Passive step - can multitask"
    >
      <circle cx="12" cy="12" r="9" strokeWidth="2" />
      <path strokeWidth="2" strokeLinecap="round" d="M12 7v5l3 3" />
    </svg>
  );
}

