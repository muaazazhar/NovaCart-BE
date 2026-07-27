import { PrismaClient, DiscountType, OrderStatus, PaymentMethod, PaymentStatus, ProductStatus, RoleName, BannerPosition } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import * as bcrypt from 'bcrypt';
import { Pool } from 'pg';
import {
  BRANDS,
  CATEGORIES,
  CITIES,
  COUPON_DEFS,
  FIRST_NAMES,
  LAST_NAMES,
  PRODUCT_TEMPLATES,
  REVIEW_COMMENTS,
  seededRandom,
  slugify,
} from './data';
import { getBannerImage, getBrandLogo, getCategoryImage, getProductImageUrls } from './images';

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error('DATABASE_URL is required for seeding');
}

const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const rand = seededRandom(42);

function pick<T>(arr: T[]): T {
  return arr[Math.floor(rand() * arr.length)];
}

function money(min: number, max: number): number {
  return Number((min + rand() * (max - min)).toFixed(2));
}

async function clearDatabase() {
  const tables = [
    'activity_logs',
    'notifications',
    'order_items',
    'orders',
    'cart_items',
    'carts',
    'wishlist_items',
    'reviews',
    'collection_products',
    'collections',
    'hero_banners',
    'product_variants',
    'product_images',
    'products',
    'coupons',
    'addresses',
    'refresh_tokens',
    'role_permissions',
    'permissions',
    'users',
    'roles',
    'brands',
    'categories',
  ];

  for (const table of tables) {
    await prisma.$executeRawUnsafe(`TRUNCATE TABLE "${table}" RESTART IDENTITY CASCADE`);
  }
}

async function seedRolesAndPermissions() {
  const modules = [
    'users', 'roles', 'permissions', 'products', 'categories', 'brands', 'variants',
    'reviews', 'wishlist', 'cart', 'orders', 'coupons', 'addresses', 'notifications',
    'dashboard', 'banners', 'collections', 'activity_logs', 'upload',
  ];
  const actions = ['create', 'read', 'update', 'delete', 'manage'];

  const permissions = [];
  for (const module of modules) {
    for (const action of actions) {
      permissions.push({
        name: `${module}:${action}`,
        displayName: `${action} ${module}`.replace(/\b\w/g, (c) => c.toUpperCase()),
        module,
        action,
        description: `Allow ${action} on ${module}`,
      });
    }
  }

  await prisma.permission.createMany({ data: permissions });
  const allPermissions = await prisma.permission.findMany();

  const roles = [
    {
      name: RoleName.SUPER_ADMIN,
      displayName: 'Super Admin',
      description: 'Full system access',
      isSystem: true,
      permissionFilter: () => true,
    },
    {
      name: RoleName.ADMIN,
      displayName: 'Admin',
      description: 'Administrative access',
      isSystem: true,
      permissionFilter: (p: { name: string }) => !p.name.startsWith('roles:delete'),
    },
    {
      name: RoleName.MANAGER,
      displayName: 'Manager',
      description: 'Catalog and order management',
      isSystem: true,
      permissionFilter: (p: { module: string; action: string }) =>
        ['products', 'categories', 'brands', 'variants', 'orders', 'coupons', 'banners', 'collections', 'reviews', 'dashboard', 'upload'].includes(p.module) &&
        p.action !== 'delete',
    },
    {
      name: RoleName.SUPPORT,
      displayName: 'Support',
      description: 'Customer support access',
      isSystem: true,
      permissionFilter: (p: { module: string; action: string }) =>
        ['orders', 'users', 'notifications', 'reviews'].includes(p.module) &&
        ['read', 'update'].includes(p.action),
    },
    {
      name: RoleName.CUSTOMER,
      displayName: 'Customer',
      description: 'Storefront customer',
      isSystem: true,
      permissionFilter: (p: { module: string; action: string }) =>
        ['cart', 'wishlist', 'addresses', 'orders', 'reviews', 'notifications'].includes(p.module) &&
        ['create', 'read', 'update', 'delete'].includes(p.action),
    },
  ];

  const roleMap: Record<string, string> = {};
  for (const roleDef of roles) {
    const role = await prisma.role.create({
      data: {
        name: roleDef.name,
        displayName: roleDef.displayName,
        description: roleDef.description,
        isSystem: roleDef.isSystem,
        rolePermissions: {
          create: allPermissions
            .filter(roleDef.permissionFilter as any)
            .map((p) => ({ permissionId: p.id })),
        },
      },
    });
    roleMap[role.name] = role.id;
  }

  return roleMap;
}

