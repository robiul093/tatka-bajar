import {
  Body,
  Controller,
  Delete,
  Get,
  HttpStatus,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CartService } from './cart.service';
import { AddToCartDto, UpdateCartItemDto } from './dto/cart.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { GetCurrentUser } from '../../common/decorator/get-current-user.decorator';
import { sendResponse } from '../../common/helpers/api-response.helper';

@ApiTags('Cart')
@Controller('cart')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('access-token')
export class CartController {
  constructor(private readonly cartService: CartService) {}

  @Get()
  @ApiOperation({ summary: 'Get current user shopping cart' })
  async getCart(@GetCurrentUser('userId') userId: string) {
    const data = await this.cartService.getCart(userId);
    return sendResponse(HttpStatus.OK, 'Cart fetched successfully', data);
  }

  @Post('items')
  @ApiOperation({ summary: 'Add product to cart' })
  async addToCart(
    @GetCurrentUser('userId') userId: string,
    @Body() dto: AddToCartDto,
  ) {
    const data = await this.cartService.addToCart(userId, dto);
    return sendResponse(HttpStatus.OK, 'Item added to cart', data);
  }

  @Patch('items/:itemId')
  @ApiOperation({ summary: 'Update cart item quantity' })
  async updateItem(
    @GetCurrentUser('userId') userId: string,
    @Param('itemId') itemId: string,
    @Body() dto: UpdateCartItemDto,
  ) {
    const data = await this.cartService.updateItem(userId, itemId, dto);
    return sendResponse(HttpStatus.OK, 'Cart item updated', data);
  }

  @Delete('items/:itemId')
  @ApiOperation({ summary: 'Remove item from cart' })
  async removeItem(
    @GetCurrentUser('userId') userId: string,
    @Param('itemId') itemId: string,
  ) {
    const data = await this.cartService.removeItem(userId, itemId);
    return sendResponse(HttpStatus.OK, 'Item removed from cart', data);
  }

  @Delete()
  @ApiOperation({ summary: 'Clear all items from cart' })
  async clearCart(@GetCurrentUser('userId') userId: string) {
    const data = await this.cartService.clearCart(userId);
    return sendResponse(HttpStatus.OK, 'Cart cleared successfully', data);
  }
}
