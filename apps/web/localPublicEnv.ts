import { existsSync, readFileSync } from "node:fs";
import { parse } from "dotenv";

type EnvTarget = Record<string, string | undefined>;

export function loadPublicEnvFile(path: string, target: EnvTarget = process.env): boolean {
  if (!existsSync(path)) {
    return false;
  }

  const values = parse(readFileSync(path, "utf8"));
  for (const key of Object.keys(values)) {
    if (!key.startsWith("VITE_")) {
      throw new Error(`Public env file must not contain ${key}. Move it to local.server.env.`);
    }
  }

  for (const [key, value] of Object.entries(values)) {
    if (!target[key]) {
      target[key] = value;
    }
  }
  return true;
}
