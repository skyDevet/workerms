import { json } from '../index.js';
import { requireAdmin } from '../middleware/auth.js';

async function create({ request, supa, env }) {
  const { error } = await requireAdmin({ request, supa });
  if (error) return json(error.body, error.status, env);
  const body = await request.json().catch(() => ({}));
  const filename = String(body.filename || '').trim();
  if (!filename) return json({ error: 'filename is required.' }, 400, env);
  const safe = filename.replace(/[^a-zA-Z0-9._-]/g, '_');
  const folder = String(body.folder || 'misc').replace(/[^a-zA-Z0-9_-]/g, '');
  const path = folder + '/' + Date.now() + '-' + safe;
  const bucket = env.SUPABASE_STORAGE_BUCKET || 'uploads';

  const { data, error: stErr } = await supa.storage.from(bucket).createSignedUploadUrl(path);
  if (stErr) return json({ error: stErr.message }, 400, env);
  const pub = supa.storage.from(bucket).getPublicUrl(path);
  return json({
    bucket, path: data.path, token: data.token, signedUrl: data.signedUrl,
    publicUrl: pub.data.publicUrl,
  }, 201, env);
}

export const routes = [{ method: 'POST', path: '/', handler: create }];
