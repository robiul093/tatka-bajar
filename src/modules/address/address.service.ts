import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateAddressDto } from './dto/create-address.dto';
import { UpdateAddressDto } from './dto/update-address.dto';

@Injectable()
export class AddressService {
  constructor(private readonly prisma: PrismaService) {}

  async create(userId: string, dto: CreateAddressDto) {
    // If this is set as default, unset all other defaults first
    if (dto.isDefault) {
      await this.prisma.address.updateMany({
        where: { userId },
        data: { isDefault: false },
      });
    }

    // Auto-set first address as default
    const count = await this.prisma.address.count({ where: { userId } });
    const isFirstAddress = count === 0;

    return this.prisma.address.create({
      data: {
        userId,
        title: dto.title || 'Home',
        recipientName: dto.recipientName,
        phone: dto.phone,
        streetAddress: dto.streetAddress,
        area: dto.area,
        city: dto.city || 'Dhaka',
        postalCode: dto.postalCode,
        latitude: dto.latitude,
        longitude: dto.longitude,
        isDefault: dto.isDefault !== undefined ? dto.isDefault : isFirstAddress,
      },
    });
  }

  async findAll(userId: string) {
    return this.prisma.address.findMany({
      where: { userId },
      orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }],
    });
  }

  async findOne(userId: string, addressId: string) {
    const address = await this.prisma.address.findFirst({
      where: { addressId, userId },
    });

    if (!address) {
      throw new NotFoundException(`Address not found: ${addressId}`);
    }

    return address;
  }

  async update(userId: string, addressId: string, dto: UpdateAddressDto) {
    await this.findOne(userId, addressId);

    if (dto.isDefault) {
      await this.prisma.address.updateMany({
        where: { userId },
        data: { isDefault: false },
      });
    }

    return this.prisma.address.update({
      where: { addressId },
      data: dto,
    });
  }

  async setDefault(userId: string, addressId: string) {
    await this.findOne(userId, addressId);

    await this.prisma.address.updateMany({
      where: { userId },
      data: { isDefault: false },
    });

    return this.prisma.address.update({
      where: { addressId },
      data: { isDefault: true },
    });
  }

  async remove(userId: string, addressId: string) {
    await this.findOne(userId, addressId);
    return this.prisma.address.delete({
      where: { addressId },
    });
  }
}
