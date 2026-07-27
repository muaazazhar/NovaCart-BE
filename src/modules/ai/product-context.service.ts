import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ProductStatus } from '@prisma/client';
import { BrandsService } from '../brands/brands.service';
import { CartService } from '../cart/cart.service';
import { CategoriesService } from '../categories/categories.service';
import { ProductsService } from '../products/products.service';
import { QueryProductDto } from '../products/dto/query-product.dto';
import type {
  ProductContextItem,
  StructuredSearchFilters,
} from './interfaces/ai.interfaces';

@Injectable()
export class ProductContextService {
  private readonly logger = new Logger(ProductContextService.name);

  constructor(
    private readonly productsService: ProductsService,
    private readonly categoriesService: CategoriesService,
    private readonly brandsService: BrandsService,
    private readonly cartService: CartService,
  ) {}

  async resolveFilters(filters: StructuredSearchFilters): Promise<QueryProductDto> {
    const query: QueryProductDto = {
      page: 1,
      limit: filters.limit || 12,
      status: ProductStatus.ACTIVE,
      sortBy: 'averageRating',
      sortOrder: 'desc',
    };

    const searchParts: string[] = [];
    if (filters.search) searchParts.push(filters.search);
    if (filters.wireless) searchParts.push('wireless');
    if (filters.tags?.length) searchParts.push(...filters.tags);
    if (searchParts.length) {
      query.search = searchParts.join(' ');
    }

    if (filters.minPrice !== undefined && filters.minPrice !== null) {
      query.minPrice = filters.minPrice;
    }
    if (filters.maxPrice !== undefined && filters.maxPrice !== null) {
      query.maxPrice = filters.maxPrice;
    }
    if (filters.isFeatured !== undefined && filters.isFeatured !== null) {
      query.isFeatured = filters.isFeatured;
    }

    if (filters.categoryId) {
      query.categoryId = filters.categoryId;
    } else if (filters.category) {
      const categoryId = await this.findCategoryIdByName(filters.category);
      if (categoryId) query.categoryId = categoryId;
      else searchParts.push(filters.category);
    }

    if (filters.brandId) {
      query.brandId = filters.brandId;
    } else if (filters.brand) {
      const brandId = await this.findBrandIdByName(filters.brand);
      if (brandId) query.brandId = brandId;
      else searchParts.push(filters.brand);
    }

    if (!query.search && searchParts.length) {
      query.search = [...new Set(searchParts)].join(' ');
    }

    // Prefer tag filter when a single clear tag exists
    if (filters.tags?.length === 1 && !filters.wireless) {
      query.tag = filters.tags[0];
    } else if (filters.wireless) {
      query.tag = 'wireless';
    }

    this.logger.log(`Resolved product query: ${JSON.stringify(query)}`);
    return query;
  }

  async searchByFilters(filters: StructuredSearchFilters): Promise<ProductContextItem[]> {
    const query = await this.resolveFilters(filters);
    const result = await this.productsService.findAll(query);
    return result.data.map((p) => this.toContext(p));
  }

  async searchByText(search: string, limit = 12): Promise<ProductContextItem[]> {
    const result = await this.productsService.findAll({
      page: 1,
      limit,
      search,
      status: ProductStatus.ACTIVE,
      sortBy: 'averageRating',
      sortOrder: 'desc',
    });
    return result.data.map((p) => this.toContext(p));
  }

  async getFeatured(limit = 20): Promise<ProductContextItem[]> {
    const featured = await this.productsService.featured(limit);
    return (featured.data as unknown[]).map((p) => this.toContext(p));
  }

  async getByIds(ids: string[]): Promise<ProductContextItem[]> {
    const unique = [...new Set(ids.filter(Boolean))];
    const products: ProductContextItem[] = [];
    for (const id of unique) {
      try {
        const result = await this.productsService.findOne(id);
        products.push(this.toContext(result.data));
      } catch (error) {
        if (error instanceof NotFoundException) {
          this.logger.warn(`Product not found for AI context: ${id}`);
          continue;
        }
        throw error;
      }
    }
    return products;
  }

