/**
 * pi-loki-gate — Loki Log Gateway
 *
 * Tools: loki_query, loki_job_logs, loki_worker_logs
 * Config: .lokirc.yml
 */
import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { queryLogsTool, jobLogsTool, workerLogsTool } from "./tools/query";

export default function (pi: ExtensionAPI) {
  pi.registerTool(queryLogsTool);
  pi.registerTool(jobLogsTool);
  pi.registerTool(workerLogsTool);
}
