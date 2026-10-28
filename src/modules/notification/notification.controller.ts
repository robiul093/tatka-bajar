import {
  Body,
  Controller,
  Delete,
  Get,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { NotificationService } from './notification.service';
import { BroadcastNotificationDto } from './dto/broadcast-notification.dto';
import { QueryNotificationDto } from './dto/query-notification.dto';
import { UpdateFcmTokenDto } from './dto/update-fcm-token.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorator/roles.decorator';
import { GetCurrentUser } from '../../common/decorator/get-current-user.decorator';
import { sendResponse } from '../../common/helpers/api-response.helper';
import { NotificationType } from '@prisma/client';

@ApiTags('Notification')
@Controller('notifications')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('access-token')
export class NotificationController {
  constructor(private readonly notificationService: NotificationService) {}

  @Get()
  @ApiOperation({ summary: 'Get current logged-in user notifications' })
  async getUserNotifications(
    @GetCurrentUser('userId') userId: string,
    @Query() query: QueryNotificationDto,
  ) {
    const { notifications, unreadCount, meta } =
      await this.notificationService.getUserNotifications(userId, query);
    return sendResponse(
      HttpStatus.OK,
      'Notifications fetched successfully',
      { notifications, unreadCount },
      meta,
    );
  }

  @Get('unread-count')
  @ApiOperation({ summary: 'Get unread notification count for app badge icon' })
  async getUnreadCount(@GetCurrentUser('userId') userId: string) {
    const data = await this.notificationService.getUnreadCount(userId);
    return sendResponse(HttpStatus.OK, 'Unread count fetched successfully', data);
  }

  @Patch('read-all')
  @ApiOperation({ summary: 'Mark all notifications as read for current user' })
  async markAllAsRead(@GetCurrentUser('userId') userId: string) {
    const data = await this.notificationService.markAllAsRead(userId);
    return sendResponse(HttpStatus.OK, 'All notifications marked as read', data);
  }

  @Patch(':id/read')
  @ApiOperation({ summary: 'Mark single notification as read' })
  async markAsRead(
    @GetCurrentUser('userId') userId: string,
    @Param('id') id: string,
  ) {
    const data = await this.notificationService.markAsRead(userId, id);
    return sendResponse(HttpStatus.OK, 'Notification marked as read', data);
  }

  @Patch('fcm-token')
  @ApiOperation({ summary: 'Register/update mobile push notification device FCM token' })
  async updateFcmToken(
    @GetCurrentUser('userId') userId: string,
    @Body() dto: UpdateFcmTokenDto,
  ) {
    const data = await this.notificationService.updateFcmToken(userId, dto.fcmToken);
    return sendResponse(HttpStatus.OK, 'FCM token registered successfully', data);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a notification' })
  async deleteNotification(
    @GetCurrentUser('userId') userId: string,
    @Param('id') id: string,
  ) {
    const data = await this.notificationService.deleteNotification(userId, id);
    return sendResponse(HttpStatus.OK, 'Notification deleted successfully', data);
  }

  @Post('admin/broadcast')
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  @UseInterceptors(FileInterceptor('image'))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({
    summary: 'Broadcast promotional or system notification with image file upload (Admin only)',
    description:
      'Dispatches an in-app notification to all users or filtered by role. Optional promo image must be a file upload.',
  })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['title', 'body'],
      properties: {
        title: { type: 'string', example: 'Flash Sale: 20% off all Seasonal Fruits!' },
        body: { type: 'string', example: 'Grab fresh Rajshahi mangoes today only with code FRESH20.' },
        type: {
          type: 'string',
          enum: Object.values(NotificationType),
          example: NotificationType.PROMOTION,
        },
        targetRole: {
          type: 'string',
          enum: ['ALL', 'USER', 'RIDER', 'ADMIN'],
          example: 'ALL',
        },
        linkUrl: { type: 'string', example: 'https://tatkabajar.com/campaign/fresh-deals' },
        image: {
          type: 'string',
          format: 'binary',
          description: 'Promotional notification graphic image file (max 5MB)',
        },
      },
    },
  })
  @ApiResponse({ status: 201, description: 'Broadcast notification sent successfully' })
  async broadcast(
    @Body() dto: BroadcastNotificationDto,
    @UploadedFile() image?: Express.Multer.File,
  ) {
    const data = await this.notificationService.broadcastNotification(dto, image);
    return sendResponse(HttpStatus.CREATED, 'Broadcast notification sent successfully', data);
  }
}

