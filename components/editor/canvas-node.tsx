'use client';

import type { NodeProps } from '@xyflow/react';
import type { CanvasNode } from '@/types/canvas';
import { DEFAULT_NODE_TEXT_COLOR } from '@/lib/canvas-shapes';

export function CanvasNodeRenderer({ data, selected }: NodeProps<CanvasNode>) {
  const complexShape = data.shape === 'diamond' || data.shape === 'hexagon' || data.shape === 'cylinder';
  const radius = data.shape === 'circle' || data.shape === 'pill' ? 'rounded-full' : 'rounded-xl';
  const padding = data.shape === 'diamond' ? 'p-[25%]' : complexShape || data.shape === 'circle' ? 'px-[20%] py-[15%]' : 'p-3';

  return (
    <div className={`relative flex h-full w-full items-center justify-center text-center text-sm ${padding} ${complexShape ? '' : `overflow-hidden border ${radius} ${selected ? 'border-brand' : 'border-surface-border'}`}`}
      style={{ backgroundColor: complexShape ? undefined : data.color, color: DEFAULT_NODE_TEXT_COLOR }}>
      {complexShape && (
        <svg aria-hidden="true" className={`pointer-events-none absolute inset-0 h-full w-full ${selected ? 'text-brand' : 'text-surface-border'}`}
          viewBox="0 0 100 100" preserveAspectRatio="none" fill={data.color} stroke="currentColor" strokeWidth="1">
          {data.shape === 'diamond' && <polygon points="50,1 99,50 50,99 1,50" vectorEffect="non-scaling-stroke" />}
          {data.shape === 'hexagon' && <polygon points="25,1 75,1 99,50 75,99 25,99 1,50" vectorEffect="non-scaling-stroke" />}
          {data.shape === 'cylinder' && (
            <>
              <path d="M 1 13 A 49 12 0 0 1 99 13 V 87 A 49 12 0 0 1 1 87 Z" vectorEffect="non-scaling-stroke" />
              <ellipse cx="50" cy="13" rx="49" ry="12" vectorEffect="non-scaling-stroke" />
            </>
          )}
        </svg>
      )}
      <span className="relative min-w-0 max-h-full overflow-hidden whitespace-pre-wrap break-words">{data.label}</span>
    </div>
  );
}