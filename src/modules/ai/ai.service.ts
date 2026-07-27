import {
  BadRequestException,
  Injectable,
  Logger,
} from '@nestjs/common';
import type {
  ProductContextItem,
  RecommendationResult,
  StructuredSearchFilters,
} from './interfaces/ai.interfaces';
import { PromptBuilderService } from './prompt-builder.service';
import { ProductContextService } from './product-context.service';
import { OpenAiProvider } from './providers/openai.provider';
import type {
  AiCartRecommendDto,
  AiChatDto,
  AiCompareDto,
  AiExplainSpecsDto,
  AiProductQaDto,
  AiRecommendDto,
  AiSearchDto,
} from './dto/ai.dto';

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);

  constructor(
    private readonly llm: OpenAiProvider,
    private readonly prompts: PromptBuilderService,
    private readonly productContext: ProductContextService,
  ) {}

  async search(dto: AiSearchDto) {
    this.logger.log(`Nova AI search: ${dto.query}`);
    const filters = await this.extractFilters(dto.query);
    filters.limit = dto.limit || 12;

    const products = await this.productContext.searchByFilters(filters);
    const messages = this.prompts.buildSearchResponsePrompt(
      dto.query,
      filters,
      products,
      dto.history,
    );

    const answer = await this.completeOrFallback(messages, () =>
      this.fallbackSearchSummary(dto.query, filters, products),
    );

    return {
      message: 'Nova AI search complete',
      data: {
        query: dto.query,
        filters,
        products,
        answer,
        provider: this.providerMeta(),
      },
    };
  }

  async *searchStream(dto: AiSearchDto): AsyncGenerator<string> {
    const filters = await this.extractFilters(dto.query);
    filters.limit = dto.limit || 12;
    const products = await this.productContext.searchByFilters(filters);
    const messages = this.prompts.buildSearchResponsePrompt(
      dto.query,
      filters,
      products,
      dto.history,
    );
    yield* this.streamOrFallback(messages, () =>
      this.fallbackSearchSummary(dto.query, filters, products),
    );
  }

  async recommend(dto: AiRecommendDto) {
    this.logger.log(`Nova AI recommend: ${dto.query}`);
    const candidates = await this.productContext.searchByText(dto.query, 20);
    const pool = candidates.length
      ? candidates
      : await this.productContext.getFeatured(20);

    const messages = this.prompts.buildRecommendationPrompt(
      dto.query,
      pool,
      dto.limit || 5,
      dto.history,
    );

    const raw = await this.completeOrFallback(
      messages,
      () => this.fallbackRecommendationsJson(pool, dto.limit || 5, dto.query),
      true,
    );

    const parsed = this.prompts.parseJson<{
      recommendations: RecommendationResult[];
      summary: string;
    }>(raw, {
      recommendations: this.localRecommendations(pool, dto.limit || 5, dto.query),
      summary: 'Recommendations based on catalog ranking.',
    });

    const enriched = this.enrichRecommendations(parsed.recommendations, pool);

    return {
      message: 'Nova AI recommendations ready',
      data: {
        query: dto.query,
        summary: parsed.summary,
        recommendations: enriched,
        provider: this.providerMeta(),
      },
    };
  }

  async *recommendStream(dto: AiRecommendDto): AsyncGenerator<string> {
    const candidates = await this.productContext.searchByText(dto.query, 20);
    const pool = candidates.length
      ? candidates
      : await this.productContext.getFeatured(20);
    const messages = this.prompts.buildRecommendationPrompt(
      dto.query,
      pool,
      dto.limit || 5,
      dto.history,
    );
    yield* this.streamOrFallback(messages, () =>
      this.fallbackRecommendationsJson(pool, dto.limit || 5, dto.query),
    );
  }

  async compare(dto: AiCompareDto) {
    this.logger.log(`Nova AI compare: ${dto.productIds.join(',')}`);
    const products = await this.productContext.getByIds(dto.productIds);
    if (products.length < 2) {
      throw new BadRequestException('At least two valid products are required for comparison');
    }

    const messages = this.prompts.buildComparisonPrompt(
      products,
      dto.focus,
      dto.history,
    );
    const markdown = await this.completeOrFallback(messages, () =>
      this.fallbackComparisonMarkdown(products),
    );

    return {
      message: 'Nova AI comparison ready',
      data: {
        products,
        markdown,
        provider: this.providerMeta(),
      },
    };
  }

  async *compareStream(dto: AiCompareDto): AsyncGenerator<string> {
    const products = await this.productContext.getByIds(dto.productIds);
    if (products.length < 2) {
      throw new BadRequestException('At least two valid products are required for comparison');
    }
    const messages = this.prompts.buildComparisonPrompt(products, dto.focus, dto.history);
    yield* this.streamOrFallback(messages, () => this.fallbackComparisonMarkdown(products));
  }

  async productQa(dto: AiProductQaDto) {
    this.logger.log(`Nova AI Q&A for product ${dto.productId}`);
    const product = await this.productContext.getByIdOrThrow(dto.productId);
    const messages = this.prompts.buildProductQaPrompt(
      dto.question,
      product,
      dto.history,
    );
    const answer = await this.completeOrFallback(messages, () =>
      this.fallbackProductQa(dto.question, product),
    );

    return {
      message: 'Nova AI product answer ready',
      data: {
        productId: product.id,
        question: dto.question,
        answer,
        product,
        provider: this.providerMeta(),
      },
    };
  }

  async *productQaStream(dto: AiProductQaDto): AsyncGenerator<string> {
    const product = await this.productContext.getByIdOrThrow(dto.productId);
    const messages = this.prompts.buildProductQaPrompt(dto.question, product, dto.history);
    yield* this.streamOrFallback(messages, () => this.fallbackProductQa(dto.question, product));
  }

  async cartRecommend(userId: string, dto: AiCartRecommendDto) {
    this.logger.log(`Nova AI cart recommendations for user ${userId}`);
    const cartProducts = await this.productContext.getCartProducts(userId);
    if (!cartProducts.length) {
      throw new BadRequestException('Your cart is empty. Add products before requesting cart recommendations.');
    }

    const candidates = await this.productContext.getComplementaryCandidates(
      cartProducts,
      20,
    );
    const messages = this.prompts.buildCartRecommendationPrompt(
      cartProducts,
      candidates,
      dto.preference,
      dto.history,
    );

    const raw = await this.completeOrFallback(
      messages,
      () =>
        this.fallbackRecommendationsJson(
          candidates,
          dto.limit || 5,
          dto.preference || 'complementary accessories',
        ),
      true,
    );

    const parsed = this.prompts.parseJson<{
      recommendations: RecommendationResult[];
      summary: string;
    }>(raw, {
      recommendations: this.localRecommendations(
        candidates,
        dto.limit || 5,
        dto.preference || 'complementary',
      ),
      summary: 'Complementary picks based on your cart categories.',
    });

    return {
      message: 'Nova AI cart recommendations ready',
      data: {
        cartProductIds: cartProducts.map((p) => p.id),
        summary: parsed.summary,
        recommendations: this.enrichRecommendations(parsed.recommendations, candidates),
        provider: this.providerMeta(),
      },
    };
  }

  async *cartRecommendStream(
    userId: string,
    dto: AiCartRecommendDto,
  ): AsyncGenerator<string> {
    const cartProducts = await this.productContext.getCartProducts(userId);
    if (!cartProducts.length) {
      throw new BadRequestException('Your cart is empty. Add products before requesting cart recommendations.');
    }
    const candidates = await this.productContext.getComplementaryCandidates(cartProducts, 20);
    const messages = this.prompts.buildCartRecommendationPrompt(
      cartProducts,
      candidates,
      dto.preference,
      dto.history,
    );
    yield* this.streamOrFallback(messages, () =>
      this.fallbackRecommendationsJson(
        candidates,
        dto.limit || 5,
        dto.preference || 'complementary accessories',
      ),
    );
  }

  async explainSpecs(dto: AiExplainSpecsDto) {
    this.logger.log(`Nova AI explain specs for ${dto.productId}`);
    const product = await this.productContext.getByIdOrThrow(dto.productId);
    const messages = this.prompts.buildExplainSpecsPrompt(
      product,
      dto.focus,
      dto.history,
    );
    const explanation = await this.completeOrFallback(messages, () =>
      this.fallbackExplainSpecs(product, dto.focus),
    );

    return {
      message: 'Nova AI specification explanation ready',
      data: {
        productId: product.id,
        explanation,
        specifications: product.specifications,
        provider: this.providerMeta(),
      },
    };
  }

  async *explainSpecsStream(dto: AiExplainSpecsDto): AsyncGenerator<string> {
    const product = await this.productContext.getByIdOrThrow(dto.productId);
    const messages = this.prompts.buildExplainSpecsPrompt(product, dto.focus, dto.history);
    yield* this.streamOrFallback(messages, () => this.fallbackExplainSpecs(product, dto.focus));
  }

  async chat(dto: AiChatDto) {
    this.logger.log(`Nova AI chat: ${dto.message.slice(0, 80)}`);
    const products = await this.productContext.searchByText(dto.message, 10);
    const pool = products.length ? products : await this.productContext.getFeatured(10);
    const messages = this.prompts.buildGeneralChatPrompt(dto.message, pool, dto.history);
    const answer = await this.completeOrFallback(messages, () =>
      this.fallbackSearchSummary(dto.message, { search: dto.message }, pool),
    );

    return {
      message: 'Nova AI reply ready',
      data: {
        answer,
        products: pool,
        provider: this.providerMeta(),
      },
    };
  }

  async *chatStream(dto: AiChatDto): AsyncGenerator<string> {
    const products = await this.productContext.searchByText(dto.message, 10);
    const pool = products.length ? products : await this.productContext.getFeatured(10);
    const messages = this.prompts.buildGeneralChatPrompt(dto.message, pool, dto.history);
    yield* this.streamOrFallback(messages, () =>
      this.fallbackSearchSummary(dto.message, { search: dto.message }, pool),
    );
  }

  private async extractFilters(query: string): Promise<StructuredSearchFilters> {
    if (!this.llm.isConfigured()) {
      return this.heuristicFilters(query);
    }

    try {
      const raw = await this.llm.complete({
        messages: this.prompts.buildFilterExtractionPrompt(query),
        temperature: 0,
        maxTokens: 300,
        jsonMode: true,
      });
      const parsed = this.prompts.parseJson<Record<string, unknown>>(raw, {});
      return this.normalizeFilters(parsed, query);
    } catch (error) {
      this.logger.warn(`Filter extraction failed, using heuristics: ${(error as Error).message}`);
      return this.heuristicFilters(query);
    }
  }

  private normalizeFilters(
    parsed: Record<string, unknown>,
    query: string,
  ): StructuredSearchFilters {
    const num = (v: unknown) =>
      typeof v === 'number' && !Number.isNaN(v) ? v : undefined;
    const str = (v: unknown) =>
      typeof v === 'string' && v.trim() ? v.trim() : undefined;
    const bool = (v: unknown) => (typeof v === 'boolean' ? v : undefined);
    const tags = Array.isArray(parsed.tags)
      ? parsed.tags.filter((t): t is string => typeof t === 'string')
      : undefined;

    const filters: StructuredSearchFilters = {
      search: str(parsed.search) || undefined,
      category: str(parsed.category),
      brand: str(parsed.brand),
      minPrice: num(parsed.minPrice),
      maxPrice: num(parsed.maxPrice),
      wireless: bool(parsed.wireless),
      tags,
      isFeatured: bool(parsed.isFeatured),
    };

    if (!filters.search && !filters.category && !filters.brand) {
      return this.heuristicFilters(query);
    }
    return filters;
  }

  private heuristicFilters(query: string): StructuredSearchFilters {
    const lower = query.toLowerCase();
    const filters: StructuredSearchFilters = { search: query };

    const priceMatch = lower.match(/(?:under|below|less than|max(?:imum)?)\s*\$?\s*(\d+(?:\.\d+)?)/i);
    if (priceMatch) filters.maxPrice = Number(priceMatch[1]);

    const minMatch = lower.match(/(?:over|above|more than|min(?:imum)?)\s*\$?\s*(\d+(?:\.\d+)?)/i);
    if (minMatch) filters.minPrice = Number(minMatch[1]);

    if (/\bwireless\b|\bbluetooth\b/.test(lower)) filters.wireless = true;

    const categoryHints: Array<[RegExp, string]> = [
      [/\bheadphone|earbuds|earphones\b/, 'Electronics'],
      [/\blaptop|notebook\b/, 'Electronics'],
      [/\bshoe|sneaker|apparel|jacket|fashion\b/, 'Fashion'],
      [/\bbeauty|skincare|serum\b/, 'Beauty & Personal Care'],
      [/\bfitness|yoga|dumbbell|outdoors\b/, 'Sports & Outdoors'],
      [/\bhome|furniture|lamp|bedding\b/, 'Home & Living'],
      [/\bvitamin|supplement|wellness\b/, 'Health & Wellness'],
      [/\btoy|game|puzzle\b/, 'Toys & Games'],
      [/\bcar|automotive\b/, 'Automotive'],
      [/\bcoffee|gourmet|grocery\b/, 'Grocery & Gourmet'],
      [/\bbook|media|vinyl\b/, 'Books & Media'],
    ];
    for (const [re, category] of categoryHints) {
      if (re.test(lower)) {
        filters.category = category;
        break;
      }
    }

    return filters;
  }

  private async completeOrFallback(
    messages: Parameters<OpenAiProvider['complete']>[0]['messages'],
    fallback: () => string,
    jsonMode = false,
  ): Promise<string> {
    if (!this.llm.isConfigured()) {
      return fallback();
    }
    try {
      return await this.llm.complete({
        messages,
        temperature: jsonMode ? 0.2 : 0.4,
        jsonMode,
      });
    } catch (error) {
      this.logger.warn(`LLM complete failed, using fallback: ${(error as Error).message}`);
      return fallback();
    }
  }

  private async *streamOrFallback(
    messages: Parameters<OpenAiProvider['stream']>[0]['messages'],
    fallback: () => string,
  ): AsyncGenerator<string> {
    if (!this.llm.isConfigured()) {
      const text = fallback();
      for (const chunk of text.match(/.{1,40}/g) || [text]) {
        yield chunk;
      }
      return;
    }

    try {
      yield* this.llm.stream({ messages, temperature: 0.4 });
    } catch (error) {
      this.logger.warn(`LLM stream failed, using fallback: ${(error as Error).message}`);
      const text = fallback();
      yield text;
    }
  }

  private providerMeta() {
    return {
      name: 'openai',
      model: this.llm.getModel(),
      configured: this.llm.isConfigured(),
      mode: this.llm.isConfigured() ? 'llm' : 'fallback',
    };
  }

  private enrichRecommendations(
    recommendations: RecommendationResult[],
    pool: ProductContextItem[],
  ) {
    const map = new Map(pool.map((p) => [p.id, p]));
    return recommendations
      .filter((r) => map.has(r.productId))
      .map((r) => ({
        ...r,
        confidence: Math.max(0, Math.min(1, Number(r.confidence) || 0)),
        product: map.get(r.productId),
      }));
  }

  private localRecommendations(
    products: ProductContextItem[],
    limit: number,
    reasonHint: string,
  ): RecommendationResult[] {
    return products.slice(0, limit).map((p, index) => ({
      productId: p.id,
      reason: `Matches “${reasonHint}” based on catalog relevance and rating (${p.averageRating}).`,
      pros: [
        `Priced at $${p.price}`,
        p.brand?.name ? `From ${p.brand.name}` : 'Available in NovaCart catalog',
        p.stock > 0 ? 'In stock' : 'Limited availability',
      ],
      cons: [
        p.reviewCount < 5 ? 'Limited review volume in catalog' : 'Compare specs before buying',
        p.specifications ? 'Review full specifications for fit' : 'Detailed specs are limited in catalog data',
      ],
      confidence: Number((0.85 - index * 0.08).toFixed(2)),
    }));
  }

  private fallbackSearchSummary(
    query: string,
    filters: StructuredSearchFilters,
    products: ProductContextItem[],
  ): string {
    if (!products.length) {
      return `I could not find catalog matches for “${query}” with filters ${JSON.stringify(filters)}. Try broadening the request.`;
    }
    const lines = products.slice(0, 5).map(
      (p, i) =>
        `${i + 1}. **${p.name}** — $${p.price}` +
        (p.brand?.name ? ` by ${p.brand.name}` : '') +
        (p.averageRating ? ` (${p.averageRating}★)` : ''),
    );
    return [
      `Here are NovaCart matches for “${query}”:`,
      ...lines,
      '',
      `Applied filters: ${JSON.stringify(filters)}`,
    ].join('\n');
  }

  private fallbackRecommendationsJson(
    products: ProductContextItem[],
    limit: number,
    query: string,
  ): string {
    return JSON.stringify({
      summary: `Catalog-based recommendations for “${query}”.`,
      recommendations: this.localRecommendations(products, limit, query),
    });
  }

  private fallbackComparisonMarkdown(products: ProductContextItem[]): string {
    const headers = ['Attribute', ...products.map((p) => p.name)];
    const row = (label: string, values: string[]) =>
      `| ${label} | ${values.join(' | ')} |`;

    const lines = [
      `| ${headers.join(' | ')} |`,
      `| ${headers.map(() => '---').join(' | ')} |`,
      row('Price', products.map((p) => `$${p.price}`)),
      row('Brand', products.map((p) => p.brand?.name || 'N/A')),
      row('Rating', products.map((p) => `${p.averageRating} (${p.reviewCount} reviews)`)),
      row('Stock', products.map((p) => String(p.stock))),
      row('Category', products.map((p) => p.category?.name || 'N/A')),
      '',
      '### Verdict',
      ...products.map(
        (p) =>
          `- **${p.name}**: Good if you want ${p.shortDescription || p.category?.name || 'this catalog option'} at $${p.price}.`,
      ),
    ];
    return lines.join('\n');
  }

  private fallbackProductQa(question: string, product: ProductContextItem): string {
    const blob = JSON.stringify({
      name: product.name,
      description: product.description,
      specifications: product.specifications,
      tags: product.tags,
      price: product.price,
    }).toLowerCase();

    const keywords = question
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter((w) => w.length > 3);

    const hit = keywords.some((k) => blob.includes(k));
    if (!hit && !product.specifications) {
      return 'That detail is not listed in the product data.';
    }

    if (product.specifications) {
      const specs = Object.entries(product.specifications)
        .map(([k, v]) => `- ${k}: ${String(v)}`)
        .join('\n');
      return [
        `Based only on catalog data for **${product.name}**:`,
        specs || 'No specifications are listed.',
        '',
        hit
          ? 'If your question is not fully covered above, that specific detail is not listed in the product data.'
          : 'That detail is not listed in the product data.',
      ].join('\n');
    }

    return `From the product description of **${product.name}**: ${product.shortDescription || product.description.slice(0, 300)}. If you need a detail beyond this text, it is not listed in the product data.`;
  }

  private fallbackExplainSpecs(product: ProductContextItem, focus?: string): string {
    if (!product.specifications || !Object.keys(product.specifications).length) {
      return `No technical specifications are listed for **${product.name}** in the catalog data.`;
    }

    const entries = Object.entries(product.specifications);
    const filtered = focus
      ? entries.filter(([k, v]) =>
          `${k} ${String(v)}`.toLowerCase().includes(focus.toLowerCase()),
        )
      : entries;

    if (focus && !filtered.length) {
      return `The focus “${focus}” is not listed in the product data for **${product.name}**.`;
    }

    return [
      `Here is a simple explanation of the specs for **${product.name}**:`,
      ...filtered.map(
        ([key, value]) =>
          `- **${key}**: ${String(value)} — this describes a product attribute from the catalog.`,
      ),
    ].join('\n');
  }
}
