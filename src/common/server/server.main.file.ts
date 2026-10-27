import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import helmet from 'helmet';
import * as net from 'net';
import rateLimit from 'express-rate-limit';
import { Redis } from 'ioredis';

let apm: any;
try {
  apm = require('elastic-apm-node');
} catch {}

let RedisStore: any;
try {
  RedisStore = require('rate-limit-redis');
} catch {}

export async function getAvailablePort(
  startPort: number,
  maxAttempts = 10,
): Promise<number> {
  return new Promise((resolve, reject) => {
    let attempts = 0;
    const tryPort = (port: number) => {
      const server = net.createServer();
      server.once('error', (err: NodeJS.ErrnoException) => {
        if (err.code === 'EADDRINUSE') {
          attempts++;
          if (attempts >= maxAttempts) reject(err);
          else tryPort(port + 1);
        } else reject(err);
      });
      server.once('listening', () => {
        server.close();
        resolve(port);
      });
      server.listen(port);
    };
    tryPort(startPort);
  });
}

export function initializeAPM(
  configService: ConfigService,
  nodeEnv: string,
): void {
  if (nodeEnv === 'production' && apm) {
    const apmServerUrl = configService.get('APM_SERVER_URL');
    const apmSecretToken = configService.get('APM_SECRET_TOKEN');
    if (apmServerUrl && apmSecretToken) {
      apm.start({
        serviceName: configService.get<string>('APP_NAME') || 'nest-api',
        secretToken: apmSecretToken,
        serverUrl: apmServerUrl,
        environment: nodeEnv,
        active: true,
      });
    }
  }
}

export function setupInMemoryRateLimiting(
  app: any,
  windowMs: number,
  max: number,
) {
  app.use(
    rateLimit({
      windowMs,
      max,
      skip: (req: any) =>
        ['/health', '/metrics', '/docs'].some((p) => req.url.includes(p)),
    }),
  );
}

export function setupRateLimiting(
  app: any,
  configService: ConfigService,
  nodeEnv: string,
): void {
  if (nodeEnv !== 'production') return;

  const windowMs = configService.get<number>(
    'RATE_LIMIT_WINDOW_MS',
    15 * 60 * 1000,
  );
  const max = configService.get<number>('RATE_LIMIT_MAX', 100);
  const redisUrl = configService.get('REDIS_URL');

  if (redisUrl && RedisStore) {
    const redisClient = new Redis(redisUrl);
    app.use(
      rateLimit({
        windowMs,
        max,
        store: new RedisStore({ client: redisClient }),
        skip: (req: any) =>
          ['/health', '/metrics', '/docs'].some((p) => req.url.includes(p)),
      }),
    );
  } else {
    setupInMemoryRateLimiting(app, windowMs, max);
  }
}

export function setupSecurity(
  app: any,
  configService: ConfigService,
  nodeEnv: string,
): void {
  app.use(
    helmet({
      contentSecurityPolicy: false,
    }),
  );
  app.enableCors({
    origin: true,
    credentials: true,
  });
}

export function setupRequestLogging(app: any, logger: Logger): void {
  app.use((req: any, res: any, next: any) => {
    const start = Date.now();
    res.on('finish', () => {
      logger.log(
        `${req.method} ${req.url} ${res.statusCode} ${Date.now() - start}ms`,
      );
    });
    next();
  });
}

export function setupSwagger(
  app: any,
  configService: ConfigService,
  nodeEnv: string,
  port: number,
): void {
  if (configService.get('ENABLE_SWAGGER') === 'false') return;

  const appName = configService.get<string>('APP_NAME') || 'Application API';
  const appVersion = configService.get<string>('APP_VERSION') || '1.0.0';

  const config = new DocumentBuilder()
    .setTitle(`${appName} Documentation`)
    .setDescription(
      `Documentation and interactive API specifications for ${appName}.\n\n` +
        `**Base URL:** \`http://localhost:${port}/api/v1\`\n\n` +
        '**Auth:** Use the `POST /api/v1/auth/login` endpoint to obtain a Bearer token, ' +
        'then click **Authorize** above.',
    )
    .setVersion(appVersion)
    .addServer(`http://localhost:${port}`, 'Local Development')
    .addServer('/', 'Current Host')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'Enter your JWT access token',
      },
      'access-token',
    )
    .addTag('Base', 'Base API & server health check')
    .addTag('Auth', 'Authentication & authorization endpoints')
    .addTag('User', 'User management endpoints')
    .addTag('Category', 'Product categories')
    .addTag('Product', 'Fresh produce & groceries catalog')
    .addTag('Address', 'Customer delivery addresses')
    .addTag('Cart', 'Shopping cart management')
    .addTag('Order', 'Checkout & order lifecycle management')
    .addTag('Review', 'Product ratings and customer reviews')
    .build();

  const document = SwaggerModule.createDocument(app, config);

  const SWAGGER_CDN = 'https://cdnjs.cloudflare.com/ajax/libs/swagger-ui/5.18.2';

  SwaggerModule.setup('docs', app, document, {
    customCssUrl: [
      `${SWAGGER_CDN}/swagger-ui.min.css`,
      `${SWAGGER_CDN}/swagger-ui-standalone-preset.min.css`,
    ],
    customJs: [
      `${SWAGGER_CDN}/swagger-ui-bundle.min.js`,
      `${SWAGGER_CDN}/swagger-ui-standalone-preset.min.js`,
    ],
    swaggerOptions: {
      persistAuthorization: true,
      tagsSorter: 'alpha',
      operationsSorter: 'alpha',
    },
  });

  new Logger('Swagger').log(`Swagger: http://localhost:${port}/docs`);
}
