import { json } from './index.js';
import * as egp from './routes/egp.js';
import * as quotes from './routes/quotes.js';
import * as proformas from './routes/proformas.js';
import * as projects from './routes/projects.js';
import * as reviews from './routes/reviews.js';
import * as business from './routes/business.js';
import * as uploads from './routes/uploads.js';
import { supabaseFor } from './lib/supabase.js';

export async function handleApi(request, env, ctx) {
  const url = new URL(request.url);
  const path = url.pathname;
  const method = request.method;

  if (path === '/api/health' && method === 'GET') return json({ ok: true }, 200, env, request);

  if (path.startsWith('/api/egp/')) return dispatchEgp(request, env, path, method);

  const supa = supabaseFor(env);
  if (!supa) return json({ error: 'Supabase is not configured on the server.' }, 503, env, request);

  if (path === '/api/quotes' || path.startsWith('/api/quotes/')) return dispatchSimple(quotes, request, env, supa, path, '/api/quotes', method);
  if (path === '/api/proformas' || path.startsWith('/api/proformas/')) return dispatchSimple(proformas, request, env, supa, path, '/api/proformas', method);
  if (path === '/api/projects' || path.startsWith('/api/projects/')) return dispatchSimple(projects, request, env, supa, path, '/api/projects', method);
  if (path === '/api/reviews' || path.startsWith('/api/reviews/')) return dispatchSimple(reviews, request, env, supa, path, '/api/reviews', method);
  if (path === '/api/business' || path.startsWith('/api/business/')) return dispatchSimple(business, request, env, supa, path, '/api/business', method);
  if (path === '/api/uploads' || path.startsWith('/api/uploads/')) return dispatchSimple(uploads, request, env, supa, path, '/api/uploads', method);

  return json({ error: 'Not found.' }, 404, env, request);
}

async function dispatchSimple(mod, request, env, supa, fullPath, base, method) {
  const sub = fullPath.slice(base.length) || '/';
  const segs = sub.split('/').filter(Boolean);
  const match = mod.routes.find((r) => r.method === method && matchPath(r.path, segs));
  if (!match) return json({ error: 'Not found.' }, 404, env, request);
  const params = extractParams(match.path, segs);
  return match.handler({ request, env, supa, params });
}

function matchPath(pattern, segs) {
  const p = pattern.split('/').filter(Boolean);
  if (p.length !== segs.length) return false;
  for (let i = 0; i < p.length; i++) {
    if (p[i].startsWith(':')) continue;
    if (p[i] !== segs[i]) return false;
  }
  return true;
}
function extractParams(pattern, segs) {
  const p = pattern.split('/').filter(Boolean);
  const out = {};
  for (let i = 0; i < p.length; i++) if (p[i].startsWith(':')) out[p[i].slice(1)] = decodeURIComponent(segs[i]);
  return out;
}

async function dispatchEgp(request, env, path, method) {
  const sub = path.slice('/api/egp'.length);
  const url = new URL(request.url);
  const body = method === 'GET' || method === 'HEAD' ? null : await safeJson(request);

  if (sub === '/login'   && method === 'POST') return egp.postLogin({ env });
  if (sub === '/refresh' && method === 'POST') return egp.postRefresh({ env });
  if (sub === '/status'  && method === 'GET')  return egp.getStatus({ env });

  if (sub === '/tenders' && method === 'GET') return egp.getTenders({ env, query: url.search });

  let m = sub.match(/^\/tender\/([^/]+)$/);
  if (m && method === 'GET') return egp.getTender({ env, id: m[1], query: url.searchParams });

  m = sub.match(/^\/tender\/([^/]+)\/items$/);
  if (m && method === 'GET') return egp.getTenderItems({ env, id: m[1] });

  m = sub.match(/^\/tender\/([^/]+)\/response-items$/);
  if (m && method === 'GET') return egp.getResponseItems({ env, id: m[1] });

  m = sub.match(/^\/tender\/([^/]+)\/response$/);
  if (m && method === 'GET') return egp.getResponse({ env, id: m[1] });

  m = sub.match(/^\/schedule\/([^/]+)$/);
  if (m && method === 'GET') return egp.getSchedule({ env, id: m[1] });

  if (sub === '/register' && method === 'POST')       return egp.postRegister({ env, body });
  if (sub === '/push-price-one' && method === 'POST') return egp.postPushPrice({ env, body });
  if (sub === '/push-spec-one' && method === 'POST')  return egp.postPushSpec({ env, body });
  if (sub === '/add-items' && method === 'POST')      return egp.postAddItems({ env, body });

  m = sub.match(/^\/submit\/([^/]+)$/);
  if (m && method === 'POST') return egp.postSubmit({ env, id: m[1] });

  return json({ error: 'Not found.' }, 404, env, request);
}

async function safeJson(req) {
  try { return await req.json(); } catch { return {}; }
}
