import * as React from "react";
import { useMemo } from "react";
import {
  ReactFlow,
  Background,
  Controls,
  BackgroundVariant,
  MarkerType,
  type Node,
  type Edge,
} from "@xyflow/react";
import dagre from "@dagrejs/dagre";
import "@xyflow/react/dist/style.css";

import { useApplications } from "../hooks/useApplications";
import { DEFAULT_LAYERS } from "../config/layers";
import { LayerNode, LayerNodeData } from "./LayerNode";
import { Application } from "../types/argocd";
import "../styles/index.css";

const NODE_WIDTH = 280;
const NODE_HEIGHT_COLLAPSED = 72;
const RANK_SEP = 100;
const NODE_SEP = 60;

const nodeTypes = { layer: LayerNode };

function buildGraph(
  layers: Record<string, Application[]>
): { nodes: Node<LayerNodeData>[]; edges: Edge[] } {
  const g = new dagre.graphlib.Graph();
  g.setDefaultEdgeLabel(() => ({}));
  g.setGraph({ rankdir: "TB", ranksep: RANK_SEP, nodesep: NODE_SEP });

  const nodes: Node<LayerNodeData>[] = [];
  const edges: Edge[] = [];

  for (const [key, config] of Object.entries(DEFAULT_LAYERS)) {
    const apps = layers[key] ?? [];

    g.setNode(key, { width: NODE_WIDTH, height: NODE_HEIGHT_COLLAPSED });

    nodes.push({
      id: key,
      type: "layer",
      position: { x: 0, y: 0 },
      data: {
        label: config.label,
        apps,
      },
    });

    for (const dep of config.dependsOn) {
      const edgeId = `${dep}->${key}`;
      g.setEdge(dep, key);
      edges.push({
        id: edgeId,
        source: dep,
        target: key,
        type: "smoothstep",
        animated: true,
        markerEnd: { type: MarkerType.ArrowClosed, color: "#64748b" },
        style: { stroke: "#64748b", strokeWidth: 2 },
      });
    }
  }

  dagre.layout(g);

  for (const node of nodes) {
    const pos = g.node(node.id);
    node.position = {
      x: pos.x - NODE_WIDTH / 2,
      y: pos.y - NODE_HEIGHT_COLLAPSED / 2,
    };
  }

  return { nodes, edges };
}

export function PlatformOverview(): React.ReactElement {
  const { layers, loading, error } = useApplications();

  const { nodes, edges } = useMemo(() => buildGraph(layers), [layers]);

  if (loading && Object.keys(layers).length === 0) {
    return (
      <div className="dag-container dag-center">
        <div className="dag-loading">Loading applications...</div>
      </div>
    );
  }

  if (error && Object.keys(layers).length === 0) {
    return (
      <div className="dag-container dag-center">
        <div className="dag-error">
          <strong>Error:</strong> {error}
        </div>
      </div>
    );
  }

  return (
    <div className="dag-container">
      {error && (
        <div className="dag-error-banner">
          Refresh failed: {error}
        </div>
      )}
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        fitView
        fitViewOptions={{ padding: 0.2 }}
        minZoom={0.3}
        maxZoom={2}
        nodesDraggable={false}
        nodesConnectable={false}
        elementsSelectable={false}
        proOptions={{ hideAttribution: true }}
      >
        <Background variant={BackgroundVariant.Dots} gap={20} size={1} color="#334155" />
        <Controls showInteractive={false} />
      </ReactFlow>
    </div>
  );
}
