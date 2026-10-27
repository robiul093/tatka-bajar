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
import { AddressService } from './address.service';
import { CreateAddressDto } from './dto/create-address.dto';
import { UpdateAddressDto } from './dto/update-address.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { GetCurrentUser } from '../../common/decorator/get-current-user.decorator';
import { sendResponse } from '../../common/helpers/api-response.helper';

@ApiTags('Address')
@Controller('addresses')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('access-token')
export class AddressController {
  constructor(private readonly addressService: AddressService) {}

  @Post()
  @ApiOperation({ summary: 'Add a new delivery address' })
  async create(
    @GetCurrentUser('userId') userId: string,
    @Body() createAddressDto: CreateAddressDto,
  ) {
    const data = await this.addressService.create(userId, createAddressDto);
    return sendResponse(HttpStatus.CREATED, 'Address added successfully', data);
  }

  @Get()
  @ApiOperation({ summary: 'Get all delivery addresses for current user' })
  async findAll(@GetCurrentUser('userId') userId: string) {
    const data = await this.addressService.findAll(userId);
    return sendResponse(HttpStatus.OK, 'Addresses fetched successfully', data);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get single address by ID' })
  async findOne(
    @GetCurrentUser('userId') userId: string,
    @Param('id') id: string,
  ) {
    const data = await this.addressService.findOne(userId, id);
    return sendResponse(HttpStatus.OK, 'Address fetched successfully', data);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update delivery address' })
  async update(
    @GetCurrentUser('userId') userId: string,
    @Param('id') id: string,
    @Body() updateAddressDto: UpdateAddressDto,
  ) {
    const data = await this.addressService.update(userId, id, updateAddressDto);
    return sendResponse(HttpStatus.OK, 'Address updated successfully', data);
  }

  @Patch(':id/default')
  @ApiOperation({ summary: 'Set address as default delivery address' })
  async setDefault(
    @GetCurrentUser('userId') userId: string,
    @Param('id') id: string,
  ) {
    const data = await this.addressService.setDefault(userId, id);
    return sendResponse(HttpStatus.OK, 'Default address updated successfully', data);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete delivery address' })
  async remove(
    @GetCurrentUser('userId') userId: string,
    @Param('id') id: string,
  ) {
    const data = await this.addressService.remove(userId, id);
    return sendResponse(HttpStatus.OK, 'Address deleted successfully', data);
  }
}
