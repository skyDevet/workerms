import { handleApi } from './api.js';
import { bootstrap as egpBootstrap, setRuntimeEnv } from './egpAuth.js';

addEventListener('unhandledrejection', (e) => console.error('[api] unhandledRejection', e.reason?.message || e.reason));
addEventListener('error', (e) => console.error('[api] uncaught', e.message));

export default {
  async fetch(request, env, ctx) {
    setRuntimeEnv(env);

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders(env, request) });
    }

    const url = new URL(request.url);
    if (!url.pathname.startsWith('/api')) {
      return new Response(JSON.stringify({ error: 'Not found.' }), {
        status: 404,
        headers: { 'content-type': 'application/json', ...corsHeaders(env, request) },
      });
    }

    try {
      ctx.waitUntil(egpBootstrap(env).catch((e) => console.error('[api] egp bootstrap:', e?.message || e)));
      const res = await handleApi(request, env, ctx);
      const headers = new Headers(res.headers);
      for (const [k, v] of Object.entries(corsHeaders(env, request))) headers.set(k, v);
      if (!headers.has('content-type')) headers.set('content-type', 'application/json');
      return new Response(res.body, { status: res.status, headers });
    } catch (e) {
      console.error('[api] route error:', e?.message || e);
      return json({ error: 'Server error: ' + (e?.message || 'unknown') }, 500, env, request);
    }
  },
};

export function corsHeaders(env, request) {
  const origins = String(env.CORS_ORIGIN || 'http://localhost:5173')
    .split(',').map((s) => s.trim()).filter(Boolean);
  const origin = request.headers.get('Origin') || '';
  const allow = origins.includes(origin) ? origin : origins[0] || '*';
  return {
    'Access-Control-Allow-Origin': allow,
    'Access-Control-Allow-Credentials': 'true',
    'Access-Control-Allow-Methods': 'GET,POST,PUT,PATCH,DELETE,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type,Authorization',
    'Vary': 'Origin',
  };
}

export function json(obj, status = 200, env, request) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: {
      'content-type': 'application/json',
      ...(env && request ? corsHeaders(env, request) : {}),
    },
  });
}
