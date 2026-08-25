import { DataSource } from 'typeorm';
import * as bcrypt from 'bcrypt';
import * as dotenv from 'dotenv';
import { User } from '../../modules/auth/entities/user.entity';
import { RefreshToken } from '../../modules/auth/entities/refresh-token.entity';
import { Role } from '../../modules/rbac/entities/role.entity';
import { Permission } from '../../modules/rbac/entities/permission.entity';
import { UserRole } from '../../modules/rbac/entities/user-role.entity';
import { AppModule } from '../../modules/rbac/entities/module.entity';
import { Warehouse } from '../../modules/master/entities/warehouse.entity';
import { Outlet } from '../../modules/master/entities/outlet.entity';
import { Category } from '../../modules/master/entities/category.entity';
import { UserLocation } from '../../modules/master/entities/user-location.entity';
import { CompanySettings } from '../../modules/master/entities/company.entity';
import { Product } from '../../modules/inventory/entities/product.entity';
import { ProductBatch } from '../../modules/inventory/entities/product-batch.entity';
import { Inventory } from '../../modules/inventory/entities/inventory.entity';
import { StockMovement } from '../../modules/inventory/entities/stock-movement.entity';
import { PurchaseOrder } from '../../modules/purchase-order/entities/purchase-order.entity';
import { POItem } from '../../modules/purchase-order/entities/po-item.entity';
import { Transaction } from '../../modules/pos/entities/transaction.entity';
import { TransactionItem } from '../../modules/pos/entities/transaction-item.entity';
import { Payment } from '../../modules/pos/entities/payment.entity';
import { Member } from '../../modules/pos/entities/member.entity';
import { PointTransaction } from '../../modules/pos/entities/point-transaction.entity';
import { Promo } from '../../modules/pos/entities/promo.entity';
import { Return, ReturnItem } from '../../modules/pos/entities/return.entity';
import { PosSession } from '../../modules/pos/entities/pos-session.entity';
import { Notification } from '../../modules/notifications/entities/notification.entity';

dotenv.config();