async function seedUsers(roleMap: Record<string, string>) {
  const password = await bcrypt.hash(process.env.SEED_ADMIN_PASSWORD || 'Admin@123456', 12);
  const customerPassword = await bcrypt.hash('Customer@123', 12);

  const admin = await prisma.user.create({
    data: {
      email: (process.env.SEED_ADMIN_EMAIL || 'admin@novacart.com').toLowerCase(),
      password,
      firstName: 'Nova',
      lastName: 'Admin',
      phone: '+15550000001',
      isActive: true,
      isEmailVerified: true,
      roleId: roleMap[RoleName.SUPER_ADMIN],
      cart: { create: {} },
    },
  });

  const users = [admin];
  for (let i = 0; i < 29; i++) {
    const firstName = FIRST_NAMES[i % FIRST_NAMES.length];
    const lastName = LAST_NAMES[i % LAST_NAMES.length];
    const role =
      i < 2 ? RoleName.ADMIN : i < 4 ? RoleName.MANAGER : i < 6 ? RoleName.SUPPORT : RoleName.CUSTOMER;

    const user = await prisma.user.create({
      data: {
        email: `${firstName.toLowerCase()}.${lastName.toLowerCase()}${i + 1}@example.com`,
        password: role === RoleName.CUSTOMER ? customerPassword : password,
        firstName,
        lastName,
        phone: `+1555${String(1000000 + i).slice(0, 7)}`,
        isActive: true,
        isEmailVerified: rand() > 0.2,
        roleId: roleMap[role],
        cart: { create: {} },
        addresses: {
          create: {
            type: 'BOTH',
            label: 'Home',
            firstName,
            lastName,
            phone: `+1555${String(1000000 + i).slice(0, 7)}`,
            street: `${100 + i} Market Street`,
            city: CITIES[i % CITIES.length].city,
            state: CITIES[i % CITIES.length].state,
            postalCode: CITIES[i % CITIES.length].postalCode,
            country: 'US',
            isDefault: true,
          },
        },
      },
    });
    users.push(user);
  }

  return users;
}

