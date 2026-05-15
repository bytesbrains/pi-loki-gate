/**
 * pi-loki-gate — Types
 */

export interface LokiConfig {
  /** Base URL of the Loki instance (e.g. http://localhost:3100) */
  lokiUrl: string;
  /** Default line limit for queries */
  defaultLimit: number;
}

export const DEFAULT_CONFIG: LokiConfig = {
  lokiUrl: "http://localhost:3100",
  defaultLimit: 100,
};

// ── Loki API Types ──

export interface LokiQueryResult {
  status: string;
  data: {
    resultType: string;
    result: LokiStream[];
  };
}

export interface LokiStream {
  stream: Record<string, string>;
  values: Array<[string, string]>; // [timestamp_ns, log_line]
}

export interface LokiLogEntry {
  timestamp: string; // ISO 8601
  line: string;
  labels: Record<string, string>;
}
