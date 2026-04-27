export interface Supplier {
  id: string;
  name: string;
  contact: string;
  phone: string;
  email: string;
  address: string;
  category: string;
  totalOrders: number;
  totalSpent: number;
  status: 'active' | 'inactive';
  joinedDate: string;
  notes: string;
}

export interface PurchaseOrder {
  id: string;
  supplierId: string;
  supplierName: string;
  date: string;
  expectedDate: string;
  items: number;
  total: number;
  status: 'Received' | 'Pending' | 'Cancelled' | 'Partial';
  paymentStatus: 'Paid' | 'Unpaid' | 'Partial' | 'Refunded';
  notes: string;
}

export const seedSuppliers: Supplier[] = [
  {
    id: 'sup001',
    name: 'TechWorld Distributors',
    contact: 'Kwame Asante',
    phone: '+233 24 123 4567',
    email: 'kwame@techworld.gh',
    address: 'Accra, Ghana',
    category: 'Electronics',
    totalOrders: 24,
    totalSpent: 18450,
    status: 'active',
    joinedDate: 'Jan 15, 2025',
    notes: 'Primary electronics supplier. Offers 30-day credit terms.',
  },
  {
    id: 'sup002',
    name: 'Global Electronics Ltd',
    contact: 'Amara Diallo',
    phone: '+233 20 987 6543',
    email: 'amara@globalelec.com',
    address: 'Kumasi, Ghana',
    category: 'Electronics',
    totalOrders: 18,
    totalSpent: 12200,
    status: 'active',
    joinedDate: 'Mar 8, 2025',
    notes: 'Good for bulk orders. Minimum order ₵500.',
  },
  {
    id: 'sup003',
    name: 'AfriStyle Clothing Co.',
    contact: 'Nia Mensah',
    phone: '+233 55 456 7890',
    email: 'nia@afristyle.com',
    address: 'Takoradi, Ghana',
    category: 'Clothing',
    totalOrders: 9,
    totalSpent: 4800,
    status: 'active',
    joinedDate: 'Jun 20, 2025',
    notes: 'Seasonal collections. Lead time 2 weeks.',
  },
  {
    id: 'sup004',
    name: 'Office Supplies Hub',
    contact: 'James Osei',
    phone: '+233 27 321 0987',
    email: 'james@officesupplies.gh',
    address: 'Accra, Ghana',
    category: 'Stationery',
    totalOrders: 15,
    totalSpent: 3100,
    status: 'active',
    joinedDate: 'Feb 3, 2025',
    notes: 'Fast delivery within Accra. Cash on delivery.',
  },
  {
    id: 'sup005',
    name: 'AccessoriesPlus GH',
    contact: 'Abena Frimpong',
    phone: '+233 50 789 1234',
    email: 'abena@accessoriesplus.gh',
    address: 'Tema, Ghana',
    category: 'Accessories',
    totalOrders: 11,
    totalSpent: 6750,
    status: 'active',
    joinedDate: 'Apr 12, 2025',
    notes: 'Specializes in phone accessories and cables.',
  },
  {
    id: 'sup006',
    name: 'Volta Imports Ltd',
    contact: 'Kofi Boateng',
    phone: '+233 24 555 8899',
    email: 'kofi@voltaimports.com',
    address: 'Ho, Ghana',
    category: 'Electronics',
    totalOrders: 4,
    totalSpent: 2200,
    status: 'inactive',
    joinedDate: 'Sep 5, 2024',
    notes: 'Currently on hold. Pending contract renewal.',
  },
];

export const seedPurchaseOrders: PurchaseOrder[] = [
  { id: 'PO-0021', supplierId: 'sup001', supplierName: 'TechWorld Distributors', date: 'Apr 24, 2026', expectedDate: 'Apr 28, 2026', items: 5, total: 2340, status: 'Received', paymentStatus: 'Paid', notes: 'Samsung phones and earbuds restock' },
  { id: 'PO-0020', supplierId: 'sup002', supplierName: 'Global Electronics Ltd', date: 'Apr 22, 2026', expectedDate: 'Apr 26, 2026', items: 3, total: 1150, status: 'Received', paymentStatus: 'Paid', notes: 'Keyboards and mice' },
  { id: 'PO-0019', supplierId: 'sup003', supplierName: 'AfriStyle Clothing Co.', date: 'Apr 20, 2026', expectedDate: 'May 4, 2026', items: 8, total: 880, status: 'Pending', paymentStatus: 'Unpaid', notes: 'New season polo shirts' },
  { id: 'PO-0018', supplierId: 'sup004', supplierName: 'Office Supplies Hub', date: 'Apr 18, 2026', expectedDate: 'Apr 20, 2026', items: 12, total: 420, status: 'Received', paymentStatus: 'Paid', notes: 'Notebooks and stationery' },
  { id: 'PO-0017', supplierId: 'sup001', supplierName: 'TechWorld Distributors', date: 'Apr 15, 2026', expectedDate: 'Apr 19, 2026', items: 4, total: 3200, status: 'Received', paymentStatus: 'Paid', notes: 'Power banks and speakers' },
  { id: 'PO-0016', supplierId: 'sup002', supplierName: 'Global Electronics Ltd', date: 'Apr 12, 2026', expectedDate: 'Apr 16, 2026', items: 6, total: 1800, status: 'Cancelled', paymentStatus: 'Refunded', notes: 'Order cancelled - out of stock' },
  { id: 'PO-0015', supplierId: 'sup005', supplierName: 'AccessoriesPlus GH', date: 'Apr 10, 2026', expectedDate: 'Apr 14, 2026', items: 20, total: 960, status: 'Received', paymentStatus: 'Paid', notes: 'Phone cases and screen protectors' },
  { id: 'PO-0014', supplierId: 'sup005', supplierName: 'AccessoriesPlus GH', date: 'Apr 5, 2026', expectedDate: 'Apr 9, 2026', items: 15, total: 750, status: 'Partial', paymentStatus: 'Partial', notes: 'USB cables - partial delivery' },
];
