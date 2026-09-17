import { createHash } from 'node:crypto';
import type { NetworkConfig } from './network.ts';

import { GUIDE_FILES, type GuideFile } from './guideFiles.ts';

export { GUIDE_FILES };
export type { GuideFile };
export type GuideTemplates = Record<GuideFile, string>;

/** Render once per instance; the hash and size always describe the served bytes. */
export function renderGuide(file: GuideFile, templates: GuideTemplates, config: NetworkConfig) {
  if (!config.gatewayUrl) throw new Error('No gateway is published for this network');
  const values: Record<string, string> = {
    SITE_URL: config.siteUrl,
    GATEWAY_URL: config.gatewayUrl,
    CHAIN_ID: String(config.chainId),
    CHAIN_NAME: config.chainName,
  };
  const content = templates[file].replace(/\{\{([A-Z_]+)\}\}/g, (_, key: string) => {
    if (!(key in values)) throw new Error(`Unknown guide placeholder: ${key}`);
    return values[key]!;
  });
  return {
    name: file === 'SKILL.md' ? 'daski' : file.slice(0, -3),
    file,
    content,
    url: `${config.siteUrl}/skills/${file}`,
    sha256: createHash('sha256').update(content).digest('hex'),
    bytes: Buffer.byteLength(content),
  };
}

export function agentDocument(path: string, templates: GuideTemplates, config: NetworkConfig): Response {
  const file = path.startsWith('/skills/') ? path.slice('/skills/'.length) : null;
  const installable = ['/skill.md', '/SKILL.md', '/.well-known/skills/daski/SKILL.md'].includes(path);
  const index = path === '/.well-known/agent-skills/index.json';
  const legacy = path === '/.well-known/skills/index.json';
  const full = path === '/llms-full.txt';
  if (!(file && GUIDE_FILES.includes(file as GuideFile)) && !installable && !index && !legacy && !full) {
    return new Response('Guide not found', { status: 404 });
  }
  if (!config.gatewayUrl) {
    return new Response(`The ${config.label} marketplace on ${config.chainName} is not available yet. No gateway is configured.\n`, {
      status: 503,
      headers: { 'content-type': 'text/plain; charset=utf-8', 'cache-control': 'no-store', 'retry-after': '60' },
    });
  }
  let body: string;
  let type = 'text/markdown';
  if (index) {
    type = 'application/json';
    body = JSON.stringify({ version: '1', skills: GUIDE_FILES.map(name => {
      const { content: _content, file: _file, ...entry } = renderGuide(name, templates, config);
      return entry;
    }) });
  } else if (legacy) {
    type = 'application/json';
    const skill = renderGuide('SKILL.md', templates, config);
    const description = /^description: (.+)$/m.exec(skill.content)?.[1] ?? 'Daski buyer skill';
    body = JSON.stringify({ skills: [{ name: 'daski', description, files: ['SKILL.md'] }] });
  } else if (full) {
    body = GUIDE_FILES.map(name => renderGuide(name, templates, config).content.trimEnd()).join('\n\n') + '\n';
  } else {
    body = renderGuide(installable ? 'SKILL.md' : file as GuideFile, templates, config).content;
  }
  return new Response(body, { headers: {
    'content-type': `${type}; charset=utf-8`,
    'cache-control': 'public, max-age=60',
    'access-control-allow-origin': '*',
    'x-content-type-options': 'nosniff',
    etag: `"${createHash('sha256').update(body).digest('hex')}"`,
  } });
}
