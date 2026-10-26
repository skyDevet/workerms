import { json } from '../index.js';
import { requireAdmin, pick } from '../middleware/auth.js';

const FIELDS = ['number', 'status', 'source_request_id', 'client', 'lines', 'totals', 'terms', 'valid_days'];

async function list({ request, supa, env }) {
  const { error } = await requireAdmin({ request, supa });
  if (error) return json(error.body, error.status, env);
  const { data, error: dbErr } = await supa.from('proformas').select('*').order('created_at', { ascending: false });
  if (dbErr) return json({ error: dbErr.message }, 400, env);
  return json(data, 200, env);
}

async function getOne({ request, supa, env, params }) {
  const { error } = await requireAdmin({ request, supa });
  if (error) return json(error.body, error.status, env);
  const { data, error: dbErr } = await supa.from('proformas').select('*').eq('id', params.id).maybeSingle();
  if (dbErr) return json({ error: dbErr.message }, 400, env);
  if (!data) return json({ error: 'Not found.' }, 404, env);
  return json(data, 200, env);
}

async function create({ request, supa, env }) {
  const { user, error } = await requireAdmin({ request, supa });
  if (error) return json(error.body, error.status, env);
  const body = await request.json();
  const row = { ...pick(body, FIELDS), created_by: user.id };
  const { data, error: dbErr } = await supa.from('proformas').insert(row).select().single();
  if (dbErr) return json({ error: dbErr.message }, 400, env);
  return json(data, 201, env);
}

async function update({ request, supa, env, params }) {
  const { error } = await requireAdmin({ request, supa });
  if (error) return json(error.body, error.status, env);
  const body = await request.json();
  const patch = { ...pick(body, FIELDS), updated_at: new Date().toISOString() };
  const { data, error: dbErr } = await supa.from('proformas').update(patch).eq('id', params.id).select().single();
  if (dbErr) return json({ error: dbErr.message }, 400, env);
  return json(data, 200, env);
}

async function remove({ request, supa, env, params }) {
  const { error } = await requireAdmin({ request, supa });
  if (error) return json(error.body, error.status, env);
  const { error: dbErr } = await supa.from('proformas').delete().eq('id', params.id);
  if (dbErr) return json({ error: dbErr.message }, 400, env);
  return new Response(null, { status: 204 });
}

export const routes = [
  { method: 'GET',    path: '/',    handler: list },
  { method: 'GET',    path: '/:id', handler: getOne },
  { method: 'POST',   path: '/',    handler: create },
  { method: 'PUT',    path: '/:id', handler: update },
  { method: 'DELETE', path: '/:id', handler: remove },
];
