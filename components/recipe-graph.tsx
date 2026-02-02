'use client';

import { useMemo } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  Node,
  Edge,
  ConnectionLineType,
  useNodesState,
  useEdgesState,
} from '@xyflow/react';
import dagre from 'dagre';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { RecipeStep } from '@/lib/types';

import '@xyflow/react/dist/style.css';

interface RecipeGraphProps {
  steps: RecipeStep[];
  compact?: boolean;
}

const NODE_WIDTH_FULL = 220;
const NODE_HEIGHT_FULL = 120; // Fits ~4 lines of text before clamping
const NODE_WIDTH_COMPACT = 120;
const NODE_HEIGHT_COMPACT = 50;

// Use dagre to automatically layout the graph
function getLayoutedElements(
  nodes: Node[],
  edges: Edge[],
  nodeWidth: number,
  nodeHeight: number,
  direction: 'TB' | 'LR' = 'TB'
) {
  const dagreGraph = new dagre.graphlib.Graph();
  dagreGraph.setDefaultEdgeLabel(() => ({}));
  dagreGraph.setGraph({ rankdir: direction, nodesep: 30, ranksep: 50 });

  nodes.forEach((node) => {
    dagreGraph.setNode(node.id, { width: nodeWidth, height: nodeHeight });
  });

  edges.forEach((edge) => {
    dagreGraph.setEdge(edge.source, edge.target);
  });

  dagre.layout(dagreGraph);

  const layoutedNodes = nodes.map((node) => {
    const nodeWithPosition = dagreGraph.node(node.id);
    return {
      ...node,
      position: {
        x: nodeWithPosition.x - nodeWidth / 2,
        y: nodeWithPosition.y - nodeHeight / 2,
      },
    };
  });

  return { nodes: layoutedNodes, edges };
}

export function RecipeGraph({ steps, compact = false }: RecipeGraphProps) {
  const nodeWidth = compact ? NODE_WIDTH_COMPACT : NODE_WIDTH_FULL;
  const nodeHeight = compact ? NODE_HEIGHT_COMPACT : NODE_HEIGHT_FULL;

  // Transform steps into React Flow nodes and edges
  const { nodes: initialNodes, edges: initialEdges } = useMemo(() => {
    const nodes: Node[] = steps.map((step, index) => {
      const canStartImmediately = step.dependsOn.length === 0;
      return {
        id: step.id,
        data: {
          label: compact ? (
            <div className="text-center p-1">
              <div className="font-semibold text-xs">Step {index + 1}</div>
            </div>
          ) : (
            <div className="text-center p-2">
              <div className="font-semibold text-sm">Step {index + 1}</div>
              <div className="text-xs mt-1 line-clamp-4">{step.text}</div>
            </div>
          ),
        },
        position: { x: 0, y: 0 }, // Will be set by dagre
        style: {
          width: nodeWidth,
          height: nodeHeight,
          background: canStartImmediately ? '#dcfce7' : '#fef9c3',
          border: canStartImmediately ? '2px solid #16a34a' : '2px solid #ca8a04',
          borderRadius: compact ? '6px' : '8px',
          fontSize: compact ? '10px' : '12px',
        },
      };
    });

    const edges: Edge[] = steps.flatMap((step) =>
      step.dependsOn.map((depId) => ({
        id: `${depId}-${step.id}`,
        source: depId,
        target: step.id,
        type: 'smoothstep',
        animated: true,
        style: { stroke: '#64748b', strokeWidth: compact ? 1 : 2 },
      }))
    );

    // Apply dagre layout
    return getLayoutedElements(nodes, edges, nodeWidth, nodeHeight);
  }, [steps, compact, nodeWidth, nodeHeight]);

  const [nodes, , onNodesChange] = useNodesState(initialNodes);
  const [edges, , onEdgesChange] = useEdgesState(initialEdges);

  // Compact mode - just the graph without wrapper
  if (compact) {
    return (
      <div className="h-full bg-muted/30 rounded-lg">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
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
        <CardTitle className="text-lg flex items-center justify-between">
          <span>Dependency Graph</span>
          <div className="flex gap-4 text-sm font-normal">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded bg-green-100 border-2 border-green-600" />
              <span className="text-muted-foreground">Can start immediately</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded bg-yellow-100 border-2 border-yellow-600" />
              <span className="text-muted-foreground">Has dependencies</span>
            </div>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[500px] bg-muted/30 rounded-lg">
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            connectionLineType={ConnectionLineType.SmoothStep}
            fitView
            fitViewOptions={{ padding: 0.2 }}
            minZoom={0.5}
            maxZoom={1.5}
            attributionPosition="bottom-left"
          >
            <Background color="#94a3b8" gap={16} size={1} />
            <Controls />
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
