import { Body, Controller, Post, Res } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import type { Response } from 'express';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Public } from '../../common/decorators/public.decorator';
import type { AuthenticatedUser } from '../../common/interfaces/jwt-payload.interface';
import { AiService } from './ai.service';
import {
  AiCartRecommendDto,
  AiChatDto,
  AiCompareDto,
  AiExplainSpecsDto,
  AiProductQaDto,
  AiRecommendDto,
  AiSearchDto,
} from './dto/ai.dto';

@ApiTags('Nova AI')
@Controller('ai')
@Throttle({ default: { limit: 20, ttl: 60000 } })
export class AiController {
  constructor(private readonly aiService: AiService) {}

  @Public()
  @Post('search')
  @ApiOperation({
    summary: 'Natural language product search',
    description:
      'Converts a shopper request into structured filters, queries catalog services, and returns matching products with an AI summary.',
  })
  async search(@Body() dto: AiSearchDto, @Res({ passthrough: true }) res: Response) {
    if (dto.stream) {
      return this.writeStream(res, this.aiService.searchStream(dto));
    }
    return this.aiService.search(dto);
  }

  @Public()
  @Post('recommend')
  @ApiOperation({
    summary: 'Product recommendations',
    description: 'Returns recommendations with reason, pros, cons, and confidence score.',
  })
  async recommend(
    @Body() dto: AiRecommendDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    if (dto.stream) {
      return this.writeStream(res, this.aiService.recommendStream(dto));
    }
    return this.aiService.recommend(dto);
  }

  @Public()
  @Post('compare')
  @ApiOperation({
    summary: 'Compare products',
    description: 'Compares 2–4 products and returns a markdown table comparison.',
  })
  async compare(@Body() dto: AiCompareDto, @Res({ passthrough: true }) res: Response) {
    if (dto.stream) {
      return this.writeStream(res, this.aiService.compareStream(dto));
    }
    return this.aiService.compare(dto);
  }

  @Public()
  @Post('product-qa')
  @ApiOperation({
    summary: 'Product Q&A',
    description:
      'Answers questions using product specifications only. Never invents missing details.',
  })
  async productQa(
    @Body() dto: AiProductQaDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    if (dto.stream) {
      return this.writeStream(res, this.aiService.productQaStream(dto));
    }
    return this.aiService.productQa(dto);
  }

  @Post('cart-recommend')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Cart complementary recommendations',
    description: 'Recommends complementary products based on the authenticated user cart.',
  })
  async cartRecommend(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: AiCartRecommendDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    if (dto.stream) {
      return this.writeStream(res, this.aiService.cartRecommendStream(user.id, dto));
    }
    return this.aiService.cartRecommend(user.id, dto);
  }

  @Public()
  @Post('explain-specs')
  @ApiOperation({
    summary: 'Explain specifications',
    description: 'Rewrites technical product specifications into beginner-friendly language.',
  })
  async explainSpecs(
    @Body() dto: AiExplainSpecsDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    if (dto.stream) {
      return this.writeStream(res, this.aiService.explainSpecsStream(dto));
    }
    return this.aiService.explainSpecs(dto);
  }

  @Public()
  @Post('chat')
  @ApiOperation({
    summary: 'General Nova AI shopping chat',
    description: 'Conversational shopping help using catalog context. History limited to latest 10 messages.',
  })
  async chat(@Body() dto: AiChatDto, @Res({ passthrough: true }) res: Response) {
    if (dto.stream) {
      return this.writeStream(res, this.aiService.chatStream(dto));
    }
    return this.aiService.chat(dto);
  }

  private async writeStream(
    res: Response,
    generator: AsyncGenerator<string>,
  ): Promise<void> {
    res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders?.();

    try {
      for await (const chunk of generator) {
        res.write(`data: ${JSON.stringify({ content: chunk })}\n\n`);
      }
      res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
    } catch (error) {
      res.write(
        `data: ${JSON.stringify({ error: (error as Error).message })}\n\n`,
      );
    } finally {
      res.end();
    }
  }
}
