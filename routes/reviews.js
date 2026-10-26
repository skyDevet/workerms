import { json } from '../index.js';
import { requireUser, requireAdmin, pick } from '../middleware/auth.js';

async function listApproved({ supa, env }) {
  const { data, error } = await supa.from('reviews').select('*').eq('approved', true).order('created_at', { ascending: false });
  if (error) return json({ error: error.message }, 400, env);
  return json(data, 200, env);
}
async function listAll({ request, supa, env }) {
  const { error } = await requireAdmin({ request, supa });
  if (error) return json(error.body, error.status, env);
  const { data, error: dbErr } = await supa.from('reviews').select('*').order('created_at', { ascending: false });
  if (dbErr) return json({ error: dbErr.message }, 400, env);
  return json(data, 200, env);
}
async function create({ request, supa, env }) {
  const { error } = await requireUser({ request, supa });
  if (error) return json(error.body, error.status, env);
  const body = await request.json();
  const row = { ...pick(body, ['name', 'loc', 'stars', 'text']), approved: false };
  const { data, error: dbErr } = await supa.from('reviews').insert(row).select().single();
  if (dbErr) return json({ error: dbErr.message }, 400, env);
  return json(data, 201, env);
}
async function patch({ request, supa, env, params }) {
  const { error } = await requireAdmin({ request, supa });
  if (error) return json(error.body, error.status, env);
  const body = await request.json();
  const { data, error: dbErr } = await supa.from('reviews')
    .update(pick(body, ['name', 'loc', 'stars', 'text', 'approved'])).eq('id', params.id).select().single();
  if (dbErr) return json({ error: dbErr.message }, 400, env);
  return json(data, 200, env);
}
async function remove({ request, supa, env, params }) {
  const { error } = await requireAdmin({ request, supa });
  if (error) return json(error.body, error.status, env);
  const { error: dbErr } = await supa.from('reviews').delete().eq('id', params.id);
  if (dbErr) return json({ error: dbErr.message }, 400, env);
  return new Response(null, { status: 204 });
}

export const routes = [
  { method: 'GET',    path: '/',    handler: listApproved },
  { method: 'GET',    path: '/all', handler: listAll },
  { method: 'POST',   path: '/',    handler: create },
  { method: 'PATCH',  path: '/:id', handler: patch },
  { method: 'DELETE', path: '/:id', handler: remove },
];
