import { Injectable, Logger } from '@nestjs/common';
import type {
  ChatMessage,
  ProductContextItem,
  StructuredSearchFilters,
} from './interfaces/ai.interfaces';
import { MAX_CONVERSATION_MESSAGES } from './interfaces/ai.interfaces';
import type { ConversationMessageDto } from './dto/ai.dto';

@Injectable()
export class PromptBuilderService {
  private readonly logger = new Logger(PromptBuilderService.name);

  limitHistory(history?: ConversationMessageDto[]): ChatMessage[] {
    if (!history?.length) return [];
    return history
      .slice(-MAX_CONVERSATION_MESSAGES)
      .map((m) => ({ role: m.role, content: m.content }));
  }

  buildSystemPrompt(capability: string): string {
    return [
      'You are Nova AI, the shopping assistant for NovaCart.',
      'You only use the product context provided in the user message.',
      'Never invent product details, prices, stock, or specifications.',
      'If information is missing, say clearly that it is not available in the catalog data.',
      'Be concise, helpful, and product-focused.',
      `Current task: ${capability}.`,
    ].join(' ');
  }

  buildFilterExtractionPrompt(query: string): ChatMessage[] {
    return [
      {
        role: 'system',
        content: [
          'Extract structured eCommerce search filters from the shopper request.',
          'Return ONLY valid JSON with this shape:',
          '{"search":string|null,"category":string|null,"brand":string|null,"minPrice":number|null,"maxPrice":number|null,"wireless":boolean|null,"tags":string[]|null,"isFeatured":boolean|null}',
          'Use null for unknown fields. Do not add extra keys.',
          'category should be a short catalog category name when implied (e.g. Headphones, Electronics, Fashion).',
          'Put distinctive keywords into search and tags when useful.',
        ].join(' '),
      },
      {
        role: 'user',
        content: query,
      },
    ];
  }

  buildSearchResponsePrompt(
    query: string,
    filters: StructuredSearchFilters,
    products: ProductContextItem[],
    history?: ConversationMessageDto[],
  ): ChatMessage[] {
    return [
      { role: 'system', content: this.buildSystemPrompt('natural language product search') },
      ...this.limitHistory(history),
      {
        role: 'user',
        content: [
          `Shopper request: ${query}`,
          `Parsed filters: ${JSON.stringify(filters)}`,
          `Matching products (${products.length}):`,
          this.stringifyProducts(products),
          'Summarize the best matches in plain language. Mention names, prices, and why they fit. Do not invent products.',
        ].join('\n\n'),
      },
    ];
  }

  buildRecommendationPrompt(
    query: string,
    products: ProductContextItem[],
    limit: number,
    history?: ConversationMessageDto[],
  ): ChatMessage[] {
    return [
      {
        role: 'system',
        content: [
          this.buildSystemPrompt('product recommendations'),
          'Return ONLY valid JSON:',
          '{"recommendations":[{"productId":string,"reason":string,"pros":string[],"cons":string[],"confidence":number}],"summary":string}',
          `Pick at most ${limit} products from the provided list. confidence is 0-1.`,
          'pros/cons must be grounded in provided data only.',
        ].join(' '),
      },
      ...this.limitHistory(history),
      {
        role: 'user',
        content: [
          `Shopper need: ${query}`,
          `Candidate products:`,
          this.stringifyProducts(products),
        ].join('\n\n'),
      },
    ];
  }

  buildComparisonPrompt(
    products: ProductContextItem[],
    focus?: string,
    history?: ConversationMessageDto[],
  ): ChatMessage[] {
    return [
      {
        role: 'system',
        content: [
          this.buildSystemPrompt('product comparison'),
          'Produce a markdown comparison with:',
          '1) A markdown table of key attributes (name, price, rating, brand, stock, notable specs)',
          '2) Short verdict for who each product suits best',
          '3) A final recommendation with caveats',
          'Only use provided product data.',
        ].join(' '),
      },
      ...this.limitHistory(history),
      {
        role: 'user',
        content: [
          focus ? `Comparison focus: ${focus}` : 'Compare these products fairly.',
          this.stringifyProducts(products),
        ].join('\n\n'),
      },
    ];
  }

