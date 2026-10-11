import type { APIRoute } from 'astro';
import { llmsText } from '../lib/chains.ts';
import { networkConfig, networkView } from '../lib/network.ts';
import { advertisedPromotion } from '../lib/promotions.ts';
import { promotionLlmsLine } from '../lib/promotionPresentation.ts';

export const prerender = false;
export const GET: APIRoute = async () => {
  const config = networkConfig();
  // The open promotion adds one line; without one, or on any error, it is left out.
  const promotion = await advertisedPromotion(config);
  return new Response(
    llmsText(networkView(config), promotion ? promotionLlmsLine(promotion, config.siteUrl) : null),
    {
      headers: {
        'content-type': 'text/plain; charset=utf-8',
        'cache-control': 'public, max-age=300',
      },
    },
  );
};
