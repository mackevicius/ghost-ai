import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import vm from 'node:vm';
import ts from 'typescript';
import { Component, createElement } from 'react';
import * as jsxRuntime from 'react/jsx-runtime';
import { renderToStaticMarkup } from 'react-dom/server';

function load(file, dependencies) {
  const exports = {};
  const { outputText } = ts.transpileModule(readFileSync(new URL(`../${file}`, import.meta.url), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX },
  });
  vm.runInNewContext(outputText, { exports, require: (name) => {
    assert.ok(name in dependencies, `Unexpected dependency: ${name}`);
    return dependencies[name];
  } });
  return exports;
}

test('canvas uses empty suspense state and passes every synced handler to React Flow', () => {
  let options;
  let flowProps;
  let background;
  const state = { nodes: [], edges: [], ...Object.fromEntries(
    ['onNodesChange', 'onEdgesChange', 'onConnect', 'onDelete'].map((name) => [name, () => {}]),
  ) };
  const { BaseCanvas } = load('components/editor/base-canvas.tsx', {
    'react/jsx-runtime': jsxRuntime,
    react: { useRef: () => ({ current: null }) },
    '@/components/editor/shape-panel': { ShapePanel: () => null },
    '@/components/editor/canvas-node': { CanvasNodeRenderer: () => null },
    '@/lib/canvas-shapes': { nodeFromShapeDrop: () => null, SHAPE_DRAG_TYPE: 'application/ghost-ai-shape' },
    '@xyflow/react/dist/style.css': {},
    '@liveblocks/react-flow': { useLiveblocksFlow: (value) => { options = value; return state; } },
    '@xyflow/react': {
      ReactFlow: (props) => { flowProps = props; return createElement('div', null, props.children); },
      MiniMap: () => createElement('div', null, 'MiniMap'),
      Background: (props) => { background = props; return null; },
      ConnectionMode: { Loose: 'loose' }, BackgroundVariant: { Dots: 'dots' },
    },
  });
  const html = renderToStaticMarkup(createElement(BaseCanvas));
  assert.equal(options.suspense, true);
  assert.equal(options.nodes.initial.length, 0);
  assert.equal(options.edges.initial.length, 0);
  for (const key of Object.keys(state)) assert.equal(flowProps[key], state[key]);
  assert.equal(flowProps.connectionMode, 'loose');
  assert.equal(flowProps.fitView, true);
  assert.equal(background.variant, 'dots');
  assert.match(html, /MiniMap/);
});

test('shape payloads create correctly sized custom nodes with unique IDs and reject malformed input', () => {
  const { shapeDragPayload, nodeFromShapeDrop, SHAPE_SIZES, DEFAULT_NODE_COLOR } = load('lib/canvas-shapes.ts', {});
  const ids = new Set();
  for (const shape of ['rectangle', 'diamond', 'circle', 'pill', 'cylinder', 'hexagon']) {
    const payload = shapeDragPayload(shape);
    assert.deepEqual(JSON.parse(payload), { shape, ...SHAPE_SIZES[shape] });
    for (let index = 0; index < 2; index++) {
      const node = nodeFromShapeDrop(payload, { x: 12, y: -34 });
      assert.equal(node.type, 'canvasNode');
      assert.equal(node.data.shape, shape);
      assert.equal(node.data.label, '');
      assert.equal(node.data.color, DEFAULT_NODE_COLOR);
      assert.equal(node.position.x, 12);
      assert.equal(node.position.y, -34);
      assert.equal(node.width, SHAPE_SIZES[shape].width);
      assert.equal(node.height, SHAPE_SIZES[shape].height);
      assert.match(node.id, new RegExp(`^${shape}-\\d+-\\d+$`));
      assert.ok(!ids.has(node.id));
      ids.add(node.id);
    }
  }
  assert.ok(SHAPE_SIZES.rectangle.width > SHAPE_SIZES.rectangle.height);
  assert.equal(SHAPE_SIZES.circle.width, SHAPE_SIZES.circle.height);
  assert.ok(SHAPE_SIZES.diamond.height > SHAPE_SIZES.rectangle.height);
  for (const value of ['', 'null', '{}', '[]', '{', '{"shape":"toString"}', '{"shape":"rectangle","width":-1,"height":100}']) {
    assert.equal(nodeFromShapeDrop(value, { x: 0, y: 0 }), null);
  }
});