  buildProductQaPrompt(
    question: string,
    product: ProductContextItem,
    history?: ConversationMessageDto[],
  ): ChatMessage[] {
    return [
      {
        role: 'system',
        content: [
          this.buildSystemPrompt('product Q&A'),
          'Answer using only the product payload.',
          'If the answer cannot be determined from specifications/description, say: "That detail is not listed in the product data."',
          'Never guess.',
        ].join(' '),
      },
      ...this.limitHistory(history),
      {
        role: 'user',
        content: [
          `Question: ${question}`,
          `Product data:`,
          this.stringifyProducts([product]),
        ].join('\n\n'),
      },
    ];
  }

  buildCartRecommendationPrompt(
    cartItems: ProductContextItem[],
    candidates: ProductContextItem[],
    preference?: string,
    history?: ConversationMessageDto[],
  ): ChatMessage[] {
    return [
      {
        role: 'system',
        content: [
          this.buildSystemPrompt('cart complementary recommendations'),
          'Recommend complementary products that are NOT already in the cart.',
          'Return ONLY valid JSON:',
          '{"recommendations":[{"productId":string,"reason":string,"pros":string[],"cons":string[],"confidence":number}],"summary":string}',
          'Explain complementarity clearly. Use only provided catalog data.',
        ].join(' '),
      },
      ...this.limitHistory(history),
      {
        role: 'user',
        content: [
          preference ? `Shopper preference: ${preference}` : 'Suggest useful add-ons.',
          `Current cart products:`,
          this.stringifyProducts(cartItems),
          `Candidate complementary products:`,
          this.stringifyProducts(candidates),
        ].join('\n\n'),
      },
    ];
  }

  buildExplainSpecsPrompt(
    product: ProductContextItem,
    focus?: string,
    history?: ConversationMessageDto[],
  ): ChatMessage[] {
    return [
      {
        role: 'system',
        content: [
          this.buildSystemPrompt('explain specifications'),
          'Rewrite technical specifications into beginner-friendly language.',
          'Use short paragraphs or bullets. Avoid jargon, or define it when needed.',
          'If a requested focus area is missing from the data, say so.',
        ].join(' '),
      },
      ...this.limitHistory(history),
      {
        role: 'user',
        content: [
          focus ? `Focus: ${focus}` : 'Explain all listed specifications simply.',
          this.stringifyProducts([product]),
        ].join('\n\n'),
      },
    ];
  }

  buildGeneralChatPrompt(
    message: string,
    products: ProductContextItem[],
    history?: ConversationMessageDto[],
  ): ChatMessage[] {
    return [
      {
        role: 'system',
        content: [
          this.buildSystemPrompt('general shopping assistance'),
          'Use the catalog snapshot when recommending products.',
          'If the request needs filters you cannot satisfy from the snapshot, say what is missing.',
        ].join(' '),
      },
      ...this.limitHistory(history),
      {
        role: 'user',
        content: [
          `Message: ${message}`,
          `Catalog snapshot:`,
          this.stringifyProducts(products),
        ].join('\n\n'),
      },
    ];
  }

  stringifyProducts(products: ProductContextItem[]): string {
    this.logger.debug(`Serializing ${products.length} products for LLM context`);
    return JSON.stringify(
      products.map((p) => ({
        id: p.id,
        name: p.name,
        slug: p.slug,
        sku: p.sku,
        price: p.price,
        compareAtPrice: p.compareAtPrice,
        stock: p.stock,
        status: p.status,
        averageRating: p.averageRating,
        reviewCount: p.reviewCount,
        tags: p.tags,
        shortDescription: p.shortDescription,
        description: p.description?.slice(0, 500),
        specifications: p.specifications,
        category: p.category?.name,
        brand: p.brand?.name,
        variants: p.variants?.map((v: NonNullable<ProductContextItem['variants']>[number]) => ({
          id: v.id,
          name: v.name,
          price: v.price,
          stock: v.stock,
          attributes: v.attributes,
        })),
      })),
      null,
      2,
    );
  }

  parseJson<T>(raw: string, fallback: T): T {
    try {
      const cleaned = raw
        .replace(/^```json\s*/i, '')
        .replace(/^```\s*/i, '')
        .replace(/\s*```$/i, '')
        .trim();
      return JSON.parse(cleaned) as T;
    } catch (error) {
      this.logger.warn(`Failed to parse LLM JSON: ${(error as Error).message}`);
      return fallback;
    }
  }
}
