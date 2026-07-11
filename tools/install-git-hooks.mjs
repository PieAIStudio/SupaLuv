import { existsSync } from "node:fs";
import { spawnSync } from "node:child_process";

if (!existsSync(new URL("../.git", import.meta.url))) {
  console.log("Skipping Lefthook install outside a Git checkout");
  process.exit(0);
}

const command = process.platform === "win32" ? "lefthook.cmd" : "lefthook";
const result = spawnSync(command, ["install"], { stdio: "inherit" });

if (result.error) {
  throw result.error;
}

process.exit(result.status ?? 1);
