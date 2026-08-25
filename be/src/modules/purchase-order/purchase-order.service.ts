import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PurchaseOrder, POStatus } from './entities/purchase-order.entity';
import { POItem } from './entities/po-item.entity';
import { Inventory, LocationType } from '../inventory/entities/inventory.entity';
import { StockMovement, MovementType } from '../inventory/entities/stock-movement.entity';
import { CreatePurchaseOrderDto, ReceivePODto } from './dto/purchase-order.dto';

@Injectable()
export class PurchaseOrderService {
  constructor(
    @InjectRepository(PurchaseOrder)
    private readonly poRepo: Repository<PurchaseOrder>,
    @InjectRepository(POItem)
    private readonly poItemRepo: Repository<POItem>,
    @InjectRepository(Inventory)
    private readonly inventoryRepo: Repository<Inventory>,
    @InjectRepository(StockMovement)
    private readonly movementRepo: Repository<StockMovement>,
  ) {}

  async createPO(dto: CreatePurchaseOrderDto, userId: string) {
    const poNumber = await this.generatePONumber();

    const po = this.poRepo.create({
      poNumber,
      warehouseId: dto.warehouseId,
      outletId: dto.outletId,
      createdBy: userId,
      notes: dto.notes,
      status: POStatus.DRAFT,
      items: dto.items.map((item) =>
        this.poItemRepo.create({
          productId: item.productId,
          batchId: item.batchId,
          quantity: item.quantity,
          notes: item.notes,
        }),
      ),
    });

    return this.poRepo.save(po);
  }

  async submitPO(id: string) {
    const po = await this.findById(id);
    if (po.status !== POStatus.DRAFT) {
      throw new BadRequestException('PO can only be submitted from draft status');
    }
    po.status = POStatus.SUBMITTED;
    return this.poRepo.save(po);
  }

  async shipPO(id: string) {
    const po = await this.findById(id);
    if (po.status !== POStatus.SUBMITTED) {
      throw new BadRequestException('PO can only be shipped from submitted status');
    }

    // Deduct stock from warehouse
    for (const item of po.items) {
      const inventory = await this.inventoryRepo.findOne({
        where: {
          productId: item.productId,
          batchId: item.batchId,
          locationType: LocationType.WAREHOUSE,
          locationId: po.warehouseId,
        },
      });

      if (!inventory || inventory.quantity < item.quantity) {
        throw new BadRequestException(
          `Insufficient stock for product in warehouse (batch: ${item.batchId})`,
        );
      }

      inventory.quantity -= item.quantity;
      await this.inventoryRepo.save(inventory);
    }

    po.status = POStatus.SHIPPED;
    po.shippedAt = new Date();
    return this.poRepo.save(po);
  }

  async receivePO(id: string, dto: ReceivePODto, userId: string) {
    const po = await this.findById(id);
    if (po.status !== POStatus.SHIPPED) {
      throw new BadRequestException('PO can only be received from shipped status');
    }

    for (const item of dto.items) {
      const poItem = po.items.find((i) => i.id === item.poItemId);
      if (!poItem) throw new NotFoundException(`PO item ${item.poItemId} not found`);
      poItem.receivedQuantity = item.receivedQuantity;
      await this.poItemRepo.save(poItem);
    }

    po.status = POStatus.RECEIVED;
    po.receivedAt = new Date();
    return this.poRepo.save(po);
  }

  async approvePO(id: string, userId: string) {
    const po = await this.findById(id);
    if (po.status !== POStatus.RECEIVED) {
      throw new BadRequestException('PO can only be approved from received status');
    }

    // Add stock to outlet based on received quantities
    for (const item of po.items) {
      const qty = item.receivedQuantity || item.quantity;

      let inventory = await this.inventoryRepo.findOne({
        where: {
          productId: item.productId,
          batchId: item.batchId,
          locationType: LocationType.OUTLET,
          locationId: po.outletId,
        },
      });

      if (inventory) {
        inventory.quantity += qty;
      } else {
        inventory = this.inventoryRepo.create({
          productId: item.productId,
          batchId: item.batchId,
          locationType: LocationType.OUTLET,
          locationId: po.outletId,
          quantity: qty,
        });
      }
      await this.inventoryRepo.save(inventory);

      // Record stock movement
      const movement = this.movementRepo.create({
        productId: item.productId,
        batchId: item.batchId,
        movementType: MovementType.TRANSFER,
        quantity: qty,
        fromLocationType: LocationType.WAREHOUSE,
        fromLocationId: po.warehouseId,
        toLocationType: LocationType.OUTLET,
        toLocationId: po.outletId,
        referenceType: 'purchase_order',
        referenceId: po.id,
        createdBy: userId,
      });
      await this.movementRepo.save(movement);
    }

    po.status = POStatus.APPROVED;
    po.approvedBy = userId;
    po.approvedAt = new Date();
    return this.poRepo.save(po);
  }

  async findAll() {
    return this.poRepo.find({
      relations: { warehouse: true, outlet: true, items: { product: true, batch: true } },
      order: { createdAt: 'DESC' },
    });
  }

  async findById(id: string) {
    const po = await this.poRepo.findOne({
      where: { id },
      relations: { warehouse: true, outlet: true, items: { product: true, batch: true } },
    });
    if (!po) throw new NotFoundException('Purchase order not found');
    return po;
  }

  async findByPONumber(poNumber: string) {
    const po = await this.poRepo.findOne({
      where: { poNumber },
      relations: { warehouse: true, outlet: true, items: { product: true, batch: true } },
    });
    if (!po) throw new NotFoundException('Purchase order not found');
    return po;
  }

  private async generatePONumber(): Promise<string> {
    const date = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const count = await this.poRepo.count();
    return `PO-${date}-${String(count + 1).padStart(4, '0')}`;
  }
}
