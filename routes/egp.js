import { json } from '../index.js';
import {
  doPasswordLogin, doRefresh, status as egpStatus,
  egpGet, egpRequest, loadSessionFromKV, saveSessionToKV,
  setRuntimeEnv,
} from '../egpAuth.js';

export async function postLogin({ env }) {
  setRuntimeEnv(env);
  await loadSessionFromKV(env);
  const ok = await doPasswordLogin();
  await saveSessionToKV(env);
  return json({ success: ok, ...egpStatus() }, 200, env);
}
export async function postRefresh({ env }) {
  setRuntimeEnv(env);
  await loadSessionFromKV(env);
  const ok = await doRefresh();
  await saveSessionToKV(env);
  return json({ success: ok, ...egpStatus() }, 200, env);
}
export async function getStatus({ env }) {
  setRuntimeEnv(env);
  await loadSessionFromKV(env);
  return json(egpStatus(), 200, env);
}

export async function getTenders({ env, query }) {
  setRuntimeEnv(env); await loadSessionFromKV(env);
  const qs = query.startsWith('?') ? query.slice(1) : query;
  const p = '/po-gw/cms-v2/api/sourcing/get-grouped-sourcing' + (qs ? '?' + qs : '');
  const { status: s, body } = await egpGet(p);
  return json(body, s, env);
}

export async function getTender({ env, id, query }) {
  setRuntimeEnv(env); await loadSessionFromKV(env);
  const source = String(query.get('source') || '').toLowerCase();
  const p = source === 'purchasing'
    ? `/po-gw/federal/purchasing/api/quotation-invitations/get-quotation-invitation/${id}`
    : `/po-gw/cms-v2/api/sourcing/get-lot/${id}`;
  const { status: s, body } = await egpGet(p);
  return json(body, s, env);
}

export async function getTenderItems({ env, id }) {
  setRuntimeEnv(env); await loadSessionFromKV(env);
  const p = '/po-gw/federal/purchasing/api/quotation-requests/get-quotation-request-items-by-quotation-request-id/' + id;
  const { status: s, body } = await egpGet(p);
  return json(body, s, env);
}

export async function getResponseItems({ env, id }) {
  setRuntimeEnv(env); await loadSessionFromKV(env);
  const p = '/po-gw/federal/purchasing/api/quotation-request-responses/get-quotation-request-response-items-v2'
          + '?quatationRequestResponseId=' + encodeURIComponent(id);
  const { status: s, body } = await egpGet(p);
  return json(body, s, env);
}

export async function getSchedule({ env, id }) {
  setRuntimeEnv(env); await loadSessionFromKV(env);
  const p = '/po-gw/federal/purchasing/api/quotation-requests/get-schedule-of-requirement-by-quotation-request-id-v2/' + id;
  const { status: s, body } = await egpGet(p);
  return json(body, s, env);
}

export async function getResponse({ env, id }) {
  setRuntimeEnv(env); await loadSessionFromKV(env);
  const p = '/po-gw/federal/purchasing/api/quotation-request-responses/get-public-quotation-request-response-v2/' + id;
  const { status: s, body } = await egpGet(p);
  return json(body, s, env);
}

export async function postRegister({ env, body }) {
  setRuntimeEnv(env); await loadSessionFromKV(env);
  const { quotationRequestId, quotationRequestName } = body || {};
  if (!quotationRequestId || !quotationRequestName) return json({ error: 'quotationRequestId + quotationRequestName required' }, 400, env);
  const { status: s, body: b } = await egpRequest('POST',
    '/po-gw/federal/purchasing/api/quotation-request-registrations/create-quotation-request-registration',
    { quatationRequestId: quotationRequestId, quatationRequestName: quotationRequestName });
  return json(b, s, env);
}

export async function postPushPrice({ env, body }) {
  setRuntimeEnv(env); await loadSessionFromKV(env);
  const p = body || {};
  if (!p.id || !p.quotationRequestResponseId || !p.quotationRequestId || !p.lotItemId || p.unitPrice == null)
    return json({ error: 'id, quotationRequestResponseId, quotationRequestId, lotItemId, unitPrice required' }, 400, env);

  const payload = {
    id: p.id,
    quotationRequestResponseId: p.quotationRequestResponseId,
    quotationRequestId: p.quotationRequestId,
    lotItemId: p.lotItemId,
    name: p.name || '',
    description: p.description || '',
    quantity: Number(p.quantity) || 0,
    currency: p.currency || 'ETB',
    unitMeasure: p.unitMeasure || '',
    unitPrice: Number(p.unitPrice),
    deliveryTime: p.deliveryTime ?? null,
    taxAmount: p.taxAmount ?? null,
    tax: p.tax ?? 'VAT',
  };
  const { status: s, body: b } = await egpRequest('POST',
    '/po-gw/federal/purchasing/api/quotation-request-responses/update-quotation-request-response-item', payload);
  return json({ ok: s >= 200 && s < 300, status: s, body: b }, s, env);
}

export async function postPushSpec({ env, body }) {
  setRuntimeEnv(env); await loadSessionFromKV(env);
  const { quotationRequestResponseId, lotItemId, offeredSpecification } = body || {};
  if (!quotationRequestResponseId || !lotItemId) {
    return json({ error: 'quotationRequestResponseId + lotItemId required' }, 400, env);
  }

  const schedPath = '/po-gw/federal/purchasing/api/quotation-requests/get-schedule-of-requirement-by-quotation-request-id-v2/' + lotItemId;
  const sched = await egpGet(schedPath);
  const scheduleItems = (sched.body?.items || []).filter(x => !x.isCancelled);
  if (scheduleItems.length === 0) return json({ error: 'no schedule requirements for this lotItemId' }, 400, env);

  const respPath = '/po-gw/federal/purchasing/api/quotation-request-responses/get-quotation-request-response-items-v2'
                 + '?quatationRequestResponseId=' + encodeURIComponent(quotationRequestResponseId);
  const respItems = await egpGet(respPath);
  const matching = (respItems.body?.items || []).find(x => x.lotItemId === lotItemId);
  if (!matching?.id) return json({ error: 'response item not found for this lotItemId' }, 400, env);

  const payload = {
    quotationRequestResponseId,
    quotationRequestResponseItemId: matching.id,
    quotationRequestResponseItemDetails: scheduleItems.map(s => ({
      quotationRequestResponseId,
      quotationRequestResponseItemId: matching.id,
      lotItemId,
      scheduleofRequirementId: s.id,
      offeredSpecification: offeredSpecification || s.requirement || 'Compliant',
      attribute: s.reqAttribute || 'Technical Detail',
    })),
  };
  const { status: s, body: b } = await egpRequest('POST',
    '/po-gw/federal/purchasing/api/quotation-request-responses/add-quotation-request-response-item-details',
    payload);
  return json({ ok: s >= 200 && s < 300, status: s, body: b }, s, env);
}

export async function postAddItems({ env }) {
  return json({ error: 'Deprecated. Use /push-price-one and /push-spec-one.' }, 410, env);
}

export async function postSubmit({ env, id }) {
  setRuntimeEnv(env); await loadSessionFromKV(env);
  const { status: s, body } = await egpRequest('POST',
    `/po-gw/federal/purchasing/api/quotation-request-responses/submit-quotation-request-response/${id}`, {});
  return json(body, s, env);
}
