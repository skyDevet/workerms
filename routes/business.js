import { json } from '../index.js';
import { requireAdmin } from '../middleware/auth.js';

async function get({ supa, env }) {
  const { data, error } = await supa.from('business_info').select('data').eq('id', 1).maybeSingle();
  if (error) return json({ error: error.message }, 400, env);
  return json(data ? data.data : {}, 200, env);
}
async function put({ request, supa, env }) {
  const { error } = await requireAdmin({ request, supa });
  if (error) return json(error.body, error.status, env);
  const body = await request.json();
  const row = { id: 1, data: body || {}, updated_at: new Date().toISOString() };
  const { data, error: dbErr } = await supa.from('business_info').upsert(row).select('data').single();
  if (dbErr) return json({ error: dbErr.message }, 400, env);
  return json(data.data, 200, env);
}

export const routes = [
  { method: 'GET', path: '/', handler: get },
  { method: 'PUT', path: '/', handler: put },
];
