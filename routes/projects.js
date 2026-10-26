import { json } from '../index.js';
import { requireAdmin, pick } from '../middleware/auth.js';

const FIELDS = ['title', 'type', 'icon', 'image', 'description', 'budget', 'duration', 'year', 'client'];

async function list({ supa, env }) {
  const { data, error } = await supa.from('projects').select('*').order('created_at', { ascending: true });
  if (error) return json({ error: error.message }, 400, env);
  return json(data, 200, env);
}
async function create({ request, supa, env }) {
  const { error } = await requireAdmin({ request, supa });
  if (error) return json(error.body, error.status, env);
  const body = await request.json();
  const { data, error: dbErr } = await supa.from('projects').insert(pick(body, ['id'].concat(FIELDS))).select().single();
  if (dbErr) return json({ error: dbErr.message }, 400, env);
  return json(data, 201, env);
}
async function update({ request, supa, env, params }) {
  const { error } = await requireAdmin({ request, supa });
  if (error) return json(error.body, error.status, env);
  const body = await request.json();
  const { data, error: dbErr } = await supa.from('projects').update(pick(body, FIELDS)).eq('id', params.id).select().single();
  if (dbErr) return json({ error: dbErr.message }, 400, env);
  return json(data, 200, env);
}
async function remove({ request, supa, env, params }) {
  const { error } = await requireAdmin({ request, supa });
  if (error) return json(error.body, error.status, env);
  const { error: dbErr } = await supa.from('projects').delete().eq('id', params.id);
  if (dbErr) return json({ error: dbErr.message }, 400, env);
  return new Response(null, { status: 204 });
}

export const routes = [
  { method: 'GET',    path: '/',    handler: list },
  { method: 'POST',   path: '/',    handler: create },
  { method: 'PUT',    path: '/:id', handler: update },
  { method: 'DELETE', path: '/:id', handler: remove },
];
