import type { CanvasNode, CanvasShape } from '@/types/canvas';

export const SHAPE_DRAG_TYPE = 'application/ghost-ai-shape';
export const DEFAULT_NODE_COLOR = '#1F1F1F';
export const DEFAULT_NODE_TEXT_COLOR = '#EDEDED';
export const SHAPE_SIZES: Record<CanvasShape, { width: number; height: number }> = {
  rectangle: { width: 180, height: 100 },
  diamond: { width: 180, height: 180 },
  circle: { width: 120, height: 120 },
  pill: { width: 180, height: 80 },
  cylinder: { width: 140, height: 160 },
  hexagon: { width: 160, height: 140 },
};

export function shapeDragPayload(shape: CanvasShape) {
  return JSON.stringify({ shape, ...SHAPE_SIZES[shape] });
}

let nodeCounter = 0;

export function nodeFromShapeDrop(payload: string, position: { x: number; y: number }): CanvasNode | null {
  let value: unknown;
  try { value = JSON.parse(payload); } catch { return null; }
  if (!value || typeof value !== 'object' || !('shape' in value) ||
    typeof value.shape !== 'string' || !Object.hasOwn(SHAPE_SIZES, value.shape)) return null;
  const shape = value.shape as CanvasShape;
  const size = SHAPE_SIZES[shape];
  if (!('width' in value) || !('height' in value) || value.width !== size.width || value.height !== size.height) return null;
  return {
    id: `${shape}-${Date.now()}-${++nodeCounter}`,
    type: 'canvasNode',
    position,
    ...size,
    data: { label: '', color: DEFAULT_NODE_COLOR, shape },
  };
}