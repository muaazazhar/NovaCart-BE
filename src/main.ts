import { Logger, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import { existsSync, mkdirSync } from 'fs';
import helmet from 'helmet';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { join } from 'path';
import { NestExpressApplication } from '@nestjs/platform-express';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    bufferLogs: true,
  });

  const configService = app.get(ConfigService);
  const logger = app.get(WINSTON_MODULE_NEST_PROVIDER);
  app.useLogger(logger);

  const port = configService.get<number>('port') || 3000;
  const apiPrefix = configService.get<string>('apiPrefix') || 'api/v1';
  const appName = configService.get<string>('appName') || 'NovaCart';
  const corsOrigins = configService.get<string[]>('cors.origins') || ['*'];
  const uploadDest = configService.get<string>('upload.dest') || './uploads';

  if (!existsSync(uploadDest)) {
    mkdirSync(uploadDest, { recursive: true });
  }
  if (!existsSync('logs')) {
    mkdirSync('logs', { recursive: true });
  }

  app.setGlobalPrefix(apiPrefix);
  app.enableCors({
    origin: corsOrigins,
    credentials: true,
  });
  app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
  app.use(compression());
  app.use(cookieParser());
  app.useStaticAssets(join(process.cwd(), uploadDest), { prefix: '/uploads' });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  const swaggerConfig = new DocumentBuilder()
    .setTitle(`${appName} API`)
    .setDescription('Production-ready eCommerce backend API for NovaCart')
    .setVersion('1.0')
    .addBearerAuth()
    .addTag('Auth')
    .addTag('Users')
    .addTag('Roles')
    .addTag('Permissions')
    .addTag('Products')
    .addTag('Categories')
    .addTag('Brands')
    .addTag('Product Variants')
    .addTag('Reviews')
    .addTag('Wishlist')
    .addTag('Cart')
    .addTag('Orders')
    .addTag('Coupons')
    .addTag('Addresses')
    .addTag('Notifications')
    .addTag('Dashboard')
    .addTag('Hero Banners')
    .addTag('Collections')
    .addTag('Activity Logs')
    .addTag('Upload')
    .addTag('Nova AI')
    .addTag('Health')
    .build();

  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('docs', app, document, {
    swaggerOptions: { persistAuthorization: true },
  });

  await app.listen(port);
  Logger.log(`${appName} running on http://localhost:${port}/${apiPrefix}`, 'Bootstrap');
  Logger.log(`Swagger docs at http://localhost:${port}/docs`, 'Bootstrap');
}

bootstrap();
