import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Warehouse } from './entities/warehouse.entity';
import { Outlet } from './entities/outlet.entity';
import { Category } from './entities/category.entity';
import { UserLocation, LocationType } from './entities/user-location.entity';
import { CompanySettings } from './entities/company.entity';
import { CreateWarehouseDto, UpdateWarehouseDto } from './dto/warehouse.dto';
import { CreateOutletDto, UpdateOutletDto } from './dto/outlet.dto';
import { CreateCategoryDto, UpdateCategoryDto } from './dto/category.dto';

@Injectable()
export class MasterService {
  constructor(
    @InjectRepository(Warehouse)
    private readonly warehouseRepo: Repository<Warehouse>,
    @InjectRepository(Outlet)
    private readonly outletRepo: Repository<Outlet>,
    @InjectRepository(Category)
    private readonly categoryRepo: Repository<Category>,
    @InjectRepository(UserLocation)
    private readonly userLocationRepo: Repository<UserLocation>,
    @InjectRepository(CompanySettings)
    private readonly companyRepo: Repository<CompanySettings>,
  ) {}

  // --- Warehouses ---
  async createWarehouse(dto: CreateWarehouseDto) {
    const warehouse = this.warehouseRepo.create(dto);
    return this.warehouseRepo.save(warehouse);
  }

  async findAllWarehouses() {
    return this.warehouseRepo.find({ where: { isActive: true } });
  }

  async findWarehouseById(id: string) {
    const wh = await this.warehouseRepo.findOne({ where: { id } });
    if (!wh) throw new NotFoundException('Warehouse not found');
    return wh;
  }

  async updateWarehouse(id: string, dto: UpdateWarehouseDto) {
    const wh = await this.findWarehouseById(id);
    Object.assign(wh, dto);
    return this.warehouseRepo.save(wh);
  }

  async deleteWarehouse(id: string) {
    const wh = await this.findWarehouseById(id);
    await this.warehouseRepo.softRemove(wh);
    return { message: 'Warehouse deleted' };
  }

  // --- Outlets ---
  async createOutlet(dto: CreateOutletDto) {
    const outlet = this.outletRepo.create(dto);
    return this.outletRepo.save(outlet);
  }

  async findAllOutlets() {
    return this.outletRepo.find({ where: { isActive: true } });
  }

  async findOutletById(id: string) {
    const outlet = await this.outletRepo.findOne({ where: { id } });
    if (!outlet) throw new NotFoundException('Outlet not found');
    return outlet;
  }

  async updateOutlet(id: string, dto: UpdateOutletDto) {
    const outlet = await this.findOutletById(id);
    Object.assign(outlet, dto);
    return this.outletRepo.save(outlet);
  }

  async deleteOutlet(id: string) {
    const outlet = await this.findOutletById(id);
    await this.outletRepo.softRemove(outlet);
    return { message: 'Outlet deleted' };
  }

  // --- Categories ---
  async createCategory(dto: CreateCategoryDto) {
    const category = this.categoryRepo.create(dto);
    return this.categoryRepo.save(category);
  }

  async findAllCategories() {
    const categories = await this.categoryRepo.find({
      where: { isActive: true },
      order: { name: 'ASC' },
    });
    return this.buildCategoryTree(categories);
  }

  async findCategoryById(id: string) {
    const cat = await this.categoryRepo.findOne({ where: { id }, relations: { children: true } });
    if (!cat) throw new NotFoundException('Category not found');
    return cat;
  }

  async updateCategory(id: string, dto: UpdateCategoryDto) {
    const cat = await this.findCategoryById(id);
    Object.assign(cat, dto);
    return this.categoryRepo.save(cat);
  }

  async deleteCategory(id: string) {
    const cat = await this.findCategoryById(id);
    await this.categoryRepo.softRemove(cat);
    return { message: 'Category deleted' };
  }

  private buildCategoryTree(categories: Category[], parentId?: string): any[] {
    return categories
      .filter((c) => c.parentId === (parentId || null))
      .map((c) => ({
        ...c,
        children: this.buildCategoryTree(categories, c.id),
      }));
  }

  // --- User Location ---
  async assignUserLocation(userId: string, locationType: LocationType, locationId: string) {
    const assignment = this.userLocationRepo.create({ userId, locationType, locationId });
    return this.userLocationRepo.save(assignment);
  }

  async getUserLocations(userId: string) {
    return this.userLocationRepo.find({ where: { userId } });
  }

  async removeUserLocation(id: string) {
    await this.userLocationRepo.delete(id);
    return { message: 'Location assignment removed' };
  }

  // --- Company Settings ---
  async getCompanySettings() {
    const settings = await this.companyRepo.find();
    return settings[0] || null;
  }

  async upsertCompanySettings(dto: Partial<CompanySettings>) {
    const existing = await this.companyRepo.find();
    if (existing.length > 0) {
      Object.assign(existing[0], dto);
      return this.companyRepo.save(existing[0]);
    }
    const company = this.companyRepo.create(dto);
    return this.companyRepo.save(company);
  }
}