  async getByIdOrThrow(id: string): Promise<ProductContextItem> {
    const result = await this.productsService.findOne(id);
    return this.toContext(result.data);
  }

  async getCartProducts(userId: string): Promise<ProductContextItem[]> {
    const cart = await this.cartService.getCart(userId);
    const items = (cart.data as { items?: Array<{ product: unknown }> }).items || [];
    return items.map((item) => this.toContext(item.product));
  }

  async getComplementaryCandidates(
    cartProducts: ProductContextItem[],
    limit = 20,
  ): Promise<ProductContextItem[]> {
    const cartIds = new Set(cartProducts.map((p) => p.id));
    const categoryIds = [
      ...new Set(cartProducts.map((p) => p.category?.id).filter(Boolean) as string[]),
    ];

    const pooled: ProductContextItem[] = [];

    for (const categoryId of categoryIds.slice(0, 3)) {
      const result = await this.productsService.findAll({
        page: 1,
        limit: 10,
        categoryId,
        status: ProductStatus.ACTIVE,
        sortBy: 'soldCount',
        sortOrder: 'desc',
      });
      pooled.push(...result.data.map((p) => this.toContext(p)));
    }

    if (pooled.length < limit) {
      const featured = await this.getFeatured(limit);
      pooled.push(...featured);
    }

    const seen = new Set<string>();
    return pooled
      .filter((p) => {
        if (cartIds.has(p.id) || seen.has(p.id)) return false;
        seen.add(p.id);
        return true;
      })
      .slice(0, limit);
  }

  private async findCategoryIdByName(name: string): Promise<string | undefined> {
    const result = await this.categoriesService.findAll({
      page: 1,
      limit: 20,
      search: name,
    });
    const exact = result.data.find(
      (c) => c.name.toLowerCase() === name.toLowerCase(),
    );
    if (exact) return exact.id;

    const partial = result.data.find((c) =>
      c.name.toLowerCase().includes(name.toLowerCase()) ||
      name.toLowerCase().includes(c.name.toLowerCase()),
    );
    return partial?.id;
  }

  private async findBrandIdByName(name: string): Promise<string | undefined> {
    const result = await this.brandsService.findAll({
      page: 1,
      limit: 20,
      search: name,
    });
    const exact = result.data.find(
      (b) => b.name.toLowerCase() === name.toLowerCase(),
    );
    if (exact) return exact.id;
    const partial = result.data.find((b) =>
      b.name.toLowerCase().includes(name.toLowerCase()),
    );
    return partial?.id;
  }

  toContext(product: any): ProductContextItem {
    const images = product.images || [];
    const primary =
      images.find((img: { isPrimary?: boolean }) => img.isPrimary)?.url ||
      images[0]?.url ||
      null;

    return {
      id: product.id,
      name: product.name,
      slug: product.slug,
      sku: product.sku,
      description: product.description,
      shortDescription: product.shortDescription,
      price: Number(product.price),
      compareAtPrice: product.compareAtPrice != null ? Number(product.compareAtPrice) : null,
      stock: product.stock,
      status: product.status,
      averageRating: Number(product.averageRating || 0),
      reviewCount: product.reviewCount || 0,
      tags: product.tags || [],
      specifications:
        product.specifications && typeof product.specifications === 'object'
          ? (product.specifications as Record<string, unknown>)
          : null,
      category: product.category
        ? {
            id: product.category.id,
            name: product.category.name,
            slug: product.category.slug,
          }
        : null,
      brand: product.brand
        ? {
            id: product.brand.id,
            name: product.brand.name,
            slug: product.brand.slug,
          }
        : null,
      primaryImage: primary,
      variants: (product.variants || []).map(
        (v: {
          id: string;
          name: string;
          sku: string;
          price: unknown;
          stock: number;
          attributes: Record<string, unknown>;
        }) => ({
          id: v.id,
          name: v.name,
          sku: v.sku,
          price: Number(v.price),
          stock: v.stock,
          attributes: (v.attributes || {}) as Record<string, unknown>,
        }),
      ),
    };
  }
}
