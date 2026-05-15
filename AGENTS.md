# Loki Gate — Agent Usage Guide

> You are an AI agent. Use loki-gate tools to query structured logs from Grafana Loki.
> For complete raw container output (including console.log), use docker-logs tools.

## Quickstart

```bash
loki_query(query='{service_name="worker"}')                        # Raw LogQL query
loki_job_logs(jobId="af57818e")                                    # Logs for a specific job
loki_worker_logs(worker="1")                                       # Logs from workers
```

## Available Labels

Loki in wrok.in uses these labels:

| Label | Values | Description |
|-------|--------|-------------|
| `service_name` | `worker`, `orchestrator`, `unknown` | Which service produced the log |
| `service` | `worker`, `orchestrator`, `unknown` | Same as service_name |
| `agent` | `developer`, `code-reviewer`, etc. | Which agent was running |

No per-container labels exist — use `docker_worker_logs` for per-container granularity.

## Tools

### loki_query

Run an arbitrary LogQL query against Loki. Best for exploring structured application logs.

```bash
loki_query(query='{service_name="orchestrator"}')
loki_query(query='{service_name="worker"} |= "error"')
loki_query(query='{service_name="worker",agent="developer"}', limit=50)
```

### loki_job_logs

Fetch log lines containing a specific factory job ID. Searches across worker and orchestrator logs.

> **Note:** Only finds jobs in structured JSON log lines. Console output ("Job X complete") is only in Docker logs. Use `docker_worker_logs` or `docker_container_logs` for complete job output.

```bash
loki_job_logs(jobId="af57818e")
loki_job_logs(jobId="e81f04e9", limit=500)
```

### loki_worker_logs

Fetch logs from workers or orchestrator via Loki. Filters by `service_name`.

```bash
loki_worker_logs(worker="1")
loki_worker_logs(worker="3", search="error")
loki_worker_logs(container="ai-factory-orchestrator", search="dispatch")
```

## Configuration

`.lokirc.yml`:

| Key | Default | Description |
|-----|---------|-------------|
| `lokiUrl` | `http://localhost:3100` | Grafana Loki API URL |
| `defaultLimit` | `100` | Default log lines per query |

## Loki vs Docker

| | Loki (`loki_*`) | Docker (`docker_*`) |
|---|---|---|
| **Captures** | Structured JSON logs only | All stdout/stderr (console.log + JSON) |
| **Filtering** | Label-based (agent, service) | Text search (`search` param) |
| **Per-container** | ❌ No container_name label | ✅ Exact container targeting |
| **Best for** | Exploring by service/agent, error aggregation | Complete job/worker output, console messages |
| **Requires** | Loki running (port 3100) | Docker CLI + socket access |

## Troubleshooting

| Problem | Solution |
|---------|----------|
| `loki_query()` returns nothing | Verify Loki is running: `curl http://localhost:3100/ready` |
| Labels wrong | Available: `agent`, `service`, `service_name`. Check: `curl http://localhost:3100/loki/api/v1/labels` |
| Job logs empty | Job ID is likely in console.log, not structured JSON. Use `docker_worker_logs` instead. |
