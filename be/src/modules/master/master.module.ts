import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Warehouse } from './entities/warehouse.entity';
import { Outlet } from './entities/outlet.entity';
import { Category } from './entities/category.entity';
import { UserLocation } from './entities/user-location.entity';
import { CompanySettings } from './entities/company.entity';
import { MasterService } from './master.service';
import { MasterController } from './master.controller';
import { RbacModule } from '../rbac/rbac.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Warehouse, Outlet, Category, UserLocation, CompanySettings]),
    RbacModule,
  ],
  controllers: [MasterController],
  providers: [MasterService],
  exports: [MasterService, TypeOrmModule],
})
export class MasterModule {}
