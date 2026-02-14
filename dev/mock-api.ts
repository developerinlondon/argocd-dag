import axios from "axios";
import {
  Application,
  ApplicationList,
  ResourceTree,
  SyncStatusCode,
  HealthStatusCode,
  SyncResultResource,
  OperationState,
} from "../src/types/argocd";

const REVISION = "a1b2c3d4e5f6789012345678abcdef0123456789";
const ARGOCD_NS = "argocd";
const NOW = new Date().toISOString();

function minutesAgo(minutes: number): string {
  return new Date(Date.now() - minutes * 60_000).toISOString();
}

function makeOperationState(
  phase: string,
  hookResources?: SyncResultResource[]
): OperationState {
  const resources: SyncResultResource[] = hookResources ?? [];
  return {
    operation: { sync: { revision: REVISION } },
    phase,
    syncResult: { resources, revision: REVISION },
    startedAt: minutesAgo(5),
    finishedAt: phase === "Running" ? undefined : minutesAgo(4),
  };
}

function makeHook(
  name: string,
  hookType: "PreSync" | "PostSync",
  hookPhase: "Succeeded" | "Failed" | "Running"
): SyncResultResource {
  return {
    group: "batch",
    version: "v1",
    kind: "Job",
    namespace: "argocd",
    name,
    status: hookPhase === "Succeeded" ? "Synced" : "OutOfSync",
    hookType,
    hookPhase,
    syncPhase: hookType,
    message:
      hookPhase === "Failed"
        ? "job failed: BackoffLimitExceeded"
        : hookPhase === "Running"
          ? "job is running"
          : "job completed",
  };
}

function makeApp(
  name: string,
  category: string,
  destNamespace: string,
  syncStatus: SyncStatusCode,
  healthStatus: HealthStatusCode,
  operationState?: OperationState
): Application {
  return {
    metadata: {
      name,
      namespace: ARGOCD_NS,
      labels: { "jeebon.ai/category": category },
      creationTimestamp: minutesAgo(60 * 24),
    },
    spec: {
      source: {
        repoURL: "https://gitlab.com/jeebon/jeebon.git",
        path: `gitops/apps/${category}/${name}`,
        targetRevision: "HEAD",
      },
      destination: {
        server: "https://kubernetes.default.svc",
        namespace: destNamespace,
      },
      project: "default",
    },
    status: {
      sync: { status: syncStatus, revision: REVISION },
      health: { status: healthStatus },
      operationState: operationState ?? makeOperationState("Succeeded"),
      reconciledAt: minutesAgo(1),
    },
  };
}

const MOCK_APPLICATIONS: Application[] = [
  makeApp("argocd", "foundation", "argocd", "Synced", "Healthy"),
  makeApp("traefik", "foundation", "kube-system", "Synced", "Healthy"),
  makeApp("dex", "foundation", "argocd", "Synced", "Healthy"),
  makeApp("cert-manager", "foundation", "cert-manager", "Synced", "Healthy"),
  makeApp("kargo", "foundation", "kargo", "Synced", "Healthy"),
  makeApp("oauth2-proxy", "foundation", "infra", "Synced", "Healthy"),
  makeApp("argo-rollouts", "foundation", "argo-rollouts", "Synced", "Healthy"),

  makeApp("eso", "operators", "infra", "Synced", "Healthy"),
  makeApp("crossplane", "operators", "crossplane-system", "Synced", "Healthy"),
  makeApp(
    "provider-cloudflare",
    "operators",
    "crossplane-system",
    "Synced",
    "Healthy"
  ),

  makeApp(
    "kube-prometheus-stack",
    "monitoring",
    "monitoring",
    "Synced",
    "Healthy"
  ),
  makeApp("loki", "monitoring", "monitoring", "Synced", "Healthy"),
  makeApp("alloy", "monitoring", "monitoring", "Synced", "Healthy"),
  makeApp(
    "r2-logs-bucket",
    "monitoring",
    "monitoring",
    "OutOfSync",
    "Healthy"
  ),

  makeApp("openbao", "secrets", "infra", "Synced", "Healthy"),
  makeApp("secret-store", "secrets", "infra", "Synced", "Healthy"),

  makeApp("postgres", "database", "jeebon-test", "Synced", "Healthy",
    makeOperationState("Succeeded", [
      makeHook("postgres-verify", "PostSync", "Succeeded"),
    ])
  ),
  makeApp("mariadb", "database", "jeebon-test", "Synced", "Healthy"),
  makeApp("redis", "database", "jeebon-test", "Synced", "Healthy"),

  makeApp("zitadel", "auth", "jeebon-test", "Synced", "Healthy",
    makeOperationState("Succeeded", [
      makeHook("zitadel-presync-migration", "PreSync", "Succeeded"),
      makeHook("zitadel-postsync-verify", "PostSync", "Succeeded"),
    ])
  ),

  makeApp("temporal", "workflows", "jeebon-test", "Synced", "Healthy"),

  makeApp("seafile", "content", "jeebon-test", "Synced", "Healthy",
    makeOperationState("Succeeded", [
      makeHook("seafile-postsync-verify", "PostSync", "Succeeded"),
    ])
  ),
  makeApp("paperless", "content", "jeebon-test", "OutOfSync", "Healthy",
    makeOperationState("Failed", [
      makeHook("paperless-postsync-verify", "PostSync", "Failed"),
    ])
  ),
  makeApp("immich", "content", "jeebon-test", "Synced", "Progressing"),
];

const MOCK_APP_LIST: ApplicationList = { items: MOCK_APPLICATIONS };

function makeMockResourceTree(appName: string): ResourceTree {
  return {
    nodes: [
      {
        group: "apps",
        version: "v1",
        kind: "Deployment",
        namespace: "jeebon-test",
        name: appName,
        uid: `uid-deploy-${appName}`,
        health: { status: "Healthy" },
        createdAt: minutesAgo(60),
      },
      {
        group: "",
        version: "v1",
        kind: "Service",
        namespace: "jeebon-test",
        name: appName,
        uid: `uid-svc-${appName}`,
        health: { status: "Healthy" },
        createdAt: minutesAgo(60),
      },
      {
        group: "batch",
        version: "v1",
        kind: "Job",
        namespace: "jeebon-test",
        name: `${appName}-postsync-verify`,
        uid: `uid-hook-${appName}`,
        health: { status: "Healthy" },
        createdAt: minutesAgo(5),
      },
    ],
  };
}

export function installMockApi(): void {
  axios.interceptors.request.use((config) => {
    const url = config.url ?? "";

    if (url === "/api/v1/applications") {
      return Promise.reject({
        __mock: true,
        response: { status: 200, data: MOCK_APP_LIST },
      });
    }

    const treeMatch = url.match(/^\/api\/v1\/applications\/([^/]+)\/resource-tree/);
    if (treeMatch) {
      const name = treeMatch[1];
      return Promise.reject({
        __mock: true,
        response: { status: 200, data: makeMockResourceTree(name) },
      });
    }

    return config;
  });

  axios.interceptors.response.use(
    (response) => response,
    (error: unknown) => {
      if (
        error !== null &&
        typeof error === "object" &&
        "__mock" in error
      ) {
        const mockError = error as { __mock: boolean; response: { status: number; data: unknown } };
        return Promise.resolve(mockError.response);
      }
      return Promise.reject(error);
    }
  );
}
