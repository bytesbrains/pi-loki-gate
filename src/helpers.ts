import type { LokiConfig, LokiQueryResult, LokiLogEntry } from "./types";

/**
 * Query Loki for log entries using LogQL.
 */
export async function lokiQuery(
  config: LokiConfig,
  query: string,
  limit: number = config.defaultLimit,
  direction: "forward" | "backward" = "backward",
): Promise<{ ok: boolean; entries?: LokiLogEntry[]; error?: string; query: string }> {
  const url = `${config.lokiUrl.replace(/\/$/, "")}/loki/api/v1/query_range`;
  const nowNs = String(Date.now() * 1_000_000);
  const oneHourAgoNs = String((Date.now() - 3600 * 1000) * 1_000_000);

  const params = new URLSearchParams({
    query,
    start: oneHourAgoNs,
    end: nowNs,
    limit: String(limit),
    direction,
  });

  try {
    const res = await fetch(`${url}?${params}`, {
      headers: { Accept: "application/json" },
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      return { ok: false, error: `Loki returned ${res.status}: ${text.slice(0, 200)}`, query };
    }

    const data = (await res.json()) as LokiQueryResult;

    if (data.status !== "success") {
      return { ok: false, error: `Loki query failed: ${JSON.stringify(data).slice(0, 200)}`, query };
    }

    const entries: LokiLogEntry[] = [];
    for (const stream of data.data.result) {
      for (const [tsNs, line] of stream.values) {
        const ts = new Date(parseInt(tsNs) / 1_000_000).toISOString();
        entries.push({ timestamp: ts, line, labels: stream.stream });
      }
    }

    // Sort by timestamp
    entries.sort((a, b) => a.timestamp.localeCompare(b.timestamp));

    return { ok: true, entries, query };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return { ok: false, error: msg, query };
  }
}

/**
 * Format a single log entry for display.
 */
export function formatLogEntry(entry: LokiLogEntry, showLabels: boolean = false): string {
  const ts = entry.timestamp.slice(0, 19).replace("T", " ");
  const container = entry.labels.service_name || entry.labels.service || "";
  const prefix = container ? `${ts} [${container}]` : ts;
  if (showLabels) {
    const labelStr = Object.entries(entry.labels)
      .map(([k, v]) => `${k}=${v}`)
      .join(", ");
    return `${prefix} ${entry.line}  # ${labelStr}`;
  }
  return `${prefix} ${entry.line}`;
}

/**
 * Format log entries with truncation for display.
 */
export function formatLogOutput(
  entries: LokiLogEntry[],
  maxLines: number,
  showLabels: boolean = false,
): string {
  if (entries.length === 0) return "No log entries found.";

  const total = entries.length;
  const truncated = total > maxLines;

  let output = entries
    .slice(truncated ? total - maxLines : 0)
    .map((e) => formatLogEntry(e, showLabels))
    .join("\n");

  if (truncated) {
    output = `... [${total - maxLines} lines truncated] ...\n${output}`;
  }

  output = `📋 ${total} log entries${truncated ? ` (showing last ${maxLines})` : ""}\n\n${output}`;
  return output;
}
