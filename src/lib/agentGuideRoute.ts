import type { APIRoute } from 'astro';
import { agentDocument, GUIDE_FILES, renderGuide, type GuideFile, type GuideTemplates } from './agentGuides.ts';
import { networkConfig } from './network.ts';

// Vite embeds the sources in the SSR bundle; the runtime needs no source files.
const sources = import.meta.glob<string>('../skills/*.md', { query: '?raw', import: 'default', eager: true });
const templates = Object.fromEntries(GUIDE_FILES.map(file => {
  const content = sources[`../skills/${file}`];
  if (!content) throw new Error(`Missing agent guide: ${file}`);
  return [file, content];
})) as GuideTemplates;

export const agentGuideRoute: APIRoute = ({ url }) => agentDocument(url.pathname, templates, networkConfig());

export const readLocalGuide = (file: GuideFile) => renderGuide(file, templates, networkConfig());
