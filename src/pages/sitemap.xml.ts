import type { APIRoute } from 'astro';
import { getServices, type PublicService } from '../lib/api';
import { gatewayTarget, networkConfig, promotionsTarget } from '../lib/network';
import { getPromotionSummaries } from '../lib/promotions';
import type { PromotionSummary } from '../lib/promotionView';
import { sitemapXml } from '../lib/seo';

const unavailable = (message: string) => new Response(message, {
  status: 503,
  headers: { 'content-type': 'text/plain; charset=utf-8', 'retry-after': '60', 'cache-control': 'no-store' },
});

export const prerender = false;
export const GET: APIRoute = async () => {
  const network = networkConfig();
  const target = gatewayTarget(network);
  const promotionsSource = promotionsTarget(network);
  let services: PublicService[] = [];
  let promotions: PromotionSummary[] = [];
  if (network.robots === 'index' && target) {
    try {
      services = (await getServices(target)).services;
    } catch {
      // A failed catalog read must not publish a misleadingly depleted sitemap.
      return unavailable('Service catalog temporarily unavailable.');
    }
  }
  // Every activated promotion has a page, listed only while the service is configured.
  if (network.robots === 'index' && promotionsSource) {
    try {
      promotions = await getPromotionSummaries(promotionsSource);
    } catch (error) {
      console.error('Failed to list promotions for the sitemap', error);
      return unavailable('Promotions temporarily unavailable.');
    }
  }
  return new Response(sitemapXml(network, services, promotions), {
    headers: {
      'content-type': 'application/xml; charset=utf-8',
      'cache-control': 'public, max-age=300',
      ...(network.robots === 'noindex' ? { 'x-robots-tag': 'noindex' } : {}),
    },
  });
};
