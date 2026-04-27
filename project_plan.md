# SPark360 - POS & Inventory Management System

## 1. Project Description
SPark360 is a modern Point-of-Sale and Inventory Management System designed for small to medium retail businesses. It enables cashiers, store managers, and admins to handle daily operations — sales, stock tracking, purchasing, customer management, and reporting — from a single, fast, intuitive interface.

## 2. Page Structure
- `/` - Dashboard (KPIs, charts, recent transactions, stock alerts)
- `/pos` - POS / Sales Screen (product grid, cart, checkout)
- `/inventory` - Inventory / Items (table, add/edit, stock levels)
- `/purchases` - Purchases & Suppliers (purchase entries, supplier management)
- `/customers` - Customers (list, add/edit, purchase history)
- `/reports` - Reports (sales, expenses, stock reports)

## 3. Core Features
- [x] App shell: sidebar navigation + topbar
- [ ] Dashboard with KPI cards, bar chart, recent transactions, stock alerts
- [ ] POS screen: product search, cart, payment, complete sale
- [ ] Inventory management: table, add/edit item drawer, stock indicators
- [ ] Purchases & Suppliers: supplier forms, purchase entry, tables
- [ ] Customer management: list, add/edit, purchase history
- [ ] Reports: sales, expenses, stock summaries

## 4. Data Model Design
No backend connected (MVP uses mock data). All data lives in mock files under `src/mocks/`.

## 5. Backend / Third-party Integration Plan
- Supabase: Not connected (Phase 1 uses mock data; can be added later for persistence)
- Shopify: Not needed
- Stripe: Not needed

## 6. Development Phase Plan

### Phase 1: App Shell + Dashboard + POS
- Goal: Build the core layout and the two most critical screens
- Deliverable: Working sidebar, topbar, Dashboard, and POS screen

### Phase 2: Inventory + Purchases & Suppliers
- Goal: Stock management and purchasing workflows
- Deliverable: Inventory table with add/edit drawer, Purchases and Suppliers pages

### Phase 3: Customers + Reports
- Goal: Customer management and reporting views
- Deliverable: Customer list/history, Reports page with charts and tables