async function seedCatalog() {
  const categories = [];
  for (let i = 0; i < CATEGORIES.length; i++) {
    const cat = CATEGORIES[i];
    categories.push(
      await prisma.category.create({
        data: {
          name: cat.name,
          slug: slugify(cat.name),
          description: cat.description,
          icon: cat.icon,
          image: getCategoryImage(i),
          sortOrder: i,
          isActive: true,
        },
      }),
    );
  }

  const brands = [];
  for (const brand of BRANDS) {
    brands.push(
      await prisma.brand.create({
        data: {
          name: brand.name,
          slug: slugify(brand.name),
          description: brand.description,
          website: brand.website,
          logo: getBrandLogo(brand.name),
          isActive: true,
        },
      }),
    );
  }

  const products = [];
  let productIndex = 0;
  for (const category of categories) {
    const templates = PRODUCT_TEMPLATES[category.name] || ['Premium Product'];
    for (let t = 0; t < 10; t++) {
      productIndex += 1;
      const baseName = templates[t % templates.length];
      const name = `${baseName} ${productIndex}`;
      const brand = brands[productIndex % brands.length];
      const price = money(12, 499);
      const compareAt = rand() > 0.5 ? Number((price * (1.1 + rand() * 0.4)).toFixed(2)) : null;
      const imageCount = 4 + Math.floor(rand() * 5); // 4-8
      const images = getProductImageUrls(category.name, productIndex, imageCount);

      const product = await prisma.product.create({
        data: {
          name,
          slug: slugify(`${name}-${productIndex}`),
          description: `${baseName} crafted for everyday performance. Designed with durable materials, thoughtful details, and a finish that fits modern lifestyles. Ideal for customers who want reliable quality without compromise.`,
          shortDescription: `Premium ${baseName.toLowerCase()} with standout quality.`,
          sku: `NC-${String(productIndex).padStart(5, '0')}`,
          price,
          compareAtPrice: compareAt,
          costPrice: Number((price * 0.55).toFixed(2)),
          stock: 20 + Math.floor(rand() * 180),
          lowStockThreshold: 10,
          weight: money(0.2, 8),
          status: ProductStatus.ACTIVE,
          isFeatured: rand() > 0.75,
          averageRating: 0,
          reviewCount: 0,
          soldCount: Math.floor(rand() * 250),
          tags: [category.name.toLowerCase().split(' ')[0], brand.name.toLowerCase(), 'novacart'],
          specifications: {
            material: pick(['Aluminum', 'Cotton', 'Leather', 'Polymer', 'Steel', 'Ceramic']),
            warranty: pick(['1 year', '2 years', '6 months']),
            origin: pick(['USA', 'Italy', 'Japan', 'Germany', 'Canada']),
            color: pick(['Black', 'White', 'Navy', 'Oak', 'Silver', 'Rose']),
          },
          metaTitle: `${name} | NovaCart`,
          metaDescription: `Shop ${name} at NovaCart. Fast shipping and easy returns.`,
          categoryId: category.id,
          brandId: brand.id,
          images: {
            create: images.map((url, i) => ({
              url,
              alt: `${name} image ${i + 1}`,
              sortOrder: i,
              isPrimary: i === 0,
            })),
          },
          variants: {
            create: [
              {
                name: 'Standard',
                sku: `NC-${String(productIndex).padStart(5, '0')}-STD`,
                price,
                stock: 10 + Math.floor(rand() * 50),
                attributes: { size: 'Standard', color: 'Default' },
              },
              {
                name: 'Premium',
                sku: `NC-${String(productIndex).padStart(5, '0')}-PRM`,
                price: Number((price * 1.2).toFixed(2)),
                stock: 5 + Math.floor(rand() * 30),
                attributes: { size: 'Premium', color: 'Default' },
              },
            ],
          },
        },
      });
      products.push(product);
    }
  }

  return { categories, brands, products };
}

async function seedReviews(users: { id: string }[], products: { id: string }[]) {
  const customers = users.slice(6); // prefer customer-like users
  let created = 0;
  const used = new Set<string>();

  while (created < 200) {
    const user = pick(customers);
    const product = pick(products);
    const key = `${user.id}-${product.id}`;
    if (used.has(key)) continue;
    used.add(key);

    const rating = 1 + Math.floor(rand() * 5);
    await prisma.review.create({
      data: {
        userId: user.id,
        productId: product.id,
        rating,
        title: pick(['Great purchase', 'Worth it', 'Solid choice', 'Love it', 'Good quality']),
        comment: pick(REVIEW_COMMENTS),
        isVerified: rand() > 0.4,
        isApproved: true,
        helpfulCount: Math.floor(rand() * 40),
        createdAt: await daysAgo(Math.floor(rand() * 75), 18),
      },
    });
    created += 1;
  }

  for (const product of products) {
    const agg = await prisma.review.aggregate({
      where: { productId: product.id, isApproved: true },
      _avg: { rating: true },
      _count: { rating: true },
    });
    await prisma.product.update({
      where: { id: product.id },
      data: {
        averageRating: agg._avg.rating || 0,
        reviewCount: agg._count.rating,
      },
    });
  }
}

async function seedCoupons() {
  const now = new Date();
  const coupons = [];
  for (const def of COUPON_DEFS) {
    coupons.push(
      await prisma.coupon.create({
        data: {
          code: def.code,
          description: `Promo code ${def.code}`,
          discountType: def.type as DiscountType,
          discountValue: def.value,
          minOrderAmount: def.min,
          maxDiscount: (def as any).max,
          usageLimit: 100 + Math.floor(rand() * 400),
          usageCount: Math.floor(rand() * 20),
          perUserLimit: 1,
          startsAt: new Date(now.getTime() - 7 * 86400000),
          expiresAt: new Date(now.getTime() + 90 * 86400000),
          isActive: true,
        },
      }),
    );
  }
  return coupons;
}

async function daysAgo(days: number, jitterHours = 0): Promise<Date> {
  const d = new Date();
  d.setDate(d.getDate() - days);
  d.setHours(d.getHours() - Math.floor(rand() * Math.max(jitterHours, 1)));
  return d;
}

