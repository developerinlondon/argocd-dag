import * as React from "react";
import { Application, SyncResultResource } from "../types/argocd";
import { HookStatus } from "./HookStatus";

interface AppCardProps {
  app: Application;
}

function formatTimestamp(ts: string | undefined): string {
  if (!ts) return "";
  const date = new Date(ts);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60_000);

  if (diffMin < 1) return "just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHrs = Math.floor(diffMin / 60);
  if (diffHrs < 24) return `${diffHrs}h ago`;
  const diffDays = Math.floor(diffHrs / 24);
  return `${diffDays}d ago`;
}

function extractHooks(app: Application): SyncResultResource[] {
  const resources =
    app.status.operationState?.syncResult?.resources ?? [];
  return resources.filter(
    (r) => r.hookType === "PreSync" || r.hookType === "PostSync"
  );
}

export function AppCard({ app }: AppCardProps): React.ReactElement {
  const syncStatus = app.status.sync?.status ?? "Unknown";
  const healthStatus = app.status.health?.status ?? "Unknown";
  const lastSync = app.status.operationState?.finishedAt;
  const hooks = extractHooks(app);

  const appUrl = `/applications/${app.metadata.namespace}/${app.metadata.name}`;

  return (
    <div className="dag-app-card">
      <div className="dag-app-card-header">
        <a
          href={appUrl}
          className="dag-app-card-name"
          onClick={(e) => {
            e.stopPropagation();
          }}
        >
          {app.metadata.name}
        </a>
        {lastSync && (
          <span className="dag-app-card-time">
            {formatTimestamp(lastSync)}
          </span>
        )}
      </div>
      <div className="dag-app-card-badges">
        <span className={`dag-badge dag-sync-${syncStatus.toLowerCase()}`}>
          {syncStatus}
        </span>
        <span className={`dag-badge dag-health-${healthStatus.toLowerCase()}`}>
          {healthStatus}
        </span>
      </div>
      <HookStatus hooks={hooks} />
    </div>
  );
}
