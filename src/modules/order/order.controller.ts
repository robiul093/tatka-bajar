import {
  Body,
  Controller,
  Get,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { IsString, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { OrderService } from './order.service';
import { CreateOrderDto, EstimateCheckoutDto } from './dto/create-order.dto';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorator/roles.decorator';
import { GetCurrentUser } from '../../common/decorator/get-current-user.decorator';
import { sendResponse } from '../../common/helpers/api-response.helper';

class AssignRiderDto {
  @ApiProperty({ example: 'uuid-rider-id', description: 'Rider ID to assign' })
  @IsString()
  @IsNotEmpty()
  riderId: string;
}

@ApiTags('Order')
@Controller('orders')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('access-token')
export class OrderController {
  constructor(private readonly orderService: OrderService) {}

  @Post()
  @ApiOperation({ summary: 'Place a new order (Checkout)' })
  @ApiResponse({ status: 201, description: 'Order placed successfully' })
  async create(
    @GetCurrentUser('userId') userId: string,
    @Body() createOrderDto: CreateOrderDto,
  ) {
    const data = await this.orderService.create(userId, createOrderDto);
    return sendResponse(HttpStatus.CREATED, 'Order placed successfully', data);
  }

  @Post('estimate')
  @ApiOperation({
    summary: 'Estimate checkout fees & distance',
    description:
      'Calculates subtotal, dynamic distance-based delivery fee, free delivery threshold, and estimated total before completing order placement.',
  })
  async estimateCheckout(
    @GetCurrentUser('userId') userId: string,
    @Body() dto: EstimateCheckoutDto,
  ) {
    const data = await this.orderService.estimateCheckout(userId, dto);
    return sendResponse(HttpStatus.OK, 'Checkout estimate calculated successfully', data);
  }

  @Get()
  @ApiOperation({ summary: 'Get current user order history' })
  @ApiQuery({
    name: 'status',
    required: false,
    description:
      'Filter by order status (PENDING, CONFIRMED, PROCESSING, OUT_FOR_DELIVERY, DELIVERED, CANCELLED)',
  })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async findUserOrders(
    @GetCurrentUser('userId') userId: string,
    @Query('status') status?: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    const { orders, meta } = await this.orderService.findUserOrders(
      userId,
      status,
      Number(page) || 1,
      Number(limit) || 10,
    );
    return sendResponse(HttpStatus.OK, 'Orders fetched successfully', orders, meta);
  }

  @Get('admin/all')
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Get all orders across system (Admin only)' })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async findAllAdmin(
    @Query('status') status?: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    const { orders, meta } = await this.orderService.findAllAdmin(
      status,
      Number(page) || 1,
      Number(limit) || 20,
    );
    return sendResponse(HttpStatus.OK, 'Orders fetched successfully', orders, meta);
  }

  @Get('rider/assigned')
  @UseGuards(RolesGuard)
  @Roles('RIDER')
  @ApiOperation({ summary: 'Get orders assigned to current rider' })
  @ApiQuery({ name: 'status', required: false })
  async findRiderOrders(
    @GetCurrentUser('userId') userId: string,
    @Query('status') status?: string,
  ) {
    const data = await this.orderService.findRiderOrders(userId, status);
    return sendResponse(HttpStatus.OK, 'Assigned orders fetched successfully', data);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get user order details by ID or Order Number' })
  async findOne(
    @GetCurrentUser('userId') userId: string,
    @Param('id') id: string,
  ) {
    const data = await this.orderService.findUserOrderById(userId, id);
    return sendResponse(HttpStatus.OK, 'Order details fetched successfully', data);
  }

  @Patch(':id/cancel')
  @ApiOperation({ summary: 'Cancel order (Only allowed if status is PENDING)' })
  async cancel(
    @GetCurrentUser('userId') userId: string,
    @Param('id') id: string,
  ) {
    const data = await this.orderService.cancelOrder(userId, id);
    return sendResponse(HttpStatus.OK, 'Order cancelled successfully', data);
  }

  @Patch(':id/status')
  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'RIDER')
  @ApiOperation({ summary: 'Update order status (Admin or assigned Rider)' })
  async updateStatus(
    @GetCurrentUser('userId') userId: string,
    @GetCurrentUser('role') role: string,
    @Param('id') id: string,
    @Body() updateOrderStatusDto: UpdateOrderStatusDto,
  ) {
    const data = await this.orderService.updateStatus(
      id,
      updateOrderStatusDto,
      userId,
      role,
    );
    return sendResponse(HttpStatus.OK, 'Order status updated successfully', data);
  }

  @Patch(':id/assign-rider')
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Assign a rider to an order (Admin only)' })
  @ApiBody({ type: AssignRiderDto })
  async assignRider(
    @Param('id') id: string,
    @Body() body: AssignRiderDto,
  ) {
    const data = await this.orderService.assignRider(id, body.riderId);
    return sendResponse(HttpStatus.OK, 'Rider assigned successfully', data);
  }
}
