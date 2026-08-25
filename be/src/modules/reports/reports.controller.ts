import { Controller, Get, Query, Res, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { Response } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ReportsService } from './reports.service';

@ApiTags('Reports')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('reports')
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get('dashboard')
  @ApiOperation({ summary: 'Get dashboard summary' })
  getDashboard() {
    return this.reportsService.getDashboardSummary();
  }

  @Get('sales')
  @ApiOperation({ summary: 'Get sales report' })
  getSalesReport(@Query('from') from?: string, @Query('to') to?: string, @Query('outletId') outletId?: string) {
    return this.reportsService.getSalesReport(from, to, outletId);
  }

  @Get('stock')
  @ApiOperation({ summary: 'Get stock report' })
  getStockReport(@Query('outletId') outletId?: string) {
    return this.reportsService.getStockReport(outletId);
  }

  @Get('expired')
  @ApiOperation({ summary: 'Get expired report' })
  getExpiredReport() {
    return this.reportsService.getExpiredReport();
  }

  @Get('export/sales/excel')
  @ApiOperation({ summary: 'Export sales report as Excel' })
  async exportSalesExcel(@Res() res: Response, @Query('from') from?: string, @Query('to') to?: string, @Query('outletId') outletId?: string) {
    const buffer = await this.reportsService.exportSalesExcel(from, to, outletId);
    res.set({
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename=sales-report-${from || 'all'}-${to || 'now'}.xlsx`,
    });
    res.send(buffer);
  }

  @Get('export/sales/pdf')
  @ApiOperation({ summary: 'Export sales report as PDF' })
  async exportSalesPdf(@Res() res: Response, @Query('from') from?: string, @Query('to') to?: string, @Query('outletId') outletId?: string) {
    const buffer = await this.reportsService.exportSalesPdf(from, to, outletId);
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename=sales-report-${from || 'all'}-${to || 'now'}.pdf`,
    });
    res.send(buffer);
  }

  @Get('export/stock/excel')
  @ApiOperation({ summary: 'Export stock report as Excel' })
  async exportStockExcel(@Res() res: Response, @Query('outletId') outletId?: string) {
    const buffer = await this.reportsService.exportStockExcel(outletId);
    res.set({
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': 'attachment; filename=stock-report.xlsx',
    });
    res.send(buffer);
  }
}
