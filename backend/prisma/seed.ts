import bcrypt from 'bcrypt';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error('DATABASE_URL is not set');
}

const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });

async function main() {
  const adminPassword = await bcrypt.hash('Admin@123', 10);
  const salesPassword = await bcrypt.hash('Sales@123', 10);
  const warehousePassword = await bcrypt.hash('Warehouse@123', 10);
  const accountsPassword = await bcrypt.hash('Accounts@123', 10);

  await prisma.user.createMany({
    data: [
      {
        name: 'Admin User',
        email: 'admin@mini-erp.local',
        passwordHash: adminPassword,
        role: 'ADMIN',
        isActive: true
      },
      {
        name: 'Sales User',
        email: 'sales@mini-erp.local',
        passwordHash: salesPassword,
        role: 'SALES',
        isActive: true
      },
      {
        name: 'Warehouse User',
        email: 'warehouse@mini-erp.local',
        passwordHash: warehousePassword,
        role: 'WAREHOUSE',
        isActive: true
      },
      {
        name: 'Accounts User',
        email: 'accounts@mini-erp.local',
        passwordHash: accountsPassword,
        role: 'ACCOUNTS',
        isActive: true
      }
    ],
    skipDuplicates: true
  });

  await prisma.warehouse.createMany({
    data: [
      { name: 'Main Warehouse', location: 'Karachi', isActive: true },
      { name: 'North Retail Hub', location: 'Lahore', isActive: true }
    ],
    skipDuplicates: true
  });

  await prisma.customer.createMany({
    data: [
      {
        name: 'Retail Co.',
        mobile: '03001234567',
        email: 'retail@example.com',
        businessName: 'Retail Co.',
        gstNumber: 'GST10001',
        customerType: 'RETAIL',
        address: 'Main Market Street',
        status: 'ACTIVE',
        notes: 'Preferred retail customer',
        followUpDate: new Date('2026-08-12T00:00:00.000Z')
      },
      {
        name: 'Wholesale Supply',
        mobile: '03007654321',
        email: 'wholesale@example.com',
        businessName: 'Wholesale Supply',
        gstNumber: 'GST10002',
        customerType: 'WHOLESALE',
        address: 'Industrial Area',
        status: 'ACTIVE',
        notes: 'Higher volume sales',
        followUpDate: new Date('2026-08-14T00:00:00.000Z')
      },
      {
        name: 'Metro Distributor',
        mobile: '03009876543',
        email: 'metro@example.com',
        businessName: 'Metro Distributor',
        gstNumber: 'GST10003',
        customerType: 'DISTRIBUTOR',
        address: 'Distribution lane',
        status: 'LEAD',
        notes: 'New distributor lead',
        followUpDate: new Date('2026-08-18T00:00:00.000Z')
      },
      {
        name: 'City Traders',
        mobile: '03124567890',
        email: 'city@example.com',
        businessName: 'City Traders',
        gstNumber: 'GST10004',
        customerType: 'RETAIL',
        address: 'City Plaza',
        status: 'INACTIVE',
        notes: 'Dormant, revisit later',
        followUpDate: new Date('2026-08-20T00:00:00.000Z')
      },
      {
        name: 'North Channel Retailers',
        mobile: '03127654321',
        email: 'north@example.com',
        businessName: 'North Channel Retailers',
        gstNumber: 'GST10005',
        customerType: 'WHOLESALE',
        address: 'North Market',
        status: 'ACTIVE',
        notes: 'Medium order trend',
        followUpDate: new Date('2026-08-22T00:00:00.000Z')
      }
    ],
    skipDuplicates: true
  });

  await prisma.product.createMany({
    data: [
      {
        name: 'USB Printer Cable',
        sku: 'USB-PRINTER-CABLE',
        category: 'Office Supplies',
        unitPrice: 350,
        currentStock: 20,
        minimumStockAlert: 5,
        warehouseId: null,
        isActive: true
      },
      {
        name: 'Barcode Scanner',
        sku: 'BARCODE-SCANNER-01',
        category: 'Hardware',
        unitPrice: 1250,
        currentStock: 12,
        minimumStockAlert: 3,
        warehouseId: null,
        isActive: true
      },
      {
        name: 'Logitech Mouse',
        sku: 'LOG-M001',
        category: 'Accessories',
        unitPrice: 1500,
        currentStock: 16,
        minimumStockAlert: 4,
        warehouseId: null,
        isActive: true
      },
      {
        name: 'A4 Copier Paper',
        sku: 'A4-PAPER-500',
        category: 'Stationery',
        unitPrice: 280,
        currentStock: 50,
        minimumStockAlert: 12,
        warehouseId: null,
        isActive: true
      },
      {
        name: 'Packing Tape Roll',
        sku: 'PACK-TAPE-ROLL',
        category: 'Packaging',
        unitPrice: 95,
        currentStock: 60,
        minimumStockAlert: 15,
        warehouseId: null,
        isActive: true
      },
      {
        name: 'Thermal Printer',
        sku: 'THERMAL-PRINTER-01',
        category: 'Hardware',
        unitPrice: 42000,
        currentStock: 4,
        minimumStockAlert: 2,
        warehouseId: null,
        isActive: true
      },
      {
        name: 'UPS Battery Backup',
        sku: 'UPS-12V-001',
        category: 'Power',
        unitPrice: 8500,
        currentStock: 7,
        minimumStockAlert: 4,
        warehouseId: null,
        isActive: true
      },
      {
        name: 'Office Chair',
        sku: 'OFFICE-CHAIR-001',
        category: 'Furniture',
        unitPrice: 15000,
        currentStock: 3,
        minimumStockAlert: 1,
        warehouseId: null,
        isActive: true
      }
    ],
    skipDuplicates: true
  });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
