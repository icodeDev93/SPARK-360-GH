import type { Customer, InvoiceRecord, TopCustomer } from '@/types/erp';

export function getTop5Customers(customers: Customer[]): TopCustomer[] {
  return [...customers]
    .sort((a, b) => b.totalPurchases - a.totalPurchases)
    .slice(0, 5)
    .map(({ customerId, fullName, customerType, totalPurchases, avatar }) => ({
      customerId,
      fullName,
      customerType,
      totalPurchases,
      avatar,
    }));
}

export function calcCustomerTotalFromInvoices(
  customerId: string,
  invoices: InvoiceRecord[]
): number {
  return invoices
    .filter((inv) => inv.customerId === customerId && inv.status === 'completed')
    .reduce((sum, inv) => sum + inv.netSales, 0);
}

export function calcOutstandingBalance(
  customerId: string,
  invoices: InvoiceRecord[],
  payments: number
): number {
  const totalBilled = invoices
    .filter((inv) => inv.customerId === customerId && inv.status === 'completed')
    .reduce((sum, inv) => sum + inv.netSales, 0);
  return Math.max(0, totalBilled - payments);
}

export function getCustomerInvoices(
  customerId: string,
  invoices: InvoiceRecord[]
): InvoiceRecord[] {
  return invoices
    .filter((inv) => inv.customerId === customerId)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}

export function searchCustomers(customers: Customer[], query: string): Customer[] {
  const q = query.toLowerCase();
  return customers.filter(
    (c) =>
      c.fullName.toLowerCase().includes(q) ||
      c.phone.includes(q)
  );
}

export function filterByCustomerType(
  customers: Customer[],
  type: 'Wholesale' | 'Retail' | 'All'
): Customer[] {
  if (type === 'All') return customers;
  return customers.filter((c) => c.customerType === type);
}
