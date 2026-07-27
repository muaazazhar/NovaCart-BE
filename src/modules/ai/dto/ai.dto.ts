import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';

export class ConversationMessageDto {
  @ApiProperty({ enum: ['user', 'assistant'] })
  @IsIn(['user', 'assistant'])
  role: 'user' | 'assistant';

  @ApiProperty()
  @IsString()
  @MinLength(1)
  @MaxLength(4000)
  content: string;
}

export class AiSearchDto {
  @ApiProperty({
    example: 'I need wireless headphones under $150',
    description: 'Natural language shopping request',
  })
  @IsString()
  @MinLength(3)
  @MaxLength(1000)
  query: string;

  @ApiPropertyOptional({ default: 12, minimum: 1, maximum: 30 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(30)
  limit?: number = 12;

  @ApiPropertyOptional({ type: [ConversationMessageDto], description: 'Latest conversation turns (max 10 used)' })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(20)
  @ValidateNested({ each: true })
  @Type(() => ConversationMessageDto)
  history?: ConversationMessageDto[];

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  stream?: boolean = false;
}

export class AiRecommendDto {
  @ApiProperty({ example: 'Looking for a gift for a runner who likes tech gadgets' })
  @IsString()
  @MinLength(3)
  @MaxLength(1000)
  query: string;

  @ApiPropertyOptional({ default: 5, minimum: 1, maximum: 10 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(10)
  limit?: number = 5;

  @ApiPropertyOptional({ type: [ConversationMessageDto] })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(20)
  @ValidateNested({ each: true })
  @Type(() => ConversationMessageDto)
  history?: ConversationMessageDto[];

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  stream?: boolean = false;
}

export class AiCompareDto {
  @ApiProperty({
    type: [String],
    example: ['product-id-1', 'product-id-2'],
    description: '2–4 product IDs to compare',
  })
  @IsArray()
  @ArrayMinSize(2)
  @ArrayMaxSize(4)
  @IsString({ each: true })
  productIds: string[];

  @ApiPropertyOptional({ example: 'Focus on battery life and value' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  focus?: string;

  @ApiPropertyOptional({ type: [ConversationMessageDto] })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(20)
  @ValidateNested({ each: true })
  @Type(() => ConversationMessageDto)
  history?: ConversationMessageDto[];

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  stream?: boolean = false;
}

export class AiProductQaDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  productId: string;

  @ApiProperty({ example: 'Is this waterproof?' })
  @IsString()
  @MinLength(3)
  @MaxLength(1000)
  question: string;

  @ApiPropertyOptional({ type: [ConversationMessageDto] })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(20)
  @ValidateNested({ each: true })
  @Type(() => ConversationMessageDto)
  history?: ConversationMessageDto[];

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  stream?: boolean = false;
}

export class AiCartRecommendDto {
  @ApiPropertyOptional({
    example: 'Suggest accessories that complete my setup',
  })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  preference?: string;

  @ApiPropertyOptional({ default: 5, minimum: 1, maximum: 10 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(10)
  limit?: number = 5;

  @ApiPropertyOptional({ type: [ConversationMessageDto] })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(20)
  @ValidateNested({ each: true })
  @Type(() => ConversationMessageDto)
  history?: ConversationMessageDto[];

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  stream?: boolean = false;
}

export class AiExplainSpecsDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  productId: string;

  @ApiPropertyOptional({
    example: 'Explain battery capacity and connectivity in simple terms',
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  focus?: string;

  @ApiPropertyOptional({ type: [ConversationMessageDto] })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(20)
  @ValidateNested({ each: true })
  @Type(() => ConversationMessageDto)
  history?: ConversationMessageDto[];

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  stream?: boolean = false;
}

export class AiChatDto {
  @ApiProperty({ example: 'Help me find a laptop for college under $800' })
  @IsString()
  @MinLength(1)
  @MaxLength(2000)
  message: string;

  @ApiPropertyOptional({ type: [ConversationMessageDto] })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(20)
  @ValidateNested({ each: true })
  @Type(() => ConversationMessageDto)
  history?: ConversationMessageDto[];

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  stream?: boolean = false;
}
