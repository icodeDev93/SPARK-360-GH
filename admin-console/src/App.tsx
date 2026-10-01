import { useEffect, useMemo, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import type { BusinessRow, BusinessStatus, BusinessUserRow, PlatformAdminRow, ProfileRow } from '@/types';
import type { PageKey } from '@/lib/nav';
import type { StatusFilter } from '@/lib/status';
import { Sidebar } from '@/components/layout/Sidebar';
import { MobileNav } from '@/components/layout/MobileNav';
import { Topbar } from '@/components/layout/Topbar';
import { Alert } from '@/components/ui/Alert';
import { FullPageMessage } from '@/components/ui/FullPageMessage';
import { LoginScreen } from '@/pages/LoginScreen';
import { Dashboard } from '@/pages/Dashboard';
import { ApprovalsPage } from '@/pages/ApprovalsPage';
import { BusinessesPage } from '@/pages/BusinessesPage';
import { UsersPage } from '@/pages/UsersPage';

export default function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [sessionLoading, setSessionLoading] = useState(true);
  const [admin, setAdmin] = useState<PlatformAdminRow | null>(null);
  const [accessError, setAccessError] = useState('');
  const [page, setPage] = useState<PageKey>('dashboard');
  const [businesses, setBusinesses] = useState<BusinessRow[]>([]);
  const [profiles, setProfiles] = useState<ProfileRow[]>([]);
  const [memberships, setMemberships] = useState<BusinessUserRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [actionId, setActionId] = useState('');
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setSessionLoading(false);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      setAdmin(null);
      setAccessError('');
    });

    return () => listener.subscription.unsubscribe();
  }, []);

  const profileById = useMemo(() => {
    const map = new Map<string, ProfileRow>();
    profiles.forEach((profile) => map.set(profile.id, profile));
    return map;
  }, [profiles]);

  const businessCountByOwner = useMemo(() => {
    const map = new Map<string, number>();
    businesses
      .filter((business) => business.status !== 'archived')
      .forEach((business) => map.set(business.owner_id, (map.get(business.owner_id) ?? 0) + 1));
    return map;
  }, [businesses]);

  const loadConsole = async () => {
    if (!session?.user) return;
    setLoading(true);
    setError('');
    setNotice('');

    const { data: adminRow, error: adminError } = await supabase
      .from('platform_admins')
      .select('*')
      .eq('user_id', session.user.id)
      .eq('is_active', true)
      .maybeSingle();

    if (adminError) {
      setAccessError(adminError.message);
      setLoading(false);
      return;
    }

    if (!adminRow) {
      setAccessError('Your account is not enabled as a platform admin.');
      setLoading(false);
      return;
    }

    setAdmin(adminRow as PlatformAdminRow);

    const [businessRes, profileRes, memberRes] = await Promise.all([
      supabase.from('businesses').select('*').order('created_at', { ascending: false }),
      supabase.from('profiles').select('id,name,email,role,phone,address,status,created_at').order('created_at', { ascending: false }),
      supabase.from('business_users').select('*').order('created_at', { ascending: false }),
    ]);

    if (businessRes.error) setError(businessRes.error.message);
    else setBusinesses((businessRes.data ?? []) as BusinessRow[]);

    if (profileRes.error) setError(profileRes.error.message);
    else setProfiles((profileRes.data ?? []) as ProfileRow[]);

    if (memberRes.error) setError(memberRes.error.message);
    else setMemberships((memberRes.data ?? []) as BusinessUserRow[]);

    setLoading(false);
  };

  useEffect(() => {
    if (!sessionLoading && session) loadConsole();
  }, [sessionLoading, session?.user?.id]);

  const statusCounts = useMemo(() => {
    const counts: Record<BusinessStatus, number> = { pending: 0, active: 0, inactive: 0, archived: 0 };
    businesses.forEach((business) => {
      counts[business.status] += 1;
    });
    return counts;
  }, [businesses]);

  const pendingBusinesses = useMemo(() => businesses.filter((business) => business.status === 'pending'), [businesses]);

  const filteredBusinesses = useMemo(() => {
    const q = search.toLowerCase().trim();
    return businesses.filter((business) => {
      const owner = profileById.get(business.owner_id);
      const matchesStatus = statusFilter === 'all' || business.status === statusFilter;
      const matchesSearch =
        !q ||
        business.business_name.toLowerCase().includes(q) ||
        (business.address ?? '').toLowerCase().includes(q) ||
        (owner?.name ?? '').toLowerCase().includes(q) ||
        (owner?.email ?? '').toLowerCase().includes(q);
      return matchesStatus && matchesSearch;
    });
  }, [businesses, profileById, search, statusFilter]);

  const owners = useMemo(() => profiles.filter((profile) => profile.role === 'owner'), [profiles]);

  const updateBusinessStatus = async (business: BusinessRow, status: BusinessStatus) => {
    setActionId(`${business.id}:${status}`);
    setError('');
    setNotice('');

    const { error: updateError } = await supabase
      .from('businesses')
      .update({
        status,
        archived_at: status === 'archived' ? new Date().toISOString() : null,
      })
      .eq('id', business.id);

    if (updateError) {
      setError(updateError.message);
      setActionId('');
      return;
    }

    setBusinesses((prev) =>
      prev.map((item) =>
        item.id === business.id
          ? { ...item, status, archived_at: status === 'archived' ? new Date().toISOString() : null }
          : item,
      ),
    );
    setNotice(`${business.business_name} is now ${status}.`);
    setActionId('');
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setSession(null);
    setAdmin(null);
    setBusinesses([]);
    setProfiles([]);
    setMemberships([]);
  };

  if (sessionLoading) {
    return <FullPageMessage icon="ri-loader-4-line animate-spin" title="Loading console" text="Checking your session." />;
  }

  if (!session) return <LoginScreen />;

  if (accessError) {
    return (
      <FullPageMessage
        icon="ri-shield-user-line"
        title="Admin access required"
        text={accessError}
        actionLabel="Sign out"
        onAction={signOut}
      />
    );
  }

  if (!admin && loading) {
    return <FullPageMessage icon="ri-loader-4-line animate-spin" title="Loading console" text="Preparing platform data." />;
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <Sidebar page={page} pendingCount={pendingBusinesses.length} onNavigate={setPage} />

      <main className="lg:pl-64">
        <Topbar page={page} session={session} admin={admin} onRefresh={loadConsole} onSignOut={signOut} />

        <MobileNav page={page} onNavigate={setPage} />

        <section className="p-4 lg:p-8">
          {notice && <Alert kind="success" text={notice} onClose={() => setNotice('')} />}
          {error && <Alert kind="error" text={error} onClose={() => setError('')} />}

          {page === 'dashboard' && (
            <Dashboard
              businesses={businesses}
              profiles={profiles}
              memberships={memberships}
              statusCounts={statusCounts}
              onOpenApprovals={() => setPage('approvals')}
            />
          )}

          {page === 'approvals' && (
            <ApprovalsPage
              businesses={pendingBusinesses}
              profileById={profileById}
              actionId={actionId}
              onUpdateStatus={updateBusinessStatus}
            />
          )}

          {page === 'businesses' && (
            <BusinessesPage
              businesses={filteredBusinesses}
              profileById={profileById}
              actionId={actionId}
              search={search}
              statusFilter={statusFilter}
              onSearch={setSearch}
              onStatusFilter={setStatusFilter}
              onUpdateStatus={updateBusinessStatus}
            />
          )}

          {page === 'users' && <UsersPage owners={owners} businessCountByOwner={businessCountByOwner} />}
        </section>
      </main>
    </div>
  );
}
