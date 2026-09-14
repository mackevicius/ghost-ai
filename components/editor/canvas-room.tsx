'use client';

import { Component, useState, type ReactNode } from 'react';
import { ClientSideSuspense, LiveblocksProvider, RoomProvider, useErrorListener } from '@liveblocks/react';
import { BaseCanvas } from '@/components/editor/base-canvas';

function CanvasError() {
  return (
    <div role="alert" className="flex h-full items-center justify-center p-6 text-center text-sm text-error">
      Unable to connect to the canvas. Refresh to try again.
    </div>
  );
}

class CanvasErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  render() {
    return this.state.failed ? <CanvasError /> : this.props.children;
  }
}

function ConnectedCanvas() {
  const [failed, setFailed] = useState(false);
  useErrorListener((error) => {
    if (error.context.type === 'ROOM_CONNECTION_ERROR') setFailed(true);
  });

  if (failed) return <CanvasError />;

  return (
    <ClientSideSuspense fallback={
      <div role="status" className="flex h-full items-center justify-center p-6 text-sm text-copy-muted">
        Loading canvas...
      </div>
    }>
      <BaseCanvas />
    </ClientSideSuspense>
  );
}

export function CanvasRoom({ roomId }: { roomId: string }) {
  return (
    <CanvasErrorBoundary key={roomId}>
      <LiveblocksProvider authEndpoint="/api/liveblocks-auth">
        <RoomProvider id={roomId} initialPresence={{ cursor: null, isThinking: false }} initialStorage={{}}>
          <ConnectedCanvas />
        </RoomProvider>
      </LiveblocksProvider>
    </CanvasErrorBoundary>
  );
}