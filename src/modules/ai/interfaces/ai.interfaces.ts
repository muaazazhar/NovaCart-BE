export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface LlmCompletionOptions {
  messages: ChatMessage[];
  temperature?: number;
  maxTokens?: number;
  jsonMode?: boolean;
}

export interface LlmProvider {
  complete(options: LlmCompletionOptions): Promise<string>;
  stream(options: LlmCompletionOptions): AsyncGenerator<string, void, unknown>;
}

export const LLM_PROVIDER = Symbol('LLM_PROVIDER');

export interface ProductContextItem {
  id: string;
  name: string;
  slug: string;
  sku: string;
  description: string;
  shortDescription?: string | null;
  price: number;
  compareAtPrice?: number | null;
  stock: number;
  status: string;
  averageRating: number;
  reviewCount: number;
  tags: string[];
  specifications: Record<string, unknown> | null;
  category?: { id: string; name: string; slug: string } | null;
  brand?: { id: string; name: string; slug: string } | null;
  primaryImage?: string | null;
  variants?: Array<{
    id: string;
    name: string;
    sku: string;
    price: number;
    stock: number;
    attributes: Record<string, unknown>;
  }>;
}

export interface StructuredSearchFilters {
  search?: string;
  category?: string;
  categoryId?: string;
  brand?: string;
  brandId?: string;
  minPrice?: number;
  maxPrice?: number;
  wireless?: boolean;
  tags?: string[];
  isFeatured?: boolean;
  limit?: number;
}

export interface RecommendationResult {
  productId: string;
  reason: string;
  pros: string[];
  cons: string[];
  confidence: number;
}

export const MAX_CONVERSATION_MESSAGES = 10;