async function seedOrders(users: any[], products: any[], coupons: any[]) {
  const customers = users.slice(1);
  const orderCount = 85;

  for (let i = 0; i < orderCount; i++) {
    const user = customers[i % customers.length];
    const address = await prisma.address.findFirst({ where: { userId: user.id } });
    if (!address) continue;

    const itemCount = 1 + Math.floor(rand() * 4);
    const selected = [];
    for (let j = 0; j < itemCount; j++) selected.push(pick(products));

    let subtotal = 0;
    const items = selected.map((product) => {
      const qty = 1 + Math.floor(rand() * 3);
      const unitPrice = Number(product.price);
      subtotal += unitPrice * qty;
      return {
        productId: product.id,
        productName: product.name,
        productSku: product.sku,
        quantity: qty,
        unitPrice,
        totalPrice: unitPrice * qty,
      };
    });

    const coupon = rand() > 0.45 ? pick(coupons) : null;
    let discountAmount = 0;
    if (coupon) {
      discountAmount =
        coupon.discountType === 'PERCENTAGE'
          ? Math.min(
              (subtotal * Number(coupon.discountValue)) / 100,
              Number(coupon.maxDiscount || 9999),
            )
          : Number(coupon.discountValue);
      discountAmount = Math.min(discountAmount, subtotal);
    }

    const shippingAmount = subtotal >= 100 ? 0 : 9.99;
    const taxAmount = Number((Math.max(subtotal - discountAmount, 0) * 0.08).toFixed(2));
    const total = Number((Math.max(subtotal - discountAmount, 0) + shippingAmount + taxAmount).toFixed(2));

    // Bias toward completed orders so the store looks active
    const status = pick([
      OrderStatus.DELIVERED,
      OrderStatus.DELIVERED,
      OrderStatus.DELIVERED,
      OrderStatus.SHIPPED,
      OrderStatus.SHIPPED,
      OrderStatus.PROCESSING,
      OrderStatus.CONFIRMED,
      OrderStatus.PENDING,
      OrderStatus.CANCELLED,
    ]);

    const createdAt = await daysAgo(Math.floor(rand() * 90), 20);
    const shippedAt = ([OrderStatus.SHIPPED, OrderStatus.DELIVERED] as OrderStatus[]).includes(status)
      ? new Date(createdAt.getTime() + 2 * 86400000)
      : null;
    const deliveredAt =
      status === OrderStatus.DELIVERED
        ? new Date(createdAt.getTime() + (3 + Math.floor(rand() * 5)) * 86400000)
        : null;

    await prisma.order.create({
      data: {
        orderNumber: `NC-SEED-${String(i + 1).padStart(4, '0')}`,
        userId: user.id,
        status,
        paymentStatus:
          status === OrderStatus.PENDING
            ? PaymentStatus.PENDING
            : status === OrderStatus.CANCELLED
              ? PaymentStatus.REFUNDED
              : PaymentStatus.PAID,
        paymentMethod: pick([
          PaymentMethod.CARD,
          PaymentMethod.CARD,
          PaymentMethod.PAYPAL,
          PaymentMethod.COD,
          PaymentMethod.WALLET,
        ]),
        subtotal,
        discountAmount,
        shippingAmount,
        taxAmount,
        total,
        couponId: coupon?.id,
        shippingAddressId: address.id,
        billingAddressId: address.id,
        trackingNumber: shippedAt ? `TRK${100000 + i}` : null,
        shippedAt,
        deliveredAt,
        cancelledAt: status === OrderStatus.CANCELLED ? new Date(createdAt.getTime() + 86400000) : null,
        cancelReason: status === OrderStatus.CANCELLED ? 'Changed mind before shipment' : null,
        createdAt,
        updatedAt: deliveredAt || shippedAt || createdAt,
        items: { create: items },
      },
    });

    // Reflect sales velocity on products
    for (const item of items) {
      await prisma.product.update({
        where: { id: item.productId },
        data: {
          soldCount: { increment: item.quantity + Math.floor(rand() * 8) },
          viewCount: { increment: 20 + Math.floor(rand() * 120) },
        },
      });
    }
  }
}

