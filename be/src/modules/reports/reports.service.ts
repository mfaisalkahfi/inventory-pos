import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, LessThanOrEqual, MoreThanOrEqual } from 'typeorm';
import { Product } from '../inventory/entities/product.entity';
import { ProductBatch } from '../inventory/entities/product-batch.entity';
import { Inventory } from '../inventory/entities/inventory.entity';
import { StockMovement } from '../inventory/entities/stock-movement.entity';
import { Transaction, TransactionStatus } from '../pos/entities/transaction.entity';
import { TransactionItem } from '../pos/entities/transaction-item.entity';
import { Payment } from '../pos/entities/payment.entity';
import { PurchaseOrder, POStatus } from '../purchase-order/entities/purchase-order.entity';

@Injectable()
export class ReportsService {
  constructor(
    @InjectRepository(Product) private readonly productRepo: Repository<Product>,
    @InjectRepository(ProductBatch) private readonly batchRepo: Repository<ProductBatch>,
    @InjectRepository(Inventory) private readonly inventoryRepo: Repository<Inventory>,
    @InjectRepository(StockMovement) private readonly movementRepo: Repository<StockMovement>,
    @InjectRepository(Transaction) private readonly transactionRepo: Repository<Transaction>,
    @InjectRepository(TransactionItem) private readonly txnItemRepo: Repository<TransactionItem>,
    @InjectRepository(Payment) private readonly paymentRepo: Repository<Payment>,
    @InjectRepository(PurchaseOrder) private readonly poRepo: Repository<PurchaseOrder>,
  ) {}

  async getDashboardSummary() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Total products
    const totalProducts = await this.productRepo.count({ where: { isActive: true } });

    // Today's sales
    const todayTransactions = await this.transactionRepo.find({
      where: { status: TransactionStatus.COMPLETED, createdAt: Between(today, tomorrow) },
    });
    const todaySales = todayTransactions.reduce((sum, t) => sum + Number(t.total), 0);
    const todayTxnCount = todayTransactions.length;

    // Pending POs
    const pendingPO = await this.poRepo.count({
      where: [
        { status: POStatus.SUBMITTED },
        { status: POStatus.SHIPPED },
        { status: POStatus.RECEIVED },
      ],
    });

