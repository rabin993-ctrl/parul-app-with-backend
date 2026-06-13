// cdn.parul.pet/<bucket>/<path>  ->  Supabase Storage public object (cached at Cloudflare edge)
const SUPABASE = 'https://zoezppkypxogylwypdwu.supabase.co';
export default {
  async fetch(req, ctx) {
    if (req.method !== 'GET' && req.method !== 'HEAD')
      return new Response('Method Not Allowed', { status: 405 });
    const url = new URL(req.url);
    const origin = `${SUPABASE}/storage/v1/object/public${url.pathname}${url.search}`;
    const cache = caches.default;
    const hit = await cache.match(req);
    if (hit) return hit;
    let res = await fetch(origin, { cf: { cacheEverything: true, cacheTtl: 86400 } });
    res = new Response(res.body, res);
    res.headers.set('Cache-Control', 'public, max-age=86400, s-maxage=2592000, immutable');
    res.headers.set('Access-Control-Allow-Origin', '*');
    ctx.waitUntil(cache.put(req, res.clone()));
    return res;
  },
};