async function runSeed() {
  const dataSource = new DataSource({
    type: 'postgres',
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    username: process.env.DB_USERNAME || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    database: process.env.DB_NAME || 'inventory_pos',
    entities: [
      User, RefreshToken,
      Role, Permission, UserRole, AppModule,
      Warehouse, Outlet, Category, UserLocation, CompanySettings,
      Product, ProductBatch, Inventory, StockMovement,
      PurchaseOrder, POItem,
      Transaction, TransactionItem, Payment,
      Member, PointTransaction, Promo,
      Return, ReturnItem, PosSession,
      Notification,
    ],
    synchronize: true, // Creates/updates all tables
  });

  await dataSource.initialize();
  console.log('Connected to database — schema synchronized');

  const queryRunner = dataSource.createQueryRunner();
  await queryRunner.connect();
  await queryRunner.startTransaction();

  try {
    // 1. Create permissions
    const permissions = [
      { slug: 'rbac:manage_roles', name: 'Manage Roles' },
      { slug: 'rbac:read_roles', name: 'Read Roles' },
      { slug: 'rbac:manage_permissions', name: 'Manage Permissions' },
      { slug: 'rbac:read_permissions', name: 'Read Permissions' },
      { slug: 'rbac:assign_roles', name: 'Assign Roles' },
      { slug: 'master:manage_warehouses', name: 'Manage Warehouses' },
      { slug: 'master:read_warehouses', name: 'Read Warehouses' },
      { slug: 'master:manage_outlets', name: 'Manage Outlets' },
      { slug: 'master:read_outlets', name: 'Read Outlets' },
      { slug: 'master:manage_categories', name: 'Manage Categories' },
      { slug: 'master:read_categories', name: 'Read Categories' },
      { slug: 'inventory:manage_products', name: 'Manage Products' },
      { slug: 'inventory:read_products', name: 'Read Products' },
      { slug: 'inventory:manage_batches', name: 'Manage Batches' },
      { slug: 'inventory:read_batches', name: 'Read Batches' },
      { slug: 'inventory:stock_in', name: 'Stock In' },
      { slug: 'inventory:read_stock', name: 'Read Stock' },
      { slug: 'po:create', name: 'Create PO' },
      { slug: 'po:read', name: 'Read PO' },
      { slug: 'po:submit', name: 'Submit PO' },
      { slug: 'po:ship', name: 'Ship PO' },
      { slug: 'po:receive', name: 'Receive PO' },
      { slug: 'po:approve', name: 'Approve PO' },
      { slug: 'pos:create_transaction', name: 'Create Transaction' },
      { slug: 'pos:read_transactions', name: 'Read Transactions' },
      { slug: 'pos:void_transaction', name: 'Void Transaction' },
      { slug: 'pos:process_payment', name: 'Process Payment' },
      { slug: 'pos:manage_members', name: 'Manage Members' },
      { slug: 'pos:read_members', name: 'Read Members' },
      { slug: 'pos:manage_returns', name: 'Manage Returns' },
      { slug: 'pos:manage_promos', name: 'Manage Promos' },
      { slug: 'reports:sales', name: 'View Sales Reports' },
      { slug: 'reports:stock', name: 'View Stock Reports' },
      { slug: 'reports:finance', name: 'View Finance Reports' },
      { slug: 'master:manage_company', name: 'Manage Company Settings' },
    ];

    const savedPermissions: any[] = [];
    for (const perm of permissions) {
      const result = await queryRunner.query(
        `INSERT INTO permissions (id, slug, name, created_at, updated_at) VALUES (gen_random_uuid(), $1, $2, NOW(), NOW()) ON CONFLICT (slug) DO NOTHING RETURNING id`,
        [perm.slug, perm.name],
      );
      if (result.length > 0) {
        savedPermissions.push({ id: result[0].id, ...perm });
      }
    }
    console.log(`Created ${savedPermissions.length} permissions`);

    // 2. Create roles
    const adminRoleResult = await queryRunner.query(
      `INSERT INTO roles (id, name, description, is_active, created_at, updated_at) VALUES (gen_random_uuid(), 'Admin', 'Full system access', true, NOW(), NOW()) ON CONFLICT DO NOTHING RETURNING id`,
    );
    const adminRoleId = adminRoleResult[0]?.id;

    const whManagerResult = await queryRunner.query(
      `INSERT INTO roles (id, name, description, is_active, created_at, updated_at) VALUES (gen_random_uuid(), 'Warehouse Manager', 'Manages warehouse operations', true, NOW(), NOW()) ON CONFLICT DO NOTHING RETURNING id`,
    );

    const cashierResult = await queryRunner.query(
      `INSERT INTO roles (id, name, description, is_active, created_at, updated_at) VALUES (gen_random_uuid(), 'Cashier', 'POS operations', true, NOW(), NOW()) ON CONFLICT DO NOTHING RETURNING id`,
    );

    const outletManagerResult = await queryRunner.query(
      `INSERT INTO roles (id, name, description, is_active, created_at, updated_at) VALUES (gen_random_uuid(), 'Outlet Manager', 'Manages outlet operations', true, NOW(), NOW()) ON CONFLICT DO NOTHING RETURNING id`,
    );

    // 3. Assign all permissions to Admin role
    if (adminRoleId) {
      const allPermIds = await queryRunner.query(`SELECT id FROM permissions`);
      for (const p of allPermIds) {
        await queryRunner.query(
          `INSERT INTO role_permissions (role_id, permission_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
          [adminRoleId, p.id],
        );
      }
      console.log('Assigned all permissions to Admin role');
    }

    // 4. Create admin user
    const passwordHash = await bcrypt.hash('Admin@123', 12);
    const userResult = await queryRunner.query(
      `INSERT INTO users (id, email, password_hash, full_name, is_active, created_at, updated_at) VALUES (gen_random_uuid(), 'admin@inventorypos.com', $1, 'System Admin', true, NOW(), NOW()) ON CONFLICT (email) DO NOTHING RETURNING id`,
      [passwordHash],
    );
    const adminUserId = userResult[0]?.id;

    // 5. Assign admin role to admin user
    if (adminUserId && adminRoleId) {
      await queryRunner.query(
        `INSERT INTO user_roles (id, user_id, role_id) VALUES (gen_random_uuid(), $1, $2) ON CONFLICT DO NOTHING`,
        [adminUserId, adminRoleId],
      );
      console.log('Admin user created and role assigned');
    }

    // 6. Create sample modules (menu)
    // 6. Create menu modules (clear first to avoid duplicates)
    await queryRunner.query(`DELETE FROM modules`);
    const modules = [
      { name: 'Dashboard', icon: 'LayoutDashboard', route: '/dashboard', order: 1 },
      { name: 'Master Data', icon: 'Database', route: '/master', order: 2, permission: 'master:read_warehouses' },
      { name: 'Inventory', icon: 'Package', route: '/inventory', order: 3, permission: 'inventory:read_products' },
      { name: 'Purchase Orders', icon: 'FileText', route: '/purchase-orders', order: 4, permission: 'po:read' },
      { name: 'POS', icon: 'ShoppingCart', route: '/pos', order: 5, permission: 'pos:create_transaction' },
      { name: 'Members', icon: 'Users', route: '/members', order: 6, permission: 'pos:read_members' },
      { name: 'Reports', icon: 'BarChart3', route: '/reports', order: 7, permission: 'reports:sales' },
      { name: 'Settings', icon: 'Settings', route: '/settings', order: 8, permission: 'rbac:manage_roles' },
    ];

    for (const mod of modules) {
      await queryRunner.query(
        `INSERT INTO modules (id, name, icon, route, sort_order, is_active, required_permission, created_at, updated_at) VALUES (gen_random_uuid(), $1, $2, $3, $4, true, $5, NOW(), NOW())`,
        [mod.name, mod.icon, mod.route, mod.order, mod.permission || null],
      );
    }
    console.log('Created menu modules');

    // 7. Create default company settings
    await queryRunner.query(
      `INSERT INTO company_settings (id, company_name, address, phone, email, receipt_footer, created_at, updated_at)
       VALUES (gen_random_uuid(), 'PT. Inventory POS Indonesia', 'Jl. Contoh No. 1, Jakarta', '021-1234567', 'info@inventorypos.com', 'Terima kasih atas kunjungan Anda!', NOW(), NOW())
       ON CONFLICT DO NOTHING`,
    );
    console.log('Created default company settings');

    await queryRunner.commitTransaction();
    console.log('Seed completed successfully!');
    console.log('\n--- Admin Login ---');
    console.log('Email: admin@inventorypos.com');
    console.log('Password: Admin@123');
  } catch (error) {
    await queryRunner.rollbackTransaction();
    console.error('Seed failed:', error);
  } finally {
    await queryRunner.release();
    await dataSource.destroy();
  }
}

runSeed();
