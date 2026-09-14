import type { Edge, Node } from '@xyflow/react';

export type CanvasShape = 'rectangle' | 'diamond' | 'circle' | 'pill' | 'cylinder' | 'hexagon';

export interface CanvasNodeData extends Record<string, unknown> {
  label: string;
  color: string;
  shape: CanvasShape;
}

export type CanvasNode = Node<CanvasNodeData, 'canvasNode'>;
export type CanvasEdge = Edge<Record<string, unknown>, 'canvasEdge'>;