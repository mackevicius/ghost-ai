'use client';

import { Circle, Cylinder, Diamond, Hexagon, RectangleHorizontal, Pill } from 'lucide-react';
import { SHAPE_DRAG_TYPE, shapeDragPayload } from '@/lib/canvas-shapes';
import type { CanvasShape } from '@/types/canvas';

const shapes = [
  { shape: 'rectangle', Icon: RectangleHorizontal },
  { shape: 'diamond', Icon: Diamond },
  { shape: 'circle', Icon: Circle },
  { shape: 'pill', Icon: Pill },
  { shape: 'cylinder', Icon: Cylinder },
  { shape: 'hexagon', Icon: Hexagon },
] satisfies { shape: CanvasShape; Icon: typeof Circle }[];

export function ShapePanel() {
  return (
    <div role="toolbar" aria-label="Shapes" className="nodrag nopan absolute bottom-4 left-1/2 z-10 flex max-w-full -translate-x-1/2 gap-1 rounded-full border border-surface-border bg-elevated p-2 shadow-lg">
      {shapes.map(({ shape, Icon }) => (
        <button key={shape} type="button" draggable aria-label={shape} title={shape}
          className="flex h-8 w-8 shrink-0 cursor-grab items-center justify-center rounded-full text-copy-secondary hover:bg-subtle hover:text-brand focus-visible:outline-2 focus-visible:outline-brand active:cursor-grabbing sm:h-10 sm:w-10"
          onDragStart={(event) => {
            event.dataTransfer.setData(SHAPE_DRAG_TYPE, shapeDragPayload(shape));
            event.dataTransfer.effectAllowed = 'copy';
          }}
        >
          <Icon className="h-5 w-5" aria-hidden="true" />
        </button>
      ))}
    </div>
  );
}