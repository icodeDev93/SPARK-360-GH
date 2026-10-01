import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const migrationPath = new URL('../supabase/migrations/20260927150000_harden_permissions_and_scale_indexes.sql', import.meta.url);

test('every tenant write area has a database permission mapping', async () => {
  const sql = await readFile(migrationPath, 'utf8');
  const expected = {
    customers: 'customers', suppliers: 'purchases', inventory: 'inventory',
    inventory_categories: 'inventory', sales: 'pos', sale_items: 'pos', receipts: 'pos',
    credit_payments: 'credit', purchases: 'purchases', purchase_items: 'purchases',
    expense_categories: 'expenses', expenses: 'expenses', banks: 'bank-deposit',
    bank_deposits: 'bank-deposit', store_settings: 'settings',
  };
  for (const [table, permission] of Object.entries(expected)) {
    assert.match(sql, new RegExp(`\\('${table}', '${permission}'\\)`));
  }
  assert.match(sql, /has_business_permission\(%L, business_id\)/);
  assert.match(sql, /current_app_role\(\) in \(''owner'', ''manager''\).*has_business_permission/);
});

test('tenant owners cannot edit global role defaults', async () => {
  const sql = await readFile(migrationPath, 'utf8');
  assert.match(sql, /role_permissions_write_platform_admin/);
  assert.doesNotMatch(sql, /create policy role_permissions_write_owner/);
});

test('user management functions reject wildcard browser origins', async () => {
  for (const name of ['create-user', 'update-user']) {
    const source = await readFile(new URL(`../supabase/functions/${name}/index.ts`, import.meta.url), 'utf8');
    assert.doesNotMatch(source, /Access-Control-Allow-Origin['"]:\s*['"]\*['"]/);
    assert.match(source, /ALLOWED_ORIGINS/);
  }
});
