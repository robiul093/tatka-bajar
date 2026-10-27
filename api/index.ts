import { NestFactory } from '@nestjs/core';
import { ExpressAdapter } from '@nestjs/platform-express';
import express, { Express, Request, Response } from 'express';
import { ValidationPipe, VersioningType, RequestMethod } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AppModule } from '../src/app.module';
import { HttpExceptionFilter } from '../src/common/filters';
import {
  LoggingInterceptor,
  TransformInterceptor,
} from '../src/common/interceptors';
import {
  setupSecurity,
  setupSwagger,
} from '../src/common/server/server.main.file';

const server: Express = express();
let appPromise: Promise<void> | null = null;

async function bootstrap() {
  const app = await NestFactory.create(AppModule, new ExpressAdapter(server));
  const configService = app.get(ConfigService);
  const nodeEnv = configService.get<string>('NODE_ENV', 'development');

  // Global prefix: all routes are served under /api/v1/<route> except base api (/)
  app.setGlobalPrefix('api', {
    exclude: [
      { path: '', method: RequestMethod.GET },
      { path: '/', method: RequestMethod.GET },
    ],
  });

  app.enableVersioning({
    type: VersioningType.URI,
    defaultVersion: '1',
  });

  setupSecurity(app, configService, nodeEnv);

  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  app.useGlobalFilters(new HttpExceptionFilter());
  app.useGlobalInterceptors(
    new LoggingInterceptor(),
    new TransformInterceptor(),
  );

  setupSwagger(app, configService, nodeEnv, 3000);

  await app.init();
}

export default async function handler(req: Request, res: Response) {
  try {
    if (!appPromise) {
      appPromise = bootstrap().catch((err) => {
        appPromise = null;
        throw err;
      });
    }
    await appPromise;
    server(req, res);
  } catch (error: any) {
    console.error('❌ Vercel serverless function bootstrap failed:', error);
    return res.status(500).json({
      statusCode: 500,
      message: 'Failed to initialize server application',
      error: error?.message || String(error),
    });
  }
}
