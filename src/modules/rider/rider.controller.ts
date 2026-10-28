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
import { RiderService } from './rider.service';
import { CreateRiderDto } from './dto/create-rider.dto';
import { UpdateRiderDto } from './dto/update-rider.dto';
import { UpdateRiderLocationDto } from './dto/update-rider-location.dto';
import { QueryRiderDto } from './dto/query-rider.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorator/roles.decorator';
import { GetCurrentUser } from '../../common/decorator/get-current-user.decorator';
import { sendResponse } from '../../common/helpers/api-response.helper';

@ApiTags('Rider')
@Controller('riders')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth('access-token')
export class RiderController {
  constructor(private readonly riderService: RiderService) {}

  @Post()
  @Roles('ADMIN')
  @UseInterceptors(FileInterceptor('avatar'))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({
    summary: 'Register a new rider with optional avatar file (Admin only)',
    description:
      'Creates a user with RIDER role and provisions a Rider profile. Accepts avatar as multipart image file upload.',
  })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['name', 'phone', 'email'],
      properties: {
        name: { type: 'string', example: 'Rakibul Hasan' },
        phone: { type: 'string', example: '01712345678' },
        email: { type: 'string', example: 'rider.rakib@tatkabajar.com' },
        password: { type: 'string', example: 'Rider@1234' },
        currentLat: { type: 'number', example: 23.7516 },
        currentLng: { type: 'number', example: 90.3944 },
        avatar: {
          type: 'string',
          format: 'binary',
          description: 'Rider profile avatar image file (max 5MB)',
        },
      },
    },
  })
  @ApiResponse({ status: 201, description: 'Rider registered successfully' })
  async create(
    @Body() createRiderDto: CreateRiderDto,
    @UploadedFile() avatarFile?: Express.Multer.File,
  ) {
    const data = await this.riderService.createRider(createRiderDto, avatarFile);
    return sendResponse(HttpStatus.CREATED, 'Rider registered successfully', data);
  }

  @Get()
  @Roles('ADMIN')
  @ApiOperation({ summary: 'List all registered riders with stats (Admin only)' })
  async findAll(@Query() query: QueryRiderDto) {
    const { riders, meta } = await this.riderService.findAll(query);
    return sendResponse(HttpStatus.OK, 'Riders fetched successfully', riders, meta);
  }

  @Get('me')
  @Roles('RIDER')
  @ApiOperation({ summary: 'Get current logged-in rider profile and active deliveries' })
  async getMyProfile(@GetCurrentUser('userId') userId: string) {
    const data = await this.riderService.getMyProfile(userId);
    return sendResponse(HttpStatus.OK, 'Rider profile fetched successfully', data);
  }

  @Patch('location')
  @Roles('RIDER')
  @ApiOperation({ summary: 'Update current rider GPS location (Rider only)' })
  async updateLocation(
    @GetCurrentUser('userId') userId: string,
    @Body() dto: UpdateRiderLocationDto,
  ) {
    const data = await this.riderService.updateLocation(
      userId,
      dto.currentLat,
      dto.currentLng,
    );
    return sendResponse(HttpStatus.OK, 'Rider location updated successfully', data);
  }

  @Get(':id')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Get single rider details by Rider ID (Admin only)' })
  async findOne(@Param('id') id: string) {
    const data = await this.riderService.findOne(id);
    return sendResponse(HttpStatus.OK, 'Rider details fetched successfully', data);
  }

  @Patch(':id')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Update rider details (Admin only)' })
  async update(
    @Param('id') id: string,
    @Body() updateRiderDto: UpdateRiderDto,
  ) {
    const data = await this.riderService.updateRider(id, updateRiderDto);
    return sendResponse(HttpStatus.OK, 'Rider updated successfully', data);
  }

  @Patch(':id/status')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Toggle rider active status (Admin only)' })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['isActive'],
      properties: {
        isActive: { type: 'boolean', example: true },
      },
    },
  })
  async toggleStatus(
    @Param('id') id: string,
    @Body('isActive') isActive: boolean,
  ) {
    const data = await this.riderService.toggleStatus(id, Boolean(isActive));
    return sendResponse(HttpStatus.OK, 'Rider status updated successfully', data);
  }

  @Patch(':id/avatar')
  @Roles('ADMIN', 'RIDER')
  @UseInterceptors(FileInterceptor('avatar'))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Upload/replace rider profile avatar file' })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['avatar'],
      properties: {
        avatar: {
          type: 'string',
          format: 'binary',
          description: 'Rider avatar image file (max 5MB)',
        },
      },
    },
  })
  async updateAvatar(
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    const data = await this.riderService.updateAvatar(id, file);
    return sendResponse(HttpStatus.OK, 'Rider avatar updated successfully', data);
  }

  @Delete(':id')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Deactivate / Remove rider (Admin only)' })
  async remove(@Param('id') id: string) {
    const data = await this.riderService.remove(id);
    return sendResponse(HttpStatus.OK, 'Rider deactivated successfully', data);
  }
}

