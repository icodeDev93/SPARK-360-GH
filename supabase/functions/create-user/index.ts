import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

type UserRole = 'owner' | 'manager' | 'cashier';

interface CreateUserRequest {
  name: string;
  email: string;
  password: string;
  role: UserRole;
  status?: 'Active' | 'Inactive';
  permissionOverrides?: { granted?: string[]; revoked?: string[] };
  businessId?: string | null;
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });

const initials = (name: string) =>
  name.trim().split(/\s+/).map((word) => word[0]).slice(0, 2).join('').toUpperCase() || 'US';

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (request.method !== 'POST') return json({ error: 'Method not allowed.' }, 405);

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!supabaseUrl || !serviceRoleKey) {
    return json({ error: 'User creation service is not configured.' }, 500);
  }

  const authHeader = request.headers.get('Authorization') ?? '';
  const token = authHeader.replace(/^Bearer\s+/i, '').trim();
  if (!token) return json({ error: 'Missing authorization token.' }, 401);

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data: authData, error: authError } = await supabase.auth.getUser(token);
  if (authError || !authData.user) return json({ error: 'Invalid user session.' }, 401);

  const { data: actor, error: actorError } = await supabase
    .from('profiles')
    .select('id, role, business_access')
    .eq('id', authData.user.id)
    .single();

  if (actorError || !actor) return json({ error: 'Current user profile was not found.' }, 403);
  if (!['owner', 'manager'].includes(actor.role)) {
    return json({ error: 'Only owners and managers can create users.' }, 403);
  }

  const payload = await request.json().catch(() => null) as CreateUserRequest | null;
  const name = payload?.name?.trim() ?? '';
  const email = payload?.email?.trim().toLowerCase() ?? '';
  const password = payload?.password ?? '';
  const role = payload?.role;
  const status = payload?.status === 'Inactive' ? 'Inactive' : 'Active';
  const businessId = payload?.businessId?.trim() || null;
  const permissionOverrides = role === 'owner'
    ? { granted: [], revoked: [] }
    : {
        granted: payload?.permissionOverrides?.granted ?? [],
        revoked: payload?.permissionOverrides?.revoked ?? [],
      };

  if (!name) return json({ error: 'Name is required.' }, 400);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return json({ error: 'A valid email address is required.' }, 400);
  if (!password || password.length < 6) return json({ error: 'Password must be at least 6 characters.' }, 400);
  if (!['owner', 'manager', 'cashier'].includes(role)) return json({ error: 'Invalid user role.' }, 400);
  if (role === 'owner' && actor.role !== 'owner') return json({ error: 'Only an owner can create another owner.' }, 403);
  if (role === 'cashier' && !businessId) return json({ error: 'Attendants must be assigned to one business.' }, 400);

  let accessibleBusinessIds: string[] = [];
  if (actor.role === 'owner') {
    const { data, error } = await supabase
      .from('businesses')
      .select('id')
      .eq('owner_id', actor.id)
      .eq('status', 'active');
    if (error) return json({ error: error.message }, 400);
    accessibleBusinessIds = (data ?? []).map((business) => business.id);
  } else {
    const { data, error } = await supabase
      .from('business_users')
      .select('business_id')
      .eq('user_id', actor.id);
    if (error) return json({ error: error.message }, 400);
    accessibleBusinessIds = (data ?? []).map((business) => business.business_id);
  }

  if (role === 'cashier' && businessId && !accessibleBusinessIds.includes(businessId)) {
    return json({ error: 'You do not have access to the selected business.' }, 403);
  }

  const { data: created, error: createError } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { name, role },
  });

  if (createError || !created.user) {
    return json({ error: createError?.message ?? 'Unable to create sign-in account.' }, 400);
  }

  const profileRow = {
    id: created.user.id,
    name,
    email,
    role,
    initials: initials(name),
    avatar_color: role === 'manager' ? 'bg-emerald-600' : role === 'cashier' ? 'bg-amber-600' : 'bg-indigo-600',
    status,
    permission_overrides: permissionOverrides,
    primary_business_id: role === 'cashier' ? businessId : null,
    business_access: role === 'cashier' ? 'assigned' : 'all',
  };

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .upsert(profileRow, { onConflict: 'id' })
    .select('*')
    .single();

  if (profileError) {
    await supabase.auth.admin.deleteUser(created.user.id);
    return json({ error: profileError.message }, 400);
  }

  const membershipBusinessIds = role === 'cashier'
    ? [businessId]
    : accessibleBusinessIds;

  const membershipRows = membershipBusinessIds
    .filter((id): id is string => Boolean(id))
    .map((id) => ({ business_id: id, user_id: created.user.id, role }));

  if (membershipRows.length) {
    const { error: membershipError } = await supabase.from('business_users').insert(membershipRows);
    if (membershipError) {
      await supabase.from('profiles').delete().eq('id', created.user.id);
      await supabase.auth.admin.deleteUser(created.user.id);
      return json({ error: membershipError.message }, 400);
    }
  }

  return json({ profile });
});
