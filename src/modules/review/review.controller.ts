import {
  Body,
  Controller,
  Delete,
  Get,
  HttpStatus,
  Param,
  Post,
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
import { ReviewService } from './review.service';
import { CreateReviewDto } from './dto/create-review.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { GetCurrentUser } from '../../common/decorator/get-current-user.decorator';
import { sendResponse } from '../../common/helpers/api-response.helper';

@ApiTags('Review')
@Controller('reviews')
export class ReviewController {
  constructor(private readonly reviewService: ReviewService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Submit or update a product review' })
  @ApiResponse({ status: 200, description: 'Review submitted successfully' })
  async createOrUpdate(
    @GetCurrentUser('userId') userId: string,
    @Body() dto: CreateReviewDto,
  ) {
    const data = await this.reviewService.createOrUpdate(userId, dto);
    return sendResponse(HttpStatus.OK, 'Review submitted successfully', data);
  }

  @Get('product/:productId')
  @ApiOperation({ summary: 'Get all reviews for a product' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async findByProduct(
    @Param('productId') productId: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    const { reviews, meta } = await this.reviewService.findByProduct(
      productId,
      Number(page) || 1,
      Number(limit) || 10,
    );
    return sendResponse(HttpStatus.OK, 'Reviews fetched successfully', reviews, meta);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Delete a review (User or Admin)' })
  async remove(
    @GetCurrentUser('userId') userId: string,
    @GetCurrentUser('role') role: string,
    @Param('id') id: string,
  ) {
    const isAdmin = role === 'ADMIN';
    const data = await this.reviewService.remove(userId, id, isAdmin);
    return sendResponse(HttpStatus.OK, 'Review deleted successfully', data);
  }
}
