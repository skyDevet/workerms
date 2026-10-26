import { json } from '../index.js';
import { requireUser, requireAdmin, isAdmin, pick } from '../middleware/auth.js';

const FIELDS_CREATE = ['id', 'kind', 'client', 'cart', 'description', 'service_type', 'budget_range', 'timeline'];

async function create({ request, supa, env }) {
  const body = await request.json();
  const picked = pick(body, FIELDS_CREATE);
  if (!['materials', 'services'].includes(picked.kind))
    return json({ error: 'kind must be "materials" or "services".' }, 400, env);

  const { user, error } = await requireUser({ request, supa });
  if (error) return json(error.body, error.status, env);

  const row = { ...picked, user_id: user.id, user_email: user.email || null, status: 'new' };
  const { data, error: dbErr } = await supa.from('quote_requests').insert(row).select().single();
  if (dbErr) return json({ error: dbErr.message }, 400, env);
  return json(data, 201, env);
}

async function list({ request, supa, env }) {
  const { user, error } = await requireUser({ request, supa });
  if (error) return json(error.body, error.status, env);

  const url = new URL(request.url);
  let q = supa.from('quote_requests').select('*').order('created_at', { ascending: false });
  if (!(await isAdmin(supa, user.id))) q = q.eq('user_id', user.id);
  const status = url.searchParams.get('status');
  if (status) q = q.eq('status', status);

  const { data, error: dbErr } = await q;
  if (dbErr) return json({ error: dbErr.message }, 400, env);
  return json(data, 200, env);
}

async function patch({ request, supa, env, params }) {
  const { error } = await requireAdmin({ request, supa });
  if (error) return json(error.body, error.status, env);
  const body = await request.json();
  const { data, error: dbErr } = await supa.from('quote_requests')
    .update(pick(body, ['status'])).eq('id', params.id).select().single();
  if (dbErr) return json({ error: dbErr.message }, 400, env);
  return json(data, 200, env);
}

async function remove({ request, supa, env, params }) {
  const { error } = await requireAdmin({ request, supa });
  if (error) return json(error.body, error.status, env);
  const { error: dbErr } = await supa.from('quote_requests').delete().eq('id', params.id);
  if (dbErr) return json({ error: dbErr.message }, 400, env);
  return new Response(null, { status: 204 });
}

export const routes = [
  { method: 'POST',   path: '/',    handler: create },
  { method: 'GET',    path: '/',    handler: list },
  { method: 'PATCH',  path: '/:id', handler: patch },
  { method: 'DELETE', path: '/:id', handler: remove },
];