async function seedBannersAndCollections(products: { id: string }[]) {
  const banners = [
    {
      title: 'Summer Essentials',
      subtitle: 'Up to 40% off',
      description: 'Refresh your wardrobe and home with curated summer picks.',
      linkText: 'Shop now',
      linkUrl: '/collections/summer-essentials',
      position: BannerPosition.HERO,
    },
    {
      title: 'New Tech Arrivals',
      subtitle: 'Power your day',
      description: 'Discover the latest gadgets from top brands.',
      linkText: 'Explore electronics',
      linkUrl: '/categories/electronics',
      position: BannerPosition.HERO,
    },
    {
      title: 'Wellness Month',
      subtitle: 'Feel better daily',
      description: 'Vitamins, fitness gear, and self-care favorites.',
      linkText: 'Browse wellness',
      linkUrl: '/collections/wellness-month',
      position: BannerPosition.SECONDARY,
    },
    {
      title: 'Free Shipping',
      subtitle: 'Orders over $100',
      description: 'Fast delivery on qualifying orders across the US.',
      linkText: 'Learn more',
      linkUrl: '/shipping',
      position: BannerPosition.SECONDARY,
    },
  ];

  for (let i = 0; i < banners.length; i++) {
    await prisma.heroBanner.create({
      data: {
        ...banners[i],
        image: getBannerImage(i),
        mobileImage: getBannerImage(i),
        sortOrder: i,
        isActive: true,
      },
    });
  }

  const collectionDefs = [
    { name: 'Summer Essentials', featured: true },
    { name: 'Best Sellers', featured: true },
    { name: 'Wellness Month', featured: true },
    { name: 'Home Refresh', featured: false },
    { name: 'Gift Ideas', featured: true },
  ];

  for (let i = 0; i < collectionDefs.length; i++) {
    const def = collectionDefs[i];
    const selected = products.slice(i * 8, i * 8 + 12);
    await prisma.collection.create({
      data: {
        name: def.name,
        slug: slugify(def.name),
        description: `Curated ${def.name.toLowerCase()} from NovaCart.`,
        image: getBannerImage(i),
        isActive: true,
        isFeatured: def.featured,
        sortOrder: i,
        products: {
          create: selected.map((p, idx) => ({
            productId: p.id,
            sortOrder: idx,
          })),
        },
      },
    });
  }
}

async function seedNotifications(users: { id: string }[]) {
  const promoCopy = [
    ['Flash sale ends tonight', 'Save up to 25% on featured electronics and fashion.'],
    ['Free shipping weekend', 'Orders over $50 ship free through Sunday.'],
    ['New arrivals dropped', 'Fresh picks just landed in Home & Living.'],
    ['Your wishlist items are trending', 'A few saved products are moving quickly.'],
  ];

  for (const user of users) {
    await prisma.notification.create({
      data: {
        userId: user.id,
        type: 'SYSTEM',
        title: 'Welcome to NovaCart',
        message: 'Thanks for joining. Enjoy curated products and exclusive offers.',
        createdAt: await daysAgo(60 + Math.floor(rand() * 20)),
      },
    });

    if (rand() > 0.35) {
      const [title, message] = pick(promoCopy);
      await prisma.notification.create({
        data: {
          userId: user.id,
          type: 'PROMO',
          title,
          message,
          isRead: rand() > 0.5,
          readAt: rand() > 0.5 ? await daysAgo(Math.floor(rand() * 10)) : null,
          createdAt: await daysAgo(Math.floor(rand() * 14)),
        },
      });
    }

    if (rand() > 0.4) {
      await prisma.notification.create({
        data: {
          userId: user.id,
          type: 'ORDER',
          title: 'Order update',
          message: 'Your recent NovaCart order has progressed. Track it anytime in Orders.',
          isRead: rand() > 0.4,
          createdAt: await daysAgo(Math.floor(rand() * 21)),
        },
      });
    }
  }
}

