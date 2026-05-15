# pi-loki-gate

Loki log gateway for pi agents — query Grafana Loki for structured application logs from the [wrok.in](https://github.com/nandal/wrok.in) AI Factory.

For raw Docker container output (console.log + everything), use [pi-docker-logs](../docker-logs).

## Install

```bash
pi install npm:@bytesbrains/pi-loki-gate
```

## Configuration

Add a `.lokirc.yml` to your repo root:

```yaml
lokiUrl: http://localhost:3100
defaultLimit: 100
```

| Key | Default | Description |
|-----|---------|-------------|
| `lokiUrl` | `http://localhost:3100` | Grafana Loki API URL |
| `defaultLimit` | `100` | Default log lines per query |

## Available Labels

| Label | Values | Description |
|-------|--------|-------------|
| `service_name` | `worker`, `orchestrator` | Service producing the log |
| `service` | `worker`, `orchestrator` | Same as service_name |
| `agent` | `developer`, etc. | Agent running the task |

## Tools

### loki_query

Run arbitrary LogQL queries against Loki.

```
loki_query(query='{service_name="orchestrator"}')
loki_query(query='{service_name="worker"} |= "error"', limit=50)
```

### loki_job_logs

Fetch logs for a specific factory job by its ID.

> **Note:** Only matches structured JSON log lines. Console output like "Job X complete" is only in Docker logs — use `docker_worker_logs` for full output.

```
loki_job_logs(jobId="af57818e")
```

### loki_worker_logs

Fetch logs from workers or orchestrator via Loki.

```
loki_worker_logs(worker="1")
loki_worker_logs(worker="3", search="error")
loki_worker_logs(container="ai-factory-orchestrator")
```

## Loki vs Docker Logs

| | Loki | Docker Logs |
|---|---|---|
| Captures | Structured JSON only | All stdout/stderr |
| Per-container | ❌ | ✅ |
| Label filtering | ✅ (agent, service) | ❌ (text search) |
| Best for | Service/agent exploration, error patterns | Complete job output, console messages |

## License

MIT
