export enum PermissionAction {
  CREATE = 'create',
  READ = 'read',
  UPDATE = 'update',
  DELETE = 'delete',
  MANAGE = 'manage',
}

export enum PermissionModule {
  USERS = 'users',
  ROLES = 'roles',
  PERMISSIONS = 'permissions',
  PRODUCTS = 'products',
  CATEGORIES = 'categories',
  BRANDS = 'brands',
  VARIANTS = 'variants',
  REVIEWS = 'reviews',
  WISHLIST = 'wishlist',
  CART = 'cart',
  ORDERS = 'orders',
  COUPONS = 'coupons',
  ADDRESSES = 'addresses',
  NOTIFICATIONS = 'notifications',
  DASHBOARD = 'dashboard',
  BANNERS = 'banners',
  COLLECTIONS = 'collections',
  ACTIVITY_LOGS = 'activity_logs',
  UPLOAD = 'upload',
}

export function permissionName(module: string, action: string): string {
  return `${module}:${action}`;
}
