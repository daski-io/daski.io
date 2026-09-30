import type { APIRoute } from 'astro';
import { getServices, type PublicService } from '../lib/api';
import { gatewayTarget, networkConfig } from '../lib/network';
import { sitemapXml } from '../lib/seo';

export const prerender = false;
export const GET: APIRoute = async () => {
  const network = networkConfig();
  const target = gatewayTarget(network);
  let services: PublicService[] = [];
  if (network.robots === 'index' && target) {
    try {
      services = (await getServices(target)).services;
    } catch {
      // A failed catalog read must not publish a misleadingly depleted sitemap.
      return new Response('Service catalog temporarily unavailable.', {
        status: 503,
        headers: { 'content-type': 'text/plain; charset=utf-8', 'retry-after': '60', 'cache-control': 'no-store' },
      });
    }
  }
  return new Response(sitemapXml(network, services), {
    headers: {
      'content-type': 'application/xml; charset=utf-8',
      'cache-control': 'public, max-age=300',
      ...(network.robots === 'noindex' ? { 'x-robots-tag': 'noindex' } : {}),
    },
  });
};
