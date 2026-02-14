import * as React from "react";
import { useState, useEffect } from "react";
import axios from "axios";
import { Application, SyncResultResource, ResourceNode } from "../types/argocd";
import { formatTimestamp } from "../utils/time";

interface AppCardProps {
  app: Application;
}

interface SyncPhaseGroup {
  phase: string;
  resources: SyncResultResource[];
}

function groupByPhase(resources: SyncResultResource[]): SyncPhaseGroup[] {
  const order = ["PreSync", "Sync", "PostSync"];
  const map = new Map<string, SyncResultResource[]>();

  for (const r of resources) {
    const phase = r.syncPhase ?? "Sync";
    const list = map.get(phase) ?? [];
    list.push(r);
    map.set(phase, list);
  }

  return order
    .filter((p) => map.has(p))
    .map((phase) => ({ phase, resources: map.get(phase)! }));
}

function phaseIcon(hookPhase: string | undefined): string {
  switch (hookPhase) {
    case "Succeeded": return "\u2713";
    case "Failed":
    case "Error": return "\u2717";
    case "Running": return "\u25CB";
    default: return "\u2013";
  }
}

function phaseColorClass(hookPhase: string | undefined): string {
  switch (hookPhase) {
    case "Succeeded": return "dag-phase-ok";
    case "Failed":
    case "Error": return "dag-phase-fail";
    case "Running": return "dag-phase-running";
    default: return "dag-phase-pending";
  }
}

function truncate(str: string, max: number): string {
  if (str.length <= max) return str;
  return str.slice(0, max) + "\u2026";
}

interface ResourceSummary {
  kind: string;
  count: number;
  healthy: number;
  progressing: number;
  degraded: number;
}

function summarizeResources(nodes: ResourceNode[]): ResourceSummary[] {
  const map = new Map<string, ResourceSummary>();

  for (const node of nodes) {
    const existing = map.get(node.kind) ?? {
      kind: node.kind, count: 0, healthy: 0, progressing: 0, degraded: 0,
    };
    existing.count++;
    const health = node.health?.status;
    if (health === "Healthy") existing.healthy++;
    else if (health === "Progressing") existing.progressing++;
    else if (health === "Degraded" || health === "Missing") existing.degraded++;
    map.set(node.kind, existing);
  }

  const kindPriority: Record<string, number> = {
    Deployment: 0, StatefulSet: 1, DaemonSet: 2,
    Service: 3, Ingress: 4, IngressRoute: 5,
    Pod: 6, Job: 7, CronJob: 8,
    ConfigMap: 10, Secret: 11, ExternalSecret: 12,
    PersistentVolumeClaim: 13,
  };

  return Array.from(map.values()).sort((a, b) => {
    const pa = kindPriority[a.kind] ?? 99;
    const pb = kindPriority[b.kind] ?? 99;
    return pa - pb;
  });
}

function summaryIcon(s: ResourceSummary): string {
  if (s.degraded > 0) return "\u2717";
  if (s.progressing > 0) return "\u25CB";
  if (s.healthy === s.count && s.count > 0) return "\u2713";
  return "\u2013";
}

function summaryColorClass(s: ResourceSummary): string {
  if (s.degraded > 0) return "dag-phase-fail";
  if (s.progressing > 0) return "dag-phase-running";
  if (s.healthy === s.count && s.count > 0) return "dag-phase-ok";
  return "dag-phase-pending";
}

export function AppCard({ app }: AppCardProps): React.ReactElement {
  const syncStatus = app.status.sync?.status ?? "Unknown";
  const healthStatus = app.status.health?.status ?? "Unknown";
  const lastSync = app.status.operationState?.finishedAt;
  const allResources = app.status.operationState?.syncResult?.resources ?? [];
  const phases = groupByPhase(allResources);

  const appName = app.metadata.name;
  const appNs = app.metadata.namespace;
  const appUrl = `/applications/${appNs}/${appName}`;

  const [resourceNodes, setResourceNodes] = useState<ResourceNode[]>([]);
  const [treeLoading, setTreeLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    axios
      .get(`/api/v1/applications/${appName}/resource-tree`, {
        params: { appNamespace: appNs },
      })
      .then((res) => {
        if (!cancelled) {
          setResourceNodes(res.data.nodes ?? []);
          setTreeLoading(false);
        }
      })
      .catch(() => {
        if (!cancelled) setTreeLoading(false);
      });
    return () => { cancelled = true; };
  }, [appName, appNs]);

  const resourceSummary = summarizeResources(resourceNodes);

  return (
    <div className="dag-app-card">
      <div className="dag-app-card-header">
        <div className="dag-app-card-badges">
          <span className={`dag-badge dag-sync-${syncStatus.toLowerCase()}`}>
            {syncStatus}
          </span>
          <span className={`dag-badge dag-health-${healthStatus.toLowerCase()}`}>
            {healthStatus}
          </span>
        </div>
        {lastSync && (
          <span className="dag-app-card-time">
            {formatTimestamp(lastSync)}
          </span>
        )}
      </div>

      {phases.map((group) => {
        const isHookPhase = group.phase === "PreSync" || group.phase === "PostSync";
        const displayResources = isHookPhase
          ? group.resources
          : group.resources.filter((r) => r.hookType);
        const appliedCount = isHookPhase
          ? 0
          : group.resources.length - displayResources.length;

        return (
          <div key={group.phase} className="dag-sync-phase">
            <div className="dag-phase-header">{group.phase}</div>
            {displayResources.map((r, idx) => (
              <div key={idx} className={`dag-phase-row ${phaseColorClass(r.hookPhase)}`}>
                <span className="dag-phase-icon">{phaseIcon(r.hookPhase)}</span>
                <span className="dag-phase-label">{r.kind}/{r.name}</span>
                <span className="dag-phase-msg" title={r.message ?? ""}>
                  {r.message ? truncate(r.message, 40) : ""}
                </span>
              </div>
            ))}
            {appliedCount > 0 && (
              <div className="dag-phase-row dag-phase-ok">
                <span className="dag-phase-icon">{"\u2713"}</span>
                <span className="dag-phase-label">
                  {appliedCount} resource{appliedCount !== 1 ? "s" : ""} applied
                </span>
              </div>
            )}
          </div>
        );
      })}

      <div className="dag-resource-section">
        <div className="dag-phase-header">Resources</div>
        {treeLoading && (
          <div className="dag-phase-row dag-phase-pending">
            <span className="dag-phase-icon">{"\u25CB"}</span>
            <span className="dag-phase-label">Loading...</span>
          </div>
        )}
        {resourceSummary.map((s) => (
          <div key={s.kind} className={`dag-phase-row ${summaryColorClass(s)}`}>
            <span className="dag-phase-icon">{summaryIcon(s)}</span>
            <span className="dag-phase-label">
              {s.count} {s.kind}{s.count !== 1 ? "s" : ""}
            </span>
            {s.degraded > 0 && (
              <span className="dag-resource-count dag-count-fail">{s.degraded} degraded</span>
            )}
            {s.progressing > 0 && (
              <span className="dag-resource-count dag-count-running">{s.progressing} in progress</span>
            )}
          </div>
        ))}
        {!treeLoading && resourceSummary.length === 0 && (
          <div className="dag-phase-row dag-phase-pending">
            <span className="dag-phase-icon">{"\u2013"}</span>
            <span className="dag-phase-label">No resources</span>
          </div>
        )}
      </div>

      <div className="dag-app-card-footer">
        <a href={appUrl} className="dag-app-detail-link">View in ArgoCD &rarr;</a>
      </div>
    </div>
  );
}