    // Expiring soon (within 7 days)
    const sevenDaysFromNow = new Date();
    sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);
    const expiringSoon = await this.batchRepo.count({
      where: {
        isBlocked: false,
        expiredDate: Between(today, sevenDaysFromNow),
      },
    });

    // Low stock (products with inventory below min_stock in any outlet)
    const lowStockProducts = await this.productRepo
      .createQueryBuilder('p')
      .where('p.isActive = true AND p.min_stock > 0')
      .andWhere(`
        (SELECT COALESCE(SUM(i.quantity), 0) FROM inventory i WHERE i.product_id = p.id) < p.min_stock
      `)
      .getCount();

    // Recent transactions
    const recentTransactions = await this.transactionRepo.find({
      where: { status: TransactionStatus.COMPLETED },
      order: { createdAt: 'DESC' },
      take: 5,
      relations: { outlet: true },
    });

    return {
      totalProducts,
      todaySales,
      todayTxnCount,
      pendingPO,
      expiringSoon,
      lowStockProducts,
      recentTransactions: recentTransactions.map(t => ({
        id: t.id,
        number: t.transactionNumber,
        total: t.total,
        outlet: t.outlet?.name,
        date: t.createdAt,
      })),
    };
  }

  async getSalesReport(from?: string, to?: string, outletId?: string) {
    const startDate = from ? new Date(from) : new Date(new Date().setDate(new Date().getDate() - 30));
    startDate.setHours(0, 0, 0, 0);
    const endDate = to ? new Date(to) : new Date();
    endDate.setHours(23, 59, 59, 999);

    const where: any = {
      status: TransactionStatus.COMPLETED,
      createdAt: Between(startDate, endDate),
    };
    if (outletId) where.outletId = outletId;

    const transactions = await this.transactionRepo.find({
      where,
      relations: { payments: true, outlet: true },
      order: { createdAt: 'DESC' },
    });

    let totalSales = 0, totalCash = 0, totalDigital = 0, totalDiscount = 0;
    for (const t of transactions) {
      totalSales += Number(t.total);
      totalDiscount += Number(t.discount);
      for (const p of t.payments || []) {
        if (p.method === 'cash') totalCash += Number(p.amount) - Number(p.changeAmount);
        else totalDigital += Number(p.amount);
      }
    }

    // Daily breakdown
    const dailyMap: Record<string, { sales: number; count: number }> = {};
    for (const t of transactions) {
      const day = new Date(t.createdAt).toISOString().slice(0, 10);
      if (!dailyMap[day]) dailyMap[day] = { sales: 0, count: 0 };
      dailyMap[day].sales += Number(t.total);
      dailyMap[day].count++;
    }
    const dailyBreakdown = Object.entries(dailyMap).map(([date, data]) => ({ date, ...data })).sort((a, b) => a.date.localeCompare(b.date));

    return {
      period: { from: startDate.toISOString().slice(0, 10), to: endDate.toISOString().slice(0, 10) },
      totalSales,
      totalTransactions: transactions.length,
      totalCash,
      totalDigital,
      totalDiscount,
      averageTransaction: transactions.length > 0 ? totalSales / transactions.length : 0,
      dailyBreakdown,
    };
  }

  async getStockReport(outletId?: string) {
    const where: any = {};
    if (outletId) { where.locationId = outletId; where.locationType = 'outlet'; }

    const inventory = await this.inventoryRepo.find({
      where,
      relations: { product: true, batch: true },
    });

    // Group by product
    const productMap: Record<string, { product: any; totalStock: number; batches: any[] }> = {};
    for (const inv of inventory) {
      const pid = inv.productId;
      if (!productMap[pid]) {
        productMap[pid] = { product: inv.product, totalStock: 0, batches: [] };
      }
      productMap[pid].totalStock += inv.quantity;
      if (inv.batch) {
        productMap[pid].batches.push({
          batchCode: inv.batch.batchCode,
          expiredDate: inv.batch.expiredDate,
          quantity: inv.quantity,
          isExpired: inv.batch.isExpired,
          isBlocked: inv.batch.isBlocked,
        });
      }
    }

    const items = Object.values(productMap).map(p => ({
      productId: p.product?.id,
      sku: p.product?.sku,
      name: p.product?.name,
      totalStock: p.totalStock,
      minStock: p.product?.minStock || 0,
      isLowStock: p.totalStock < (p.product?.minStock || 0),
      batches: p.batches,
    }));

    return {
      totalItems: items.length,
      lowStockCount: items.filter(i => i.isLowStock).length,
      items: items.sort((a, b) => a.name?.localeCompare(b.name || '') || 0),
    };
  }

  async getExpiredReport() {
    const today = new Date();
    const sevenDays = new Date(); sevenDays.setDate(today.getDate() + 7);

    const expired = await this.batchRepo.find({
      where: { isExpired: true },
      relations: { product: true },
      order: { expiredDate: 'DESC' },
      take: 50,
    });

    const expiringSoon = await this.batchRepo.find({
      where: { isBlocked: false, expiredDate: Between(today, sevenDays) },
      relations: { product: true },
      order: { expiredDate: 'ASC' },
    });

    return {
      expiredCount: expired.length,
      expiringSoonCount: expiringSoon.length,
      expired: expired.map(b => ({ batchCode: b.batchCode, product: b.product?.name, expiredDate: b.expiredDate })),
      expiringSoon: expiringSoon.map(b => ({ batchCode: b.batchCode, product: b.product?.name, expiredDate: b.expiredDate, daysLeft: Math.ceil((new Date(b.expiredDate).getTime() - today.getTime()) / 86400000) })),
    };
  }

  // =============================================
  // EXPORT METHODS
  // =============================================

  async exportSalesExcel(from?: string, to?: string, outletId?: string): Promise<Buffer> {
    const data = await this.getSalesReport(from, to, outletId);
    const ExcelJS = require('exceljs');
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Sales Report');

    // Header info
    sheet.addRow(['SALES REPORT']);
    sheet.addRow([`Period: ${data.period.from} - ${data.period.to}`]);
    sheet.addRow([]);
    sheet.addRow(['Summary']);
    sheet.addRow(['Total Sales', `Rp ${Number(data.totalSales).toLocaleString('id-ID')}`]);
    sheet.addRow(['Total Transactions', data.totalTransactions]);
    sheet.addRow(['Cash Payments', `Rp ${Number(data.totalCash).toLocaleString('id-ID')}`]);
    sheet.addRow(['Digital Payments', `Rp ${Number(data.totalDigital).toLocaleString('id-ID')}`]);
    sheet.addRow(['Average Transaction', `Rp ${Number(data.averageTransaction).toLocaleString('id-ID')}`]);
    sheet.addRow([]);

    // Daily breakdown table
    sheet.addRow(['Date', 'Sales', 'Transactions']);
    const headerRow = sheet.lastRow;
    headerRow.font = { bold: true };

    for (const day of data.dailyBreakdown || []) {
      sheet.addRow([day.date, Number(day.sales), day.count]);
    }

    // Auto-width columns
    sheet.columns.forEach((col: any) => { col.width = 20; });

    const buffer = await workbook.xlsx.writeBuffer();
    return Buffer.from(buffer);
  }

  async exportSalesPdf(from?: string, to?: string, outletId?: string): Promise<Buffer> {
    const data = await this.getSalesReport(from, to, outletId);
    const PDFDocument = require('pdfkit');

    return new Promise((resolve) => {
      const doc = new PDFDocument({ margin: 50 });
      const chunks: Buffer[] = [];
      doc.on('data', (chunk: Buffer) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));

      // Title
      doc.fontSize(18).font('Helvetica-Bold').text('SALES REPORT', { align: 'center' });
      doc.fontSize(10).font('Helvetica').text(`Period: ${data.period.from} to ${data.period.to}`, { align: 'center' });
      doc.moveDown(2);

      // Summary
      doc.fontSize(12).font('Helvetica-Bold').text('Summary');
      doc.fontSize(10).font('Helvetica');
      doc.text(`Total Sales: Rp ${Number(data.totalSales).toLocaleString('id-ID')}`);
      doc.text(`Total Transactions: ${data.totalTransactions}`);
      doc.text(`Cash Payments: Rp ${Number(data.totalCash).toLocaleString('id-ID')}`);
      doc.text(`Digital Payments: Rp ${Number(data.totalDigital).toLocaleString('id-ID')}`);
      doc.text(`Average per Transaction: Rp ${Math.round(Number(data.averageTransaction)).toLocaleString('id-ID')}`);
      doc.moveDown(2);

      // Daily breakdown
      doc.fontSize(12).font('Helvetica-Bold').text('Daily Breakdown');
      doc.moveDown(0.5);

      // Table header
      const tableTop = doc.y;
      doc.fontSize(9).font('Helvetica-Bold');
      doc.text('Date', 50, tableTop);
      doc.text('Sales', 200, tableTop);
      doc.text('Transactions', 380, tableTop);
      doc.moveTo(50, tableTop + 15).lineTo(550, tableTop + 15).stroke();

      let y = tableTop + 20;
      doc.font('Helvetica');
      for (const day of data.dailyBreakdown || []) {
        if (y > 700) { doc.addPage(); y = 50; }
        doc.text(day.date, 50, y);
        doc.text(`Rp ${Number(day.sales).toLocaleString('id-ID')}`, 200, y);
        doc.text(String(day.count), 380, y);
        y += 18;
      }

      doc.moveDown(2);
      doc.fontSize(8).text(`Generated: ${new Date().toLocaleString('id-ID')}`, { align: 'right' });

      doc.end();
    });
  }

  async exportStockExcel(outletId?: string): Promise<Buffer> {
    const data = await this.getStockReport(outletId);
    const ExcelJS = require('exceljs');
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Stock Report');

    sheet.addRow(['STOCK REPORT']);
    sheet.addRow([`Generated: ${new Date().toLocaleString('id-ID')}`]);
    sheet.addRow([]);

    // Summary
    sheet.addRow(['Total Products', data.totalItems]);
    sheet.addRow(['Low Stock Count', data.lowStockCount]);
    sheet.addRow([]);

    // Table
    const headerRow = sheet.addRow(['SKU', 'Product', 'Total Stock', 'Min Stock', 'Status']);
    headerRow.font = { bold: true };

    for (const item of data.items || []) {
      sheet.addRow([item.sku, item.name, item.totalStock, item.minStock, item.isLowStock ? 'LOW' : 'OK']);
    }

    sheet.columns.forEach((col: any) => { col.width = 18; });

    const buffer = await workbook.xlsx.writeBuffer();
    return Buffer.from(buffer);
  }
}