test('drop converts screen coordinates and adds the node using the synced change handler', () => {
  const helpers = load('lib/canvas-shapes.ts', {});
  let changes;
  let screenPosition;
  const reference = { current: null };
  const { BaseCanvas } = load('components/editor/base-canvas.tsx', {
    'react/jsx-runtime': jsxRuntime,
    react: { useRef: () => reference },
    '@/components/editor/shape-panel': { ShapePanel: () => null },
    '@/components/editor/canvas-node': { CanvasNodeRenderer: () => null },
    '@/lib/canvas-shapes': helpers,
    '@xyflow/react/dist/style.css': {},
    '@liveblocks/react-flow': { useLiveblocksFlow: () => ({ nodes: [], edges: [], onNodesChange: (value) => { changes = value; } }) },
    '@xyflow/react': { ReactFlow: () => null, MiniMap: () => null, Background: () => null, ConnectionMode: { Loose: 'loose' }, BackgroundVariant: { Dots: 'dots' } },
  });
  const wrapper = BaseCanvas();
  const flowElement = wrapper.props.children[0];
  flowElement.props.onInit({ screenToFlowPosition: (position) => { screenPosition = position; return { x: 25, y: 50 }; } });
  let prevented = false;
  const event = {
    clientX: 200, clientY: 400,
    preventDefault: () => { prevented = true; },
    dataTransfer: { types: [helpers.SHAPE_DRAG_TYPE], getData: () => helpers.shapeDragPayload('diamond') },
  };
  wrapper.props.onDragOver(event);
  assert.equal(prevented, true);
  assert.equal(event.dataTransfer.dropEffect, 'copy');
  wrapper.props.onDrop(event);
  assert.equal(screenPosition.x, 200);
  assert.equal(screenPosition.y, 400);
  assert.equal(changes[0].type, 'add');
  assert.equal(changes[0].item.position.x, 25);
  assert.equal(changes[0].item.position.y, 50);
  assert.equal(changes[0].item.data.shape, 'diamond');
  assert.ok(flowElement.props.nodeTypes.canvasNode);
  changes = undefined;
  event.dataTransfer.getData = () => 'invalid';
  wrapper.props.onDrop(event);
  assert.equal(changes, undefined);
});

test('canvas renderer displays each saved shape with its fill, label and selection outline', () => {
  const helpers = load('lib/canvas-shapes.ts', {});
  const { CanvasNodeRenderer } = load('components/editor/canvas-node.tsx', {
    'react/jsx-runtime': jsxRuntime,
    '@/lib/canvas-shapes': helpers,
  });
  const outlines = {
    rectangle: /rounded-xl/,
    circle: /rounded-full/,
    pill: /rounded-full/,
    diamond: /points="50,1 99,50 50,99 1,50"/,
    hexagon: /points="25,1 75,1 99,50 75,99 25,99 1,50"/,
    cylinder: /<ellipse cx="50" cy="13" rx="49" ry="12"/,
  };
  for (const [shape, outline] of Object.entries(outlines)) {
    const node = helpers.nodeFromShapeDrop(helpers.shapeDragPayload(shape), { x: 0, y: 0 });
    node.data.label = 'Saved label';
    for (const selected of [false, true]) {
      const html = renderToStaticMarkup(createElement(CanvasNodeRenderer, { data: node.data, selected }));
      assert.match(html, outline);
      assert.match(html, /Saved label/);
      assert.ok(html.includes(helpers.DEFAULT_NODE_COLOR));
      assert.match(html, selected ? /(?:text|border)-brand/ : /(?:text|border)-surface-border/);
      if (['diamond', 'hexagon', 'cylinder'].includes(shape)) {
        assert.match(html, /vector-effect="non-scaling-stroke"/);
        assert.doesNotMatch(html, /background-color|rounded-xl/);
      }
    }
  }
});

test('room wrapper sets auth, room and presence and handles connection errors outside suspense', () => {
  let provider;
  let room;
  let listener;
  let failed = false;
  let loading = true;
  const { CanvasRoom } = load('components/editor/canvas-room.tsx', {
    'react/jsx-runtime': jsxRuntime,
    react: { Component, useState: () => [failed, (value) => { failed = value; }] },
    '@/components/editor/base-canvas': { BaseCanvas: () => createElement('div', null, 'Synced canvas') },
    '@liveblocks/react': {
      LiveblocksProvider: (props) => { provider = props; return props.children; },
      RoomProvider: (props) => { room = props; return props.children; },
      ClientSideSuspense: (props) => loading ? props.fallback : props.children,
      useErrorListener: (callback) => { listener = callback; },
    },
  });
  const render = () => renderToStaticMarkup(createElement(CanvasRoom, { roomId: 'project-room' }));
  assert.match(render(), /Loading canvas/);
  assert.equal(provider.authEndpoint, '/api/liveblocks-auth');
  assert.equal(room.id, 'project-room');
  assert.equal(room.initialPresence.cursor, null);
  assert.equal(room.initialPresence.isThinking, false);
  listener({ context: { type: 'ROOM_CONNECTION_ERROR' } });
  assert.match(render(), /Unable to connect/);
  failed = false;
  loading = false;
  assert.match(render(), /Synced canvas/);
});