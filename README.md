# @farhoodliquor/paperclip-adapter-hermes-k8s

Paperclip adapter that runs Hermes agents as isolated Kubernetes Jobs instead of inside the main Paperclip process.

## Features

- Spawns agent runs as K8s Jobs with full pod isolation
- Inherits container image, secrets, DNS, and PVC from the Paperclip Deployment automatically
- Real-time log streaming from Job pods back to the Paperclip UI
- Session resume via shared RWX PVC
- Per-agent concurrency guard
- Configurable resources, namespace, node selectors, tolerations
- Multi-model support (Claude, OpenAI, Gemini, etc.)

## Requirements

### ReadWriteMany (RWX) PersistentVolumeClaim

**This is the most important requirement.** Paperclip must be deployed with a PVC that supports `ReadWriteMany` access mode, mounted at `/paperclip` on the Paperclip Deployment. The adapter automatically discovers this PVC from the running pod and re-mounts it into every agent Job pod at the same path.

The RWX access mode is required because the Paperclip Deployment pod and agent Job pods run concurrently on potentially different nodes, all reading and writing to the same volume. Common storage backends that support RWX include:

- **EFS** (AWS) via the EFS CSI driver
- **Filestore** (GCP) via the Filestore CSI driver
- **Azure Files** (Azure) via the Azure File CSI driver
- **NFS** provisioners (on-prem)
- **Longhorn** with NFS export

Example PVC:

```yaml
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: paperclip-data
  namespace: paperclip
spec:
  accessModes:
    - ReadWriteMany
  resources:
    requests:
      storage: 50Gi
  storageClassName: efs-sc   # adjust to your cluster's RWX-capable StorageClass
```

### Kubernetes RBAC

The Paperclip Deployment's service account needs permissions to create and manage Jobs, list Pods, and stream logs. The adapter also runs a health check on startup that performs a self-subject access review and verifies the PVC and namespace exist.

Below is a complete RBAC example using deployment `paperclip` in namespace `paperclip`:

```yaml
apiVersion: v1
kind: ServiceAccount
metadata:
  name: paperclip
  namespace: paperclip
---
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  name: paperclip-adapter
  namespace: paperclip
rules:
  # Core: create and manage agent Jobs
  - apiGroups: ["batch"]
    resources: ["jobs"]
    verbs: ["create", "get", "list", "delete"]

  # Core: find Job pods and read their status/exit codes
  - apiGroups: [""]
    resources: ["pods"]
    verbs: ["get", "list"]

  # Core: stream real-time logs from agent containers
  - apiGroups: [""]
    resources: ["pods/log"]
    verbs: ["get"]

  # Health check: verify PVC exists and is RWX
  - apiGroups: [""]
    resources: ["persistentvolumeclaims"]
    verbs: ["get"]

  # Health check: verify provider API key secret exists
  - apiGroups: [""]
    resources: ["secrets"]
    verbs: ["get"]
---
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata:
  name: paperclip-adapter
  namespace: paperclip
subjects:
  - kind: ServiceAccount
    name: paperclip
    namespace: paperclip
roleRef:
  kind: Role
  name: paperclip-adapter
  apiGroup: rbac.authorization.k8s.io
```

If the adapter needs to create Jobs in a **different namespace** than the one Paperclip runs in (via the `namespace` config option), you will also need a ClusterRole or an additional Role/RoleBinding in that target namespace, plus permission to read namespace objects:

```yaml
# Only required when running Jobs in a different namespace
- apiGroups: [""]
  resources: ["namespaces"]
  verbs: ["get"]
```

The adapter also uses `SelfSubjectAccessReview` during health checks to verify its own RBAC permissions. This is typically allowed by default for all authenticated service accounts and does not require an explicit rule.

### API Key Secret

The adapter expects a Kubernetes Secret (default name: `paperclip-secrets`) in the same namespace, containing the API keys for your chosen AI provider:

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: paperclip-secrets
  namespace: paperclip
type: Opaque
stringData:
  ANTHROPIC_API_KEY: "sk-ant-..."
  # or for AWS Bedrock:
  # AWS_BEARER_TOKEN_BEDROCK: "..."
  # or for other providers:
  # OPENAI_API_KEY: "sk-..."
  # GOOGLE_GENERATIVE_AI_API_KEY: "..."
