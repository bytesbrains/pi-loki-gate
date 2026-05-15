import * as fs from "node:fs";
import * as path from "node:path";
import type { LokiConfig } from "./types";
import { DEFAULT_CONFIG } from "./types";

export function loadConfig(cwd: string): LokiConfig {
  const configPath = path.join(cwd, ".lokirc.yml");
  if (!fs.existsSync(configPath)) return { ...DEFAULT_CONFIG };
  try {
    const content = fs.readFileSync(configPath, "utf-8");
    const result: Record<string, unknown> = {};
    for (const line of content.split("\n")) {
      const m = line.match(/^\s*(\w[\w.]*):\s*(.+)$/);
      if (m) {
        let val = m[2].trim();
        if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
          val = val.slice(1, -1);
        }
        result[m[1]] = val;
      }
    }
    return {
      lokiUrl: (result["lokiUrl"] as string) || DEFAULT_CONFIG.lokiUrl,
      defaultLimit: parseInt(result["defaultLimit"] as string) || DEFAULT_CONFIG.defaultLimit,
    };
  } catch {
    return { ...DEFAULT_CONFIG };
  }
}
