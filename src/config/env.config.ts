import { registerAs } from '@nestjs/config';

export interface IEnv {
  APPLICATION: {
    NODE_ENV: string;
    PORT: string;
    API_PREFIX: string;
    APP_NAME: string;
    APP_URL: string;
  };
  DATABASE: {
    DATABASE_URL: string;
    DATABASE_POOL_MIN: string;
    DATABASE_POOL_MAX: string;
  };
  JWT_CONFIG: {
    JWT_SECRET: string;
    JWT_EXPIRES_IN: string;
    JWT_REFRESH_SECRET: string;
    JWT_REFRESH_EXPIRES_IN: string;
  };
  SMTP_EMAIL_CONFIG: {
    EMAIL_HOST: string;
    EMAIL_PORT: string;
    EMAIL_USER: string;
    EMAIL_PASSWORD: string;
    EMAIL_FROM: string;
    EMAIL_FROM_NAME: string;
  };
  CLOUDINARY_CONFIG: {
    CLOUDINARY_CLOUD_NAME: string;
    CLOUDINARY_API_KEY: string;
    CLOUDINARY_API_SECRET: string;
  };
  ADMIN_CONFIG: {
    SUPER_ADMIN_EMAIL: string;
    SUPER_ADMIN_PASSWORD: string;
  };
  SEEDER_CONFIG: {
    ADMIN: {
      NAME: string;
      EMAIL: string;
      PASSWORD: string;
      PHONE: string;
    };
    USER: {
      NAME: string;
      EMAIL: string;
      PASSWORD: string;
      PHONE: string;
    };
    RIDER: {
      NAME: string;
      EMAIL: string;
      PASSWORD: string;
      PHONE: string;
    };
  };
}

const requiredEnv = [
  'DATABASE_URL',
  'JWT_SECRET',
  'JWT_REFRESH_SECRET',
];

// env Checker
function envChecker() {
  const missing = requiredEnv.filter((key) => !process.env[key]);
  if (missing.length > 0) {
    throw new Error(`❌ Missing required env variables: ${missing.join(', ')}`);
  }
}

export default registerAs('env', (): IEnv => {
  envChecker();

  return {
    APPLICATION: {
      NODE_ENV: (process.env.NODE_ENV as string) || 'development',
      PORT: (process.env.PORT as string) || '3000',
      API_PREFIX: (process.env.API_PREFIX as string) || 'api/v1',
      APP_NAME: (process.env.APP_NAME as string) || 'Application',
      APP_URL: (process.env.APP_URL as string) || 'http://localhost:3000',
    },
    DATABASE: {
      DATABASE_URL: process.env.DATABASE_URL as string,
      DATABASE_POOL_MIN: (process.env.DATABASE_POOL_MIN as string) || '2',
      DATABASE_POOL_MAX: (process.env.DATABASE_POOL_MAX as string) || '10',
    },
    JWT_CONFIG: {
      JWT_SECRET: process.env.JWT_SECRET as string,
      JWT_EXPIRES_IN: (process.env.JWT_EXPIRES_IN as string) || '15m',
      JWT_REFRESH_SECRET: process.env.JWT_REFRESH_SECRET as string,
      JWT_REFRESH_EXPIRES_IN: (process.env.JWT_REFRESH_EXPIRES_IN as string) || '7d',
    },
    SMTP_EMAIL_CONFIG: {
      EMAIL_HOST: (process.env.EMAIL_HOST as string) || '',
      EMAIL_PORT: (process.env.EMAIL_PORT as string) || '587',
      EMAIL_USER: (process.env.EMAIL_USER as string) || '',
      EMAIL_PASSWORD: (process.env.EMAIL_PASSWORD as string) || '',
      EMAIL_FROM: (process.env.EMAIL_FROM as string) || '',
      EMAIL_FROM_NAME: (process.env.EMAIL_FROM_NAME as string) || 'Application',
    },
    CLOUDINARY_CONFIG: {
      CLOUDINARY_CLOUD_NAME: (process.env.CLOUDINARY_CLOUD_NAME as string) || '',
      CLOUDINARY_API_KEY: (process.env.CLOUDINARY_API_KEY as string) || '',
      CLOUDINARY_API_SECRET: (process.env.CLOUDINARY_API_SECRET as string) || '',
    },
    ADMIN_CONFIG: {
      SUPER_ADMIN_EMAIL: (process.env.SUPER_ADMIN_EMAIL as string) || (process.env.ADMIN_EMAIL as string) || 'admin@example.com',
      SUPER_ADMIN_PASSWORD: (process.env.SUPER_ADMIN_PASSWORD as string) || (process.env.ADMIN_PASSWORD as string) || 'SuperSecurePassword123!',
    },
    SEEDER_CONFIG: {
      ADMIN: {
        NAME: (process.env.SEED_ADMIN_NAME as string) || (process.env.ADMIN_NAME as string) || 'Admin User',
        EMAIL: (process.env.SEED_ADMIN_EMAIL as string) || (process.env.ADMIN_EMAIL as string) || (process.env.SUPER_ADMIN_EMAIL as string) || 'admin@example.com',
        PASSWORD: (process.env.SEED_ADMIN_PASSWORD as string) || (process.env.ADMIN_PASSWORD as string) || (process.env.SUPER_ADMIN_PASSWORD as string) || 'Admin@123456',
        PHONE: (process.env.SEED_ADMIN_PHONE as string) || (process.env.ADMIN_PHONE as string) || '+8801700000001',
      },
      USER: {
        NAME: (process.env.SEED_USER_NAME as string) || (process.env.USER_NAME as string) || 'Default User',
        EMAIL: (process.env.SEED_USER_EMAIL as string) || (process.env.USER_EMAIL as string) || 'user@example.com',
        PASSWORD: (process.env.SEED_USER_PASSWORD as string) || (process.env.USER_PASSWORD as string) || 'User@123456',
        PHONE: (process.env.SEED_USER_PHONE as string) || (process.env.USER_PHONE as string) || '+8801700000002',
      },
      RIDER: {
        NAME: (process.env.SEED_RIDER_NAME as string) || (process.env.RIDER_NAME as string) || 'Default Rider',
        EMAIL: (process.env.SEED_RIDER_EMAIL as string) || (process.env.RIDER_EMAIL as string) || 'rider@example.com',
        PASSWORD: (process.env.SEED_RIDER_PASSWORD as string) || (process.env.RIDER_PASSWORD as string) || 'Rider@123456',
        PHONE: (process.env.SEED_RIDER_PHONE as string) || (process.env.RIDER_PHONE as string) || '+8801700000003',
      },
    },
  };
});
