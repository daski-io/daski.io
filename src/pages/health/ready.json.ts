import type { APIRoute } from "astro";
import { networkConfig } from "../../lib/network.ts";

export const prerender = false;
export const GET: APIRoute = async () => {
  const env = (globalThis as { process?: { env?: Record<string, string | undefined> } }).process?.env;
  const commit = env?.RELEASE_SOURCE_SHA || env?.RAILWAY_GIT_COMMIT_SHA || "";

  // An invalid network configuration fails readiness loudly instead of the
  // instance quietly serving another network. The network is reported so a
  // smoke check can assert which instance it is talking to.
  let network: { id: string; gateway: string | null } | null = null;
  let error: string | null = null;
  try {
    const config = networkConfig();
    network = { id: config.id, gateway: config.gatewayUrl };
  } catch (configError) {
    error = configError instanceof Error ? configError.message : String(configError);
  }

  const ready = /^[a-f0-9]{40}$/.test(commit) && error === null;
  const body = { status: ready ? "ready" : "not_ready", commit, network, ...(error ? { error } : {}) };
  return new Response(JSON.stringify(body), {
    status: ready ? 200 : 503,
    headers: { "content-type": "application/json", "cache-control": "no-store" },
  });
};
