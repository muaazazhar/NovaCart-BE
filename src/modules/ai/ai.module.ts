import { Module } from '@nestjs/common';
import { BrandsModule } from '../brands/brands.module';
import { CartModule } from '../cart/cart.module';
import { CategoriesModule } from '../categories/categories.module';
import { ProductsModule } from '../products/products.module';
import { AiController } from './ai.controller';
import { AiService } from './ai.service';
import { ProductContextService } from './product-context.service';
import { PromptBuilderService } from './prompt-builder.service';
import { OpenAiProvider } from './providers/openai.provider';
import { LLM_PROVIDER } from './interfaces/ai.interfaces';

@Module({
  imports: [ProductsModule, CategoriesModule, BrandsModule, CartModule],
  controllers: [AiController],
  providers: [
    AiService,
    PromptBuilderService,
    ProductContextService,
    OpenAiProvider,
    {
      provide: LLM_PROVIDER,
      useExisting: OpenAiProvider,
    },
  ],
  exports: [AiService, PromptBuilderService, ProductContextService, OpenAiProvider],
})
export class AiModule {}
