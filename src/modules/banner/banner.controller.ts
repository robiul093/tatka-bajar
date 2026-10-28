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
import { BannerService } from './banner.service';
import { CreateBannerDto } from './dto/create-banner.dto';
import { UpdateBannerDto } from './dto/update-banner.dto';
import { QueryBannerDto } from './dto/query-banner.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorator/roles.decorator';
import { sendResponse } from '../../common/helpers/api-response.helper';
import { BannerLinkType } from '@prisma/client';

@ApiTags('Banner')
@Controller('banners')
export class BannerController {
  constructor(private readonly bannerService: BannerService) {}

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @ApiBearerAuth('access-token')
  @UseInterceptors(FileInterceptor('image'))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({
    summary: 'Create promotional banner with image file upload (Admin only)',
    description:
      'Creates a new banner. The banner image must be uploaded as a binary file (JPEG, PNG, WEBP, max 5MB).',
  })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['title', 'linkType', 'linkValue', 'image'],
      properties: {
        title: { type: 'string', example: 'Summer Fresh Mango Festival' },
        subtitle: { type: 'string', example: 'Up to 30% off on Rajshahi Himsagar' },
        tag: { type: 'string', example: 'SEASONAL DEAL' },
        tagColor: { type: 'string', example: '#FF6B35' },
        linkType: {
          type: 'string',
          enum: Object.values(BannerLinkType),
          example: BannerLinkType.CATEGORY,
        },
        linkValue: { type: 'string', example: 'mangoes' },
        discountPercent: { type: 'number', example: 25 },
        isActive: { type: 'boolean', example: true },
        sortOrder: { type: 'number', example: 1 },
        startsAt: { type: 'string', format: 'date-time', example: '2026-10-28T00:00:00.000Z' },
        endsAt: { type: 'string', format: 'date-time', example: '2026-11-15T23:59:59.000Z' },
        image: {
          type: 'string',
          format: 'binary',
          description: 'Banner graphic image file (max 5MB)',
        },
      },
    },
  })
  @ApiResponse({ status: 201, description: 'Banner created successfully' })
  async create(
    @Body() createBannerDto: CreateBannerDto,
    @UploadedFile() image: Express.Multer.File,
  ) {
    const data = await this.bannerService.create(createBannerDto, image);
    return sendResponse(HttpStatus.CREATED, 'Banner created successfully', data);
  }

  @Get()
  @ApiOperation({
    summary: 'Get active promotional banners for homepage',
    description:
      'Returns all active banners currently within their active schedule window, sorted by display priority.',
  })
  async findAllPublic() {
    const data = await this.bannerService.findAllPublic();
    return sendResponse(HttpStatus.OK, 'Active banners fetched successfully', data);
  }

  @Get('admin')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Get all banners including inactive & scheduled (Admin only)' })
  async findAllAdmin(@Query() query: QueryBannerDto) {
    const { banners, meta } = await this.bannerService.findAllAdmin(query);
    return sendResponse(HttpStatus.OK, 'Banners fetched successfully', banners, meta);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get single banner by ID' })
  async findOne(@Param('id') id: string) {
    const data = await this.bannerService.findOne(id);
    return sendResponse(HttpStatus.OK, 'Banner details fetched successfully', data);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @ApiBearerAuth('access-token')
  @UseInterceptors(FileInterceptor('image'))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({
    summary: 'Update banner details and optional replacement image file (Admin only)',
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        title: { type: 'string', example: 'Winter Fresh Vegetables' },
        subtitle: { type: 'string', example: 'Fresh from northern farms' },
        tag: { type: 'string', example: 'DAILY SPECIAL' },
        tagColor: { type: 'string', example: '#2E7D32' },
        linkType: {
          type: 'string',
          enum: Object.values(BannerLinkType),
          example: BannerLinkType.CATEGORY,
        },
        linkValue: { type: 'string', example: 'vegetables' },
        discountPercent: { type: 'number', example: 20 },
        isActive: { type: 'boolean', example: true },
        sortOrder: { type: 'number', example: 2 },
        startsAt: { type: 'string', format: 'date-time' },
        endsAt: { type: 'string', format: 'date-time' },
        image: {
          type: 'string',
          format: 'binary',
          description: 'Replacement banner graphic image file (max 5MB)',
        },
      },
    },
  })
  async update(
    @Param('id') id: string,
    @Body() updateBannerDto: UpdateBannerDto,
    @UploadedFile() image?: Express.Multer.File,
  ) {
    const data = await this.bannerService.update(id, updateBannerDto, image);
    return sendResponse(HttpStatus.OK, 'Banner updated successfully', data);
  }

  @Patch(':id/image')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @ApiBearerAuth('access-token')
  @UseInterceptors(FileInterceptor('image'))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Upload replacement image file for banner (Admin only)' })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['image'],
      properties: {
        image: {
          type: 'string',
          format: 'binary',
          description: 'New banner image file (max 5MB)',
        },
      },
    },
  })
  async updateImage(
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    const data = await this.bannerService.updateImage(id, file);
    return sendResponse(HttpStatus.OK, 'Banner image updated successfully', data);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Delete banner (Admin only)' })
  async remove(@Param('id') id: string) {
    const data = await this.bannerService.remove(id);
    return sendResponse(HttpStatus.OK, 'Banner deleted successfully', data);
  }
}

