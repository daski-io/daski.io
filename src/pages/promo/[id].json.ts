import type { APIRoute } from 'astro';
import { networkConfig, promotionsTarget } from '../../lib/network.ts';
import { getPromotionSnapshot, PromotionsHttpError } from '../../lib/promotions.ts';
import { isPromotionId } from '../../lib/promotionView.ts';

// The promotion page's data for agents and for the page's own 30-second
// refresh: the same parsed view the page renders, so the browser never calls
// the promotions service.
export const prerender = false;

const notFound = () => Response.json(
  { error: { code: 'NOT_FOUND', message: 'No promotion with that ID.' } },
  { status: 404, headers: { 'cache-control': 'no-store' } },
);

export const GET: APIRoute = async ({ params }) => {
  const target = promotionsTarget(networkConfig());
  const { id } = params;
  if (!target || !isPromotionId(id)) return notFound();
  try {
    const { value } = await getPromotionSnapshot(target, id);
    return Response.json(value, {
      headers: { 'cache-control': 'public, max-age=30', 'access-control-allow-origin': '*' },
    });
  } catch (error) {
    if (error instanceof PromotionsHttpError && error.status === 404) return notFound();
    console.error(`Failed to load promotion ${id}`, error);
    return Response.json(
      { error: { code: 'PROMOTIONS_UNAVAILABLE', message: 'Promotion data is temporarily unavailable.' } },
      { status: 503, headers: { 'cache-control': 'no-store', 'retry-after': '60' } },
    );
  }
};
