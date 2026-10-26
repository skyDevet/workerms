import { supabaseFor } from '../lib/supabase.js';

export { supabaseFor };

export function pick(obj, keys) {
  const out = {};
  keys.forEach((k) => { if (obj && obj[k] !== undefined) out[k] = obj[k]; });
  return out;
}

async function userFromRequest(req, supa) {
  const header = req.headers.get('authorization') || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return null;
  const { data, error } = await supa.auth.getUser(token);
  if (error || !data || !data.user) return null;
  return data.user;
}

export async function isAdmin(supa, userId) {
  const { data } = await supa.from('admin_users').select('user_id').eq('user_id', userId).maybeSingle();
  return !!data;
}

export async function requireUser({ request, supa }) {
  const user = await userFromRequest(request, supa);
  if (!user) return { error: { status: 401, body: { error: 'Sign in required.' } } };
  return { user };
}

export async function requireAdmin({ request, supa }) {
  const user = await userFromRequest(request, supa);
  if (!user) return { error: { status: 401, body: { error: 'Sign in required.' } } };
  if (!(await isAdmin(supa, user.id))) return { error: { status: 403, body: { error: 'Not authorized.' } } };
  return { user };
}
