import * as React from "react";
import { useMemo, useCallback, useState } from "react";

import { useApplications } from "../hooks/useApplications";
import { DEFAULT_LAYERS, LayerConfig } from "../config/layers";
import { LayerCard } from "./LayerNode";
import { Application } from "../types/argocd";
import "../styles/index.css";

interface Stage {
  order: number;
  layers: [string, LayerConfig][];
}

function isLayerActive(apps: Application[]): boolean {
  return apps.some((app) => {
    const health = app.status.health?.status;
    const sync = app.status.sync?.status;
    const opPhase = app.status.operationState?.phase;
    const hooks = app.status.operationState?.syncResult?.resources ?? [];
    const hookRunning = hooks.some((r) => r.hookType === "PostSync" && r.hookPhase === "Running");
    return health === "Progressing" || sync === "OutOfSync" || opPhase === "Running" || hookRunning;
  });
}

function buildStages(layerKeys: string[]): Stage[] {
  const orderMap = new Map<number, [string, LayerConfig][]>();

  for (const [key, config] of Object.entries(DEFAULT_LAYERS)) {
    const existing = orderMap.get(config.order) ?? [];
    existing.push([key, config]);
    orderMap.set(config.order, existing);
  }

  const maxOrder = Math.max(...Array.from(orderMap.keys()), 0);
  const unknownKeys = layerKeys.filter((k) => !(k in DEFAULT_LAYERS));
  if (unknownKeys.length > 0) {
    const uncatOrder = maxOrder + 1;
    const uncatLayers: [string, LayerConfig][] = unknownKeys.map((k) => [
      k,
      { order: uncatOrder, dependsOn: [], label: k.charAt(0).toUpperCase() + k.slice(1) },
    ]);
    orderMap.set(uncatOrder, uncatLayers);
  }

  return Array.from(orderMap.entries())
    .sort(([a], [b]) => a - b)
    .map(([order, layers]) => ({ order, layers }));
}

function isStageActive(stage: Stage, allLayers: Record<string, Application[]>): boolean {
  return stage.layers.some(([key]) => isLayerActive(allLayers[key] ?? []));
}

export function PlatformOverview(): React.ReactElement {
  const { layers, loading, error, connected } = useApplications();
  const [expandedApps, setExpandedApps] = useState<Set<string>>(new Set());
  const [colorMode, setColorMode] = useState<"light" | "dark">("light");
  const isDark = colorMode === "dark";

  const layerKeys = useMemo(() => Object.keys(layers), [layers]);
  const stages = useMemo(() => buildStages(layerKeys), [layerKeys]);

  const allAppNames = useMemo(() => {
    const names: string[] = [];
    for (const apps of Object.values(layers)) {
      for (const app of apps) {
        names.push(app.metadata.name);
      }
    }
    return names;
  }, [layers]);

  const allExpanded = allAppNames.length > 0 && allAppNames.every((n) => expandedApps.has(n));

  const toggleApp = useCallback((name: string) => {
    setExpandedApps((prev) => {
      const next = new Set(prev);
      if (next.has(name)) {
        next.delete(name);
      } else {
        next.add(name);
      }
      return next;
    });
  }, []);

  const toggleLayer = useCallback((appNames: string[]) => {
    setExpandedApps((prev) => {
      const allInLayerExpanded = appNames.every((n) => prev.has(n));
      const next = new Set(prev);
      if (allInLayerExpanded) {
        for (const n of appNames) next.delete(n);
      } else {
        for (const n of appNames) next.add(n);
      }
      return next;
    });
  }, []);

  const toggleAll = useCallback(() => {
    setExpandedApps((prev) => {
      const allCurrentlyExpanded = allAppNames.length > 0 && allAppNames.every((n) => prev.has(n));
      return allCurrentlyExpanded ? new Set<string>() : new Set(allAppNames);
    });
  }, [allAppNames]);

  if (loading && Object.keys(layers).length === 0) {
    return (
      <div className="dag-container dag-light dag-center">
        <div className="dag-loading">Loading applications...</div>
      </div>
    );
  }

  if (error && Object.keys(layers).length === 0) {
    return (
      <div className="dag-container dag-light dag-center">
        <div className="dag-error">
          <strong>Error:</strong> {error}
        </div>
      </div>
    );
  }

  return (
    <div className={`dag-container ${isDark ? "dag-dark" : "dag-light"}`}>
      <div className="dag-toolbar">
        <span
          className={`dag-connection-dot ${connected ? "dag-connected" : "dag-disconnected"}`}
          title={connected ? "Live (SSE connected)" : "Reconnecting..."}
        />
        <button
          className="dag-expand-all-btn"
          onClick={toggleAll}
        >
          {allExpanded ? "Collapse All" : "Expand All"}
        </button>
        <button
          className="dag-theme-toggle"
          onClick={() => setColorMode((m) => (m === "dark" ? "light" : "dark"))}
          title={isDark ? "Switch to light mode" : "Switch to dark mode"}
        >
          {isDark ? "\u2600" : "\u263D"}
        </button>
      </div>
      {error && (
        <div className="dag-error-banner">
          Refresh failed: {error}
        </div>
      )}
      <div className="dag-pipeline">
        {stages.map((stage, idx) => {
          const stageActive = isStageActive(stage, layers);
          const prevActive = idx > 0 && isStageActive(stages[idx - 1], layers);
          const arrowActive = stageActive || prevActive;

          return (
            <React.Fragment key={stage.order}>
              {idx > 0 && (
                <div className={`dag-arrow ${arrowActive ? "dag-arrow-active" : ""}`}>
                  <svg viewBox="0 0 24 40">
                    <polyline points="6,8 18,20 6,32" />
                  </svg>
                </div>
              )}
              <div className="dag-stage-column">
                {stage.layers.map(([key, config]) => (
                  <LayerCard
                    key={key}
                    id={key}
                    label={config.label}
                    apps={layers[key] ?? []}
                    expandedApps={expandedApps}
                    active={isLayerActive(layers[key] ?? [])}
                    onToggleApp={toggleApp}
                    onToggleLayer={toggleLayer}
                  />
                ))}
              </div>
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
}
