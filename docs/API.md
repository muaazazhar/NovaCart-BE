# NovaCart API documentation

Base URL: `http://localhost:3000/api/v1`  
Interactive docs: `http://localhost:3000/docs`

All successful responses follow:

```json
{
  "success": true,
  "message": "Success",
  "data": {},
  "meta": {},
  "timestamp": "2026-07-24T00:00:00.000Z",
  "path": "/api/v1/..."
}
```

Authenticate with `Authorization: Bearer <accessToken>`.

## Auth

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/auth/register` | Public | Register customer |
| POST | `/auth/login` | Public | Login |
| POST | `/auth/refresh` | Public | Refresh tokens |
| POST | `/auth/logout` | Bearer | Logout |
| POST | `/auth/change-password` | Bearer | Change password |
| GET | `/auth/me` | Bearer | Current user |

## Users

| Method | Path | Roles | Description |
|--------|------|-------|-------------|
| POST | `/users` | Admin | Create user |
| GET | `/users` | Admin/Manager | List users |
| GET | `/users/profile` | Any | Own profile |
| PATCH | `/users/profile` | Any | Update profile |
| GET | `/users/:id` | Admin/Manager | Get user |
| PATCH | `/users/:id` | Admin | Update user |
| DELETE | `/users/:id` | Admin | Soft delete |

## Catalog

| Resource | Prefix | Public reads |
|----------|--------|--------------|
| Categories | `/categories` | Yes (`GET`, `/tree`) |
| Brands | `/brands` | Yes |
| Products | `/products` | Yes (`GET`, `/featured`) |
| Variants | `/variants` | Yes (`GET`) |
| Reviews | `/reviews` | Yes (`GET product/:id`) |
| Collections | `/collections` | Yes |
| Banners | `/banners/active` | Yes |

## Commerce

| Resource | Prefix | Notes |
|----------|--------|-------|
| Cart | `/cart` | Authenticated |
| Wishlist | `/wishlist` | Authenticated |
| Addresses | `/addresses` | Authenticated |
| Orders | `/orders` | Create from cart |
| Coupons | `/coupons` | Validate via `POST /coupons/validate` |

## Admin

| Resource | Prefix |
|----------|--------|
| Roles | `/roles` |
| Permissions | `/permissions` |
| Dashboard | `/dashboard/overview` |
| Activity logs | `/activity-logs` |
| Upload | `/upload/image`, `/upload/images` |
| Health | `/health`, `/health/live` |

## Query params (list endpoints)

- `page` (default 1)
- `limit` (default 20, max 100)
- `search`
- `sortBy` (default `createdAt`)
- `sortOrder` (`asc` | `desc`)

Product filters also support: `categoryId`, `brandId`, `status`, `isFeatured`, `minPrice`, `maxPrice`, `tag`.

## Demo credentials (after seed)

- Admin: `admin@novacart.com` / `Admin@123456`
- Customer: `james.smith1@example.com` / `Customer@123`
