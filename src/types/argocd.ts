export interface ApplicationMetadata {
  name: string;
  namespace: string;
  labels?: Record<string, string>;
  annotations?: Record<string, string>;
  creationTimestamp?: string;
}

export interface ApplicationSpec {
  source?: {
    repoURL?: string;
    path?: string;
    targetRevision?: string;
    chart?: string;
    helm?: {
      valueFiles?: string[];
    };
  };
  destination?: {
    server?: string;
    namespace?: string;
  };
  project?: string;
}

export type SyncStatusCode = "Synced" | "OutOfSync" | "Unknown";
export type HealthStatusCode =
  | "Healthy"
  | "Progressing"
  | "Degraded"
  | "Suspended"
  | "Missing"
  | "Unknown";

export interface SyncStatus {
  status: SyncStatusCode;
  revision?: string;
}

export interface HealthStatus {
  status: HealthStatusCode;
  message?: string;
}

export interface OperationPhase {
  phase: "Running" | "Succeeded" | "Failed" | "Error" | "Terminating";
  message?: string;
  startedAt?: string;
  finishedAt?: string;
}

export interface SyncResult {
  resources?: SyncResultResource[];
  revision?: string;
}

export interface SyncResultResource {
  group: string;
  version: string;
  kind: string;
  namespace: string;
  name: string;
  status: string;
  message?: string;
  hookPhase?: string;
  hookType?: string;
  syncPhase?: string;
}

export interface OperationState {
  operation?: {
    sync?: {
      revision?: string;
    };
  };
  phase?: string;
  message?: string;
  syncResult?: SyncResult;
  startedAt?: string;
  finishedAt?: string;
}

export interface ApplicationStatus {
  sync?: SyncStatus;
  health?: HealthStatus;
  operationState?: OperationState;
  reconciledAt?: string;
  resources?: ResourceStatus[];
}

export interface ResourceStatus {
  group?: string;
  version: string;
  kind: string;
  namespace?: string;
  name: string;
  status?: SyncStatusCode;
  health?: HealthStatus;
  hook?: boolean;
}

export interface Application {
  metadata: ApplicationMetadata;
  spec: ApplicationSpec;
  status: ApplicationStatus;
}

export interface ApplicationList {
  items: Application[];
}

export interface ResourceNode {
  group?: string;
  version: string;
  kind: string;
  namespace?: string;
  name: string;
  uid?: string;
  health?: HealthStatus;
  info?: ResourceInfo[];
  parentRefs?: ResourceRef[];
  networkingInfo?: {
    labels?: Record<string, string>;
  };
  createdAt?: string;
  resourceVersion?: string;
}

export interface ResourceInfo {
  name: string;
  value: string;
}

export interface ResourceRef {
  group?: string;
  version: string;
  kind: string;
  namespace?: string;
  name: string;
  uid?: string;
}

export interface ResourceTree {
  nodes: ResourceNode[];
  orphanedNodes?: ResourceNode[];
}
