import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, Between } from 'typeorm';
import { Transaction, TransactionStatus, PaymentStatus } from './entities/transaction.entity';
import { TransactionItem } from './entities/transaction-item.entity';
import { Payment, PaymentMethod, PaymentState } from './entities/payment.entity';
import { Member } from './entities/member.entity';
import { PointTransaction, PointTransactionType } from './entities/point-transaction.entity';
import { Product } from '../inventory/entities/product.entity';
import { ProductBatch } from '../inventory/entities/product-batch.entity';
import { Inventory, LocationType } from '../inventory/entities/inventory.entity';
import { StockMovement, MovementType } from '../inventory/entities/stock-movement.entity';
import { CreateTransactionDto, ProcessPaymentDto } from './dto/transaction.dto';
import { CreateMemberDto, UpdateMemberDto } from './dto/member.dto';
import { PosSession, SessionStatus } from './entities/pos-session.entity';
import { StartSessionDto, CloseSessionDto } from './dto/session.dto';

@Injectable()
export class PosService {
  constructor(
    @InjectRepository(Transaction)
    private readonly transactionRepo: Repository<Transaction>,
    @InjectRepository(TransactionItem)
    private readonly txnItemRepo: Repository<TransactionItem>,
    @InjectRepository(Payment)
    private readonly paymentRepo: Repository<Payment>,
    @InjectRepository(Member)
    private readonly memberRepo: Repository<Member>,
    @InjectRepository(PointTransaction)
    private readonly pointTxnRepo: Repository<PointTransaction>,
    @InjectRepository(Product)
    private readonly productRepo: Repository<Product>,
    @InjectRepository(ProductBatch)
    private readonly batchRepo: Repository<ProductBatch>,
    @InjectRepository(Inventory)
    private readonly inventoryRepo: Repository<Inventory>,
    @InjectRepository(StockMovement)
    private readonly movementRepo: Repository<StockMovement>,
    @InjectRepository(PosSession)
    private readonly sessionRepo: Repository<PosSession>,
    private readonly dataSource: DataSource,
  ) {}

  // --- Product Search for POS ---
  async searchProducts(query?: string, outletId?: string) {
    const qb = this.productRepo
      .createQueryBuilder('p')
      .where('p.isActive = true');

    if (query && query.length >= 1) {
      qb.andWhere('(LOWER(p.name) LIKE :q OR LOWER(p.sku) LIKE :q)', {
        q: `%${query.toLowerCase()}%`,
      });
    }

    qb.orderBy('p.name', 'ASC').take(20);
    const products = await qb.getMany();

    // If outletId provided, add stock info
    if (outletId) {
      const result = [];
      for (const product of products) {
        const stockRows = await this.inventoryRepo.find({
          where: { productId: product.id, locationType: LocationType.OUTLET, locationId: outletId },
        });
        const totalStock = stockRows.reduce((sum, s) => sum + s.quantity, 0);
        result.push({ ...product, availableStock: totalStock });
      }
      return result;
    }

    return products;
  }

  // --- Members ---
  async createMember(dto: CreateMemberDto) {
    const code = await this.generateMemberCode();
    const member = this.memberRepo.create({ ...dto, code });
    return this.memberRepo.save(member);
  }

  async findMemberByPhone(phone: string) {
    const member = await this.memberRepo.findOne({ where: { phone } });
    if (!member) throw new NotFoundException('Member not found');
    return member;
  }

  async findMemberById(id: string) {
    const member = await this.memberRepo.findOne({ where: { id } });
    if (!member) throw new NotFoundException('Member not found');
    return member;
  }

  async updateMember(id: string, dto: UpdateMemberDto) {
    const member = await this.findMemberById(id);
    Object.assign(member, dto);
    return this.memberRepo.save(member);
  }

