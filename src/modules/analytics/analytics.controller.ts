import {
  Controller,
  Get,
  HttpStatus,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { AnalyticsService } from './analytics.service';
import {
  AnalyticsPeriod,
  AnalyticsPeriodDto,
  TopProductsQueryDto,
} from './dto/analytics-query.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorator/roles.decorator';
import { sendResponse } from '../../common/helpers/api-response.helper';

@ApiTags('Analytics')
@Controller('analytics')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
@ApiBearerAuth('access-token')
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get('today')
  @ApiOperation({
    summary: "Get today's real-time sales & order performance KPIs (Admin only)",
    description:
      'Calculates total sales, purchase cost, gross profit, and order statuses for today.',
  })
  @ApiResponse({ status: 200, description: "Today's statistics retrieved successfully" })
  async getTodayStats() {
    const data = await this.analyticsService.getTodayStats();
    return sendResponse(HttpStatus.OK, "Today's stats fetched successfully", data);
  }

  @Get('overview')
  @ApiOperation({
    summary: 'Get platform-wide overview statistics (Admin only)',
    description:
      'Aggregates total products, categories, customers, riders, lifetime revenue, and inventory valuation.',
  })
  async getOverviewStats() {
    const data = await this.analyticsService.getOverviewStats();
    return sendResponse(HttpStatus.OK, 'Overview stats fetched successfully', data);
  }

  @Get('sales')
  @ApiOperation({
    summary: 'Get sales timeline & revenue trend graph (Admin only)',
    description:
      'Provides daily sales breakdown and order volume for 7d, 30d, or 90d periods.',
  })
  @ApiQuery({ name: 'period', enum: AnalyticsPeriod, required: false })
  async getSalesTimeline(@Query() query: AnalyticsPeriodDto) {
    const data = await this.analyticsService.getSalesTimeline(query.period);
    return sendResponse(HttpStatus.OK, 'Sales timeline fetched successfully', data);
  }

  @Get('top-products')
  @ApiOperation({
    summary: 'Get top-selling produce & grocery items (Admin only)',
    description:
      'Ranked by total sold units and cumulative revenue with current stock levels.',
  })
  async getTopProducts(@Query() query: TopProductsQueryDto) {
    const data = await this.analyticsService.getTopProducts(query.limit);
    return sendResponse(HttpStatus.OK, 'Top products fetched successfully', data);
  }

  @Get('stock')
  @ApiOperation({
    summary: 'Get inventory health and restocking alerts (Admin only)',
    description:
      'Returns out-of-stock and low-stock (stock <= 10) products prioritized for purchase.',
  })
  async getStockHealth() {
    const data = await this.analyticsService.getStockHealth();
    return sendResponse(HttpStatus.OK, 'Stock health fetched successfully', data);
  }

  @Get('recent-orders')
  @ApiOperation({
    summary: 'Get recent orders snapshot (Admin only)',
    description: 'Returns the most recent 10 orders with buyer and fulfillment status.',
  })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async getRecentOrders(@Query('limit') limit?: number) {
    const data = await this.analyticsService.getRecentOrders(Number(limit) || 10);
    return sendResponse(HttpStatus.OK, 'Recent orders fetched successfully', data);
  }
}

