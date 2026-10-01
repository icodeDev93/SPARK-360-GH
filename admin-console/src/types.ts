export type BusinessStatus = 'pending' | 'active' | 'inactive' | 'archived';

export type BusinessRow = {
  id: string;
  owner_id: string;
  business_name: string;
  legal_name: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  logo_url: string | null;
  status: BusinessStatus;
  archived_at: string | null;
  created_at: string;
  updated_at?: string | null;
};

export type ProfileRow = {
  id: string;
  name: string;
  email: string;
  role: 'owner' | 'manager' | 'cashier';
  phone: string | null;
  address: string | null;
  status: 'Active' | 'Inactive';
  created_at: string;
};

export type BusinessUserRow = {
  id: string;
  business_id: string;
  user_id: string;
  role: 'owner' | 'manager' | 'cashier';
  created_at: string;
};

export type PlatformAdminRow = {
  user_id: string;
  role: 'super_admin' | 'support';
  is_active: boolean;
  created_at: string;
};
