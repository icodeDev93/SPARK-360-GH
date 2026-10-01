import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4';

const defaultOrigins = [
  'https://operations.spark360gh.com',
  'http://localhost:3000', 'http://127.0.0.1:3000',
  'http://localhost:5173', 'http://127.0.0.1:5173',
];
const allowedOrigins = (Deno.env.get('ALLOWED_ORIGINS') ?? defaultOrigins.join(','))
  .split(',').map((origin) => origin.trim()).filter(Boolean);
const headers = (request: Request) => ({
  'Access-Control-Allow-Origin': allowedOrigins.includes(request.headers.get('Origin') ?? '') ? request.headers.get('Origin')! : allowedOrigins[0],
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Content-Type': 'application/json',
  'Vary': 'Origin',
});
const json = (request: Request, body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: headers(request) });

interface UpdateUserRequest {
  userId: string;
  name: string;
  role: 'owner' | 'manager' | 'cashier';
  status: 'Active' | 'Inactive';
  businessId?: string | null;
  password?: string;
  permissionOverrides?: { granted: string[]; revoked: string[] };
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: headers(request) });
  if (request.method !== 'POST') return json(request, { error: 'Method not allowed.' }, 405);

  const url = Deno.env.get('SUPABASE_URL');
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!url || !serviceKey) return json(request, { error: 'User update service is not configured.' }, 500);

  const token = (request.headers.get('Authorization') ?? '').replace(/^Bearer\s+/i, '').trim();
  if (!token) return json(request, { error: 'Missing authorization token.' }, 401);
  const admin = createClient(url, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } });
  const { data: auth, error: authError } = await admin.auth.getUser(token);
  if (authError || !auth.user) return json(request, { error: 'Invalid user session.' }, 401);

  const payload = await request.json().catch(() => null) as UpdateUserRequest | null;
  if (!payload || typeof payload.userId !== 'string') return json(request, { error: 'User ID is required.' }, 400);
  const name = typeof payload.name === 'string' ? payload.name.trim() : '';
  if (!name || name.length > 100) return json(request, { error: 'A valid name is required.' }, 400);
  if (!['owner', 'manager', 'cashier'].includes(payload.role)) return json(request, { error: 'Invalid user role.' }, 400);
  if (!['Active', 'Inactive'].includes(payload.status)) return json(request, { error: 'Invalid user status.' }, 400);
  if (payload.password !== undefined && (typeof payload.password !== 'string' || payload.password.length < 10)) {
    return json(request, { error: 'Password must be at least 10 characters.' }, 400);
  }

  const { data: actorRows, error: actorError } = await admin.from('profiles').select('id, role, status').eq('id', auth.user.id).limit(2);
  if (actorError) return json(request, { error: `Unable to load the current owner: ${actorError.message}` }, 500);
  const actor = actorRows?.[0];
  if ((actorRows?.length ?? 0) > 1) return json(request, { error: 'Multiple profiles exist for the current owner.' }, 500);
  if (!actor || actor.role !== 'owner' || actor.status !== 'Active') return json(request, { error: 'Only an active business owner can edit users.' }, 403);
  const { data: targetRows, error: targetError } = await admin.from('profiles').select('*').eq('id', payload.userId).limit(2);
  if (targetError) return json(request, { error: `Unable to load the selected user: ${targetError.message}` }, 500);
  const target = targetRows?.[0];
  if ((targetRows?.length ?? 0) > 1) return json(request, { error: 'Multiple profiles exist for the selected user.' }, 500);
  if (!target) return json(request, { error: 'User not found.' }, 404);
  if (target.id === actor.id) return json(request, { error: 'Edit your own account in account settings.' }, 403);
  if (target.role === 'owner' || payload.role === 'owner') return json(request, { error: 'Owner accounts cannot be changed here.' }, 403);

  const { data: canonicalOwned, error: ownedError } = await admin.from('businesses').select('id').eq('owner_id', actor.id);
  if (ownedError) return json(request, { error: ownedError.message }, 500);
  const { data: additionalOwned, error: additionalOwnedError } = await admin
    .from('business_users').select('business_id').eq('user_id', actor.id).eq('role', 'owner');
  if (additionalOwnedError) return json(request, { error: additionalOwnedError.message }, 500);
  const ownedIds = new Set([
    ...(canonicalOwned ?? []).map((business) => business.id),
    ...(additionalOwned ?? []).map((membership) => membership.business_id),
  ]);
  const { data: links, error: linksError } = await admin.from('business_users').select('business_id, role').eq('user_id', target.id);
  if (linksError) return json(request, { error: linksError.message }, 500);
  const linkedIds = (links ?? []).map((link) => link.business_id);
  const restoreDatabaseState = async () => {
    const { id: _id, created_at: _createdAt, ...originalProfile } = target;
    await admin.from('profiles').update(originalProfile).eq('id', target.id);
    await admin.from('business_users').delete().eq('user_id', target.id);
    if (links?.length) {
      await admin.from('business_users').insert(
        links.map((link) => ({ business_id: link.business_id, user_id: target.id, role: link.role })),
      );
    }
  };
  if (!(target.primary_business_id && ownedIds.has(target.primary_business_id)) && !linkedIds.some((id) => ownedIds.has(id))) {
    return json(request, { error: 'This user does not belong to your business.' }, 403);
  }
  if (linkedIds.some((id) => !ownedIds.has(id))) return json(request, { error: 'This user also belongs to another owner.' }, 403);

  const businessId = payload.role === 'cashier' ? payload.businessId : null;
  if (payload.role === 'cashier') {
    if (!businessId || !ownedIds.has(businessId)) return json(request, { error: 'Select one of your active businesses.' }, 400);
    const { data: businessRows, error: businessError } = await admin.from('businesses').select('status').eq('id', businessId).limit(2);
    if (businessError) return json(request, { error: `Unable to verify the assigned business: ${businessError.message}` }, 500);
    const business = businessRows?.[0];
    if ((businessRows?.length ?? 0) > 1) return json(request, { error: 'Multiple businesses use the selected ID.' }, 500);
    if (business?.status !== 'active') return json(request, { error: 'The assigned business must be active.' }, 400);
  }

  const overrides = payload.role === 'owner' ? { granted: [], revoked: [] } : payload.permissionOverrides;
  if (!overrides || !Array.isArray(overrides.granted) || !Array.isArray(overrides.revoked) ||
      ![...overrides.granted, ...overrides.revoked].every((value) => typeof value === 'string')) {
    return json(request, { error: 'Invalid permissions.' }, 400);
  }

  const { error: rateError } = await admin.rpc('check_rate_limit_for_actor', {
    actor_id: actor.id, action_key: 'edge:update-user', max_requests: 10, window_seconds: 600, target_business_id: null,
  });
  if (rateError) return json(request, { error: rateError.message }, 429);

  // Repair the membership first, so an active attendant can pass the login access check.
  if (payload.role === 'cashier') {
    const { error } = await admin.from('business_users').upsert(
      { business_id: businessId, user_id: target.id, role: 'cashier' },
      { onConflict: 'business_id,user_id' },
    );
    if (error) return json(request, { error: error.message }, 500);
  }

  const initials = name.split(/\s+/).map((word) => word[0]).slice(0, 2).join('').toUpperCase();
  const { data: updatedProfiles, error: profileError } = await admin.from('profiles').update({
    name, role: payload.role, status: payload.status, initials,
    permission_overrides: overrides,
    primary_business_id: businessId,
    business_access: payload.role === 'cashier' ? 'assigned' : 'all',
  }).eq('id', target.id).select('*');
  if (profileError) {
    await restoreDatabaseState();
    return json(request, { error: profileError.message }, 500);
  }
  const profile = updatedProfiles?.[0];
  if (!profile) {
    await restoreDatabaseState();
    return json(request, { error: 'The profile update returned no row and was rolled back.' }, 500);
  }

  if (payload.role === 'cashier') {
    const staleIds = linkedIds.filter((id) => id !== businessId);
    if (staleIds.length) {
      const { error } = await admin.from('business_users').delete().eq('user_id', target.id).in('business_id', staleIds);
      if (error) {
        await restoreDatabaseState();
        return json(request, { error: `User update was rolled back: ${error.message}` }, 500);
      }
    }
  } else if (linkedIds.length) {
    const { error } = await admin.from('business_users').update({ role: 'manager' }).eq('user_id', target.id).in('business_id', linkedIds);
    if (error) {
      await restoreDatabaseState();
      return json(request, { error: `User update was rolled back: ${error.message}` }, 500);
    }
  }

  if (payload.password) {
    const { error } = await admin.auth.admin.updateUserById(target.id, { password: payload.password });
    if (error) {
      await restoreDatabaseState();
      return json(request, { error: `User update was rolled back because the password could not be changed: ${error.message}` }, 500);
    }
  }
  return json(request, { profile });
});
