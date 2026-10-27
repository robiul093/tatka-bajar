import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Role, Status } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../../prisma/prisma.service';
import { IEnv } from '../../config/env.config';

interface IRoleSeedData {
  role: Role;
  name: string;
  email: string;
  password: string;
  phone: string;
}

@Injectable()
export class SeederService implements OnApplicationBootstrap {
  private readonly logger = new Logger(SeederService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {}

  /**
   * Automatically executes when the NestJS application starts.
   */
  async onApplicationBootstrap(): Promise<void> {
    await this.seed();
  }

  /**
   * Seeds default users for all defined roles (ADMIN, USER, RIDER) if they do not already exist.
   */
  async seed(): Promise<void> {
    this.logger.log('Checking database seeding for all roles...');

    const env = this.configService.get<IEnv>('env');
    const seederConfig = env?.SEEDER_CONFIG;

    if (!seederConfig) {
      this.logger.warn('SEEDER_CONFIG not found in ConfigService. Skipping seeding.');
      return;
    }

    const rolesToSeed: IRoleSeedData[] = [
      {
        role: Role.ADMIN,
        name: seederConfig.ADMIN.NAME,
        email: seederConfig.ADMIN.EMAIL,
        password: seederConfig.ADMIN.PASSWORD,
        phone: seederConfig.ADMIN.PHONE,
      },
      {
        role: Role.USER,
        name: seederConfig.USER.NAME,
        email: seederConfig.USER.EMAIL,
        password: seederConfig.USER.PASSWORD,
        phone: seederConfig.USER.PHONE,
      },
      {
        role: Role.RIDER,
        name: seederConfig.RIDER.NAME,
        email: seederConfig.RIDER.EMAIL,
        password: seederConfig.RIDER.PASSWORD,
        phone: seederConfig.RIDER.PHONE,
      },
    ];

    for (const item of rolesToSeed) {
      try {
        await this.seedUserForRole(item);
      } catch (error) {
        const err = error as Error;
        this.logger.error(
          `Failed to seed user for role ${item.role} (${item.email}): ${err.message}`,
          err.stack,
        );
      }
    }

    this.logger.log('Database seeding check completed.');
  }

  /**
   * Checks if a user with the specified email already exists.
   * If exists, skips seeding. Otherwise, creates the user and related records.
   */
  private async seedUserForRole(data: IRoleSeedData): Promise<void> {
    const { role, name, email, password, phone } = data;

    if (!email) {
      this.logger.warn(`No email configured for role ${role}. Skipping.`);
      return;
    }

    // Check if user with this email already exists
    const existingUser = await this.prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      this.logger.log(
        `User with email "${email}" already exists. Skipping seeding for role ${role}.`,
      );
      return;
    }

    // Check if phone number is already registered to avoid unique constraint conflict
    if (phone) {
      const existingPhone = await this.prisma.user.findUnique({
        where: { phone },
      });

      if (existingPhone) {
        this.logger.warn(
          `Phone "${phone}" is already registered to user "${existingPhone.email}". Skipping seeding for role ${role} (${email}).`,
        );
        return;
      }
    }

    // Hash password using bcrypt
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user with active and verified status
    await this.prisma.user.create({
      data: {
        name,
        email,
        phone,
        password: hashedPassword,
        role,
        status: Status.ACTIVE,
        isVerified: true,
        isAgree: true,
        isNotification: true,
        ...(role === Role.RIDER
          ? {
              rider: {
                create: {
                  isActive: true,
                },
              },
            }
          : {}),
      },
    });

    this.logger.log(
      `Successfully seeded user for role ${role}: ${email} (${name})`,
    );
  }
}
