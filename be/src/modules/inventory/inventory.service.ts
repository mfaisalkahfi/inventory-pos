import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThanOrEqual } from 'typeorm';
import { Cron, CronExpression } from '@nestjs/schedule';
import { Product } from './entities/product.entity';
import { ProductBatch } from './entities/product-batch.entity';
import { Inventory, LocationType } from './entities/inventory.entity';
import { StockMovement, MovementType } from './entities/stock-movement.entity';
import { CreateProductDto, UpdateProductDto } from './dto/product.dto';
import { CreateBatchDto, StockInDto } from './dto/batch.dto';

@Injectable()
export class InventoryService {
  constructor(
    @InjectRepository(Product)
    private readonly productRepo: Repository<Product>,
    @InjectRepository(ProductBatch)
    private readonly batchRepo: Repository<ProductBatch>,
    @InjectRepository(Inventory)
    private readonly inventoryRepo: Repository<Inventory>,
    @InjectRepository(StockMovement)
    private readonly movementRepo: Repository<StockMovement>,
  ) {}

  // --- Products ---
  async createProduct(dto: CreateProductDto) {
    const sku = dto.sku || await this.generateSku();
    const product = this.productRepo.create({ ...dto, sku });
    return this.productRepo.save(product);
  }

  async findAllProducts() {
    return this.productRepo.find({ where: { isActive: true }, relations: { category: true } });
  }

  async findProductById(id: string) {
    const product = await this.productRepo.findOne({ where: { id }, relations: { category: true } });
    if (!product) throw new NotFoundException('Product not found');
    return product;
  }

  async updateProduct(id: string, dto: UpdateProductDto) {
    const product = await this.findProductById(id);
    Object.assign(product, dto);
    return this.productRepo.save(product);
  }

  async deleteProduct(id: string) {
    const product = await this.findProductById(id);
    await this.productRepo.softRemove(product);
    return { message: 'Product deleted' };
  }

  // --- Batches ---
  async createBatch(dto: CreateBatchDto) {
    const product = await this.findProductById(dto.productId);
    const batchCode = dto.batchCode || await this.generateBatchCode(product.sku);

    const batch = this.batchRepo.create({
      productId: dto.productId,
      batchCode,
      productionDate: dto.productionDate ? new Date(dto.productionDate) : undefined,
      expiredDate: new Date(dto.expiredDate),
      initialQuantity: dto.initialQuantity,
      notes: dto.notes,
    });

    // Generate QR code data
    batch.qrCodeData = JSON.stringify({
      productId: product.id,
      sku: product.sku,
      productName: product.name,
      batchCode,
      expiredDate: dto.expiredDate,
      productionDate: dto.productionDate,
    });

    const savedBatch = await this.batchRepo.save(batch);

    // Update QR data with actual batch ID
    savedBatch.qrCodeData = JSON.stringify({
      productId: product.id,
      sku: product.sku,
      productName: product.name,
      batchId: savedBatch.id,
      batchCode,
      expiredDate: dto.expiredDate,
      productionDate: dto.productionDate,
    });
    await this.batchRepo.save(savedBatch);

    return savedBatch;
  }

  async findBatchesByProduct(productId: string) {
    return this.batchRepo.find({
      where: { productId, isBlocked: false },
      order: { expiredDate: 'ASC' }, // FIFO by expiry
    });
  }

  // --- Stock In ---
  async stockIn(dto: StockInDto, userId: string) {
    const batch = await this.batchRepo.findOne({ where: { id: dto.batchId } });
    if (!batch) throw new NotFoundException('Batch not found');
    if (batch.isBlocked) throw new BadRequestException('Batch is blocked (expired)');

    // Update or create inventory record
    let inventory = await this.inventoryRepo.findOne({
      where: {
        productId: dto.productId,
        batchId: dto.batchId,
        locationType: LocationType.WAREHOUSE,
        locationId: dto.warehouseId,
      },
    });

    if (inventory) {
      inventory.quantity += dto.quantity;
    } else {
      inventory = this.inventoryRepo.create({
        productId: dto.productId,
        batchId: dto.batchId,
        locationType: LocationType.WAREHOUSE,
        locationId: dto.warehouseId,
        quantity: dto.quantity,
      });
    }
    await this.inventoryRepo.save(inventory);

    // Record movement
    const movement = this.movementRepo.create({
      productId: dto.productId,
      batchId: dto.batchId,
      movementType: MovementType.STOCK_IN,
      quantity: dto.quantity,
      toLocationType: LocationType.WAREHOUSE,
      toLocationId: dto.warehouseId,
      notes: dto.notes,
      createdBy: userId,
    });
    await this.movementRepo.save(movement);

    return { message: 'Stock in successful', inventory };
  }

  // --- Stock by Location ---
  async getStockByLocation(locationType: LocationType, locationId: string) {
    return this.inventoryRepo.find({
      where: { locationType, locationId },
      relations: { product: true, batch: true },
      order: { product: { name: 'ASC' } },
    });
  }

  // --- Expired Check Cron ---
  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async checkExpiredBatches() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const expiredBatches = await this.batchRepo.find({
      where: {
        isBlocked: false,
        expiredDate: LessThanOrEqual(today),
      },
    });

    for (const batch of expiredBatches) {
      batch.isExpired = true;
      batch.isBlocked = true;
      await this.batchRepo.save(batch);
    }

    return { blockedCount: expiredBatches.length };
  }

  // --- Helpers ---
  private async generateSku(): Promise<string> {
    const count = await this.productRepo.count();
    return `PRD-${String(count + 1).padStart(5, '0')}`;
  }

  private async generateBatchCode(sku: string): Promise<string> {
    const date = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const count = await this.batchRepo.count();
    return `${sku}-${date}-${String(count + 1).padStart(3, '0')}`;
  }
}
