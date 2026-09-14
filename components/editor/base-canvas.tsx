'use client';

import { useLiveblocksFlow } from '@liveblocks/react-flow';
import { useRef } from 'react';
import type { ReactFlowInstance } from '@xyflow/react';
import { ShapePanel } from '@/components/editor/shape-panel';
import { CanvasNodeRenderer } from '@/components/editor/canvas-node';
import { nodeFromShapeDrop, SHAPE_DRAG_TYPE } from '@/lib/canvas-shapes';
import { Background, BackgroundVariant, ConnectionMode, MiniMap, ReactFlow } from '@xyflow/react';
import type { CanvasEdge, CanvasNode } from '@/types/canvas';
import '@xyflow/react/dist/style.css';

const nodeTypes = { canvasNode: CanvasNodeRenderer };

export function BaseCanvas() {
  const flow = useRef<ReactFlowInstance<CanvasNode, CanvasEdge> | null>(null);
  const { nodes, edges, onNodesChange, onEdgesChange, onConnect, onDelete } =
    useLiveblocksFlow<CanvasNode, CanvasEdge>({
      suspense: true,
      nodes: { initial: [] },
      edges: { initial: [] },
    });

  return (
    <div className="relative h-full w-full"
      onDragOver={(event) => {
        if (!event.dataTransfer.types.includes(SHAPE_DRAG_TYPE)) return;
        event.preventDefault();
        event.dataTransfer.dropEffect = 'copy';
      }}
      onDrop={(event) => {
        event.preventDefault();
        if (!flow.current) return;
        const node = nodeFromShapeDrop(event.dataTransfer.getData(SHAPE_DRAG_TYPE),
          flow.current.screenToFlowPosition({ x: event.clientX, y: event.clientY }));
        if (node) onNodesChange([{ type: 'add', item: node }]);
      }}
    >
    <ReactFlow<CanvasNode, CanvasEdge>
      onInit={(instance) => { flow.current = instance; }}
      nodeTypes={nodeTypes}
      nodes={nodes}
      edges={edges}
      onNodesChange={onNodesChange}
      onEdgesChange={onEdgesChange}
      onConnect={onConnect}
      onDelete={onDelete}
      connectionMode={ConnectionMode.Loose}
      colorMode="dark"
      fitView
      style={{ background: 'var(--bg-base)' }}
    >
      <MiniMap
        style={{ background: 'var(--bg-surface)', width: 140, height: 100 }}
        nodeColor="var(--text-muted)"
        maskColor="var(--accent-primary-dim)"
      />
      <Background variant={BackgroundVariant.Dots} gap={20} size={1} color="var(--border-subtle)" />
    </ReactFlow>
    <ShapePanel />
    </div>
  );
}