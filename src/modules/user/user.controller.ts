import {
  Body,
  Controller,
  Get,
  HttpStatus,
  Param,
  Patch,
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
  ApiPropertyOptional,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { UserService } from './user.service';
import { CloudinaryService } from '../../cloudinary/cloudinary.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorator/roles.decorator';
import { GetCurrentUser } from '../../common/decorator/get-current-user.decorator';
import { sendResponse } from '../../common/helpers/api-response.helper';
import { IsOptional, IsString } from 'class-validator';

export class UpdateProfileDto {
  @ApiPropertyOptional({ example: 'John Doe' })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiPropertyOptional({ example: '01712345678' })
  @IsString()
  @IsOptional()
  phone?: string;

  @ApiPropertyOptional({ example: 'https://res.cloudinary.com/demo/image/upload/avatar.jpg' })
  @IsString()
  @IsOptional()
  profile?: string;
}

@ApiTags('User')
@Controller('user')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('access-token')
export class UserController {
  constructor(
    private readonly userService: UserService,
    private readonly cloudinaryService: CloudinaryService,
  ) {}

  @Get('profile')
  @ApiOperation({ summary: 'Get current logged-in user profile' })
  async getProfile(@GetCurrentUser('userId') userId: string) {
    const data = await this.userService.getProfile(userId);
    return sendResponse(HttpStatus.OK, 'Profile fetched successfully', data);
  }

  @Patch('profile')
  @ApiOperation({ summary: 'Update profile details (name, phone, avatar URL)' })
  async updateProfile(
    @GetCurrentUser('userId') userId: string,
    @Body() dto: UpdateProfileDto,
  ) {
    const data = await this.userService.updateProfile(userId, dto);
    return sendResponse(HttpStatus.OK, 'Profile updated successfully', data);
  }

  @Patch('avatar')
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Upload and update user profile avatar image file' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
          description: 'Image file (JPEG, PNG, WEBP, GIF, AVIF, max 5MB)',
        },
      },
    },
  })
  async updateAvatar(
    @GetCurrentUser('userId') userId: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    const avatarUrl = await this.cloudinaryService.uploadImage(
      file,
      'tatka-bajar/avatars',
    );
    const data = await this.userService.updateProfile(userId, { profile: avatarUrl });
    return sendResponse(HttpStatus.OK, 'Profile avatar uploaded and updated successfully', data);
  }

  @Get('all')
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Get all registered users (Admin only)' })
  @ApiQuery({ name: 'role', required: false, enum: ['ADMIN', 'USER', 'RIDER'] })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async getAllUsers(
    @Query('role') role?: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    const { users, meta } = await this.userService.getAllUsers(
      role,
      Number(page) || 1,
      Number(limit) || 20,
    );
    return sendResponse(HttpStatus.OK, 'Users fetched successfully', users, meta);
  }

  @Get('riders')
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Get all registered riders and stats (Admin only)' })
  async getAllRiders() {
    const data = await this.userService.getAllRiders();
    return sendResponse(HttpStatus.OK, 'Riders fetched successfully', data);
  }

  @Patch(':id/status')
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Update user status (Admin only)' })
  async updateUserStatus(
    @Param('id') id: string,
    @Body('status') status: 'ACTIVE' | 'INACTIVE' | 'SUSPEND',
  ) {
    const data = await this.userService.updateUserStatus(id, status);
    return sendResponse(HttpStatus.OK, 'User status updated successfully', data);
  }

  @Patch(':id/role')
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Update user role (Admin only)' })
  async updateUserRole(
    @Param('id') id: string,
    @Body('role') role: 'ADMIN' | 'USER' | 'RIDER',
  ) {
    const data = await this.userService.updateUserRole(id, role);
    return sendResponse(HttpStatus.OK, 'User role updated successfully', data);
  }
}
