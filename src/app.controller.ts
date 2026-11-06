import {
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  VERSION_NEUTRAL,
  Version,
} from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AppService } from './app.service';
import { sendResponse } from './common/helpers/api-response.helper';
import type { ApiResponse } from './common/helpers/api-response.helper';
import {
  ProductUnit,
  Role,
  Status,
  OrderStatus,
  PaymentMethod,
  PaymentStatus,
  BannerLinkType,
  NotificationType,
} from '@prisma/client';
import { ProductSortBy } from './modules/product/dto/query-product.dto';

@ApiTags('Base')
@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Version(VERSION_NEUTRAL)
  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Base API Health / Welcome Message' })
  @ApiOkResponse({
    description: 'Server status response',
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 200 },
        message: {
          type: 'string',
          example: 'Application Server Running Successfully!',
        },
        meta: { type: 'object', nullable: true, example: null },
        data: { type: 'object', nullable: true, example: null },
        timestamp: { type: 'string', example: '2026-09-04T12:00:00.000Z' },
      },
    },
  })
  getHello(): ApiResponse<null> {
    const message = this.appService.getHello();
    return sendResponse(HttpStatus.OK, message, null);
  }

  @Get('enums')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Get all system enums for frontend select/dropdown menus',
    description:
      'Provides selectable list values for product units, roles, statuses, order stages, payment methods, banner links, and notifications.',
  })
  @ApiOkResponse({
    description: 'All system enum collections',
  })
  getAllEnums() {
    return sendResponse(HttpStatus.OK, 'System enums fetched successfully', {
      productUnits: Object.values(ProductUnit),
      roles: Object.values(Role),
      userStatuses: Object.values(Status),
      orderStatuses: Object.values(OrderStatus),
      paymentMethods: Object.values(PaymentMethod),
      paymentStatuses: Object.values(PaymentStatus),
      bannerLinkTypes: Object.values(BannerLinkType),
      notificationTypes: Object.values(NotificationType),
      productSortOptions: Object.values(ProductSortBy),
    });
  }
}
