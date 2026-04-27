export const suppliers = [
  { id: 1, name: 'TechWorld Distributors', contact: 'Kwame Asante', phone: '+233 24 123 4567', email: 'kwame@techworld.gh', address: 'Accra, Ghana', totalOrders: 24, totalSpent: '₵18,450' },
  { id: 2, name: 'Global Electronics Ltd', contact: 'Amara Diallo', phone: '+233 20 987 6543', email: 'amara@globalelec.com', address: 'Kumasi, Ghana', totalOrders: 18, totalSpent: '₵12,200' },
  { id: 3, name: 'AfriStyle Clothing Co.', contact: 'Nia Mensah', phone: '+233 55 456 7890', email: 'nia@afristyle.com', address: 'Takoradi, Ghana', totalOrders: 9, totalSpent: '₵4,800' },
  { id: 4, name: 'Office Supplies Hub', contact: 'James Osei', phone: '+233 27 321 0987', email: 'james@officesupplies.gh', address: 'Accra, Ghana', totalOrders: 15, totalSpent: '₵3,100' },
];

export const purchases = [
  { id: 'PO-0021', supplier: 'TechWorld Distributors', date: 'Apr 24, 2026', items: 5, total: '₵2,340.00', status: 'Received', paymentStatus: 'Paid' },
  { id: 'PO-0020', supplier: 'Global Electronics Ltd', date: 'Apr 22, 2026', items: 3, total: '₵1,150.00', status: 'Received', paymentStatus: 'Paid' },
  { id: 'PO-0019', supplier: 'AfriStyle Clothing Co.', date: 'Apr 20, 2026', items: 8, total: '₵880.00', status: 'Pending', paymentStatus: 'Unpaid' },
  { id: 'PO-0018', supplier: 'Office Supplies Hub', date: 'Apr 18, 2026', items: 12, total: '₵420.00', status: 'Received', paymentStatus: 'Paid' },
  { id: 'PO-0017', supplier: 'TechWorld Distributors', date: 'Apr 15, 2026', items: 4, total: '₵3,200.00', status: 'Received', paymentStatus: 'Paid' },
  { id: 'PO-0016', supplier: 'Global Electronics Ltd', date: 'Apr 12, 2026', items: 6, total: '₵1,800.00', status: 'Cancelled', paymentStatus: 'Refunded' },
];
