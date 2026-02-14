import * as React from "react";
import { SyncResultResource } from "../types/argocd";

interface HookStatusProps {
  hooks: SyncResultResource[];
}

function phaseClass(phase: string | undefined): string {
  switch (phase) {
    case "Succeeded":
      return "dag-hook-badge dag-hook-succeeded";
    case "Failed":
    case "Error":
      return "dag-hook-badge dag-hook-failed";
    case "Running":
      return "dag-hook-badge dag-hook-running";
    default:
      return "dag-hook-badge dag-hook-unknown";
  }
}

function phaseIcon(phase: string | undefined): string {
  switch (phase) {
    case "Succeeded":
      return "OK";
    case "Failed":
    case "Error":
      return "X";
    case "Running":
      return "...";
    default:
      return "?";
  }
}

export function HookStatus({ hooks }: HookStatusProps): React.ReactElement | null {
  if (hooks.length === 0) {
    return null;
  }

  return (
    <div className="dag-hook-status">
      {hooks.map((hook, idx) => (
        <span key={idx} className={phaseClass(hook.hookPhase)} title={hook.message ?? ""}>
          {hook.hookType ?? hook.syncPhase}: {phaseIcon(hook.hookPhase)}
        </span>
      ))}
    </div>
  );
}
