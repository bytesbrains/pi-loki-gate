import { Type } from "typebox";
import type { ExtensionContext } from "@earendil-works/pi-coding-agent";
import { loadConfig } from "../config";
import { lokiQuery, formatLogOutput } from "../helpers";

/** Escape backticks to prevent LogQL injection via user input. */
function escapeLogQL(value: string): string {
  return value.replace(/`/g, '\\`');
}

// ─── Query Logs ───────────────────────────────────────────────────────────────

export const queryLogsTool = {
  name: "loki_query" as const,
  label: "Query Loki Logs",
  description:
    "Run a LogQL query against the Grafana Loki log aggregator. Returns matching log entries with timestamps and container labels. Available labels: service_name (worker|orchestrator), service, agent. Use for free-form log exploration.",
  parameters: Type.Object({
    query: Type.String({
      description:
        'LogQL query string (e.g. \'{service_name="worker"}\', \'{service_name="orchestrator"} |= "error"\', etc.)',
    }),
    limit: Type.Optional(Type.Number({ description: "Max log lines to return (default: 100)" })),
  }),
  async execute(_id: string, params: any, _s: any, _u: any, ctx: ExtensionContext) {
    const config = loadConfig(ctx.cwd);
    const limit = params.limit || config.defaultLimit;

    const result = await lokiQuery(config, params.query, limit);

    if (!result.ok) {
      return {
        content: [
          {
            type: "text",
            text: `❌ Loki query failed: ${result.error}\n   Query: ${result.query}`,
          },
        ],
        isError: true,
        details: { query: result.query },
      };
    }

    const entries = result.entries!;
    const output = formatLogOutput(entries, limit, true);

    return {
      content: [{ type: "text", text: output }],
      details: { query: result.query, count: entries.length },
    };
  },
};

// ─── Job Logs ──────────────────────────────────────────────────────────────────

export const jobLogsTool = {
  name: "loki_job_logs" as const,
  label: "Get Job Logs from Loki",
  description:
    "Fetch logs for a specific wrok.in factory job by searching for its job ID across worker and orchestrator logs. Matches log lines containing the job ID.",
  parameters: Type.Object({
    jobId: Type.String({ description: "Factory job ID (e.g. 'af57818e')" }),
    limit: Type.Optional(Type.Number({ description: "Max log lines (default: 200)" })),
  }),
  async execute(_id: string, params: any, _s: any, _u: any, ctx: ExtensionContext) {
    const config = loadConfig(ctx.cwd);
    const limit = params.limit || 200;
    const query = `{service_name=~"worker|orchestrator"} |= \`${escapeLogQL(params.jobId)}\``;

    const result = await lokiQuery(config, query, limit);

    if (!result.ok) {
      return {
        content: [
          {
            type: "text",
            text: `❌ Failed to get job logs: ${result.error}\n   Job: ${params.jobId}`,
          },
        ],
        isError: true,
        details: { jobId: params.jobId },
      };
    }

    const entries = result.entries!;
    if (entries.length === 0) {
      return {
        content: [
          {
            type: "text",
            text: `No log entries found for job "${params.jobId}".\n\nTry loki_query() with a broader query, or check if Loki is receiving logs.`,
          },
        ],
        details: { jobId: params.jobId, count: 0 },
      };
    }

    const output = formatLogOutput(entries, limit, false);

    return {
      content: [{ type: "text", text: output }],
      details: { jobId: params.jobId, count: entries.length },
    };
  },
};

// ─── Worker Logs ───────────────────────────────────────────────────────────────

export const workerLogsTool = {
  name: "loki_worker_logs" as const,
  label: "Get Worker Logs from Loki",
  description:
    "Fetch logs from a worker container via Loki. Filters by service_name (worker/orchestrator) and agent. Use docker_worker_logs for per-container granularity.",
  parameters: Type.Object({
    worker: Type.Optional(
      Type.String({
        description: 'Worker number or name (e.g. "1", "worker-1"). Filters to service_name="worker".',
      }),
    ),
    container: Type.Optional(
      Type.String({
        description: "Container name (e.g. 'ai-factory-worker-1', 'ai-factory-orchestrator'). Maps to service_name filter.",
      }),
    ),
    search: Type.Optional(Type.String({ description: "Text to search for in log lines" })),
    limit: Type.Optional(Type.Number({ description: "Max log lines (default: 100)" })),
  }),
  async execute(_id: string, params: any, _s: any, _u: any, ctx: ExtensionContext) {
    const config = loadConfig(ctx.cwd);
    const limit = params.limit || config.defaultLimit;

    // Build service filter (Loki labels: service_name=worker|orchestrator)
    let serviceFilter = `service_name=~"worker|orchestrator"`;
    if (params.container) {
      if (params.container.includes("orchestrator")) {
        serviceFilter = `service_name="orchestrator"`;
      } else if (params.container.includes("worker")) {
        serviceFilter = `service_name="worker"`;
      }
    } else if (params.worker) {
      serviceFilter = `service_name="worker"`;
    }

    let query = `{${serviceFilter}}`;
    if (params.search) {
      query += ` |= \`${escapeLogQL(params.search)}\``;
    }

    const result = await lokiQuery(config, query, limit);

    if (!result.ok) {
      return {
        content: [
          {
            type: "text",
            text: `❌ Failed to get worker logs: ${result.error}\n   Query: ${query}`,
          },
        ],
        isError: true,
        details: { query },
      };
    }

    const entries = result.entries!;
    if (entries.length === 0) {
      return {
        content: [
          {
            type: "text",
            text: `No log entries found for the specified worker.\n   Query: ${query}`,
          },
        ],
        details: { query, count: 0 },
      };
    }

    const output = formatLogOutput(entries, limit, false);

    return {
      content: [{ type: "text", text: output }],
      details: { query, count: entries.length },
    };
  },
};
