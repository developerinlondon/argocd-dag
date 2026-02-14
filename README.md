# argocd-dag

ArgoCD UI extension that visualizes platform layers as an interactive DAG (Directed Acyclic Graph).

## Features

- **Layer-based DAG**: Groups ArgoCD applications by category label into platform layers
- **Dependency arrows**: Shows layer dependencies with animated edges
- **Health at a glance**: Color-coded status indicators (green/yellow/red) per layer
- **Expand to drill down**: Click any layer to see individual apps with sync/health badges
- **Hook results**: Shows PreSync/PostSync hook outcomes per app
- **Auto-refresh**: Polls `/api/v1/applications` every 10 seconds
- **Dark theme**: Matches ArgoCD's UI aesthetic

## How it works

Applications are grouped by the `jeebon.ai/category` label into layers defined in `src/config/layers.ts`. The DAG is laid out using dagre and rendered with react-flow.

### Default layers

```
Foundation → Operators → Secrets → Database → Auth → Workflows → Content
             Monitoring ↗                      ↗
```

## Install

### 1. Download the extension

Download `extension.tar` from the [latest release](https://github.com/developerinlondon/argocd-dag/releases/latest).

### 2. Add init container to ArgoCD server

In your ArgoCD Helm values:

```yaml
server:
  extensions:
    enabled: true
    extensionList:
      - name: argocd-dag
        env:
          - name: EXTENSION_URL
            value: https://github.com/developerinlondon/argocd-dag/releases/download/v1.0.0/extension.tar
```

Or mount the extension manually via an init container:

```yaml
server:
  extensions:
    enabled: true
  initContainers:
    - name: argocd-dag
      image: busybox
      command: [sh, -c]
      args:
        - |
          wget -qO- https://github.com/developerinlondon/argocd-dag/releases/download/v1.0.0/extension.tar | tar xf - -C /tmp/extensions/
      volumeMounts:
        - name: extensions
          mountPath: /tmp/extensions/
```

### 3. Label your ApplicationSets

Add the category label to your ArgoCD applications:

```yaml
metadata:
  labels:
    jeebon.ai/category: foundation  # or: operators, monitoring, secrets, database, auth, workflows, content
```

## Development

```bash
bun install
bun run dev    # starts dev server on http://localhost:3000 with mock data
bun run build  # produces dist/extension.tar
```

### Customizing layers

Edit `src/config/layers.ts` to change the layer names, ordering, and dependency graph.

## License

MIT