async function seedWishlistsAndCarts(users: any[], products: any[]) {
  const customers = users.slice(6);
  let wishlistCount = 0;
  let cartItemCount = 0;

  for (const user of customers) {
    const wishCount = 2 + Math.floor(rand() * 6);
    const chosen = new Set<string>();
    for (let i = 0; i < wishCount; i++) {
      const product = pick(products);
      if (chosen.has(product.id)) continue;
      chosen.add(product.id);
      await prisma.wishlistItem.create({
        data: {
          userId: user.id,
          productId: product.id,
          createdAt: await daysAgo(Math.floor(rand() * 45)),
        },
      });
      wishlistCount += 1;
    }

    const cart = await prisma.cart.findUnique({ where: { userId: user.id } });
    if (!cart) continue;

    if (rand() > 0.35) {
      const itemCount = 1 + Math.floor(rand() * 3);
      const cartChosen = new Set<string>();
      for (let i = 0; i < itemCount; i++) {
        const product = pick(products);
        if (cartChosen.has(product.id)) continue;
        cartChosen.add(product.id);
        await prisma.cartItem.create({
          data: {
            cartId: cart.id,
            productId: product.id,
            quantity: 1 + Math.floor(rand() * 2),
            createdAt: await daysAgo(Math.floor(rand() * 7)),
          },
        });
        cartItemCount += 1;
      }
    }
  }

  console.log(`✓ Wishlists (${wishlistCount}) & cart items (${cartItemCount})`);
}

async function seedActivity(users: any[], products: any[]) {
  const actions = ['VIEW', 'LOGIN', 'CREATE', 'UPDATE'] as const;
  const modules = ['products', 'orders', 'auth', 'cart', 'wishlist', 'reviews'];
  let count = 0;

  for (let i = 0; i < 180; i++) {
    const user = pick(users);
    const product = pick(products);
    const action = pick([...actions]);
    const moduleName = pick(modules);
    await prisma.activityLog.create({
      data: {
        userId: user.id,
        action: action as any,
        module: moduleName,
        resourceId: moduleName === 'products' ? product.id : user.id,
        description:
          action === 'VIEW'
            ? `Viewed product ${product.name}`
            : action === 'LOGIN'
              ? `User session for ${user.email}`
              : `${action} on ${moduleName}`,
        ipAddress: `203.0.113.${1 + (i % 80)}`,
        userAgent: pick([
          'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_0)',
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
          'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)',
        ]),
        createdAt: await daysAgo(Math.floor(rand() * 60), 24),
      },
    });
    count += 1;
  }
  console.log(`✓ Activity logs (${count})`);
}

async function boostCatalogPopularity(products: any[]) {
  for (let i = 0; i < products.length; i++) {
    const product = products[i];
    const isHot = i % 7 === 0;
    await prisma.product.update({
      where: { id: product.id },
      data: {
        isFeatured: isHot || product.isFeatured || rand() > 0.82,
        viewCount: 80 + Math.floor(rand() * (isHot ? 2400 : 700)),
        soldCount: 5 + Math.floor(rand() * (isHot ? 420 : 90)),
        stock: Math.max(3, Math.floor(rand() * 180)),
      },
    });
  }
  console.log('✓ Catalog popularity metrics boosted');
}

async function main() {
  console.log('🌱 Seeding NovaCart PostgreSQL database...');
  await clearDatabase();

  const roleMap = await seedRolesAndPermissions();
  console.log('✓ Roles & permissions');

  const users = await seedUsers(roleMap);
  console.log(`✓ Users (${users.length})`);

  const { products } = await seedCatalog();
  console.log(`✓ Catalog (10 categories, 15 brands, ${products.length} products)`);

  await seedReviews(users, products);
  console.log('✓ Reviews (200)');

  const coupons = await seedCoupons();
  console.log(`✓ Coupons (${coupons.length})`);

  await seedOrders(users, products, coupons);
  console.log('✓ Orders (85 across ~90 days)');

  await seedBannersAndCollections(products);
  console.log('✓ Banners & collections');

  await seedNotifications(users);
  console.log('✓ Notifications');

  await seedWishlistsAndCarts(users, products);
  await seedActivity(users, products);
  await boostCatalogPopularity(products);

  await prisma.activityLog.create({
    data: {
      userId: users[0].id,
      action: 'IMPORT',
      module: 'system',
      description: 'Database seeded with high-traffic demo data for NovaCart',
    },
  });

  console.log('\n✅ Seed complete (PostgreSQL)');
  console.log(`Admin: ${process.env.SEED_ADMIN_EMAIL || 'admin@novacart.com'} / ${process.env.SEED_ADMIN_PASSWORD || 'Admin@123456'}`);
  console.log('Customer demo: james.smith1@example.com / Customer@123');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
