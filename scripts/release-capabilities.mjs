import { mkdirSync, writeFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
const commit = process.env.SOURCE_SHA || execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim();
if (!/^[a-f0-9]{40}$/.test(commit)) throw new Error("An exact SOURCE_SHA is required");
mkdirSync("dist", { recursive: true });
writeFileSync("dist/release-capabilities.json", JSON.stringify({ schemaVersion: 1, role: "website", commit,
  paidContracts: [], assetActions: [], intentFormats: ["x402-v2", "mcp-2025-06-18", "review-protocol-2"], workerFormats: [] }, null, 2)+"\n");