```

Mount this secret as a volume on the Paperclip Deployment; the adapter automatically propagates all secret-backed volumes to agent Job pods.

### Paperclip Deployment Example

A minimal Deployment spec showing the required volume mounts:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: paperclip
  namespace: paperclip
spec:
  replicas: 1
  selector:
    matchLabels:
      app: paperclip
  template:
    metadata:
      labels:
        app: paperclip
    spec:
      serviceAccountName: paperclip
      containers:
        - name: paperclip
          image: your-registry/paperclip:latest
          volumeMounts:
            - name: data
              mountPath: /paperclip
            - name: secrets
              mountPath: /etc/paperclip/secrets
              readOnly: true
          env:
            - name: ANTHROPIC_API_KEY
              valueFrom:
                secretKeyRef:
                  name: paperclip-secrets
                  key: ANTHROPIC_API_KEY
      volumes:
        - name: data
          persistentVolumeClaim:
            claimName: paperclip-data
        - name: secrets
          secret:
            secretName: paperclip-secrets
```

### Software Dependencies

- `@paperclipai/adapter-utils` >= 0.3.0
- Kubernetes cluster v1.21+

## Installation

### Via Paperclip Adapter Manager

```bash
curl -X POST http://localhost:3100/api/adapters \
  -H "Content-Type: application/json" \
  -d '{"packageName": "@farhoodliquor/paperclip-adapter-hermes-k8s"}'
```

### Local Development

```bash
curl -X POST http://localhost:3100/api/adapters \
  -H "Content-Type: application/json" \
  -d '{"localPath": "/path/to/paperclip-adapter-hermes-k8s"}'
```

## Configuration

All fields are configurable per-agent in the Paperclip UI or via the agent config API.

### Core

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `model` | string | **yes** | Hermes model in `provider/model` format (e.g. `anthropic/claude-sonnet-4-6`) |
| `provider` | string | no | AI provider (`anthropic`, `openai`, `google`, `openrouter`, `nous`). Auto-detected from model name if omitted |
| `variant` | string | no | Provider-specific reasoning variant |
| `promptTemplate` | string | no | Prompt template with `{{agent.id}}`, `{{runId}}`, etc. |
| `bootstrapPromptTemplate` | string | no | First-run prompt template (used only when no existing session) |
| `extraArgs` | string | no | Additional CLI args appended to the hermes run command |
| `env` | JSON | no | Environment variable overrides as `{"KEY": "VALUE"}` pairs |
| `dangerouslySkipPermissions` | bool | no | Inject runtime config with `permission.external_directory=allow` (default: `true`) |

### Kubernetes

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `namespace` | string | auto-detected | K8s namespace for agent Jobs |
| `image` | string | Deployment image | Override container image for Job pods |
| `imagePullPolicy` | string | `IfNotPresent` | `IfNotPresent`, `Always`, or `Never` |
| `serviceAccountName` | string | namespace default | Service account for Job pods |
| `kubeconfig` | string | in-cluster | Path to kubeconfig file |
| `cwd` | string | `/paperclip` | Working directory inside the container |
| `resources` | JSON | see below | CPU/memory requests and limits |
| `nodeSelector` | JSON | — | Node selector labels |
| `tolerations` | JSON | — | Pod tolerations |
| `labels` | JSON | — | Extra labels applied to Job and Pod |
| `ttlSecondsAfterFinished` | number | `300` | Seconds to retain completed Jobs |
| `retainJobs` | bool | `false` | Keep completed Jobs for debugging |

Default resource allocation for agent Job containers:

```yaml
resources:
  requests:
    cpu: "1000m"
    memory: "2Gi"
  limits:
    cpu: "4000m"
    memory: "8Gi"
```

### Operational

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `timeoutSec` | number | `0` | Run timeout in seconds (`0` = no timeout) |
| `graceSec` | number | `60` | Grace period in seconds before force-killing |

## Security

Agent Job pods run with a hardened security context:

- `runAsNonRoot: true` (UID 1000, GID 1000)
- All Linux capabilities dropped
- Privilege escalation disabled
- Secret volumes mounted read-only

## License

MIT
