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
  UploadedFiles,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiOperation,
  ApiProperty,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { FilesInterceptor } from '@nestjs/platform-express';
import { ProductService } from './product.service';
import { CloudinaryService } from '../../cloudinary/cloudinary.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { QueryProductDto } from './dto/query-product.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorator/roles.decorator';
import { sendResponse } from '../../common/helpers/api-response.helper';
import { IsNotEmpty, IsString } from 'class-validator';

class RemoveProductImageDto {
  @ApiProperty({ example: 'https://res.cloudinary.com/.../image.jpg' })
  @IsString()
  @IsNotEmpty()
  imageUrl: string;
}

@ApiTags('Product')
@Controller('products')
export class ProductController {
  constructor(
    private readonly productService: ProductService,
    private readonly cloudinaryService: CloudinaryService,
  ) {}

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @ApiBearerAuth('access-token')
  @ApiOperation({
    summary: 'Create new product (Admin only)',
    description:
      'Creates a new product with optional discount toggle, discount price or discount percent.',
  })
  @ApiResponse({ status: 201, description: 'Product created successfully' })
  async create(@Body() createProductDto: CreateProductDto) {
    const data = await this.productService.create(createProductDto);
    return sendResponse(HttpStatus.CREATED, 'Product created successfully', data);
  }

  @Post(':id/images')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @UseInterceptors(FilesInterceptor('images', 8))
  @ApiConsumes('multipart/form-data')
  @ApiBearerAuth('access-token')
  @ApiOperation({
    summary: 'Upload and attach up to 8 images to a product (Admin only)',
    description: 'Uploads image files directly to Cloudinary and appends them to the product image gallery.',
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        images: {
          type: 'array',
          items: {
            type: 'string',
            format: 'binary',
          },
          description: 'Product image files (JPEG, PNG, WEBP, GIF, max 5MB each)',
        },
      },
    },
  })
  async uploadImages(
    @Param('id') id: string,
    @UploadedFiles() files: Express.Multer.File[],
  ) {
    const uploadedUrls = await this.cloudinaryService.uploadMultipleImages(
      files,
      'tatka-bajar/products',
    );
    const data = await this.productService.appendImages(id, uploadedUrls);
    return sendResponse(HttpStatus.OK, 'Product images uploaded successfully', data);
  }

  @Delete(':id/images')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Remove a specific image URL from product gallery (Admin only)' })
  async removeImage(
    @Param('id') id: string,
    @Body() body: RemoveProductImageDto,
  ) {
    // Optionally delete from Cloudinary
    await this.cloudinaryService.deleteImage(body.imageUrl);
    const data = await this.productService.removeImage(id, body.imageUrl);
    return sendResponse(HttpStatus.OK, 'Product image removed successfully', data);
  }

  @Get()
  @ApiOperation({ summary: 'Get paginated list of products with filters' })
  async findAll(@Query() query: QueryProductDto) {
    const { products, meta } = await this.productService.findAll(query);
    return sendResponse(
      HttpStatus.OK,
      'Products fetched successfully',
      products,
      meta,
    );
  }

  @Get('search')
  @ApiOperation({
    summary: 'Global search products',
    description: 'Searches across product name, description, origin location, and category name',
  })
  @ApiQuery({ name: 'q', required: true, description: 'Search keyword (e.g. mango, tomato, fish)' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async search(
    @Query('q') q: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    const { products, meta } = await this.productService.search(
      q,
      Number(page) || 1,
      Number(limit) || 12,
    );
    return sendResponse(
      HttpStatus.OK,
      'Search results fetched successfully',
      products,
      meta,
    );
  }

  @Get(':idOrSlug')
  @ApiOperation({ summary: 'Get product details by ID or Slug' })
  async findOne(@Param('idOrSlug') idOrSlug: string) {
    const data = await this.productService.findOne(idOrSlug);
    return sendResponse(HttpStatus.OK, 'Product details fetched successfully', data);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @ApiBearerAuth('access-token')
  @ApiOperation({
    summary: 'Update product (Admin only)',
    description: 'Update any product field including toggling discount on/off or setting discount price/percent.',
  })
  async update(
    @Param('id') id: string,
    @Body() updateProductDto: UpdateProductDto,
  ) {
    const data = await this.productService.update(id, updateProductDto);
    return sendResponse(HttpStatus.OK, 'Product updated successfully', data);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Soft delete product (Admin only)' })
  async remove(@Param('id') id: string) {
    const data = await this.productService.remove(id);
    return sendResponse(HttpStatus.OK, 'Product deleted successfully', data);
  }
}