  // --- Transactions ---
  async createTransaction(dto: CreateTransactionDto, cashierId: string) {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const transactionNumber = await this.generateTransactionNumber();

      let subtotal = 0;
      const txnItems: TransactionItem[] = [];

      for (const itemDto of dto.items) {
        const product = await this.productRepo.findOne({ where: { id: itemDto.productId } });
        if (!product) throw new NotFoundException(`Product ${itemDto.productId} not found`);

        // Get batch (FIFO - earliest expiry first)
        let batch: ProductBatch | null = null;
        if (itemDto.batchId) {
          batch = await this.batchRepo.findOne({ where: { id: itemDto.batchId } });
        } else {
          // Auto-select batch with FIFO
          const inventory = await this.inventoryRepo
            .createQueryBuilder('inv')
            .innerJoinAndSelect('inv.batch', 'batch')
            .where('inv.productId = :productId', { productId: itemDto.productId })
            .andWhere('inv.locationType = :type', { type: LocationType.OUTLET })
            .andWhere('inv.locationId = :locationId', { locationId: dto.outletId })
            .andWhere('inv.quantity > 0')
            .andWhere('batch.isBlocked = false')
            .orderBy('batch.expiredDate', 'ASC')
            .getOne();

          if (inventory) {
            batch = inventory.batch!;
          }
        }

        // Check expired
        if (batch?.isBlocked || batch?.isExpired) {
          throw new BadRequestException(`Batch ${batch.batchCode} is expired/blocked`);
        }

        // Check stock availability
        const inventory = await this.inventoryRepo.findOne({
          where: {
            productId: itemDto.productId,
            batchId: batch?.id,
            locationType: LocationType.OUTLET,
            locationId: dto.outletId,
          },
        });

        if (!inventory || inventory.quantity < itemDto.quantity) {
          throw new BadRequestException(`Insufficient stock for ${product.name}`);
        }

        const price = product.sellPrice;
        const itemDiscount = itemDto.discount || 0;
        const itemSubtotal = (Number(price) * itemDto.quantity) - itemDiscount;
        subtotal += itemSubtotal;

        const txnItem = this.txnItemRepo.create({
          productId: product.id,
          batchId: batch?.id,
          quantity: itemDto.quantity,
          price: Number(price),
          discount: itemDiscount,
          subtotal: itemSubtotal,
        });
        txnItems.push(txnItem);
      }

      const transactionDiscount = dto.discount || 0;
      const total = subtotal - transactionDiscount;

      const transaction = this.transactionRepo.create({
        transactionNumber,
        outletId: dto.outletId,
        cashierId,
        memberId: dto.memberId,
        subtotal,
        discount: transactionDiscount,
        tax: 0,
        total,
        status: TransactionStatus.OPEN,
        paymentStatus: PaymentStatus.UNPAID,
        notes: dto.notes,
      });

      const savedTransaction = await queryRunner.manager.save(transaction);

      // Save items with transaction ID
      for (const item of txnItems) {
        item.transactionId = savedTransaction.id;
        await queryRunner.manager.save(item);
      }

      await queryRunner.commitTransaction();
      return this.findTransactionById(savedTransaction.id);
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async processPayment(dto: ProcessPaymentDto, cashierId: string) {
    const transaction = await this.findTransactionById(dto.transactionId);

    if (transaction.status !== TransactionStatus.OPEN) {
      throw new BadRequestException('Transaction is not open');
    }

    const totalPayment = dto.payments.reduce((sum, p) => sum + p.amount, 0);

    if (totalPayment < Number(transaction.total)) {
      throw new BadRequestException('Payment amount is less than total');
    }

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Create payment records
      for (const paymentDto of dto.payments) {
        const payment = this.paymentRepo.create({
          transactionId: transaction.id,
          method: paymentDto.method,
          amount: paymentDto.amount,
          status: paymentDto.method === PaymentMethod.MIDTRANS ? PaymentState.PENDING : PaymentState.COMPLETED,
          changeAmount: paymentDto.method === PaymentMethod.CASH
            ? Math.max(0, totalPayment - Number(transaction.total))
            : 0,
        });
        await queryRunner.manager.save(payment);
      }

      // Deduct stock
      for (const item of transaction.items) {
        const inventory = await this.inventoryRepo.findOne({
          where: {
            productId: item.productId,
            batchId: item.batchId,
            locationType: LocationType.OUTLET,
            locationId: transaction.outletId,
          },
        });

        if (inventory) {
          inventory.quantity -= item.quantity;
          await queryRunner.manager.save(inventory);
        }

        // Record stock movement
        const movement = this.movementRepo.create({
          productId: item.productId,
          batchId: item.batchId,
          movementType: MovementType.SALE,
          quantity: item.quantity,
          fromLocationType: LocationType.OUTLET,
          fromLocationId: transaction.outletId,
          referenceType: 'transaction',
          referenceId: transaction.id,
          createdBy: cashierId,
        });
        await queryRunner.manager.save(movement);
      }

      // Update transaction status
      transaction.status = TransactionStatus.COMPLETED;
      transaction.paymentStatus = PaymentStatus.PAID;
      await queryRunner.manager.save(transaction);

      // Process member points if applicable
      if (transaction.memberId) {
        await this.earnPoints(transaction.memberId, transaction.id, Number(transaction.total), queryRunner.manager);
      }

      await queryRunner.commitTransaction();
      return this.findTransactionById(transaction.id);
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async holdTransaction(id: string) {
    const transaction = await this.findTransactionById(id);
    if (transaction.status !== TransactionStatus.OPEN) {
      throw new BadRequestException('Only open transactions can be held');
    }
    transaction.status = TransactionStatus.HOLD;
    return this.transactionRepo.save(transaction);
  }

  async recallTransaction(id: string) {
    const transaction = await this.findTransactionById(id);
    if (transaction.status !== TransactionStatus.HOLD) {
      throw new BadRequestException('Only held transactions can be recalled');
    }
    transaction.status = TransactionStatus.OPEN;
    return this.transactionRepo.save(transaction);
  }

  async voidTransaction(id: string) {
    const transaction = await this.findTransactionById(id);
    if (transaction.status === TransactionStatus.VOID) {
      throw new BadRequestException('Transaction is already void');
    }
    transaction.status = TransactionStatus.VOID;
    return this.transactionRepo.save(transaction);
  }

  async findTransactionById(id: string) {
    const transaction = await this.transactionRepo.findOne({
      where: { id },
      relations: {
        items: { product: true, batch: true },
        payments: true,
        member: true,
        outlet: true,
      },
    });
    if (!transaction) throw new NotFoundException('Transaction not found');
    return transaction;
  }

  // --- Points ---
  private async earnPoints(memberId: string, transactionId: string, amount: number, manager: any) {
    // Rule: 1 point per Rp 10.000
    const pointsEarned = Math.floor(amount / 10000);
    if (pointsEarned <= 0) return;

    const member = await this.memberRepo.findOne({ where: { id: memberId } });
    if (!member) return;

    member.points = Number(member.points) + pointsEarned;
    member.totalSpending = Number(member.totalSpending) + amount;
    await manager.save(member);

    const pointTxn = this.pointTxnRepo.create({
      memberId,
      transactionId,
      points: pointsEarned,
      type: PointTransactionType.EARN,
      description: `Earned from transaction`,
    });
    await manager.save(pointTxn);
  }

  // --- Helpers ---
  private async generateTransactionNumber(): Promise<string> {
    const date = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const count = await this.transactionRepo.count();
    return `TXN-${date}-${String(count + 1).padStart(5, '0')}`;
  }

  private async generateMemberCode(): Promise<string> {
    const count = await this.memberRepo.count();
    return `MBR-${String(count + 1).padStart(6, '0')}`;
  }

  // =============================================
  // POS SESSION MANAGEMENT
  // =============================================

  async startSession(dto: StartSessionDto, cashierId: string) {
    // Check if there's already an open session for this cashier
    const existingSession = await this.sessionRepo.findOne({
      where: { cashierId, status: SessionStatus.OPEN },
    });
    if (existingSession) {
      throw new BadRequestException('You already have an open session. Close it first.');
    }

    const session = this.sessionRepo.create({
      outletId: dto.outletId,
      cashierId,
      openingCash: dto.openingCash,
      status: SessionStatus.OPEN,
      openedAt: new Date(),
    });

    return this.sessionRepo.save(session);
  }

  async closeSession(sessionId: string, dto: CloseSessionDto, cashierId: string) {
    const session = await this.sessionRepo.findOne({
      where: { id: sessionId, cashierId },
    });
    if (!session) throw new NotFoundException('Session not found');
    if (session.status === SessionStatus.CLOSED) {
      throw new BadRequestException('Session is already closed');
    }

    // Calculate session totals from transactions
    const transactions = await this.transactionRepo.find({
      where: {
        cashierId,
        outletId: session.outletId,
        status: TransactionStatus.COMPLETED,
        createdAt: Between(session.openedAt, new Date()),
      },
      relations: { payments: true },
    });

    let totalSales = 0;
    let totalCashPayments = 0;
    let totalDigitalPayments = 0;
    let totalVoid = 0;

    const allTransactions = await this.transactionRepo.find({
      where: {
        cashierId,
        outletId: session.outletId,
        createdAt: Between(session.openedAt, new Date()),
      },
      relations: { payments: true },
    });

    for (const txn of allTransactions) {
      if (txn.status === TransactionStatus.VOID) {
        totalVoid++;
        continue;
      }
      if (txn.status === TransactionStatus.COMPLETED) {
        totalSales += Number(txn.total);
        for (const payment of txn.payments || []) {
          if (payment.method === PaymentMethod.CASH) {
            totalCashPayments += Number(payment.amount) - Number(payment.changeAmount);
          } else {
            totalDigitalPayments += Number(payment.amount);
          }
        }
      }
    }

    const expectedCash = Number(session.openingCash) + totalCashPayments;
    const cashDifference = dto.closingCash - expectedCash;

    session.status = SessionStatus.CLOSED;
    session.closingCash = dto.closingCash;
    session.expectedCash = expectedCash;
    session.cashDifference = cashDifference;
    session.totalSales = totalSales;
    session.totalTransactions = transactions.length;
    session.totalCashPayments = totalCashPayments;
    session.totalDigitalPayments = totalDigitalPayments;
    session.totalVoid = totalVoid;
    session.closedAt = new Date();
    session.notes = dto.notes;

    return this.sessionRepo.save(session);
  }

  async getActiveSession(cashierId: string) {
    return this.sessionRepo.findOne({
      where: { cashierId, status: SessionStatus.OPEN },
      relations: { outlet: true },
    });
  }

  async getSessionById(id: string) {
    const session = await this.sessionRepo.findOne({
      where: { id },
      relations: { outlet: true, cashier: true },
    });
    if (!session) throw new NotFoundException('Session not found');
    return session;
  }

  async getSessionsByOutlet(outletId: string, date?: string) {
    const where: any = { outletId };
    if (date) {
      const start = new Date(date);
      start.setHours(0, 0, 0, 0);
      const end = new Date(date);
      end.setHours(23, 59, 59, 999);
      where.openedAt = Between(start, end);
    }
    return this.sessionRepo.find({
      where,
      relations: { cashier: true },
      order: { openedAt: 'DESC' },
    });
  }

  async getDailyReport(outletId: string, date: string) {
    const start = new Date(date);
    start.setHours(0, 0, 0, 0);
    const end = new Date(date);
    end.setHours(23, 59, 59, 999);

    // Get all sessions for this day
    const sessions = await this.sessionRepo.find({
      where: { outletId, openedAt: Between(start, end) },
      relations: { cashier: true },
      order: { openedAt: 'ASC' },
    });

    // Get all transactions for this day
    const transactions = await this.transactionRepo.find({
      where: {
        outletId,
        createdAt: Between(start, end),
        status: TransactionStatus.COMPLETED,
      },
      relations: { payments: true, items: { product: true } },
    });

    let totalSales = 0;
    let totalCash = 0;
    let totalDigital = 0;
    let totalItems = 0;

    for (const txn of transactions) {
      totalSales += Number(txn.total);
      for (const payment of txn.payments || []) {
        if (payment.method === PaymentMethod.CASH) {
          totalCash += Number(payment.amount) - Number(payment.changeAmount);
        } else {
          totalDigital += Number(payment.amount);
        }
      }
      for (const item of txn.items || []) {
        totalItems += item.quantity;
      }
    }

    const voidCount = await this.transactionRepo.count({
      where: { outletId, createdAt: Between(start, end), status: TransactionStatus.VOID },
    });

    return {
      date,
      outletId,
      totalSales,
      totalTransactions: transactions.length,
      totalCash,
      totalDigital,
      totalItems,
      totalVoid: voidCount,
      averageTransaction: transactions.length > 0 ? totalSales / transactions.length : 0,
      sessions: sessions.map(s => ({
        id: s.id,
        cashier: (s.cashier as any)?.fullName || s.cashierId,
        status: s.status,
        openedAt: s.openedAt,
        closedAt: s.closedAt,
        openingCash: s.openingCash,
        closingCash: s.closingCash,
        expectedCash: s.expectedCash,
        cashDifference: s.cashDifference,
        totalSales: s.totalSales,
        totalTransactions: s.totalTransactions,
      })),
    };
  }
}
