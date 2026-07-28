# NovaCart Backend

Production-ready NestJS eCommerce API for **NovaCart**.

## Stack

- NestJS 11 + TypeScript
- Prisma ORM 7 + PostgreSQL (Neon compatible)
- JWT + refresh tokens + Passport
- Role & permission guards
- Swagger, Winston, Multer + Sharp
- Rate limiting, health checks
- Docker, Railway, Render ready

## Features

- Auth (register, login, refresh, logout, change password)
- Users, roles, permissions (RBAC)
- Products, categories, brands, variants, reviews
- Wishlist, cart, checkout/orders, coupons, addresses
- Notifications, dashboard analytics
- Hero banners, collections, activity logs
- Image upload with Sharp optimization

## Quick start

### 1. Prerequisites

- Node.js 20+
- Docker (recommended) or a PostgreSQL / Neon database

### 2. Install

```bash
cp .env.example .env
npm install
```

### 3. Configure PostgreSQL

NovaCart uses **PostgreSQL** via Prisma. Your `.env` should point at a real `psql` database:

```bash
DATABASE_URL=postgresql://postgres:root@127.0.0.1:5432/novacart?schema=public
```

Create the database if needed:

```bash
PGPASSWORD=root psql -h 127.0.0.1 -U postgres -c "CREATE DATABASE novacart;"
```

Or start a local Postgres container:

```bash
npm run docker:dev
```

### 4. Migrate & seed

```bash
npm run db:setup
# equivalent to: npx prisma migrate deploy && npm run prisma:seed
```

This applies SQL migrations and loads high-traffic demo data (orders, reviews, wishlists, carts, activity).

### 5. Run API

```bash
npm run start:dev
```

- API: http://localhost:3000/api/v1
- Swagger: http://localhost:3000/docs
- Health: http://localhost:3000/api/v1/health

## Demo accounts (after seed)

| Role | Email | Password |
|------|-------|----------|
| Super Admin | admin@novacart.com | Admin@123456 |
| Customer | michael.miller7@example.com | Customer@123 |

All seeded accounts are email-verified by default. New self-registered users must verify email before login.

## Seed data

Deterministic seed creates a storefront that looks actively used:

- 30 users
- 10 categories / 15 brands
- 100 products (~4–8 images each, ~586 images total)
- 200 reviews (dated across ~75 days)
- 85 orders across ~90 days (with line items)
- 20 coupons
- Wishlists + in-progress carts
- Notifications + ~180 activity logs
- Boosted view/sold counts and featured products
- Hero banners + collections

Product images use Unsplash / Picsum URLs (royalty-free / placeholder).

## Project structure

```
src/
  common/          # filters, guards, interceptors, decorators, DTOs
  config/          # env validation, logger, configuration
  prisma/          # Prisma module/service
  modules/         # feature modules (auth, products, orders, ...)
prisma/
  schema.prisma
  migrations/
  seed/
docs/
  API.md
postman/
  NovaCart.postman_collection.json
```

## Scripts

| Script | Description |
|--------|-------------|
| `npm run start:dev` | Dev server with watch |
| `npm run build` | Production compile (Nest + seed scripts) |
| `npm run start:prod` | Apply migrations, then run compiled app |
| `npm run db:setup` | Migrate + seed PostgreSQL |
| `npm run prisma:migrate` | Create/apply migrations |
| `npm run prisma:seed` | Seed demo data |
| `npm run docker:up` | Full stack via Docker Compose |
| `npm run test` | Unit tests |

## Environment

See `.env.example`. Required at startup:

- `DATABASE_URL`
- `JWT_SECRET` (≥ 32 chars)
- `JWT_REFRESH_SECRET` (≥ 32 chars)

Validated via `class-validator` in `src/config/env.validation.ts`.

## Docker

```bash
docker compose up -d --build
```

## Deploy

### Railway

1. Connect the repo
2. Set env vars from `.env.example`
3. Use `railway.toml` (Dockerfile build + health check)
4. Attach a Postgres plugin / Neon URL as `DATABASE_URL`

### Render

1. Use `render.yaml` blueprint or Docker runtime
2. Set `DATABASE_URL` (Neon or Render Postgres)
3. Health check: `/api/v1/health/live`

### Neon

Set `DATABASE_URL` to your Neon connection string (include `?sslmode=require` when needed).

## API docs

- Swagger UI: `/docs`
- Markdown reference: [docs/API.md](docs/API.md)
- Postman: [postman/NovaCart.postman_collection.json](postman/NovaCart.postman_collection.json)

## Architecture notes

- Feature-based modules
- Global JWT auth with `@Public()` escape hatch
- Roles + permission guards
- Global exception filter + response interceptor
- Request logging middleware
- Throttling via `@nestjs/throttler`
- Unit-test friendly injectable services over Prisma

## License

MIT
