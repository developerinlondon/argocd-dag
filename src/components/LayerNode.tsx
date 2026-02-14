import * as React from "react";
import { Application } from "../types/argocd";
import { AppCard } from "./AppCard";

interface LayerCardProps {
  id: string;
  label: string;
  apps: Application[];
  expandedApps: Set<string>;
  active: boolean;
  onToggleApp: (appName: string) => void;
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

function syncStatus(app: Application): { cls: string; title: string } {
  const sync = app.status.sync?.status ?? "Unknown";
  const opPhase = app.status.operationState?.phase;

  if (opPhase === "Running") return { cls: "dag-dot-progress", title: "Syncing" };
  if (sync === "Synced") return { cls: "dag-dot-ok", title: "Synced" };
  if (sync === "OutOfSync") return { cls: "dag-dot-warn", title: "OutOfSync" };
  return { cls: "dag-dot-grey", title: sync };
}

function healthStatus(app: Application): { cls: string; title: string } {
  const health = app.status.health?.status ?? "Unknown";

  if (health === "Healthy") return { cls: "dag-dot-ok", title: "Healthy" };
  if (health === "Progressing") return { cls: "dag-dot-progress", title: "Progressing" };
  if (health === "Degraded" || health === "Missing") return { cls: "dag-dot-fail", title: health };
  if (health === "Suspended") return { cls: "dag-dot-warn", title: "Suspended" };
  return { cls: "dag-dot-grey", title: health };
}

function validationStatus(app: Application): { cls: string; title: string } {
  const resources = app.status.operationState?.syncResult?.resources ?? [];
  const postSyncHooks = resources.filter((r) => r.hookType === "PostSync");

  if (postSyncHooks.length === 0) return { cls: "dag-dot-grey", title: "No validation" };

  const failed = postSyncHooks.some((h) => h.hookPhase === "Failed" || h.hookPhase === "Error");
  if (failed) return { cls: "dag-dot-fail", title: "Validation failed" };

  const running = postSyncHooks.some((h) => h.hookPhase === "Running");
  if (running) return { cls: "dag-dot-progress", title: "Validating" };

  const allPassed = postSyncHooks.every((h) => h.hookPhase === "Succeeded");
  if (allPassed) return { cls: "dag-dot-ok", title: "Validated" };

  return { cls: "dag-dot-grey", title: "Unknown" };
}

export function LayerCard({ id, label, apps, expandedApps, active, onToggleApp }: LayerCardProps): React.ReactElement {
  const status = computeLayerStatus(apps);
  const borderColor = statusBorderColor(status);

  const classNames = [
    "dag-layer-node",
    active ? "dag-node-active" : "",
  ].filter(Boolean).join(" ");

  return (
    <div
      className={classNames}
      style={{ borderColor }}
    >
      <div className="dag-layer-header">
        <span className="dag-layer-label">{label}</span>
      </div>

      <div className="dag-app-list">
        {apps.map((app) => {
          const appName = app.metadata.name;
          const isExpanded = expandedApps.has(appName);
          const s = syncStatus(app);
          const h = healthStatus(app);
          const v = validationStatus(app);
          return (
            <div key={appName} className="dag-app-entry">
              <div className="dag-app-row">
                <button
                  className="dag-app-expand-btn"
                  onClick={() => onToggleApp(appName)}
                  title={isExpanded ? "Collapse" : "Expand"}
                >
                  {isExpanded ? "\u2212" : "+"}
                </button>
                <span className="dag-dots">
                  <span className={`dag-dot ${s.cls}`} title={s.title}></span>
                  <span className={`dag-dot ${h.cls}`} title={h.title}></span>
                  <span className={`dag-dot ${v.cls}`} title={v.title}></span>
                </span>
                <span className="dag-app-row-name">{appName}</span>
              </div>
              {isExpanded && (
                <AppCard app={app} />
              )}
            </div>
          );
        })}
        {apps.length === 0 && (
          <div className="dag-app-row dag-app-row-empty">No apps</div>
        )}
      </div>
    </div>
  );
}
