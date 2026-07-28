import { plainToInstance } from 'class-transformer';
import {
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  MinLength,
  validateSync,
} from 'class-validator';

enum Environment {
  Development = 'development',
  Production = 'production',
  Test = 'test',
}

export class EnvironmentVariables {
  @IsEnum(Environment)
  NODE_ENV: Environment = Environment.Development;

  @IsNumber()
  PORT: number = 3000;

  @IsString()
  APP_NAME: string = 'NovaCart';

  @IsString()
  APP_URL: string;

  @IsString()
  API_PREFIX: string = 'api/v1';

  @IsString()
  DATABASE_URL: string;

  @IsString()
  @MinLength(32)
  JWT_SECRET: string;

  @IsString()
  JWT_EXPIRES_IN: string = '15m';

  @IsString()
  @MinLength(32)
  JWT_REFRESH_SECRET: string;

  @IsString()
  JWT_REFRESH_EXPIRES_IN: string = '7d';

  @IsNumber()
  THROTTLE_TTL: number = 60;

  @IsNumber()
  THROTTLE_LIMIT: number = 100;

  @IsString()
  UPLOAD_DEST: string = './uploads';

  @IsNumber()
  MAX_FILE_SIZE: number = 5242880;

  @IsString()
  ALLOWED_IMAGE_TYPES: string;

  @IsString()
  CORS_ORIGINS: string;

  @IsString()
  LOG_LEVEL: string = 'info';

  @IsOptional()
  @IsString()
  SEED_ADMIN_EMAIL?: string;

  @IsOptional()
  @IsString()
  SEED_ADMIN_PASSWORD?: string;

  @IsOptional()
  @IsString()
  UNSPLASH_ACCESS_KEY?: string;

  @IsOptional()
  @IsString()
  PEXELS_API_KEY?: string;

  @IsOptional()
  @IsString()
  OPENAI_API_KEY?: string;

  @IsOptional()
  @IsString()
  OPENAI_MODEL?: string;

  @IsOptional()
  @IsString()
  AI_ENABLED?: string;

  @IsOptional()
  @IsString()
  FRONTEND_URL?: string;

  @IsOptional()
  @IsString()
  RESEND_API_KEY?: string;

  @IsOptional()
  @IsString()
  MAIL_FROM?: string;

  @IsOptional()
  @IsString()
  MAIL_SUPPORT_EMAIL?: string;
}

export function validate(config: Record<string, unknown>) {
  const validated = plainToInstance(EnvironmentVariables, config, {
    enableImplicitConversion: true,
  });

  const errors = validateSync(validated, {
    skipMissingProperties: false,
  });

  if (errors.length > 0) {
    throw new Error(errors.toString());
  }

  return validated;
}
