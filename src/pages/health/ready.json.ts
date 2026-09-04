import type { APIRoute } from "astro";

export const prerender = false;
export const GET: APIRoute = async () => {
  const env = (globalThis as { process?: { env?: Record<string, string | undefined> } }).process?.env;
  const commit = env?.RELEASE_SOURCE_SHA || env?.RAILWAY_GIT_COMMIT_SHA || "";
  const ready = /^[a-f0-9]{40}$/.test(commit);
  return new Response(JSON.stringify({ status: ready ? "ready" : "not_ready", commit }), {
    status: ready ? 200 : 503,
    headers: { "content-type": "application/json", "cache-control": "no-store" },
  });
};
