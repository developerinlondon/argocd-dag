import * as React from "react";
import { memo, useState } from "react";
import { Handle, Position } from "@xyflow/react";
import { Application } from "../types/argocd";
import { AppCard } from "./AppCard";

export interface LayerNodeData {
  label: string;
  apps: Application[];
  [key: string]: unknown;
}

function computeLayerStatus(apps: Application[]): "healthy" | "warning" | "error" {
  if (apps.length === 0) return "healthy";

  const hasError = apps.some((app) => {
    const health = app.status.health?.status;
    return health === "Degraded" || health === "Missing";
  });
  if (hasError) return "error";

  const hasWarning = apps.some((app) => {
    const health = app.status.health?.status;
    const sync = app.status.sync?.status;
    return health === "Progressing" || sync === "OutOfSync";
  });
  if (hasWarning) return "warning";

  return "healthy";
}

function statusBorderColor(status: "healthy" | "warning" | "error"): string {
  switch (status) {
    case "healthy":
      return "#10b981";
    case "warning":
      return "#f59e0b";
    case "error":
      return "#ef4444";
  }
}

function healthySummary(apps: Application[]): string {
  const healthyCount = apps.filter(
    (a) =>
      a.status.health?.status === "Healthy" &&
      a.status.sync?.status === "Synced"
  ).length;
  return `${healthyCount}/${apps.length}`;
}

function LayerNodeComponent({ data }: { data: LayerNodeData }): React.ReactElement {
  const [expanded, setExpanded] = useState(false);
  const status = computeLayerStatus(data.apps);
  const borderColor = statusBorderColor(status);

  return (
    <div
      className={`dag-layer-node ${expanded ? "dag-layer-expanded" : ""}`}
      style={{ borderColor }}
      onClick={() => setExpanded((prev) => !prev)}
    >
      <Handle type="target" position={Position.Top} className="dag-handle" />

      <div className="dag-layer-header">
        <span className="dag-layer-label">{data.label}</span>
        <span className="dag-layer-summary">
          [{healthySummary(data.apps)} OK]
        </span>
        <span className={`dag-layer-indicator dag-indicator-${status}`} />
      </div>

      {expanded && data.apps.length > 0 && (
        <div className="dag-layer-apps">
          {data.apps.map((app) => (
            <AppCard key={app.metadata.name} app={app} />
          ))}
        </div>
      )}

      <Handle type="source" position={Position.Bottom} className="dag-handle" />
    </div>
  );
}

export const LayerNode = memo(LayerNodeComponent);
