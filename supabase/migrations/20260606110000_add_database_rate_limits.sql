-- Database-backed rate limiting for sensitive write flows.
-- RLS controls who can perform an action; this controls how often they can do it.

create table if not exists public.rate_limit_counters (
  actor_id uuid not null,
  business_scope text not null default 'global',
  action_key text not null,
  window_seconds integer not null,
  window_start timestamptz not null,
  request_count integer not null default 0,
  updated_at timestamptz not null default now(),
  primary key (actor_id, business_scope, action_key, window_start)
);

alter table public.rate_limit_counters enable row level security;

drop policy if exists rate_limit_counters_owner_read on public.rate_limit_counters;
create policy rate_limit_counters_owner_read
on public.rate_limit_counters for select to authenticated
using (public.current_app_role() = 'owner');

create or replace function public.check_rate_limit(
  action_key text,
  max_requests integer,
  window_seconds integer default 60,
  target_business_id uuid default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor uuid := auth.uid();
  v_scope text := coalesce(target_business_id::text, 'global');
  v_window_start timestamptz;
  v_next_count integer;
begin
  -- Service-role/admin maintenance scripts do not have auth.uid(); let those pass.
  if v_actor is null then
    return;
  end if;

  if coalesce(max_requests, 0) <= 0 or coalesce(window_seconds, 0) <= 0 then
    raise exception 'Invalid rate limit configuration';
  end if;

  v_window_start := to_timestamp(
    floor(extract(epoch from now()) / window_seconds) * window_seconds
  );

  insert into public.rate_limit_counters (
    actor_id,
    business_scope,
    action_key,
    window_seconds,
    window_start,
    request_count,
    updated_at
  )
  values (
    v_actor,
    v_scope,
    btrim(action_key),
    window_seconds,
    v_window_start,
    1,
    now()
  )
  on conflict on constraint rate_limit_counters_pkey
  do update set
    request_count = public.rate_limit_counters.request_count + 1,
    updated_at = now()
  returning request_count into v_next_count;

  if v_next_count > max_requests then
    raise exception 'Rate limit exceeded. Please wait a moment and try again.'
      using errcode = 'P0001';
  end if;
end;
$$;

revoke all on function public.check_rate_limit(text, integer, integer, uuid) from public;
grant execute on function public.check_rate_limit(text, integer, integer, uuid) to authenticated;

create or replace function public.check_rate_limit_for_actor(
  actor_id uuid,
  action_key text,
  max_requests integer,
  window_seconds integer default 60,
  target_business_id uuid default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_scope text := coalesce(target_business_id::text, 'global');
  v_window_start timestamptz;
  v_next_count integer;
begin
  if actor_id is null then
    return;
  end if;

  if coalesce(max_requests, 0) <= 0 or coalesce(window_seconds, 0) <= 0 then
    raise exception 'Invalid rate limit configuration';
  end if;

  v_window_start := to_timestamp(
    floor(extract(epoch from now()) / window_seconds) * window_seconds
  );

  insert into public.rate_limit_counters (
    actor_id,
    business_scope,
    action_key,
    window_seconds,
    window_start,
    request_count,
    updated_at
  )
  values (
    actor_id,
    v_scope,
    btrim(action_key),
    window_seconds,
    v_window_start,
    1,
    now()
  )
  on conflict on constraint rate_limit_counters_pkey
  do update set
    request_count = public.rate_limit_counters.request_count + 1,
    updated_at = now()
  returning request_count into v_next_count;

  if v_next_count > max_requests then
    raise exception 'Rate limit exceeded. Please wait a moment and try again.'
      using errcode = 'P0001';
  end if;
end;
$$;

revoke all on function public.check_rate_limit_for_actor(uuid, text, integer, integer, uuid) from public;
grant execute on function public.check_rate_limit_for_actor(uuid, text, integer, integer, uuid) to authenticated;

create or replace function public.rate_limit_business_write()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  row_business_id uuid;
  action text := tg_table_name || ':' || lower(tg_op);
  max_requests integer := 60;
  window_seconds integer := 60;
begin
  case tg_table_name
    when 'businesses' then
      row_business_id := case when tg_op = 'DELETE' then old.id else new.id end;
      max_requests := 20;
      window_seconds := 300;
    when 'business_users' then
      row_business_id := case when tg_op = 'DELETE' then old.business_id else new.business_id end;
      max_requests := 60;
    when 'sales' then max_requests := case when tg_op = 'INSERT' then 40 else 80 end;
    when 'sale_items' then max_requests := 600;
    when 'receipts' then max_requests := 120;
    when 'credit_payments' then max_requests := 30;
    when 'stock_transfers' then max_requests := 30;
    when 'inventory' then max_requests := 120;
    when 'inventory_categories' then max_requests := 60;
    when 'expense_categories' then max_requests := 60;
    when 'expenses' then max_requests := 60;
    when 'bank_deposits' then max_requests := 60;
    when 'banks' then max_requests := 60;
    when 'customers' then max_requests := 80;
    when 'suppliers' then max_requests := 80;
    when 'purchases' then max_requests := 80;
    else max_requests := 60;
  end case;

  if row_business_id is null then
    row_business_id := case when tg_op = 'DELETE' then old.business_id else new.business_id end;
  end if;

  perform public.check_rate_limit(action, max_requests, window_seconds, row_business_id);
  return case when tg_op = 'DELETE' then old else new end;
end;
$$;

create or replace function public.rate_limit_global_write()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  action text := tg_table_name || ':' || lower(tg_op);
  max_requests integer := 30;
  window_seconds integer := 60;
begin
  case tg_table_name
    when 'profiles' then
      max_requests := case when tg_op = 'INSERT' then 5 else 30 end;
      window_seconds := case when tg_op = 'INSERT' then 600 else 60 end;
    when 'user_logs' then
      max_requests := case when tg_op = 'DELETE' then 30 else 300 end;
    else
      max_requests := 30;
  end case;

  perform public.check_rate_limit(action, max_requests, window_seconds, null);
  return case when tg_op = 'DELETE' then old else new end;
end;
$$;

do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'businesses',
    'business_users',
    'customers',
    'suppliers',
    'purchases',
    'inventory',
    'inventory_categories',
    'expense_categories',
    'expenses',
    'banks',
    'bank_deposits',
    'sales',
    'sale_items',
    'receipts',
    'credit_payments',
    'stock_transfers'
  ] loop
    execute format('drop trigger if exists rate_limit_%I_write on public.%I', table_name, table_name);
    execute format(
      'create trigger rate_limit_%I_write before insert or update or delete on public.%I for each row execute function public.rate_limit_business_write()',
      table_name,
      table_name
    );
  end loop;

  foreach table_name in array array['profiles', 'user_logs'] loop
    execute format('drop trigger if exists rate_limit_%I_write on public.%I', table_name, table_name);
    execute format(
      'create trigger rate_limit_%I_write before insert or update or delete on public.%I for each row execute function public.rate_limit_global_write()',
      table_name,
      table_name
    );
  end loop;
end $$;

create or replace function public.prune_rate_limit_counters()
returns void
language sql
security definer
set search_path = public
as $$
  delete from public.rate_limit_counters
  where window_start < now() - interval '24 hours';
$$;

revoke all on function public.prune_rate_limit_counters() from public;
grant execute on function public.prune_rate_limit_counters() to authenticated;
